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
            page.goto("http://localhost:5173/", timeout=60000)
            # Wait for any content, effectively
            page.wait_for_selector("#root", timeout=30000)
            time.sleep(2) # Give React time to hydrate
            page.screenshot(path="verification/dashboard.png")
            print("Dashboard screenshot taken.")
        except Exception as e:
            print(f"Dashboard failed: {e}")

        # 2. Supernode
        try:
            page.goto("http://localhost:5173/supernode")
            page.wait_for_selector(".supernode-container", timeout=30000)
            time.sleep(2)
            page.screenshot(path="verification/supernode.png")
            print("Supernode screenshot taken.")
        except Exception as e:
            print(f"Supernode failed: {e}")

        # 3. Wallet
        try:
            page.goto("http://localhost:5173/wallet")
            page.wait_for_selector(".wallet-container", timeout=30000)
            page.screenshot(path="verification/wallet.png")
            print("Wallet screenshot taken.")
        except Exception as e:
            print(f"Wallet failed: {e}")

        # 4. Governance
        try:
            page.goto("http://localhost:5173/governance")
            page.wait_for_selector(".governance-container", timeout=30000)
            page.screenshot(path="verification/governance.png")
            print("Governance screenshot taken.")
        except Exception as e:
            print(f"Governance failed: {e}")

        browser.close()

if __name__ == "__main__":
    if not os.path.exists("verification"):
        os.makedirs("verification")
    run()
