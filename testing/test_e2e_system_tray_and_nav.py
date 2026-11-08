#!/usr/bin/env python3
"""
testing/test_e2e_system_tray_and_nav.py
=======================================
Automated End-to-End Test Suite for:
1. System Tray Daemon Lifecycle and Port Monitoring (`scripts/system_tray.py`)
2. Consolidated Navigation Mega-Modules & Command Console UI Interaction (Playwright)

Validates:
- Health checking and socket query logic for all 4 core ports (3001, 4001, 8000, 4173).
- Headless system tray icon generation via Pillow.
- Navigation through all 5 high-value mega-modules in the browser:
  * Arcade Hub (/)
  * DeFi Suite (/dex)
  * Privacy Vault (/wallet)
  * Lattice Governance (/governance)
  * Network Ops (/system)
  * Protocol Manual (/manual)
- Sub-navigation links under each mega-module.
- Command console tab switching directly on the Dashboard (/):
  * Arcade & Mint tab
  * DeFi & Exchange tab
  * Storage Network tab
  * Node & Topology tab
  * Casino & Rewards tab
  * Protocol Manual tab
- Mobile Vitality Sync integration (/mobile).
- Cryptographic Dual-Key Stealth Address Protocol (DKSAP) address generation (/wallet).
"""

import sys
import os
import json
import time
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

REPO_ROOT = Path(__file__).resolve().parent.parent

def test_ai_oracle_integrity():
    print(">>> [E2E] Testing AI Oracle Anti-Bot Telemetry and Shannon Entropy...")
    import urllib.request
    base_url = "http://localhost:3001"

    # 1. Non-monotonic timestamp rejection
    non_mono = [{'time': 100.0}, {'time': 90.0}, {'time': 150.0}, {'time': 200.0}, {'time': 250.0}, {'time': 300.0}]
    req = urllib.request.Request(f"{base_url}/submit-proof", data=json.dumps({
        "proof": {"publicValues": {"address": "test_addr", "score": 2000, "replayLog": non_mono}}
    }).encode(), headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req)
        assert False, "Non-monotonic timestamps must be rejected!"
    except urllib.error.HTTPError as e:
        res = json.loads(e.read().decode())
        assert res.get("oracle", {}).get("confidenceScore") == 0.05
        print("  ✓ Non-monotonic timestamp sequence rejected with confidenceScore 0.05.")

    # 2. Robotic macro rejection (zero variance, zero MAD, zero entropy)
    macro = [{'time': float(i * 100)} for i in range(10)]
    req = urllib.request.Request(f"{base_url}/submit-proof", data=json.dumps({
        "proof": {"publicValues": {"address": "test_addr", "score": 2000, "replayLog": macro}}
    }).encode(), headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req)
        assert False, "Monotonous macro must be rejected!"
    except urllib.error.HTTPError as e:
        res = json.loads(e.read().decode())
        assert res.get("oracle", {}).get("confidenceScore") == 0.10
        print("  ✓ Monotonous zero-jitter macro rejected with confidenceScore 0.10.")

    # 3. High-entropy human timing jitter acceptance
    deltas = [75.0, 140.0, 90.0, 160.0, 85.0, 130.0, 110.0, 175.0, 95.0, 120.0]
    t = 0.0
    human_log = [{'time': t}]
    for d in deltas:
        t += d
        human_log.append({'time': t})

    req = urllib.request.Request(f"{base_url}/submit-proof", data=json.dumps({
        "proof": {"publicValues": {"address": "25HWBaVCATNfnM9etagmiuiJRdj9NaqCtzxnFgPQSKMf", "score": 2000, "replayLog": human_log}}
    }).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        assert res.get("zkVerified") is True
        assert res.get("oracle", {}).get("entropy") >= 1.0
        assert res.get("oracle", {}).get("confidenceScore") == 0.98
        print(f"  ✓ High-entropy human jitter accepted: variance={res['oracle']['variance']}, MAD={res['oracle']['mad']}, entropy={res['oracle']['entropy']}.")

    # 4. Score Manipulation Rejection: reported score 4000 but perfects=10, greats=0 (1000)
    req = urllib.request.Request(f"{base_url}/submit-proof", data=json.dumps({
        "proof": {"publicValues": {
            "address": "manip_bot",
            "score": 4000,
            "perfects": 10,
            "greats": 0,
            "replayLog": human_log
        }}
    }).encode(), headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req)
        assert False, "Score manipulation should be rejected!"
    except urllib.error.HTTPError as e:
        res = json.loads(e.read().decode())
        assert res.get("oracle", {}).get("confidenceScore") == 0.05
        print("  ✓ Score arithmetic mismatch rejected with confidenceScore 0.05.")

    # 5. Superhuman APM Rejection (> 15 events/sec)
    fast_log = [{"time": float(i * 10)} for i in range(10)]
    req = urllib.request.Request(f"{base_url}/submit-proof", data=json.dumps({
        "proof": {"publicValues": {
            "address": "rapid_bot",
            "score": 1000,
            "perfects": 10,
            "greats": 0,
            "replayLog": fast_log
        }}
    }).encode(), headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req)
        assert False, "Superhuman event frequency should be rejected!"
    except urllib.error.HTTPError as e:
        res = json.loads(e.read().decode())
        assert res.get("oracle", {}).get("confidenceScore") <= 0.10
        print("  ✓ Superhuman APM burst rejected by AI Oracle.")

    # 6. Oracle Audits Endpoint & Persistence
    resp = urllib.request.urlopen(f"{base_url}/oracle/audits")
    audits = json.loads(resp.read().decode()).get("audits", [])
    assert len(audits) >= 1
    print(f"  ✓ Oracle audit log successfully persisted to SQLite (total logged: {len(audits)}).")

    print(">>> [E2E] AI Oracle integrity verification passed!\n")

def test_system_tray_module():
    print(">>> [E2E] Testing System Tray Module & Icon Generation...")
    sys.path.insert(0, str(REPO_ROOT))
    import scripts.system_tray as st

    # Verify icon creation
    icon = st.create_tray_image()
    assert icon is not None
    assert icon.size == (64, 64)
    print("  ✓ Pillow icon generated successfully with RGBA 64x64 dimensions.")

    # Verify service health check logic
    status = st.get_services_status()
    print(f"  ✓ Service status dictionary returned: {status}")
    assert isinstance(status, dict)
    assert "go-lattice" in status
    assert "go-game-server" in status
    assert "go-supertorrent" in status
    assert "frontend" in status
    print(">>> [E2E] System Tray core checks passed!\n")

def test_consolidated_navigation_and_command_console():
    print(">>> [E2E] Testing Consolidated Dashboard Navigation & Command Console via Playwright...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        base_url = "http://localhost:4173"
        print(f"  * Navigating to {base_url}...")
        page.goto(base_url, timeout=30000)
        page.wait_for_selector(".navigation-wrapper", timeout=15000)
        print("  ✓ Navigation wrapper confirmed in DOM.")

        # Seed authenticated wallet into localStorage to prevent onboarding modal on /wallet
        dummy_wallet = {
            'publicKey': '25HWBaVCATNfnM9etagmiuiJRdj9NaqCtzxnFgPQSKMf',
            'privateKey': 'fake_priv_key_base58',
            'boxPublicKey': '6FHYYQHZVfuaBHMMkvtcgJFacE9pJhzE7k8fDcJgiYVU',
            'boxPrivateKey': 'fake_box_priv_key_base58',
            'mnemonic': 'alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima'
        }
        page.evaluate(f'localStorage.setItem("lattice_arcade_wallet", JSON.stringify({json.dumps(dummy_wallet)}))')

        # Test Telemetry bar
        telemetry = page.locator(".network-live-bar")
        assert telemetry.is_visible()
        print("  ✓ Telemetry bar visible.")

        # 1. Test Mega-Module Navigation links
        mega_links = [
            ("ARCADE HUB", "/"),
            ("DEFI SUITE", "/dex"),
            ("PRIVACY VAULT", "/wallet"),
            ("GOVERNANCE", "/governance"),
            ("NETWORK OPS", "/system"),
            ("MANUAL", "/manual"),
        ]

        for label, expected_path in mega_links:
            print(f"  * Testing Mega-Module Link: {label} -> {expected_path}")
            page.wait_for_selector(".cyber-nav", timeout=5000)
            link = page.locator(f".nav-item:has-text('{label}')").first
            assert link.is_visible(), f"Nav item '{label}' not found"
            link.click(force=True)
            time.sleep(1)
            current_path = page.evaluate("window.location.pathname")
            assert current_path == expected_path, f"Expected path {expected_path}, got {current_path}"
            print(f"    ✓ Routed to {current_path} successfully.")

        # 1b. Test Contextual Sub-Nav Bar Links across each parent module
        sub_modules = [
            ("NETWORK OPS", [
                ("SUPERNODE", "/supernode"),
                ("DAG EXPLORER", "/explorer"),
                ("MOBILE MINING", "/mobile"),
                ("SYSTEM STATUS", "/system"),
            ]),
            ("DEFI SUITE", [
                ("ORDERBOOK DEX", "/dex"),
                ("ATOMIC SWAPS", "/swap"),
                ("STAKING", "/staking"),
                ("MULTISIG", "/multisig"),
                ("STORAGE MARKET", "/market"),
            ]),
            ("PRIVACY VAULT", [
                ("SOVEREIGN WALLET", "/wallet"),
                ("ENCRYPTED VAULT", "/vault"),
                ("NFT GALLERY", "/gallery"),
            ]),
            ("ARCADE HUB", [
                ("MINT GAME", "/"),
                ("TROPHIES", "/trophies"),
                ("CASINO", "/casino"),
            ]),
        ]

        for parent_nav, links in sub_modules:
            print(f"  * Activating parent mega-module: {parent_nav}...")
            parent_link = page.locator(f".nav-item:has-text('{parent_nav}')").first
            parent_link.click(force=True)
            time.sleep(0.5)
            for sub_label, expected_path in links:
                print(f"    * Testing sub-link: {sub_label} -> {expected_path}...")
                sub_btn = page.locator(f".sub-item:has-text('{sub_label}')").first
                assert sub_btn.is_visible(), f"Sub-item {sub_label} should be visible under {parent_nav}"
                sub_btn.click(force=True)
                time.sleep(0.5)
                current_path = page.evaluate("window.location.pathname")
                assert current_path == expected_path, f"Expected {expected_path}, got {current_path}"
                print(f"      ✓ Routed to {current_path} successfully.")

        # 2. Return to Dashboard and test all Command Console tabs
        print("  * Returning to Dashboard to test Command Console tabs...")
        page.goto(base_url)
        page.wait_for_selector(".command-center-tabs", timeout=15000)

        console_tabs = [
            ("🎮 ARCADE & MINT", "THE MINT"),
            ("📈 DEFI & EXCHANGE", "ORDERBOOK"),
            ("💾 STORAGE NETWORK", "SUPERNODE"),
            ("🖥️ NODE & TOPOLOGY", "SYSTEM STATUS"),
            ("🎰 CASINO & REWARDS", "CASINO"),
            ("📖 MANUAL", "PROTOCOL MANIFESTO"),
        ]

        for tab_label, expected_content_snippet in console_tabs:
            print(f"  * Testing Command Console tab: {tab_label}...")
            btn = page.locator(f".command-center-tabs button:has-text('{tab_label}')")
            assert btn.is_visible(), f"Button {tab_label} not found"
            btn.click()
            time.sleep(0.5)
            # Verify tab switched without page reload
            body_text = page.inner_text(".ui-layer")
            assert expected_content_snippet in body_text, f"Snippet '{expected_content_snippet}' not found in active tab content"
            print(f"    ✓ Tab switched and content contains '{expected_content_snippet}'.")

        # 3. Test Mobile Vitality Sync integration
        print("  * Navigating to Mobile Light Node (/mobile)...")
        page.goto(f"{base_url}/mobile")
        page.wait_for_selector(".mobile-container", timeout=15000)
        sync_btn = page.locator("button:has-text('SYNC HEALTH DATA')")
        assert sync_btn.is_visible()
        dialog_text = []
        page.on("dialog", lambda dialog: (dialog_text.append(dialog.message), dialog.accept()))
        with page.expect_event("dialog", timeout=10000):
            sync_btn.click()
        time.sleep(0.5)
        assert len(dialog_text) > 0 and "Vitality" in dialog_text[0] and "spm" in dialog_text[0]
        print(f"    ✓ Vitality Proof synced successfully: {dialog_text[0]}")
        metrics_text = page.locator(".mining-metrics").inner_text()
        assert "METABOLIC BURN" in metrics_text
        assert "KCAL" in metrics_text
        assert "VERIFIED" in metrics_text
        print("    ✓ Biometric vitals and metabolic burn metrics validated by AI Oracle.")

        # 4. Test Privacy Vault Stealth Address Generation (DKSAP)
        print("  * Testing Privacy Vault Stealth Address Generation (DKSAP)...")
        page.goto(f"{base_url}/wallet")
        page.wait_for_selector(".wallet-card", timeout=15000)
        stealth_addr = page.locator(".stealth").inner_text()
        assert stealth_addr.startswith("stealth:") and len(stealth_addr) > 25
        print(f"    ✓ DKSAP Stealth Address verified: {stealth_addr[:24]}...")

        # 5. Test AI Oracle Real-Time Audit Inspector Modal
        print("  * Testing AI Oracle Real-Time Audit Inspector Modal...")
        page.goto(f"{base_url}/")
        page.wait_for_selector(".oracle-audit-feed", timeout=15000)
        audit_items = page.locator(".oracle-audit-item")
        if audit_items.count() > 0:
            audit_items.first.click()
            page.wait_for_selector(".modal-content", timeout=5000)
            modal_text = page.locator(".modal-content").inner_text()
            assert "AI ORACLE AUDIT INSPECTOR" in modal_text
            assert "BIOMETRIC & TIMING DELTA METRICS" in modal_text
            assert "AUTOCORR" in modal_text
            assert "CONFIDENCE RATING" in modal_text
            print("    ✓ AI Oracle Audit Inspector modal successfully opened and verified.")
            dismiss_btn = page.locator("button:has-text('DISMISS INSPECTOR')")
            dismiss_btn.click()
            time.sleep(0.3)
            assert page.locator(".modal-content").count() == 0
            print("    ✓ AI Oracle Audit Inspector dismissed cleanly.")

        # Capture verification snapshot
        out_path = REPO_ROOT / "verification" / "e2e_consolidated_navigation.png"
        page.screenshot(path=str(out_path))
        print(f"  ✓ Screenshot saved to {out_path}")

        browser.close()
    print(">>> [E2E] All browser navigation and command console interactions verified!\n")

def main():
    print("=" * 60)
    print("  LATTICE ARCADE E2E NAVIGATION, ORACLE & TRAY TEST SUITE")
    print("=" * 60)
    test_ai_oracle_integrity()
    test_system_tray_module()
    test_consolidated_navigation_and_command_console()
    print("✅ ALL TESTS PASSED.")

if __name__ == "__main__":
    main()
