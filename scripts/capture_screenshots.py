import os
import time
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC

os.makedirs('screenshots', exist_ok=True)

opts = Options()
opts.add_argument('--headless=new')
opts.add_argument('--window-size=430,1080')
opts.add_argument('--disable-gpu')
opts.add_argument('--no-sandbox')

driver = webdriver.Edge(options=opts)
wait = WebDriverWait(driver, 10)

def js_click(elem):
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", elem)
    time.sleep(0.3)
    driver.execute_script("arguments[0].click();", elem)

try:
    print('1. Capturing Dashboard Screenshot...')
    driver.get('http://localhost:4173/#dashboard')
    wait.until(EC.presence_of_element_located((By.ID, 'dashboard-stats')))
    time.sleep(2)
    driver.save_screenshot('screenshots/01-dashboard.png')
    print('[OK] Saved screenshots/01-dashboard.png')

    print('2. Navigating to New Inspection Wizard...')
    driver.get('http://localhost:4173/#new')
    time.sleep(1.5)

    # Fill Step 1
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

    # Step 2: Select Projector
    cat = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-cat-id="Projector"]')))
    js_click(cat)
    time.sleep(0.5)

    next_btn = driver.find_element(By.ID, 'btn-wizard-next')
    js_click(next_btn)
    time.sleep(1)

    # Step 3: Select 4 Stars
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

    # Click quick tag
    quick_tag = driver.find_element(By.CSS_SELECTOR, '.note-tag')
    js_click(quick_tag)
    time.sleep(0.5)

    driver.save_screenshot('screenshots/02-inspection-form.png')
    print('[OK] Saved screenshots/02-inspection-form.png')

    # Advance to Step 5 (Photo) and Step 6 (Review)
    next_btn = driver.find_element(By.ID, 'btn-wizard-next')
    js_click(next_btn)
    time.sleep(1)

    next_btn = driver.find_element(By.ID, 'btn-wizard-next')
    js_click(next_btn)
    time.sleep(1)

    print('3. Simulating Offline Mode and Queuing Submission...')
    driver.get('http://localhost:4173/#settings')
    time.sleep(1.5)
    offline_btn = driver.find_element(By.ID, 'btn-force-offline')
    js_click(offline_btn)
    time.sleep(1)

    # Go back to inspection review and submit while offline
    driver.get('http://localhost:4173/#new')
    time.sleep(1.5)
    submit_btn = driver.find_element(By.ID, 'btn-wizard-submit')
    js_click(submit_btn)
    time.sleep(2)

    # Navigate to Queue
    driver.get('http://localhost:4173/#queue')
    time.sleep(2)
    driver.save_screenshot('screenshots/03-offline-pending.png')
    print('[OK] Saved screenshots/03-offline-pending.png')

    print('4. Restoring Online Connectivity and Synchronizing Queue...')
    driver.get('http://localhost:4173/#settings')
    time.sleep(1.5)
    online_btn = driver.find_element(By.ID, 'btn-force-online')
    js_click(online_btn)
    time.sleep(1)

    driver.get('http://localhost:4173/#queue')
    time.sleep(1.5)
    sync_btn = driver.find_element(By.ID, 'btn-sync-now')
    if sync_btn.is_enabled():
        js_click(sync_btn)
        print('Dispatched sync, waiting for sequential processing...')
        time.sleep(4)

    driver.save_screenshot('screenshots/04-sync-success.png')
    print('[OK] Saved screenshots/04-sync-success.png')
    print('All screenshots captured successfully!')

finally:
    driver.quit()
