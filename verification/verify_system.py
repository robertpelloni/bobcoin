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
            print("Navigating to System Status...")
            page.goto("http://localhost:5173/system", timeout=60000)
            page.wait_for_selector(".system-status-container", timeout=30000)
            time.sleep(2)
            page.screenshot(path="verification/system_status.png")
            print("System Status screenshot taken.")
        except Exception as e:
            print(f"System Status failed: {e}")

        browser.close()

if __name__ == "__main__":
    if not os.path.exists("verification"):
        os.makedirs("verification")
    run()
