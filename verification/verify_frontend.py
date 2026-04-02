from playwright.sync_api import sync_playwright
import time
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Capture logs
        page.on("console", lambda msg: print(f"BROWSER LOG: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"BROWSER ERROR: {exc}"))

        # Wait for dev server
        time.sleep(2)

        try:
            print("Navigating to Dashboard...")
            page.goto("http://localhost:5173/", timeout=60000)
            page.wait_for_selector(".game-header", timeout=30000)
            time.sleep(2)
            page.screenshot(path="verification/dashboard.png")
            print("Dashboard screenshot taken.")
        except Exception as e:
            print(f"Dashboard failed: {e}")

        try:
            print("Navigating to Supernode...")
            page.goto("http://localhost:5173/supernode", timeout=60000)
            page.wait_for_selector(".supernode-controls", timeout=30000)
            time.sleep(2)
            page.screenshot(path="verification/supernode.png")
            print("Supernode screenshot taken.")
        except Exception as e:
            print(f"Supernode failed: {e}")

        try:
            print("Navigating to Manual...")
            page.goto("http://localhost:5173/manual", timeout=60000)
            page.wait_for_selector(".manual-content", timeout=30000)
            time.sleep(2)
            page.screenshot(path="verification/manual.png")
            print("Manual screenshot taken.")
        except Exception as e:
            print(f"Manual failed: {e}")

        browser.close()

if __name__ == "__main__":
    if not os.path.exists("verification"):
        os.makedirs("verification")
    run()
