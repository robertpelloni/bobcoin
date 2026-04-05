import { useEffect, useMemo, useState } from 'react';
import {
    getGoLatticeFrontier,
    getManifestAnchors,
    getLatticeFrontier,
    getLatticeChain,
    submitLatticeBlock,
    LATTICE_URL,
    SUPERNODE_URL,
} from '../api';
import { checkAndUnlock } from '../AchievementService';
import { Block } from '../Block';
import { encryptFileForVault, hashData, signBlock, verifySignature } from '../cryptoUtils';
import { StorageWasmWorkbench } from '../components/StorageWasmWorkbench';
import './Vault.css';

function normalizeString(value) {
    return String(value || '').toLowerCase();
}

function short(value, length = 14) {
    if (!value) return 'UNKNOWN';
    return value.length > length ? `${value.slice(0, length)}...` : value;
}

function downloadJson(filename, value) {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function matchesSearch(anchor, query) {
    if (!query) return true;
    const haystack = [
        anchor.name,
        anchor.id,
        anchor.blockHash,
        anchor.owner,
        anchor.locator,
        anchor.magnet,
        anchor.manifestId,
        anchor.ciphertextHash,
        anchor.proofHash,
        anchor.publisherAlias,
        anchor.publisherWebsite,
        anchor.publisherStatement,
        anchor.publisherAvatar,
        ...(anchor.publisherProofs || []),
        ...(anchor.publisherProofKinds || []),
        ...(anchor.publisherProofLabels || []),
        ...(anchor.publisherProofIssuers || []),
        anchor.type,
    ]
        .map(normalizeString)
        .join(' ');
    return haystack.includes(normalizeString(query));
}

function scoreProfile(profile) {
    const totalMB = profile.totalSize / (1024 * 1024);
    const score = Math.min(
        100,
        (profile.signedAnchors * 18) +
        (profile.manifestAnchors * 8) +
        (profile.legacyAnchors * 5) +
        Math.min(totalMB * 2, 20)
    );
    return Math.round(score);
}

function tierForScore(score) {
    if (score >= 80) return { label: 'SOVEREIGN', className: 'tier-sovereign' };
    if (score >= 60) return { label: 'TRUSTED', className: 'tier-trusted' };
    if (score >= 35) return { label: 'EMERGING', className: 'tier-emerging' };
    return { label: 'UNVERIFIED', className: 'tier-unverified' };
}

function normalizePublisherProofs(anchor) {
    const proofs = Array.isArray(anchor.publisherProofs) ? anchor.publisherProofs : [];
    const kinds = Array.isArray(anchor.publisherProofKinds) ? anchor.publisherProofKinds : [];
    const labels = Array.isArray(anchor.publisherProofLabels) ? anchor.publisherProofLabels : [];
    const issuers = Array.isArray(anchor.publisherProofIssuers) ? anchor.publisherProofIssuers : [];
    return proofs.map((url, index) => ({
        url,
        kind: kinds[index] || 'link',
        label: labels[index] || '',
        issuer: issuers[index] || '',
    }));
}

function buildOwnerProfiles(manifestAnchors, legacyAnchors) {
    const profiles = new Map();

    const touch = (owner) => {
        const key = owner || 'UNKNOWN';
        if (!profiles.has(key)) {
            profiles.set(key, {
                owner: key,
                manifestAnchors: 0,
                legacyAnchors: 0,
                signedAnchors: 0,
                totalAnchors: 0,
                totalSize: 0,
                latestTimestamp: 0,
            });
        }
        return profiles.get(key);
    };

    for (const anchor of manifestAnchors) {
        const profile = touch(anchor.owner);
        profile.manifestAnchors += 1;
        profile.totalAnchors += 1;
        if (anchor.proofSignature) profile.signedAnchors += 1;
        profile.totalSize += anchor.size || 0;
        profile.latestTimestamp = Math.max(profile.latestTimestamp, anchor.timestamp || 0);
    }

    for (const anchor of legacyAnchors) {
        const profile = touch(anchor.owner);
        profile.legacyAnchors += 1;
        profile.totalAnchors += 1;
        profile.totalSize += anchor.size || anchor.originalSize || 0;
        profile.latestTimestamp = Math.max(profile.latestTimestamp, anchor.timestamp || 0);
    }

    return Array.from(profiles.values())
        .map(profile => ({
            ...profile,
            trustScore: scoreProfile(profile),
            tier: tierForScore(scoreProfile(profile)),
        }))
        .sort((a, b) => b.trustScore - a.trustScore || b.totalAnchors - a.totalAnchors || b.latestTimestamp - a.latestTimestamp);
}

const VAULT_PRESETS_KEY = 'bobcoin_vault_filter_presets';
const RECOVERY_REPORTS_KEY = 'bobcoin_vault_recovery_reports';
const SOURCE_DIAGNOSTICS_PACKAGE_FORMAT = 'bobcoin-source-diagnostics-package-v1';
const DAY_MS = 24 * 60 * 60 * 1000;

function sortAnchors(anchors, sortMode, ownerProfiles) {
    const copy = [...anchors];
    const trustFor = (anchor) => ownerProfiles.get(anchor.owner)?.trustScore || 0;

    switch (sortMode) {
        case 'trust':
            return copy.sort((a, b) => trustFor(b) - trustFor(a) || (b.timestamp || 0) - (a.timestamp || 0));
        case 'size':
            return copy.sort((a, b) => (b.size || b.originalSize || 0) - (a.size || a.originalSize || 0));
        case 'name':
            return copy.sort((a, b) => normalizeString(a.name).localeCompare(normalizeString(b.name)));
        case 'owner':
            return copy.sort((a, b) => normalizeString(a.owner).localeCompare(normalizeString(b.owner)));
        case 'recent':
        default:
            return copy.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }
}

function groupAnchors(anchors, groupMode) {
    if (groupMode === 'none') {
        return [{ key: 'all', label: 'ALL RESULTS', anchors }];
    }

    const groups = new Map();
    for (const anchor of anchors) {
        const key = groupMode === 'owner'
            ? (anchor.owner || 'UNKNOWN')
            : (anchor.type || anchor.sourceKind || 'unknown');
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key).push(anchor);
    }

    return Array.from(groups.entries()).map(([key, groupedAnchors]) => ({
        key,
        label: groupMode === 'owner' ? `OWNER ${short(key, 20)}` : `TYPE ${(key || 'unknown').toUpperCase()}`,
        anchors: groupedAnchors,
    }));
}

function parseReportTimestamp(value) {
    const timestamp = Date.parse(value || '');
    return Number.isFinite(timestamp) ? timestamp : null;
}

function formatRelativeTimestamp(value) {
    const timestamp = parseReportTimestamp(value);
    if (!timestamp) return 'UNKNOWN';
    const diff = Date.now() - timestamp;
    if (diff < DAY_MS) {
        const hours = Math.max(1, Math.round(diff / (60 * 60 * 1000)));
        return `${hours}H AGO`;
    }
    const days = Math.max(1, Math.round(diff / DAY_MS));
    return `${days}D AGO`;
}

function sourceHealthTier(score) {
    if (score >= 85) return { label: 'ROBUST', className: 'health-robust' };
    if (score >= 60) return { label: 'WATCH', className: 'health-watch' };
    return { label: 'FRAGILE', className: 'health-fragile' };
}

function classifySourceTrend(profile) {
    const recentObservations = profile.recent7dFailures + profile.recent7dSuccesses;
    const previousObservations = profile.previous7dFailures + profile.previous7dSuccesses;
    const recentFailureRate = recentObservations > 0 ? profile.recent7dFailures / recentObservations : 0;
    const previousFailureRate = previousObservations > 0 ? profile.previous7dFailures / previousObservations : 0;

    if (recentObservations > 0 && previousObservations === 0) {
        return { label: 'NEW', className: 'trend-new' };
    }
    if (recentObservations === 0 && previousObservations === 0) {
        return { label: 'QUIET', className: 'trend-quiet' };
    }
    if ((recentFailureRate - previousFailureRate) >= 0.2 || profile.recent7dFailures >= profile.previous7dFailures + 2) {
        return { label: 'DEGRADING', className: 'trend-degrading' };
    }
    if ((previousFailureRate - recentFailureRate) >= 0.2 || profile.previous7dFailures >= profile.recent7dFailures + 2) {
        return { label: 'IMPROVING', className: 'trend-improving' };
    }
    return { label: 'STABLE', className: 'trend-stable' };
}

function buildSourceProfiles(reports) {
    const profiles = new Map();
    const now = Date.now();

    const touch = (host) => {
        const key = host || 'unknown-source';
        if (!profiles.has(key)) {
            profiles.set(key, {
                host: key,
                failures: 0,
                successfulFetches: 0,
                successfulRestores: 0,
                parityRecoveries: 0,
                reportCount: 0,
                categories: {},
                latestSeen: null,
                firstSeen: null,
                recent7dFailures: 0,
                previous7dFailures: 0,
                recent7dSuccesses: 0,
                previous7dSuccesses: 0,
                last30dFailures: 0,
                last30dSuccesses: 0,
                manifestIds: new Set(),
            });
        }
        return profiles.get(key);
    };

    for (const report of reports) {
        const generatedAt = report.generatedAt || null;
        const timestamp = parseReportTimestamp(generatedAt);
        const age = timestamp == null ? null : now - timestamp;
        const inRecent7d = age != null && age <= 7 * DAY_MS;
        const inPrevious7d = age != null && age > 7 * DAY_MS && age <= 14 * DAY_MS;
        const inLast30d = age != null && age <= 30 * DAY_MS;
        const manifestId = report.manifest?.id || report.manifest?.ciphertextHash || null;
        const restoredWithParity = !!report.recovery?.restoredFile?.recoveredWithParity;
        const reportHosts = new Set();

        for (const success of report.recovery?.successfulShards || []) {
            const profile = touch(success.sourceHost || success.source || 'unknown-source');
            profile.successfulFetches += 1;
            if (report.recovery?.restoredFile) profile.successfulRestores += 1;
            if (restoredWithParity) profile.parityRecoveries += 1;
            if (generatedAt) {
                profile.latestSeen = !profile.latestSeen || generatedAt > profile.latestSeen ? generatedAt : profile.latestSeen;
                profile.firstSeen = !profile.firstSeen || generatedAt < profile.firstSeen ? generatedAt : profile.firstSeen;
            }
            if (manifestId) profile.manifestIds.add(manifestId);
            if (inRecent7d) profile.recent7dSuccesses += 1;
            if (inPrevious7d) profile.previous7dSuccesses += 1;
            if (inLast30d) profile.last30dSuccesses += 1;
            reportHosts.add(profile.host);
        }

        for (const failure of report.recovery?.failedShards || []) {
            const profile = touch(failure.sourceHost || failure.source || 'unknown-source');
            profile.failures += 1;
            if (generatedAt) {
                profile.latestSeen = !profile.latestSeen || generatedAt > profile.latestSeen ? generatedAt : profile.latestSeen;
                profile.firstSeen = !profile.firstSeen || generatedAt < profile.firstSeen ? generatedAt : profile.firstSeen;
            }
            if (manifestId) profile.manifestIds.add(manifestId);
            profile.categories[failure.category] = (profile.categories[failure.category] || 0) + 1;
            if (inRecent7d) profile.recent7dFailures += 1;
            if (inPrevious7d) profile.previous7dFailures += 1;
            if (inLast30d) profile.last30dFailures += 1;
            reportHosts.add(profile.host);
        }

        for (const host of reportHosts) {
            touch(host).reportCount += 1;
        }
    }

    return Array.from(profiles.values())
        .map((profile) => {
            const totalObservations = profile.failures + profile.successfulFetches;
            const reliabilityScore = totalObservations > 0
                ? Math.round((profile.successfulFetches / totalObservations) * 100)
                : 0;
            const trend = classifySourceTrend(profile);
            const health = sourceHealthTier(reliabilityScore);
            const attentionScore = (profile.recent7dFailures * 4) + (profile.last30dFailures * 2) + profile.failures - profile.recent7dSuccesses;
            return {
                ...profile,
                manifestCount: profile.manifestIds.size,
                totalObservations,
                reliabilityScore,
                trend,
                health,
                attentionScore,
            };
        })
        .sort((a, b) => b.attentionScore - a.attentionScore || b.failures - a.failures || a.reliabilityScore - b.reliabilityScore);
}

function buildSourceOverview(sourceProfiles, reports) {
    const successfulRestores = reports.filter(report => report.recovery?.restoredFile).length;
    const parityRecoveries = reports.filter(report => report.recovery?.restoredFile?.recoveredWithParity).length;
    const recent7dFailures = sourceProfiles.reduce((sum, profile) => sum + profile.recent7dFailures, 0);
    const recent7dSuccesses = sourceProfiles.reduce((sum, profile) => sum + profile.recent7dSuccesses, 0);
    const topAtRisk = sourceProfiles.find(profile => profile.failures > 0) || null;
    const healthiest = [...sourceProfiles]
        .filter(profile => profile.totalObservations > 0)
        .sort((a, b) => b.reliabilityScore - a.reliabilityScore || b.successfulFetches - a.successfulFetches)[0] || null;
    const improving = sourceProfiles.find(profile => profile.trend.label === 'IMPROVING') || null;
    const degrading = sourceProfiles.find(profile => profile.trend.label === 'DEGRADING') || null;

    return {
        totalReports: reports.length,
        successfulRestores,
        parityRecoveries,
        distinctSources: sourceProfiles.length,
        recent7dFailures,
        recent7dSuccesses,
        topAtRisk,
        healthiest,
        improving,
        degrading,
    };
}

function compactSourceProfile(profile) {
    if (!profile) return null;
    return {
        host: profile.host,
        health: profile.health?.label || 'UNKNOWN',
        trend: profile.trend?.label || 'UNKNOWN',
        reliabilityScore: profile.reliabilityScore,
        totalObservations: profile.totalObservations,
        reportCount: profile.reportCount,
        manifestCount: profile.manifestCount,
        failures: profile.failures,
        successfulFetches: profile.successfulFetches,
        successfulRestores: profile.successfulRestores,
        parityRecoveries: profile.parityRecoveries,
        recent7dFailures: profile.recent7dFailures,
        recent7dSuccesses: profile.recent7dSuccesses,
        previous7dFailures: profile.previous7dFailures,
        previous7dSuccesses: profile.previous7dSuccesses,
        last30dFailures: profile.last30dFailures,
        last30dSuccesses: profile.last30dSuccesses,
        latestSeen: profile.latestSeen,
        firstSeen: profile.firstSeen,
        categories: profile.categories,
    };
}

function canonicalizeForSigning(value) {
    if (Array.isArray(value)) {
        return value.map(canonicalizeForSigning);
    }
    if (value && typeof value === 'object') {
        return Object.keys(value)
            .sort()
            .reduce((acc, key) => {
                acc[key] = canonicalizeForSigning(value[key]);
                return acc;
            }, {});
    }
    return value;
}

async function buildSignedDiagnosticsPackage(diagnostics, keypair) {
    if (!keypair?.publicKey || !keypair?.privateKey) {
        throw new Error('Unlock a Bobcoin wallet before exporting a signed diagnostics package.');
    }
    const canonicalDiagnostics = canonicalizeForSigning(diagnostics);
    const diagnosticsHash = await hashData(JSON.stringify(canonicalDiagnostics));
    const signature = await signBlock(diagnosticsHash, keypair.privateKey);
    return {
        format: SOURCE_DIAGNOSTICS_PACKAGE_FORMAT,
        exportedAt: new Date().toISOString(),
        exporter: {
            publicKey: keypair.publicKey,
            derivationPath: keypair.derivationPath || null,
            index: Number.isInteger(keypair.index) ? keypair.index : null,
        },
        signature: {
            algorithm: 'ed25519-sha256-base58',
            messageHash: diagnosticsHash,
            signature,
        },
        diagnostics: canonicalDiagnostics,
    };
}

async function verifyDiagnosticsPackage(value) {
    if (!value || value.format !== SOURCE_DIAGNOSTICS_PACKAGE_FORMAT) {
        throw new Error('Unsupported diagnostics package format.');
    }
    if (!value.exporter?.publicKey || !value.signature?.messageHash || !value.signature?.signature || !value.diagnostics) {
        throw new Error('Diagnostics package is missing required signature metadata.');
    }
    const canonicalDiagnostics = canonicalizeForSigning(value.diagnostics);
    const computedHash = await hashData(JSON.stringify(canonicalDiagnostics));
    const signatureValid = computedHash === value.signature.messageHash
        && verifySignature(value.signature.messageHash, value.signature.signature, value.exporter.publicKey);
    return {
        package: {
            ...value,
            diagnostics: canonicalDiagnostics,
        },
        computedHash,
        signatureValid,
    };
}

function indexSourceProfilesByHost(sources) {
    return new Map((sources || []).map(source => [source.host, source]));
}

function buildDiagnosticsComparison(localDiagnostics, importedDiagnostics) {
    if (!localDiagnostics || !importedDiagnostics) return null;

    const localSources = indexSourceProfilesByHost(localDiagnostics.sources);
    const importedSources = indexSourceProfilesByHost(importedDiagnostics.sources);
    const sharedHosts = [];
    const localOnlyHosts = [];
    const importedOnlyHosts = [];
    const changedHosts = [];

    for (const [host, localSource] of localSources.entries()) {
        const importedSource = importedSources.get(host);
        if (!importedSource) {
            localOnlyHosts.push(host);
            continue;
        }
        sharedHosts.push(host);
        const reliabilityDelta = (localSource.reliabilityScore || 0) - (importedSource.reliabilityScore || 0);
        const recentFailureDelta = (localSource.recent7dFailures || 0) - (importedSource.recent7dFailures || 0);
        const recentSuccessDelta = (localSource.recent7dSuccesses || 0) - (importedSource.recent7dSuccesses || 0);
        if (reliabilityDelta !== 0 || recentFailureDelta !== 0 || recentSuccessDelta !== 0 || localSource.trend !== importedSource.trend) {
            changedHosts.push({
                host,
                local: compactSourceProfile(localSource),
                imported: compactSourceProfile(importedSource),
                reliabilityDelta,
                recentFailureDelta,
                recentSuccessDelta,
            });
        }
    }

    for (const host of importedSources.keys()) {
        if (!localSources.has(host)) {
            importedOnlyHosts.push(host);
        }
    }

    changedHosts.sort((a, b) => Math.abs(b.reliabilityDelta) - Math.abs(a.reliabilityDelta) || Math.abs(b.recentFailureDelta) - Math.abs(a.recentFailureDelta));

    const localExportedAt = Date.parse(localDiagnostics.exportedAt || '') || 0;
    const importedExportedAt = Date.parse(importedDiagnostics.exportedAt || '') || 0;
    let freshness = 'SAME_WINDOW';
    if (localExportedAt > importedExportedAt) freshness = 'LOCAL_NEWER';
    if (importedExportedAt > localExportedAt) freshness = 'IMPORTED_NEWER';

    return {
        freshness,
        sharedHostCount: sharedHosts.length,
        localOnlyCount: localOnlyHosts.length,
        importedOnlyCount: importedOnlyHosts.length,
        changedHostCount: changedHosts.length,
        localOnlyHosts: localOnlyHosts.slice(0, 8),
        importedOnlyHosts: importedOnlyHosts.slice(0, 8),
        changedHosts: changedHosts.slice(0, 6),
        localDistinctSources: localDiagnostics?.overview?.distinctSources || 0,
        importedDistinctSources: importedDiagnostics?.overview?.distinctSources || 0,
        localTotalReports: localDiagnostics?.overview?.totalReports || 0,
        importedTotalReports: importedDiagnostics?.overview?.totalReports || 0,
    };
}

function buildComparativeSourceDiagnostics(sourceProfiles, sourceOverview, reports) {
    const rankedByReliability = [...sourceProfiles]
        .filter(profile => profile.totalObservations > 0)
        .sort((a, b) => b.reliabilityScore - a.reliabilityScore || b.successfulFetches - a.successfulFetches || a.failures - b.failures)
        .slice(0, 10)
        .map(compactSourceProfile);

    const rankedByAttention = [...sourceProfiles]
        .filter(profile => profile.failures > 0 || profile.recent7dFailures > 0)
        .sort((a, b) => b.attentionScore - a.attentionScore || b.failures - a.failures || a.reliabilityScore - b.reliabilityScore)
        .slice(0, 10)
        .map(compactSourceProfile);

    const trendBuckets = {
        degrading: sourceProfiles.filter(profile => profile.trend.label === 'DEGRADING').slice(0, 10).map(compactSourceProfile),
        improving: sourceProfiles.filter(profile => profile.trend.label === 'IMPROVING').slice(0, 10).map(compactSourceProfile),
        stable: sourceProfiles.filter(profile => profile.trend.label === 'STABLE').slice(0, 10).map(compactSourceProfile),
        new: sourceProfiles.filter(profile => profile.trend.label === 'NEW').slice(0, 10).map(compactSourceProfile),
        quiet: sourceProfiles.filter(profile => profile.trend.label === 'QUIET').slice(0, 10).map(compactSourceProfile),
    };

    return {
        exportedAt: new Date().toISOString(),
        retention: {
            retainedRecoveryReports: reports.length,
            distinctSourcesObserved: sourceOverview.distinctSources,
        },
        overview: {
            totalReports: sourceOverview.totalReports,
            successfulRestores: sourceOverview.successfulRestores,
            parityRecoveries: sourceOverview.parityRecoveries,
            distinctSources: sourceOverview.distinctSources,
            recent7dFailures: sourceOverview.recent7dFailures,
            recent7dSuccesses: sourceOverview.recent7dSuccesses,
            healthiest: compactSourceProfile(sourceOverview.healthiest),
            topAtRisk: compactSourceProfile(sourceOverview.topAtRisk),
            improving: compactSourceProfile(sourceOverview.improving),
            degrading: compactSourceProfile(sourceOverview.degrading),
        },
        leaderboards: {
            rankedByReliability,
            rankedByAttention,
        },
        trendBuckets,
        sources: sourceProfiles.map(profile => ({
            ...compactSourceProfile(profile),
            attentionScore: profile.attentionScore,
        })),
    };
}

export function Vault() {
    const [balance, setBalance] = useState(0);
    const [myAnchors, setMyAnchors] = useState([]);
    const [networkAnchors, setNetworkAnchors] = useState([]);
    const [legacyAnchors, setLegacyAnchors] = useState([]);
    const [keypair, setKeypair] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [cloakMode, setCloakMode] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [networkSearch, setNetworkSearch] = useState('');
    const [showOnlySigned, setShowOnlySigned] = useState(false);
    const [sortMode, setSortMode] = useState('recent');
    const [groupMode, setGroupMode] = useState('none');
    const [presetName, setPresetName] = useState('');
    const [savedPresets, setSavedPresets] = useState([]);
    const [recoveryReports, setRecoveryReports] = useState([]);
    const [diagnosticsPackageReview, setDiagnosticsPackageReview] = useState(null);

    useEffect(() => {
        const storedKeys = localStorage.getItem('bobcoin_wallet');
        if (!storedKeys) {
            setLoading(false);
            return;
        }

        const kp = JSON.parse(storedKeys);
        setKeypair(kp);
        refresh(kp.publicKey);

        try {
            const raw = localStorage.getItem(VAULT_PRESETS_KEY);
            if (raw) {
                setSavedPresets(JSON.parse(raw));
            }
        } catch (error) {
            console.error('Failed to load vault presets:', error);
        }

        try {
            const rawReports = localStorage.getItem(RECOVERY_REPORTS_KEY);
            if (rawReports) {
                setRecoveryReports(JSON.parse(rawReports));
            }
        } catch (error) {
            console.error('Failed to load recovery reports:', error);
        }
    }, []);

    const ownedLegacyAnchors = useMemo(
        () => legacyAnchors.filter(anchor => anchor.owner === keypair?.publicKey),
        [legacyAnchors, keypair]
    );

    const ownerProfiles = useMemo(() => {
        return buildOwnerProfiles([...networkAnchors, ...myAnchors], legacyAnchors);
    }, [networkAnchors, myAnchors, legacyAnchors]);

    const ownerProfilesMap = useMemo(() => {
        return new Map(ownerProfiles.map(profile => [profile.owner, profile]));
    }, [ownerProfiles]);

    const filteredOwnedEntries = useMemo(() => {
        const combined = [
            ...myAnchors.map(anchor => ({ ...anchor, sourceKind: 'manifest' })),
            ...ownedLegacyAnchors.map(anchor => ({ ...anchor, sourceKind: 'legacy', type: anchor.type || 'data_anchor' })),
        ].filter(anchor => {
            const anchorType = anchor.type || (anchor.sourceKind === 'legacy' ? 'data_anchor' : 'publish_manifest');
            if (typeFilter !== 'all' && anchorType !== typeFilter) return false;
            if (showOnlySigned && !anchor.proofSignature && !anchor.cloaked) return false;
            return matchesSearch(anchor, search);
        });

        return sortAnchors(combined, sortMode, ownerProfilesMap);
    }, [myAnchors, ownedLegacyAnchors, search, typeFilter, showOnlySigned, sortMode, ownerProfilesMap]);

    const filteredNetworkAnchors = useMemo(() => {
        const filtered = networkAnchors.filter(anchor => {
            if (showOnlySigned && !anchor.proofSignature) return false;
            return matchesSearch(anchor, networkSearch);
        });
        return sortAnchors(filtered, sortMode, ownerProfilesMap);
    }, [networkAnchors, networkSearch, showOnlySigned, sortMode, ownerProfilesMap]);

    const groupedOwnedEntries = useMemo(() => groupAnchors(filteredOwnedEntries, groupMode), [filteredOwnedEntries, groupMode]);
    const groupedNetworkEntries = useMemo(() => groupAnchors(filteredNetworkAnchors.slice(0, 12), groupMode), [filteredNetworkAnchors, groupMode]);

    const sourceProfiles = useMemo(() => buildSourceProfiles(recoveryReports), [recoveryReports]);
    const sourceOverview = useMemo(() => buildSourceOverview(sourceProfiles, recoveryReports), [sourceProfiles, recoveryReports]);
    const currentDiagnostics = useMemo(() => buildComparativeSourceDiagnostics(sourceProfiles, sourceOverview, recoveryReports), [sourceProfiles, sourceOverview, recoveryReports]);

    const stats = useMemo(() => {
        const totalSize = ownedLegacyAnchors.reduce((sum, anchor) => sum + (anchor.size || anchor.originalSize || 0), 0);
        const published = myAnchors.filter(anchor => anchor.type === 'publish_manifest').length;
        const legacy = ownedLegacyAnchors.length;
        const signed = myAnchors.filter(anchor => anchor.proofSignature).length;
        const avgTrust = ownerProfiles.length > 0
            ? Math.round(ownerProfiles.reduce((sum, profile) => sum + profile.trustScore, 0) / ownerProfiles.length)
            : 0;
        return { totalSize, published, legacy, signed, avgTrust };
    }, [myAnchors, ownedLegacyAnchors, ownerProfiles]);

    const persistPresets = (nextPresets) => {
        setSavedPresets(nextPresets);
        localStorage.setItem(VAULT_PRESETS_KEY, JSON.stringify(nextPresets));
    };

    const savePreset = () => {
        const name = presetName.trim();
        if (!name) {
            alert('Enter a preset name first.');
            return;
        }
        const next = [
            ...savedPresets.filter(p => p.name !== name),
            { name, search, typeFilter, networkSearch, showOnlySigned, sortMode, groupMode },
        ];
        persistPresets(next);
        setPresetName('');
    };

    const applyPreset = (preset) => {
        setSearch(preset.search || '');
        setTypeFilter(preset.typeFilter || 'all');
        setNetworkSearch(preset.networkSearch || '');
        setShowOnlySigned(!!preset.showOnlySigned);
        setSortMode(preset.sortMode || 'recent');
        setGroupMode(preset.groupMode || 'none');
    };

    const deletePreset = (name) => {
        persistPresets(savedPresets.filter(p => p.name !== name));
    };

    const exportPresets = () => {
        downloadJson('vault-filter-presets.json', {
            exportedAt: new Date().toISOString(),
            presets: savedPresets,
        });
    };

    const importPresets = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const parsed = JSON.parse(await file.text());
            const imported = Array.isArray(parsed) ? parsed : (parsed.presets || []);
            const sanitized = imported
                .filter(p => p && typeof p.name === 'string')
                .map(p => ({
                    name: p.name,
                    search: p.search || '',
                    typeFilter: p.typeFilter || 'all',
                    networkSearch: p.networkSearch || '',
                    showOnlySigned: !!p.showOnlySigned,
                    sortMode: p.sortMode || 'recent',
                    groupMode: p.groupMode || 'none',
                }));
            persistPresets(sanitized);
        } catch (error) {
            alert(`Failed to import presets: ${error.message}`);
        } finally {
            event.target.value = '';
        }
    };

    const exportVisibleArchive = () => {
        downloadJson('vault-visible-archive.json', {
            exportedAt: new Date().toISOString(),
            filters: { search, typeFilter, networkSearch, showOnlySigned, sortMode, groupMode },
            owned: filteredOwnedEntries,
            network: filteredNetworkAnchors.slice(0, 12),
        });
    };

    const exportComparativeSourceDiagnostics = () => {
        downloadJson('vault-source-comparative-diagnostics.json', currentDiagnostics);
    };

    const exportSignedComparativeSourceDiagnostics = async () => {
        try {
            const signedPackage = await buildSignedDiagnosticsPackage(currentDiagnostics, keypair);
            downloadJson('vault-source-comparative-diagnostics.signed.json', signedPackage);
            setDiagnosticsPackageReview({
                source: 'local-export',
                verified: true,
                exporter: signedPackage.exporter,
                package: signedPackage,
                computedHash: signedPackage.signature.messageHash,
                comparison: buildDiagnosticsComparison(currentDiagnostics, signedPackage.diagnostics),
            });
        } catch (error) {
            alert(error.message);
        }
    };

    const importSignedComparativeSourceDiagnostics = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const parsed = JSON.parse(await file.text());
            const verified = await verifyDiagnosticsPackage(parsed);
            setDiagnosticsPackageReview({
                source: file.name,
                verified: verified.signatureValid,
                exporter: verified.package.exporter,
                package: verified.package,
                computedHash: verified.computedHash,
                comparison: buildDiagnosticsComparison(currentDiagnostics, verified.package.diagnostics),
            });
            if (!verified.signatureValid) {
                alert('Diagnostics package loaded, but its signature could not be verified.');
            }
        } catch (error) {
            alert(`Failed to import signed diagnostics package: ${error.message}`);
            setDiagnosticsPackageReview(null);
        } finally {
            event.target.value = '';
        }
    };

    const copyVisibleLocators = async () => {
        const locators = [...filteredOwnedEntries, ...filteredNetworkAnchors.slice(0, 12)]
            .map(anchor => anchor.locator || anchor.magnet)
            .filter(Boolean);
        if (locators.length === 0) {
            alert('No visible locators to copy.');
            return;
        }
        await navigator.clipboard.writeText(locators.join('\n'));
        alert(`Copied ${locators.length} locator(s) to clipboard.`);
    };

    const refresh = async (pubkey) => {
        setLoading(true);
        setError('');

        const [legacyFrontier, goFrontier, mine, all, legacy] = await Promise.allSettled([
            getLatticeFrontier(pubkey),
            getGoLatticeFrontier(pubkey),
            getManifestAnchors(pubkey),
            getManifestAnchors(),
            fetch(`${LATTICE_URL}/anchors`).then(r => r.json()),
        ]);

        if (legacyFrontier.status === 'fulfilled') {
            setBalance(legacyFrontier.value.balance || 0);
        } else if (goFrontier.status === 'fulfilled') {
            setBalance(goFrontier.value.balance || 0);
        } else {
            setBalance(0);
        }

        setMyAnchors(mine.status === 'fulfilled' ? (mine.value.anchors || []) : []);
        setNetworkAnchors(all.status === 'fulfilled' ? (all.value.anchors || []) : []);
        setLegacyAnchors(legacy.status === 'fulfilled' ? (legacy.value.anchors || []) : []);

        if (mine.status === 'rejected' || all.status === 'rejected') {
            setError('Manifest archive data from the Go lattice is unavailable right now. Legacy data anchors remain accessible.');
        }

        setLoading(false);
    };

    const handleUpload = async () => {
        if (!file) return alert('Select a file first');
        if (!keypair?.publicKey || !keypair?.privateKey) return alert('Unlock your sovereign vault first');
        if (balance < 10) return alert('Insufficient balance for storage fee (10 BOB)');

        setUploading(true);
        try {
            let fileToUpload = file;
            const anchorPayload = {
                name: file.name,
                type: 'data_anchor',
                originalType: file.type || 'application/octet-stream',
                originalSize: file.size,
                cloaked: false,
            };

            if (cloakMode) {
                const fileBytes = new Uint8Array(await file.arrayBuffer());
                const encrypted = await encryptFileForVault(fileBytes, keypair.privateKey);
                fileToUpload = new File([encrypted.ciphertext], `${file.name}.bob`, { type: 'application/octet-stream' });

                anchorPayload.cloaked = true;
                anchorPayload.algorithm = encrypted.algorithm;
                anchorPayload.iv = encrypted.iv;
                anchorPayload.salt = encrypted.salt;
                anchorPayload.owner = keypair.publicKey;
            }

            const formData = new FormData();
            formData.append('file', fileToUpload);

            const upRes = await fetch(`${SUPERNODE_URL}/upload`, {
                method: 'POST',
                body: formData,
            }).then(r => r.json());

            if (!upRes.success) throw new Error('Supernode upload failed');

            const frontier = await getLatticeFrontier(keypair.publicKey);
            const chain = await getLatticeChain(keypair.publicKey);

            const block = new Block({
                type: 'data_anchor',
                account: keypair.publicKey,
                previous: frontier.frontier,
                balance: balance - 10,
                staked_balance: frontier.staked_balance || 0,
                link: 'DATA_ANCHOR',
                payload: {
                    ...anchorPayload,
                    magnet: upRes.magnet,
                    size: upRes.size,
                },
                height: chain.chain.length,
            });

            await block.signBlock(keypair.privateKey);
            const res = await submitLatticeBlock(block);

            if (!res.success) throw new Error(res.error || 'Anchoring failed');

            setFile(null);
            await refresh(keypair.publicKey);
            await checkAndUnlock('DATA_ARCHITECT', keypair, chain.chain || []);
            if (cloakMode) {
                await checkAndUnlock('VAULT_ENCRYPTOR', keypair, chain.chain || []);
            }

            alert(cloakMode ? 'Legacy data anchor published with cloak mode enabled.' : 'Legacy data anchor published to the lattice.');
        } catch (e) {
            alert(e.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="vault-container">
            <h1 className="glitch" data-text="CYBER VAULT">CYBER VAULT</h1>
            <p className="subtitle">GO-LATTICE ARCHIVE, MANIFEST PROVENANCE, TRUST SIGNALS, DISCOVERY, AND BROWSER-SIDE STORAGE ROUND-TRIPS</p>

            <div className="vault-summary-grid">
                <StatCard label="LIQUID BALANCE" value={`${balance} BOB`} accent="#ffd700" />
                <StatCard label="MY MANIFEST ANCHORS" value={`${stats.published}`} accent="#0ff" />
                <StatCard label="MY SIGNED ANCHORS" value={`${stats.signed}`} accent="#7dff7d" />
                <StatCard label="MY LEGACY DATA ANCHORS" value={`${stats.legacy}`} accent="#f0f" />
                <StatCard label="AVG TRUST SCORE" value={`${stats.avgTrust}/100`} accent="#ff9f43" />
                <StatCard label="LEGACY ARCHIVED SIZE" value={`${(stats.totalSize / 1024).toFixed(2)} KB`} accent="#0f0" />
            </div>

            <div className="vault-section">
                <h2>ARCHIVE DISCOVERY CONTROLS</h2>
                <p className="section-copy">
                    Search by filename, owner, locator, manifest ID, ciphertext hash, proof hash, or block hash. Filter the archive by anchor type,
                    signed provenance, and sorting mode to quickly locate trustworthy assets across the sovereign storage mesh.
                </p>
                <div className="vault-filters-grid">
                    <input
                        className="cyber-input"
                        placeholder="SEARCH YOUR ARCHIVE..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <select className="cyber-input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                        <option value="all">ALL TYPES</option>
                        <option value="publish_manifest">MANIFEST ANCHORS</option>
                        <option value="data_anchor">LEGACY DATA ANCHORS</option>
                    </select>
                    <select className="cyber-input" value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
                        <option value="recent">SORT: MOST RECENT</option>
                        <option value="trust">SORT: TRUST SCORE</option>
                        <option value="size">SORT: SIZE</option>
                        <option value="name">SORT: NAME</option>
                        <option value="owner">SORT: OWNER</option>
                    </select>
                    <select className="cyber-input" value={groupMode} onChange={(e) => setGroupMode(e.target.value)}>
                        <option value="none">GROUP: NONE</option>
                        <option value="owner">GROUP: OWNER</option>
                        <option value="type">GROUP: TYPE</option>
                    </select>
                    <label className="vault-checkbox-row">
                        <input type="checkbox" checked={showOnlySigned} onChange={() => setShowOnlySigned(!showOnlySigned)} />
                        <span>SIGNED / PROVENANCE-RICH ONLY</span>
                    </label>
                    <input
                        className="cyber-input"
                        placeholder="SEARCH NETWORK STREAM..."
                        value={networkSearch}
                        onChange={(e) => setNetworkSearch(e.target.value)}
                    />
                </div>
                <div className="vault-presets-row">
                    <input
                        className="cyber-input"
                        placeholder="SAVE CURRENT FILTERS AS..."
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                    />
                    <button className="cyber-button small" onClick={savePreset}>SAVE PRESET</button>
                    <button className="cyber-button small secondary" onClick={exportPresets}>EXPORT PRESETS</button>
                    <label className="vault-import-label">
                        <span className="cyber-button small secondary">IMPORT PRESETS</span>
                        <input type="file" accept="application/json" onChange={importPresets} />
                    </label>
                    {savedPresets.map((preset) => (
                        <div key={preset.name} className="vault-preset-chip">
                            <button className="cyber-button small secondary" onClick={() => applyPreset(preset)}>{preset.name}</button>
                            <button className="chip-delete" onClick={() => deletePreset(preset.name)} title="Delete preset">×</button>
                        </div>
                    ))}
                </div>
                <div className="vault-batch-row">
                    <button className="cyber-button small secondary" onClick={exportVisibleArchive}>EXPORT VISIBLE ARCHIVE</button>
                    <button className="cyber-button small secondary" onClick={copyVisibleLocators}>COPY VISIBLE LOCATORS</button>
                </div>
            </div>

            <div className="vault-section leaderboard-section">
                <div className="section-header-row">
                    <div>
                        <h2>SOVEREIGN PUBLISHER LEADERBOARD</h2>
                        <p className="section-copy">
                            This lightweight reputation overlay estimates archive trust from signed anchors, total archive activity, and published storage volume.
                            It is not consensus-critical, but it gives operators a fast way to assess who is actively maintaining attributable content.
                        </p>
                    </div>
                </div>
                <div className="leaderboard-grid">
                    {ownerProfiles.slice(0, 6).map((profile, index) => (
                        <div key={profile.owner} className="leaderboard-card">
                            <div className="leaderboard-rank">#{index + 1}</div>
                            <div className="leaderboard-owner">{short(profile.owner, 20)}</div>
                            <div className={`vault-badge ${profile.tier.className}`}>{profile.tier.label}</div>
                            <div className="leaderboard-score">TRUST {profile.trustScore}/100</div>
                            <div className="leaderboard-meta">SIGNED: {profile.signedAnchors} • TOTAL: {profile.totalAnchors} • SIZE: {(profile.totalSize / 1024).toFixed(1)} KB</div>
                        </div>
                    ))}
                    {ownerProfiles.length === 0 && <p className="empty">NO OWNER REPUTATION PROFILES HAVE BEEN DERIVED YET.</p>}
                </div>
            </div>

            <div className="vault-section leaderboard-section">
                <div className="section-header-row">
                    <div>
                        <h2>LONG-HORIZON SOURCE RELIABILITY</h2>
                        <p className="section-copy">
                            Recovery reports are now mined for longer-horizon source behavior, comparing recent 7-day activity with the prior week,
                            scoring each source by successful shard fetches versus failures, and surfacing which hosts are degrading, stabilizing, or improving.
                        </p>
                    </div>
                    <div className="section-actions-row">
                        <button className="cyber-button small secondary" onClick={exportComparativeSourceDiagnostics}>EXPORT COMPARATIVE DIAGNOSTICS</button>
                        <button className="cyber-button small secondary" onClick={exportSignedComparativeSourceDiagnostics}>EXPORT SIGNED PACKAGE</button>
                        <label className="vault-import-label">
                            <span className="cyber-button small secondary">IMPORT SIGNED PACKAGE</span>
                            <input type="file" accept="application/json" onChange={importSignedComparativeSourceDiagnostics} />
                        </label>
                    </div>
                </div>
                <div className="vault-summary-grid reliability-summary-grid">
                    <StatCard label="RECOVERY REPORTS RETAINED" value={`${sourceOverview.totalReports}`} accent="#0ff" />
                    <StatCard label="DISTINCT SOURCES OBSERVED" value={`${sourceOverview.distinctSources}`} accent="#ffd700" />
                    <StatCard label="7D SOURCE FAILURES" value={`${sourceOverview.recent7dFailures}`} accent="#ff8080" />
                    <StatCard label="7D SOURCE SUCCESSES" value={`${sourceOverview.recent7dSuccesses}`} accent="#7dff7d" />
                    <StatCard label="SUCCESSFUL RESTORES" value={`${sourceOverview.successfulRestores}`} accent="#7dff7d" />
                    <StatCard label="PARITY RECOVERIES" value={`${sourceOverview.parityRecoveries}`} accent="#ffb347" />
                </div>
                <div className="source-insight-row">
                    <div className="source-insight-card">
                        <div className="vault-stat-label">NEEDS ATTENTION</div>
                        <div className="source-insight-value">{sourceOverview.topAtRisk?.host || 'NO FAILING HOSTS YET'}</div>
                        <div className="leaderboard-meta">
                            {sourceOverview.topAtRisk
                                ? `TREND ${sourceOverview.topAtRisk.trend.label} • RELIABILITY ${sourceOverview.topAtRisk.reliabilityScore}/100`
                                : 'No host has accumulated failure evidence yet.'}
                        </div>
                    </div>
                    <div className="source-insight-card">
                        <div className="vault-stat-label">HEALTHIEST OBSERVED SOURCE</div>
                        <div className="source-insight-value">{sourceOverview.healthiest?.host || 'NOT ENOUGH DATA YET'}</div>
                        <div className="leaderboard-meta">
                            {sourceOverview.healthiest
                                ? `TREND ${sourceOverview.healthiest.trend.label} • RELIABILITY ${sourceOverview.healthiest.reliabilityScore}/100`
                                : 'Health ranking appears once successful shard observations accumulate.'}
                        </div>
                    </div>
                    <div className="source-insight-card">
                        <div className="vault-stat-label">IMPROVING SOURCE</div>
                        <div className="source-insight-value">{sourceOverview.improving?.host || 'NONE YET'}</div>
                        <div className="leaderboard-meta">
                            {sourceOverview.improving
                                ? `PREV 7D FAILURES ${sourceOverview.improving.previous7dFailures} → ${sourceOverview.improving.recent7dFailures}`
                                : 'No host has yet shown a clear week-over-week recovery trend.'}
                        </div>
                    </div>
                </div>
                {diagnosticsPackageReview && (
                    <div className={`diagnostics-package-review ${diagnosticsPackageReview.verified ? 'verified' : 'invalid'}`}>
                        <div className="vault-stat-label">SIGNED DIAGNOSTICS PACKAGE REVIEW</div>
                        <div className="source-insight-value">{diagnosticsPackageReview.source}</div>
                        <div className="leaderboard-meta">
                            EXPORTER: {diagnosticsPackageReview.exporter?.publicKey || 'UNKNOWN'}
                        </div>
                        <div className="leaderboard-meta">
                            HASH: {diagnosticsPackageReview.computedHash}
                        </div>
                        <div className="source-badge-row" style={{ marginTop: '0.75rem' }}>
                            <span className={`vault-badge ${diagnosticsPackageReview.verified ? 'health-robust' : 'health-fragile'}`}>
                                {diagnosticsPackageReview.verified ? 'SIGNATURE VERIFIED' : 'SIGNATURE INVALID'}
                            </span>
                            <span className="vault-badge neutral">SOURCES {diagnosticsPackageReview.package?.diagnostics?.overview?.distinctSources || 0}</span>
                            <span className="vault-badge neutral">REPORTS {diagnosticsPackageReview.package?.diagnostics?.overview?.totalReports || 0}</span>
                            {diagnosticsPackageReview.comparison && <span className="vault-badge neutral">{diagnosticsPackageReview.comparison.freshness}</span>}
                        </div>
                        {diagnosticsPackageReview.comparison && (
                            <div className="diagnostics-comparison-grid">
                                <div className="leaderboard-meta">SHARED SOURCES: {diagnosticsPackageReview.comparison.sharedHostCount}</div>
                                <div className="leaderboard-meta">LOCAL ONLY: {diagnosticsPackageReview.comparison.localOnlyCount}</div>
                                <div className="leaderboard-meta">IMPORTED ONLY: {diagnosticsPackageReview.comparison.importedOnlyCount}</div>
                                <div className="leaderboard-meta">CHANGED SOURCES: {diagnosticsPackageReview.comparison.changedHostCount}</div>
                                <div className="leaderboard-meta">LOCAL REPORTS: {diagnosticsPackageReview.comparison.localTotalReports}</div>
                                <div className="leaderboard-meta">IMPORTED REPORTS: {diagnosticsPackageReview.comparison.importedTotalReports}</div>
                            </div>
                        )}
                        {diagnosticsPackageReview.comparison?.changedHosts?.length > 0 && (
                            <div className="diagnostics-delta-list">
                                {diagnosticsPackageReview.comparison.changedHosts.map((entry) => (
                                    <div key={entry.host} className="leaderboard-meta">
                                        {entry.host}: RELIABILITY Δ {entry.reliabilityDelta > 0 ? '+' : ''}{entry.reliabilityDelta} • 7D FAILURES Δ {entry.recentFailureDelta > 0 ? '+' : ''}{entry.recentFailureDelta} • LOCAL {entry.local.trend} / IMPORTED {entry.imported.trend}
                                    </div>
                                ))}
                            </div>
                        )}
                        {diagnosticsPackageReview.comparison?.localOnlyHosts?.length > 0 && (
                            <div className="leaderboard-meta">LOCAL-ONLY HOSTS: {diagnosticsPackageReview.comparison.localOnlyHosts.join(' • ')}</div>
                        )}
                        {diagnosticsPackageReview.comparison?.importedOnlyHosts?.length > 0 && (
                            <div className="leaderboard-meta">IMPORTED-ONLY HOSTS: {diagnosticsPackageReview.comparison.importedOnlyHosts.join(' • ')}</div>
                        )}
                    </div>
                )}
                <div className="leaderboard-grid">
                    {sourceProfiles.slice(0, 8).map((profile) => (
                        <div key={profile.host} className="leaderboard-card source-profile-card">
                            <div className="leaderboard-owner">{profile.host}</div>
                            <div className="source-badge-row">
                                <span className={`vault-badge ${profile.health.className}`}>{profile.health.label}</span>
                                <span className={`vault-badge ${profile.trend.className}`}>{profile.trend.label}</span>
                                <span className="vault-badge neutral">MANIFESTS {profile.manifestCount}</span>
                            </div>
                            <div className="leaderboard-score">RELIABILITY {profile.reliabilityScore}/100</div>
                            <div className="leaderboard-meta">7D FAILURES/SUCCESSES: {profile.recent7dFailures} / {profile.recent7dSuccesses}</div>
                            <div className="leaderboard-meta">PREV 7D FAILURES/SUCCESSES: {profile.previous7dFailures} / {profile.previous7dSuccesses}</div>
                            <div className="leaderboard-meta">ALL-TIME FAILURES/SUCCESSES: {profile.failures} / {profile.successfulFetches}</div>
                            <div className="leaderboard-meta">REPORTS: {profile.reportCount} • LAST SEEN: {formatRelativeTimestamp(profile.latestSeen)} • FIRST SEEN: {formatRelativeTimestamp(profile.firstSeen)}</div>
                            <div className="leaderboard-meta">
                                {Object.entries(profile.categories).map(([category, count]) => `${category}:${count}`).join(' • ') || 'NO FAILURE CATEGORIES YET'}
                            </div>
                        </div>
                    ))}
                    {sourceProfiles.length === 0 && <p className="empty">NO RECOVERY REPORTS HAVE BEEN CAPTURED YET.</p>}
                </div>
            </div>

            <div className="vault-section">
                <h2>LEGACY DATA ANCHOR PUBLISHER</h2>
                <p className="section-copy">
                    This compatibility panel preserves direct data-anchor uploads while the newer manifest pipeline matures. Cloak Mode encrypts
                    raw file bytes in the browser before they are uploaded to the network.
                </p>
                <div className="vault-toggle-row">
                    <span className={`vault-toggle-label ${cloakMode ? 'active' : ''}`} title="Enable client-side AES-256-GCM encryption before upload.">
                        CLOAK MODE (AES-256-GCM)
                    </span>
                    <button
                        className={`toggle-btn ${cloakMode ? 'active' : ''}`}
                        onClick={() => setCloakMode(!cloakMode)}
                        title="When enabled, the file is encrypted in your browser before it reaches the network."
                        type="button"
                    >
                        {cloakMode ? 'ON' : 'OFF'}
                    </button>
                </div>
                <p className="fee" title="Anchoring data consumes 10 BOB and writes immutable metadata to the lattice.">
                    STORAGE FEE: 10.00 BOB
                </p>
                <div className="drop-zone" title="Select a file to anchor to the decentralized storage mesh.">
                    <input type="file" onChange={e => setFile(e.target.files[0])} />
                    <p>{file ? file.name : 'DRAG AND DROP OR CLICK TO UPLOAD'}</p>
                </div>
                <button
                    className="cyber-button"
                    onClick={handleUpload}
                    disabled={uploading || !file}
                    title="Upload the file to the supernode and anchor its metadata on the lattice."
                >
                    {uploading ? 'ANCHORING...' : 'ANCHOR LEGACY DATA'}
                </button>
            </div>

            {error && <div className="vault-error">{error}</div>}
            {loading && <div className="vault-loading">LOADING SOVEREIGN ARCHIVE...</div>}

            <div className="vault-section">
                <div className="section-header-row">
                    <div>
                        <h2>YOUR ANCHORED ARCHIVE</h2>
                        <p className="section-copy">
                            These entries combine Go-lattice manifest anchors with legacy data-anchor records owned by the current wallet.
                            You can now search, filter, sort, and inspect provenance-rich archive records from a single surface.
                        </p>
                    </div>
                    {keypair && (
                        <button className="cyber-button small" onClick={() => refresh(keypair.publicKey)}>
                            REFRESH ARCHIVE
                        </button>
                    )}
                </div>

                <div className="anchor-grid">
                    {groupedOwnedEntries.map(group => (
                        <div key={group.key} className="vault-group-block">
                            {groupMode !== 'none' && <div className="vault-group-label">{group.label} ({group.anchors.length})</div>}
                            {group.anchors.map(anchor => (
                                anchor.sourceKind === 'legacy'
                                    ? <LegacyAnchorCard key={anchor.id} anchor={anchor} ownerProfile={ownerProfilesMap.get(anchor.owner)} />
                                    : <AnchorCard key={anchor.blockHash || anchor.id} anchor={anchor} ownerProfile={ownerProfilesMap.get(anchor.owner)} owned />
                            ))}
                        </div>
                    ))}
                    {!loading && filteredOwnedEntries.length === 0 && (
                        <p className="empty">NO PERSONAL ARCHIVE ENTRIES MATCH THE CURRENT FILTERS.</p>
                    )}
                </div>
            </div>

            <StorageWasmWorkbench />

            <div className="vault-section">
                <h2>NETWORK MANIFEST STREAM</h2>
                <p className="section-copy">
                    The sovereign archive is no longer just a supernode-side registry. These records are the visible on-chain anchor layer for
                    published manifests and data anchors, giving operators a provenance-aware view of the storage network.
                </p>
                <div className="anchor-grid">
                    {groupedNetworkEntries.map(group => (
                        <div key={group.key} className="vault-group-block">
                            {groupMode !== 'none' && <div className="vault-group-label">{group.label} ({group.anchors.length})</div>}
                            {group.anchors.map(anchor => (
                                <AnchorCard key={anchor.blockHash || anchor.id} anchor={anchor} ownerProfile={ownerProfilesMap.get(anchor.owner)} />
                            ))}
                        </div>
                    ))}
                    {!loading && filteredNetworkAnchors.length === 0 && <p className="empty">NO NETWORK ANCHORS MATCH THE CURRENT FILTERS.</p>}
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, accent }) {
    return (
        <div className="vault-stat-card" style={{ borderColor: accent }}>
            <div className="vault-stat-label">{label}</div>
            <div className="vault-stat-value" style={{ color: accent }}>{value}</div>
        </div>
    );
}

function ProvenanceBadge({ anchor, ownerProfile }) {
    const isSigned = !!anchor.proofSignature;
    const trustScore = ownerProfile?.trustScore || 0;
    const trustTier = ownerProfile?.tier || tierForScore(trustScore);
    return (
        <div className="provenance-row">
            <span className={`vault-badge ${isSigned ? 'signed' : 'unsigned'}`}>{isSigned ? 'SIGNED' : 'UNSIGNED'}</span>
            <span className={`vault-badge ${trustTier.className}`}>{trustTier.label}</span>
            <span className="vault-badge trust">TRUST {trustScore}</span>
            {anchor.ciphertextHash && <span className="vault-badge neutral">CIPHERTEXT</span>}
            {anchor.locator && <span className="vault-badge neutral">LOCATOR</span>}
            {anchor.cloaked && <span className="vault-badge cloaked">CLOAKED</span>}
        </div>
    );
}

function AnchorCard({ anchor, ownerProfile, owned = false }) {
    const locator = anchor.locator || anchor.magnet || '';
    const manifestUrl = anchor.manifestUrl || '';
    const manifestId = anchor.manifestId || anchor.id || anchor.blockHash;
    const anchorType = anchor.type || 'anchor';

    return (
        <div className={`anchor-card ${owned ? 'owned' : ''}`}>
            <div className="anchor-icon">{anchorType === 'publish_manifest' ? 'MANIFEST' : 'ANCHOR'}</div>
            <div className="file-info">
                <span className="file-name">{anchor.name || manifestId}</span>
                <span className="file-meta">
                    {(anchor.size || 0) > 0 ? `${(anchor.size / 1024).toFixed(2)} KB` : '0.00 KB'}
                    {' | '}
                    {anchorType.toUpperCase()}
                    {' | '}
                    OWNER: {short(anchor.owner)}
                </span>
                <span className="file-meta dim">MANIFEST: {short(manifestId, 20)} | BLOCK: {short(anchor.blockHash || anchor.id, 18)}</span>
                {anchor.proofHash && <span className="file-meta dim">PROOF HASH: {short(anchor.proofHash, 24)}</span>}
                {anchor.ciphertextHash && <span className="file-meta dim">CIPHERTEXT HASH: {short(anchor.ciphertextHash, 24)}</span>}
                {anchor.publisherAlias && <span className="file-meta dim">PUBLISHER: {anchor.publisherAlias}</span>}
                {anchor.publisherWebsite && <span className="file-meta dim">PROFILE: {anchor.publisherWebsite}</span>}
                {anchor.publisherStatement && <span className="file-meta dim">STATEMENT: {anchor.publisherStatement}</span>}
                <ProvenanceBadge anchor={anchor} ownerProfile={ownerProfile} />
                {anchor.publisherAvatar && (
                    <div className="publisher-card">
                        <img src={anchor.publisherAvatar} alt={anchor.publisherAlias || 'publisher avatar'} className="publisher-avatar" />
                        <div className="publisher-card-meta">
                            <div className="publisher-card-title">{anchor.publisherAlias || 'Unnamed Publisher'}</div>
                            {anchor.publisherWebsite && <a href={anchor.publisherWebsite} target="_blank" rel="noreferrer" className="publisher-link">{anchor.publisherWebsite}</a>}
                        </div>
                    </div>
                )}
                {normalizePublisherProofs(anchor).length > 0 && (
                    <div className="publisher-proofs">
                        {normalizePublisherProofs(anchor).map((proof) => (
                            <a key={`${proof.kind}-${proof.url}`} href={proof.url} target="_blank" rel="noreferrer" className="publisher-proof-card">
                                <span className="vault-badge neutral publisher-proof-kind">{proof.kind.toUpperCase()}</span>
                                <span className="publisher-proof-title">{proof.label || proof.url}</span>
                                {proof.issuer && <span className="publisher-proof-issuer">ISSUER: {proof.issuer}</span>}
                            </a>
                        ))}
                    </div>
                )}
            </div>
            <div className="anchor-actions">
                {manifestUrl && (
                    <a href={manifestUrl} target="_blank" rel="noreferrer" className="cyber-button small">
                        MANIFEST
                    </a>
                )}
                {locator && (
                    <button className="cyber-button small secondary" onClick={() => navigator.clipboard.writeText(locator)}>
                        COPY LOCATOR
                    </button>
                )}
                {anchor.owner && (
                    <button className="cyber-button small secondary" onClick={() => navigator.clipboard.writeText(anchor.owner)}>
                        COPY OWNER
                    </button>
                )}
            </div>
        </div>
    );
}

function LegacyAnchorCard({ anchor, ownerProfile }) {
    return (
        <div className="anchor-card legacy-owned">
            <div className="file-icon">{anchor.cloaked ? 'LOCKED' : 'FILE'}</div>
            <div className="file-info">
                <span className="file-name">
                    {anchor.name}
                    {anchor.cloaked && <span className="vault-badge cloaked">CLOAKED</span>}
                </span>
                <span className="file-meta">
                    {(Number(anchor.size || anchor.originalSize || 0) / 1024).toFixed(2)} KB
                    {' | '}
                    DATA_ANCHOR
                    {' | '}
                    OWNER: {short(anchor.owner)}
                </span>
                <span className="file-meta dim">ID: {short(anchor.id, 18)}</span>
                <ProvenanceBadge anchor={anchor} ownerProfile={ownerProfile} />
            </div>
            <div className="anchor-actions">
                {anchor.magnet && (
                    <a href={anchor.magnet} className="cyber-button small">
                        MAGNET
                    </a>
                )}
            </div>
        </div>
    );
}
