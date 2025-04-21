import os
import requests
import json
import time
import random
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

# Configuration
RETRY_ATTEMPTS = 3
RETRY_DELAY = 2
SKIPPED_LOG = "skipped_files.txt"
FAILED_LOG = "failed_files.txt"
MAX_WORKERS = 10  # Adjust based on performance/testing
MIN_DELAY = 0.1  # In seconds
MAX_DELAY = 0.3

# Thread-safe logging
log_lock = Lock()

# Optional: Spoof browser headers
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123.0 Safari/537.36"
}

def sanitize_filename(name):
    return name.lower().replace(" ", "-")

def log_to_file(filename, line):
    with log_lock:
        with open(filename, "a", encoding="utf-8") as f:
            f.write(line + "\n")

def download_with_retries(url, filepath):
    for attempt in range(1, RETRY_ATTEMPTS + 1):
        try:
            response = requests.get(url, headers=HEADERS, timeout=10)
            response.raise_for_status()
            with open(filepath, 'wb') as f:
                f.write(response.content)
            return True
        except requests.RequestException as e:
            if attempt < RETRY_ATTEMPTS:
                time.sleep(RETRY_DELAY * (2 ** (attempt - 1)))
            else:
                return str(e)
    return False

def prepare_download_tasks(yoyos):
    tasks = []
    for yoyo in yoyos:
        model = sanitize_filename(yoyo["model"])
        colorway = sanitize_filename(yoyo["colorway"])
        base_dir = os.path.join("assets", model)
        os.makedirs(base_dir, exist_ok=True)

        for idx, img_url in enumerate(yoyo["images"]):
            suffix = f"_{idx+1}" if idx > 0 else ""
            filename = f"{model}_{colorway}{suffix}.jpg"
            filepath = os.path.join(base_dir, filename)
            tasks.append((img_url, filepath))
    return tasks

def handle_download_task(task):
    img_url, filepath = task

    # Add slight delay to mimic human browsing behavior
    time.sleep(random.uniform(MIN_DELAY, MAX_DELAY))

    if os.path.exists(filepath):
        log_to_file(SKIPPED_LOG, filepath)
        return f"Skipped (exists): {filepath}"

    result = download_with_retries(img_url, filepath)
    if result is True:
        return f"Saved: {filepath}"
    else:
        log_to_file(FAILED_LOG, f"{img_url} | {result}")
        return f"Failed: {img_url} -> {result}"

def download_images_concurrently(yoyos):
    tasks = prepare_download_tasks(yoyos)

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = [executor.submit(handle_download_task, task) for task in tasks]
        for f in tqdm(as_completed(futures), total=len(futures), desc="Downloading Images"):
            result = f.result()
            tqdm.write(result)

# Load and start
if __name__ == "__main__":
    with open("yoyos.json", "r", encoding="utf-8") as f:
        yoyo_data = json.load(f)

    download_images_concurrently(yoyo_data)
