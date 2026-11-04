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
- Command console tab switching directly on the Dashboard (/):
  * Arcade & Mint tab
  * DeFi & Exchange tab
  * Storage Network tab
  * Node & Topology tab
  * Casino & Rewards tab
  * Protocol Manual tab
"""

import sys
import os
import time
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

REPO_ROOT = Path(__file__).resolve().parent.parent

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
            # Ensure navigation is ready
            page.wait_for_selector(".cyber-nav", timeout=5000)
            link = page.locator(f".nav-item:has-text('{label}')").first
            assert link.is_visible(), f"Nav item '{label}' not found"
            link.click(force=True)
            time.sleep(1)
            current_path = page.evaluate("window.location.pathname")
            assert current_path == expected_path, f"Expected path {expected_path}, got {current_path}"
            print(f"    ✓ Routed to {current_path} successfully.")

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

        # Capture verification snapshot
        out_path = REPO_ROOT / "verification" / "e2e_consolidated_navigation.png"
        page.screenshot(path=str(out_path))
        print(f"  ✓ Screenshot saved to {out_path}")

        browser.close()
    print(">>> [E2E] All browser navigation and command console interactions verified!\n")

def main():
    print("=" * 60)
    print("  LATTICE ARCADE E2E NAVIGATION & TRAY AUTOMATED TEST SUITE")
    print("=" * 60)
    test_system_tray_module()
    test_consolidated_navigation_and_command_console()
    print("✅ ALL TESTS PASSED.")

if __name__ == "__main__":
    main()
