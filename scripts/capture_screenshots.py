import os
import sys
import time
import subprocess
import urllib.request
import urllib.error
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC

def find_edge_path():
    candidates = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    ]
    for path in candidates:
        if os.path.isfile(path):
            return path

    # Fallback to PATH search via 'where msedge' on Windows
    try:
        result = subprocess.run(['where', 'msedge'], capture_output=True, text=True, check=True)
        paths = result.stdout.strip().splitlines()
        if paths and os.path.isfile(paths[0]):
            return paths[0]
    except Exception:
        pass

    raise FileNotFoundError("Microsoft Edge executable (msedge.exe) not found on system.")

def wait_for_server(url, timeout=25):
    start = time.time()
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                if response.status == 200:
                    return True
        except Exception:
            time.sleep(0.5)
    return False

def main():
    edge_executable = find_edge_path()
    print(f"[EDGE] Using Microsoft Edge executable: {edge_executable}")

    preview_url = "http://localhost:4173"
    server_process = None

    # Verify if production build exists
    if not os.path.isfile("dist/index.html"):
        print("[BUILD] dist/index.html not found. Running 'npm run build'...")
        subprocess.run(["npm.cmd", "run", "build"], check=True)

    # Check if preview server is already running
    is_running = False
    try:
        with urllib.request.urlopen(preview_url, timeout=1) as resp:
            if resp.status == 200:
                is_running = True
                print(f"[PREVIEW] Production preview already active at {preview_url}")
    except Exception:
        pass

    if not is_running:
        print(f"[PREVIEW] Starting Vite production preview on port 4173...")
        server_process = subprocess.Popen(
            ["npx.cmd", "--yes", "vite", "preview", "--port", "4173", "--host", "localhost"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        if not wait_for_server(preview_url, timeout=25):
            if server_process:
                server_process.kill()
            raise RuntimeError(f"Failed to connect to preview server at {preview_url} within timeout.")
        print(f"[PREVIEW] Server successfully responding at {preview_url}")

    os.makedirs('screenshots', exist_ok=True)

    # Configure Edge options with mobile viewport 390x844
    opts = Options()
    opts.binary_location = edge_executable
    opts.add_argument('--headless=new')
    opts.add_argument('--window-size=390,844')
    opts.add_argument('--disable-gpu')
    opts.add_argument('--no-sandbox')
    opts.add_argument('--disable-dev-shm-usage')

    print("[SELENIUM] Initializing Edge WebDriver...")
    driver = webdriver.Edge(options=opts)
    wait = WebDriverWait(driver, 12)

    # Force exact 390x844 mobile viewport via Chrome/Edge DevTools Protocol (CDP)
    driver.execute_cdp_cmd('Emulation.setDeviceMetricsOverride', {
        'width': 390,
        'height': 844,
        'deviceScaleFactor': 1,
        'mobile': True
    })

    def js_click(elem):
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", elem)
        time.sleep(0.3)
        driver.execute_script("arguments[0].click();", elem)

    try:
        # 1. Dashboard
        print("1. Capturing Dashboard Screenshot...")
        driver.get(f"{preview_url}/#dashboard")
        wait.until(EC.presence_of_element_located((By.ID, 'dashboard-stats')))
        time.sleep(2)
        driver.save_screenshot('screenshots/01-dashboard.png')
        print("[OK] Saved screenshots/01-dashboard.png")

        # 2. Inspection Wizard
        print("2. Navigating to New Inspection Wizard...")
        driver.get(f"{preview_url}/#new")
        time.sleep(1.5)

        # Step 1: Location
        wait.until(EC.presence_of_element_located((By.ID, 'input-building')))
        Select(driver.find_element(By.ID, 'input-building')).select_by_index(1)
        time.sleep(0.3)
        Select(driver.find_element(By.ID, 'input-floor')).select_by_index(1)
        time.sleep(0.3)
        driver.find_element(By.ID, 'input-room').send_keys('A1-203')
        time.sleep(0.5)

        next_btn = driver.find_element(By.ID, 'btn-wizard-next')
        js_click(next_btn)
        time.sleep(1)

        # Step 2: Category
        cat = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-cat-id="Projector"]')))
        js_click(cat)
        time.sleep(0.5)

        next_btn = driver.find_element(By.ID, 'btn-wizard-next')
        js_click(next_btn)
        time.sleep(1)

        # Step 3: Condition (Rating)
        star = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-rating="4"]')))
        js_click(star)
        time.sleep(0.5)

        next_btn = driver.find_element(By.ID, 'btn-wizard-next')
        js_click(next_btn)
        time.sleep(1)

        # Step 4: Notes
        notes = wait.until(EC.presence_of_element_located((By.ID, 'input-defect-notes')))
        notes.send_keys('HDMI cable connector loose; projector lamp lumens normal.')
        time.sleep(0.5)

        quick_tag = driver.find_element(By.CSS_SELECTOR, '.note-tag')
        js_click(quick_tag)
        time.sleep(0.5)

        driver.save_screenshot('screenshots/02-inspection-form.png')
        print("[OK] Saved screenshots/02-inspection-form.png")

        # Advance to Step 5 (Photo) and Step 6 (Review)
        next_btn = driver.find_element(By.ID, 'btn-wizard-next')
        js_click(next_btn)
        time.sleep(1)

        next_btn = driver.find_element(By.ID, 'btn-wizard-next')
        js_click(next_btn)
        time.sleep(1)

        # 3. Simulate Offline Mode and Queue Submission
        print("3. Simulating Offline Mode and Queuing Submission...")
        driver.get(f"{preview_url}/#settings")
        time.sleep(1.5)
        offline_btn = driver.find_element(By.ID, 'btn-force-offline')
        js_click(offline_btn)
        time.sleep(1)

        # Go back to inspection review and submit while offline
        driver.get(f"{preview_url}/#new")
        time.sleep(1.5)
        submit_btn = driver.find_element(By.ID, 'btn-wizard-submit')
        js_click(submit_btn)
        time.sleep(2)

        # Navigate to Queue
        driver.get(f"{preview_url}/#queue")
        time.sleep(2)
        driver.save_screenshot('screenshots/03-offline-pending.png')
        print("[OK] Saved screenshots/03-offline-pending.png")

        # 4. Restore Online Connectivity and Synchronize
        print("4. Restoring Online Connectivity and Synchronizing Queue...")
        driver.get(f"{preview_url}/#settings")
        time.sleep(1.5)
        online_btn = driver.find_element(By.ID, 'btn-force-online')
        js_click(online_btn)
        time.sleep(1)

        driver.get(f"{preview_url}/#queue")
        time.sleep(1.5)
        sync_btn = driver.find_element(By.ID, 'btn-sync-now')
        if sync_btn.is_enabled():
            js_click(sync_btn)
            print("Dispatched sync, waiting for sequential processing...")
            time.sleep(5)

        driver.save_screenshot('screenshots/04-sync-success.png')
        print("[OK] Saved screenshots/04-sync-success.png")
        print("\nAll 4 screenshots captured successfully with Microsoft Edge!")

    finally:
        print("[CLEANUP] Closing Edge WebDriver...")
        try:
            driver.quit()
        except Exception:
            pass

        if server_process:
            print("[CLEANUP] Terminating preview server process...")
            server_process.kill()

if __name__ == '__main__':
    main()
