from playwright.sync_api import sync_playwright
import time
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Wait for dev server
        time.sleep(5)

        # 1. Dashboard
        try:
            page.goto("http://localhost:5173/")
            page.wait_for_selector(".game-container", timeout=10000)
            page.screenshot(path="verification/dashboard.png")
            print("Dashboard screenshot taken.")
        except Exception as e:
            print(f"Dashboard failed: {e}")

        # 2. Supernode
        try:
            page.goto("http://localhost:5173/supernode")
            page.wait_for_selector(".supernode-container", timeout=10000)
            # Wait for data to load if possible
            time.sleep(2)
            page.screenshot(path="verification/supernode.png")
            print("Supernode screenshot taken.")
        except Exception as e:
            print(f"Supernode failed: {e}")

        # 3. Wallet
        try:
            page.goto("http://localhost:5173/wallet")
            page.wait_for_selector(".wallet-container", timeout=10000)
            page.screenshot(path="verification/wallet.png")
            print("Wallet screenshot taken.")
        except Exception as e:
            print(f"Wallet failed: {e}")

        # 4. Governance
        try:
            page.goto("http://localhost:5173/governance")
            page.wait_for_selector(".governance-container", timeout=10000)
            page.screenshot(path="verification/governance.png")
            print("Governance screenshot taken.")
        except Exception as e:
            print(f"Governance failed: {e}")

        # 5. Manual
        try:
            page.goto("http://localhost:5173/manual")
            page.wait_for_selector(".manual-container", timeout=10000)
            page.screenshot(path="verification/manual.png")
            print("Manual screenshot taken.")
        except Exception as e:
            print(f"Manual failed: {e}")

        browser.close()

if __name__ == "__main__":
    if not os.path.exists("verification"):
        os.makedirs("verification")
    run()
