import { submitLatticeBlock, getLatticeFrontier, getSporaProof } from './api';
import { Block } from './Block';
import { playBlockConfirmedSound } from './audio/AudioEngine';

export const ACHIEVEMENTS = {
    GIBSON_HACKER: { id: 'GIBSON_HACKER', title: 'Hacked the Gibson', desc: 'Generated entropy via keyboard smashing.', icon: '⌨️', color: '#0ff' },
    SPORA_LORD: { id: 'SPORA_LORD', title: 'SPoRA Lord', desc: 'Stored decentralized data to secure the lattice.', icon: '💾', color: '#0f0' },
    QUADRATIC_CITIZEN: { id: 'QUADRATIC_CITIZEN', title: 'Quadratic Citizen', desc: 'Cast a vote in the Lattice DAO.', icon: '⚖️', color: '#ff0' },
    FHE_PHANTOM: { id: 'FHE_PHANTOM', title: 'FHE Phantom', desc: 'Completed a blind-multiplied game round.', icon: '👻', color: '#f0f' },
    LATTICE_SHARK: { id: 'LATTICE_SHARK', title: 'Lattice Shark', desc: 'Won a bet at the Autonomous Casino.', icon: '🎰', color: '#ff0055' },
    P2P_WARRIOR: { id: 'P2P_WARRIOR', title: 'WebRTC Warrior', desc: 'Completed a direct P2P multiplayer match.', icon: '⚔️', color: '#f80' },
    LATTICE_VALIDATOR: { id: 'LATTICE_VALIDATOR', title: 'Lattice Validator', desc: 'Staked tokens to secure the sovereign network.', icon: '🥩', color: '#0f0' },
    CRYPTOGRAPHER: { id: 'CRYPTOGRAPHER', title: 'Master Cryptographer', desc: 'Secured the sovereign identity via mnemonic backup.', icon: '🔐', color: '#ff0055' },
    DATA_ARCHITECT: { id: 'DATA_ARCHITECT', title: 'Data Architect', desc: 'Anchored permanent data to the Block Lattice.', icon: '📦', color: '#0ff' },
    LIQUIDITY_PROVIDER: { id: 'LIQUIDITY_PROVIDER', title: 'Liquidity Provider', desc: 'Bootstrapped the on-chain AMM pools.', icon: '🌊', color: '#0f0' },
    ZK_SAGE: { id: 'ZK_SAGE', title: 'Zero-Knowledge Sage', desc: 'Submitted a mathematically proven game score via SP1.', icon: '🕵️‍♂️', color: '#f0f' },
    LATTICE_CRYPTOGRAPHER: { id: 'LATTICE_CRYPTOGRAPHER', title: 'Lattice Cryptographer', desc: 'Minted supply using a native RISC-V zero-knowledge proof.', icon: '🔐', color: '#0ff' },
    LATTICE_SCHOLAR: { id: 'LATTICE_SCHOLAR', title: 'Lattice Scholar', desc: 'Mastered the Sovereign Network protocols.', icon: '📖', color: '#0ff' },
    LATTICE_OPTIMIZER: { id: 'LATTICE_OPTIMIZER', title: 'Lattice Optimizer', desc: 'Achieved high-performance consensus synchronization.', icon: '⚡', color: '#0f0' },
    LATTICE_OPERATOR: { id: 'LATTICE_OPERATOR', title: 'Lattice Operator', desc: 'Monitored the real-time health and heartbeat of the sovereign mesh.', icon: '💓', color: '#ff0055' },
    LATTICE_CONSOLIDATOR: { id: 'LATTICE_CONSOLIDATOR', title: 'Lattice Consolidator', desc: 'Synchronized a massive cryptographic batch of network history.', icon: '📦', color: '#f80' },
    LATTICE_SPEEDSTER: { id: 'LATTICE_SPEEDSTER', title: 'Lattice Speedster', desc: 'Successfully synchronized a compressed block-batch with the mesh.', icon: '🚀', color: '#0ff' },
    HD_ARCHITECT: { id: 'HD_ARCHITECT', title: 'HD Architect', desc: 'Implemented BIP-44 Hierarchical Deterministic account derivation.', icon: '🗝️', color: '#f0f' },
    LATTICE_DIPLOMAT: { id: 'LATTICE_DIPLOMAT', title: 'Lattice Diplomat', desc: 'Established a network of sovereign contacts.', icon: '📓', color: '#0ff' },
    LATTICE_ORACLE: { id: 'LATTICE_ORACLE', title: 'Lattice Oracle', desc: 'Discovered multiple active sub-accounts via derivation scanning.', icon: '🔭', color: '#ff0' },
    LATTICE_EVANGELIST: { id: 'LATTICE_EVANGELIST', title: 'Lattice Evangelist', desc: 'Installed the Sovereign OS to the local home screen.', icon: '📲', color: '#f0f' },
    LATTICE_GUARDIAN: { id: 'LATTICE_GUARDIAN', title: 'Lattice Guardian', desc: 'Verified and authorized a transaction via the pre-sign visualizer.', icon: '🛡️', color: '#ff0055' },
    LATTICE_SENTINEL: { id: 'LATTICE_SENTINEL', title: 'Lattice Sentinel', desc: 'Hardened the network by utilizing the Universal Guardian for all DeFi operations.', icon: '⚔️', color: '#0ff' },
    LATTICE_PROPHET: { id: 'LATTICE_PROPHET', title: 'Lattice Prophet', desc: 'Simulated a future transaction state using the on-chain prophecy engine.', icon: '🔮', color: '#f0f' },
    VAULT_MASTER: { id: 'VAULT_MASTER', title: 'Vault Master', desc: 'Secured the sovereign identity with AES-256-GCM encryption.', icon: '🔐', color: '#f0f' },
    LATTICE_ZENITH: { id: 'LATTICE_ZENITH', title: 'Lattice Zenith', desc: 'Achieved total Merkle-verified consensus across the sovereign network.', icon: '🏔️', color: '#0f0' },
    LATTICE_RECONCILER: { id: 'LATTICE_RECONCILER', title: 'Lattice Reconciler', desc: 'Performed a full cryptographic audit of the network ledger history.', icon: '🗄️', color: '#ff0' },
    LATTICE_ARCHITECT: { id: 'LATTICE_ARCHITECT', title: 'Lattice Architect', desc: 'Bootstrapped a node using high-performance binary state snapshots.', icon: '🏗️', color: '#0ff' },
    LATTICE_UNIFIER: { id: 'LATTICE_UNIFIER', title: 'Lattice Unifier', desc: 'Bridged heterogeneous client runtimes in perfect Merkle consensus.', icon: '🌉', color: '#0ff' },
    LATTICE_VISIONARY: { id: 'LATTICE_VISIONARY', title: 'Lattice Visionary', desc: 'Visualized the global P2P consensus mesh in the Matrix.', icon: '🕸️', color: '#ff0055' },
    PORTFOLIO_MASTER: { id: 'PORTFOLIO_MASTER', title: 'Portfolio Master', desc: 'Successfully aggregated total wealth across the sovereign HD hierarchy.', icon: '📊', color: '#0f0' },
    LATTICE_TREASURER: { id: 'LATTICE_TREASURER', title: 'Lattice Treasurer', desc: 'Managed assets and performed DeFi operations across multiple sub-accounts.', icon: '💰', color: '#ff0' },
    LATTICE_LEGEND: { id: 'LATTICE_LEGEND', title: 'Lattice Legend', desc: 'Witnessed the Sovereign Singularity and initialized the full OS boot sequence.', icon: '🎆', color: '#f0f' },
    LATTICE_HISTORIAN: { id: 'LATTICE_HISTORIAN', title: 'Lattice Historian', desc: 'Archived the global network state to a portable snapshot.', icon: '🏛️', color: '#ff0' },
    CLIENT_DIVERSIFIER: { id: 'CLIENT_DIVERSIFIER', title: 'Client Diversifier', desc: 'Maintained network consensus across multiple client types.', icon: '🌉', color: '#f0f' },
    MOBILE_WARRIOR: { id: 'MOBILE_WARRIOR', title: 'Mobile Warrior', desc: 'Deployed the Sovereign Arcade on a handheld device.', icon: '📱', color: '#0ff' },
};

export async function checkAndUnlock(achievementId, keypair, existingChain = []) {
    // 1. Check if already unlocked on-chain
    const alreadyUnlocked = existingChain.some(b => b.type === 'achievement_unlock' && b.payload?.id === achievementId);
    if (alreadyUnlocked) return false;

    console.log(`[Achievement Engine] UNLOCKING: ${achievementId}`);

    try {
        // 2. Fetch current chain state
        const frontierData = await getLatticeFrontier(keypair.publicKey);
        const previous = frontierData.frontier || null;
        const balance = 0; // Achievement blocks are metadata-only (0 balance change)
        
        // Use current balance if available
        const currentBalance = existingChain.length > 0 ? existingChain[existingChain.length-1].balance : 0;

        // 3. Create achievement_unlock block
        const block = new Block({
            type: 'achievement_unlock',
            account: keypair.publicKey,
            previous: previous,
            balance: currentBalance,
            link: 'SYSTEM_ACHIEVEMENT',
            payload: ACHIEVEMENTS[achievementId]
        });

        // 4. Sign and broadcast
        block.sign(keypair.privateKey);
        const result = await submitLatticeBlock(block);
        
        if (result.success) {
            playBlockConfirmedSound();
            return true;
        }
    } catch (e) {
        console.error(`[Achievement Engine] Failed to unlock ${achievementId}`, e);
    }
    return false;
}
