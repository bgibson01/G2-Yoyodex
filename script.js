// Debug flags
const DEBUG = true; // Master switch
const DEBUG_PWA = false;
const DEBUG_CACHE = true;
const DEBUG_DATA = false;
const DEBUG_UI = false;
const DEBUG_MODAL = false;
const DEBUG_INSTALL = false;
const DEBUG_NETWORK = false;

function debugLog(area, ...args) {
  if (!DEBUG) return;
  const enabled = {
    pwa: DEBUG_PWA,
    cache: DEBUG_CACHE,
    data: DEBUG_DATA,
    ui: DEBUG_UI,
    modal: DEBUG_MODAL,
    install: DEBUG_INSTALL,
    network: DEBUG_NETWORK,
  };
  if (enabled[area]) {
    console.log(...args);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Ensure APP_CONFIG is loaded
  if (!window.APP_CONFIG) {
    console.error('APP_CONFIG not loaded. Make sure config.js is loaded before script.js');
    return;
  }

  // Initialize CONFIG object
  const CONFIG = {
    yoyosDataUrl: window.APP_CONFIG.API.YOYOS_URL,
    specsDataUrl: window.APP_CONFIG.API.SPECS_URL,
    placeholderImage: window.APP_CONFIG.ASSETS.PLACEHOLDER_IMAGE
  };

  // Initialize CACHE_CONFIG object
  const CACHE_CONFIG = {
    yoyosCacheKey: `${window.APP_CONFIG.APP_NAME}_${window.APP_CONFIG.CACHE.KEYS.YOYOS}_v${window.APP_CONFIG.VERSION}`,
    specsCacheKey: `${window.APP_CONFIG.APP_NAME}_${window.APP_CONFIG.CACHE.KEYS.SPECS}_v${window.APP_CONFIG.VERSION}`,
    cacheExpiration: window.APP_CONFIG.CACHE.EXPIRATION
  };

  debugLog('data', 'App initialized:', {
    version: window.APP_CONFIG.VERSION,
    name: window.APP_CONFIG.APP_NAME,
    config: CONFIG,
    cacheConfig: CACHE_CONFIG
  });

  // Register service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      debugLog('pwa', 'Registering service worker...');
      
      navigator.serviceWorker.register('sw.js')
        .then(registration => {
          debugLog('pwa', 'Service worker registered:', registration.scope);
          
          // Check for updates every hour
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);

          // Handle service worker updates
          let refreshing = false;
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
              debugLog('pwa', 'New service worker activated, reloading...');
              refreshing = true;
              window.location.reload();
            }
          });

          // Check for updates immediately
          registration.update();
        })
        .catch((err) => {
          console.error('ServiceWorker registration failed:', err);
          // Log more details about the error
          if (err.message) console.error('Error message:', err.message);
          if (err.stack) console.error('Error stack:', err.stack);
        });
    });
  }

  // Add these variables at the top with other state variables
  let installPromptDismissed = false;
  const INSTALL_PROMPT_DISMISSED_KEY = 'install_prompt_dismissed';
  const INSTALL_REMINDER_DELAY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  let pageLoadTime = Date.now();

  // Add display constants
  const DISPLAY_NONE = 'none';
  const DISPLAY_FLEX = 'flex';

  // Check PWA installation criteria
  if (DEBUG_PWA) {
    debugLog('pwa', 'PWA Installation Criteria:', {
      hasServiceWorker: 'serviceWorker' in navigator,
      isHTTPS: window.location.protocol === 'https:',
      hasManifest: document.querySelector('link[rel="manifest"]') !== null,
      isStandalone: window.matchMedia('(display-mode: standalone)').matches,
      displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser',
      userAgent: window.navigator.userAgent
    });
  }

  // Create and setup install button
  let deferredPrompt;
  const installButton = document.createElement('div');
  installButton.style.display = DISPLAY_NONE; // Start hidden
  installButton.className = 'install-button';
  installButton.style.position = 'fixed';
  installButton.style.bottom = '20px';
  installButton.style.left = '20px';
  installButton.style.padding = '10px';
  installButton.style.backgroundColor = '#4CAF50';
  installButton.style.color = 'white';
  installButton.style.border = 'none';
  installButton.style.borderRadius = '5px';
  installButton.style.cursor = 'pointer';
  installButton.style.zIndex = '1000';
  installButton.style.alignItems = 'center';
  installButton.style.gap = '10px';

  // Create the install text
  const installText = document.createElement('span');
  installText.textContent = 'Install App';
  installButton.appendChild(installText);

  // Create the close button
  const closeButton = document.createElement('button');
  closeButton.innerHTML = '×';
  closeButton.className = 'clear-button';
  closeButton.setAttribute('aria-label', 'Dismiss install prompt');
  closeButton.setAttribute('data-tooltip', 'Dismiss install prompt');
  
  // Add click handler to close button
  closeButton.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent event from bubbling up to install button
    confirmModal.classList.remove('hidden'); // Show the confirmation modal
    trackEvent('Engagement', 'Dismiss Install Prompt', 'Show Confirm');
  });

  // Create the confirmation modal
  const confirmModal = document.createElement('div');
  confirmModal.className = 'install-confirm-modal hidden';
  confirmModal.innerHTML = `
    <div class="install-confirm-content">
      <div class="install-confirm-header">
        <h2>Install App</h2>
        <button class="clear-button" id="close-confirm-modal">×</button>
      </div>
      <div class="install-confirm-body">
        <p>Would you like to:</p>
        <div class="install-confirm-actions">
          <button class="gradient-button" id="remind-later">Remind me in 7 days</button>
          <button class="gradient-button" id="never-show">Never show again</button>
        </div>
      </div>
    </div>
  `;

  // Add styles for the confirmation modal
  const style = document.createElement('style');
  style.textContent = `
    .install-confirm-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1001;
    }
    
    .install-confirm-modal.hidden {
      display: none;
    }
    
    .install-confirm-content {
      background: var(--bg-color);
      border-radius: 8px;
      padding: 1rem;
      width: 90%;
      max-width: 320px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    
    .install-confirm-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    
    .install-confirm-header h2 {
      margin: 0;
      font-size: 1.2rem;
    }
    
    .install-confirm-body {
      font-size: 0.9rem;
    }
    
    .install-confirm-actions {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-top: 1rem;
    }
    
    .install-confirm-actions button {
      width: 100%;
      padding: 0.5rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s;
      color: white;
    }
    
    .install-confirm-actions button:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }

    #remind-later {
      background-color: #FFD700;
      color: #333;
    }

    #never-show {
      background-color: #FF4444;
    }
    
    @media (max-width: 640px) {
      .install-confirm-content {
        width: 85%;
        padding: 0.75rem;
      }
      
      .install-confirm-header h2 {
        font-size: 1.1rem;
      }
      
      .install-confirm-body {
        font-size: 0.85rem;
      }
      
      .install-confirm-actions button {
        padding: 0.4rem;
        font-size: 0.85rem;
      }
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(confirmModal);

  // Add click handler
  if (DEBUG_PWA) debugLog('pwa', 'Adding click handler to close button');
  const confirmCloseButton = document.getElementById('close-confirm-modal');
  if (confirmCloseButton) {
    confirmCloseButton.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent triggering the install prompt
      if (DEBUG_PWA) debugLog('pwa', 'Close button clicked');
      confirmModal.classList.add('hidden');
    });
  } else {
    console.warn('Close button not found in DOM');
  }

  // Handle modal actions
  const remindLaterBtn = document.getElementById('remind-later');
  const neverShowBtn = document.getElementById('never-show');
  const cancelDismissBtn = document.getElementById('cancel-dismiss');

  if (remindLaterBtn) {
    remindLaterBtn.addEventListener('click', () => {
      if (DEBUG_PWA) debugLog('pwa', 'Setting reminder for later');
      const timestamp = Date.now();
      localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, timestamp.toString());
      installButton.style.display = DISPLAY_NONE;
      confirmModal.classList.add('hidden');
      trackEvent('Engagement', 'Dismiss Install Prompt', 'Remind Later');
    });
  }

  if (neverShowBtn) {
    neverShowBtn.addEventListener('click', () => {
      if (DEBUG_PWA) debugLog('pwa', 'Never showing again');
      localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, 'never');
      installButton.style.display = DISPLAY_NONE;
      confirmModal.classList.add('hidden');
      trackEvent('Engagement', 'Dismiss Install Prompt', 'Never Show');
    });
  }

  if (cancelDismissBtn) {
    cancelDismissBtn.addEventListener('click', () => {
      if (DEBUG_PWA) debugLog('pwa', 'Cancelled dismissal');
      confirmModal.classList.add('hidden');
      trackEvent('Engagement', 'Dismiss Install Prompt', 'Cancelled');
    });
  }

  // Add button to install prompt
  if (DEBUG_PWA) debugLog('pwa', 'Appending close button to install button');
  installButton.appendChild(closeButton);

  // Add install button to document
  if (DEBUG_PWA) debugLog('pwa', 'Appending install button to document body');
  document.body.appendChild(installButton);

  // Add debug logging for beforeinstallprompt
  if (DEBUG_PWA) {
    debugLog('pwa', 'Setting up beforeinstallprompt listener');
    debugLog('pwa', 'Current display mode:', window.matchMedia('(display-mode: standalone)').matches);
    debugLog('pwa', 'Current standalone:', window.navigator.standalone);
  }

  // Modify the beforeinstallprompt handler
  window.addEventListener('beforeinstallprompt', (e) => {
    if (DEBUG_PWA) {
      debugLog('pwa', 'Install prompt state:', {
        isStandalone: window.matchMedia('(display-mode: standalone)').matches,
        lastDismissed: localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY),
        buttonDisplay: installButton.style.display,
        event: e
      });
    }
    
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    
    // Check if the app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone === true) {
      if (DEBUG_PWA) debugLog('pwa', 'App already installed, hiding install button');
      installButton.style.display = DISPLAY_NONE;
      return;
    }
    
    // Check if we should show the prompt based on previous dismissal
    const lastDismissed = localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY);
    
    // If 'never' was selected, don't show the prompt
    if (lastDismissed === 'never') {
      if (DEBUG_PWA) debugLog('pwa', 'User chose to never show the prompt');
      installButton.style.display = DISPLAY_NONE;
      return;
    }
    
    if (lastDismissed) {
      const timeSinceDismissed = Date.now() - parseInt(lastDismissed);
      if (timeSinceDismissed < INSTALL_REMINDER_DELAY) {
        if (DEBUG_PWA) debugLog('pwa', 'Within reminder delay, hiding install button');
        installButton.style.display = DISPLAY_NONE;
        return;
      }
    }
    
    // Only stash the event if we're going to show the prompt
    deferredPrompt = e;
    // Show the install button
    if (DEBUG_PWA) debugLog('pwa', 'Showing install button');
    installButton.style.display = DISPLAY_FLEX;
  });

  // Add a check for standalone mode on page load
  if (window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true) {
    if (DEBUG_PWA) debugLog('pwa', 'App is running in standalone mode, hiding install button');
    installButton.style.display = DISPLAY_NONE;
  }

  // Add a check for why beforeinstallprompt might not fire
  window.addEventListener('load', () => {
    if (DEBUG_PWA && !deferredPrompt) {
      debugLog('pwa', 'beforeinstallprompt did not fire. Possible reasons:', {
        isHTTPS: window.location.protocol === 'https:',
        hasManifest: document.querySelector('link[rel="manifest"]') !== null,
        isStandalone: window.matchMedia('(display-mode: standalone)').matches,
        displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser',
        userAgent: window.navigator.userAgent
      });
    }
  });

  // Modify the install button click handler
  installButton.addEventListener('click', () => {
    // Hide the app provided install prompt
    installButton.style.display = DISPLAY_NONE;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        trackEvent('Engagement', 'Install App', 'Accepted');
      } else {
        trackEvent('Engagement', 'Install App', 'Declined');
        // Only store dismissal if they explicitly click "Not now" or similar
        // Clicking X on the prompt should not count as a dismissal
        if (choiceResult.outcome === 'dismissed' && choiceResult.platform === 'web') {
          // Store the dismissal timestamp
          localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, Date.now().toString());
        } else {
          // For any other outcome (including clicking X), clear any existing dismissal
          localStorage.removeItem(INSTALL_PROMPT_DISMISSED_KEY);
        }
      }
      // Clear the saved prompt since it can't be used again
      deferredPrompt = null;
    });
  });

  // Listen for successful installation
  window.addEventListener('appinstalled', () => {
    trackEvent('Engagement', 'Install App', 'Completed');
    installButton.style.display = DISPLAY_NONE;
    // Clear the dismissal timestamp since they've installed
    localStorage.removeItem(INSTALL_PROMPT_DISMISSED_KEY);
  });

  // Initialize DOM elements
  const yoyoGrid = document.getElementById('yoyo-grid');
  const modal = document.getElementById('modal');
  const closeModalBtn = document.getElementById('close-modal');
  const modalOverlay = document.getElementById('modal-overlay');
  const modalMainImage = document.getElementById('modal-main-image');
  const modalImages = document.getElementById('modal-images');
  const paginationContainer = document.getElementById('pagination-container');

  // Initialize state variables
  let currentPage = 1;
  let itemsPerPage = getItemsPerPage(); // Dynamically determine items per page
  let yoyoData = [];
  let specsData = [];
  let searchTerm = '';
  let selectedModel = '';
  let selectedColorway = '';
  let sortDateDesc = true; // Default to newest first
  let showWishlist = false;
  let showOwned = false;
  let isLoading = true;
  let modelSortType = 'alpha'; // 'alpha' or 'quantity'
  let modelSortDesc = false;
  let colorwaySortType = 'alpha';
  let colorwaySortDesc = false;

  function getItemsPerPage() {
    const width = window.innerWidth;
    if (width >= 1680) return 24;
    if (width >= 1280) return 18;
    if (width >= 1024) return 14;
    if (width >= 640)  return 10;
    return 6;                     
  }

  window.addEventListener('resize', () => {
    const newItemsPerPage = getItemsPerPage();
    if (newItemsPerPage !== itemsPerPage) {
      itemsPerPage = newItemsPerPage;
      currentPage = 1;
      displayYoyoCards();
    }
  });

  // Helper function for deep object comparison
  function normalizeField(key, value) {
    // Normalize fields that can be blank/null
    const normalizeToNull = ['release_date', 'type', 'quantity', 'additional_images', 'description', 'og_caption', 'created_at', 'last_modified'
  ,];
    if (normalizeToNull.includes(key)) {
      if (value === undefined || value === null || value === '' || value === 'null' || (Array.isArray(value) && value.length === 0)) {
        return null;
      }
      if (typeof value === 'string' && value.trim() === '') {
        return null;
      }
      return value;
    }
    return value;
  }

  function objectsAreEqual(obj1, obj2) {
    if (obj1 === null || obj1 === undefined || obj2 === null || obj2 === undefined) {
      return obj1 === obj2;
    }
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
      return obj1 === obj2;
    }
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    if (keys1.length !== keys2.length) {
      return false;
    }
    keys1.sort();
    keys2.sort();
    for (let i = 0; i < keys1.length; i++) {
      const key = keys1[i];
      if (keys1[i] !== keys2[i]) {
        return false;
      }
      let val1 = obj1[key];
      let val2 = obj2[key];
      // Normalize fields before comparison
      val1 = normalizeField(key, val1);
      val2 = normalizeField(key, val2);
      const areObjects = typeof val1 === 'object' && val1 !== null && typeof val2 === 'object' && val2 !== null;
      if (areObjects) {
        if (!objectsAreEqual(val1, val2)) {
          return false;
        }
      } else {
        if (String(val1).trim() !== String(val2).trim()) {
          return false;
        }
      }
    }
    return true;
  }

  function getItemKey(item) {
    // Use model+colorway as the primary key, fallback to image_url for duplicates
    const model = item.model || '';
    const colorway = item.colorway || '';
    const imageUrl = item.image_url || '';
    return `${model}|||${colorway}|||${imageUrl}`;
  }

  function setCachedData(key, data) {
    // Get the previous cached data for comparison
    const previousCacheJSON = localStorage.getItem(key);
    let previousDataArray = null;
    let changes = [];
    let actualContentChanged = false; // Flag to track if content really changed

    if (previousCacheJSON) {
      try {
        const parsedCache = JSON.parse(previousCacheJSON);
        previousDataArray = parsedCache.data; // This is an array of yoyo/spec objects

        if (Array.isArray(data) && Array.isArray(previousDataArray)) {
          // Use composite key for matching
          const currentDataMap = new Map(data.map(item => [getItemKey(item), item]));
          const previousDataMap = new Map(previousDataArray.map(item => [getItemKey(item), item]));

          // Find added items
          const added = data.filter(item => {
            const keyVal = getItemKey(item);
            return !previousDataMap.has(keyVal);
          });

          // Find removed items
          const removed = previousDataArray.filter(item => {
            const keyVal = getItemKey(item);
            return !currentDataMap.has(keyVal);
          });

          // Find modified items
          const modified = data.filter(newItem => {
            const keyVal = getItemKey(newItem);
            const prevItem = previousDataMap.get(keyVal);
            return prevItem && !objectsAreEqual(newItem, prevItem);
          });

          if (added.length > 0) changes.push(`Added ${added.length} new item(s)`);
          if (removed.length > 0) changes.push(`Removed ${removed.length} item(s)`);
          if (modified.length > 0) changes.push(`Modified ${modified.length} item(s)`);

          if (changes.length > 0) {
            actualContentChanged = true; // Mark that content has indeed changed
          }

          if (DEBUG_CACHE && modified.length > 0) {
            debugLog('cache', `Cache changes for ${key}: Found ${modified.length} modified item(s). Detailed comparison:`);
            modified.slice(0, 5).forEach(newItem => { // Log details for the first 5 modified items
              const keyVal = getItemKey(newItem);
              const prevItem = previousDataMap.get(keyVal);
              debugLog('cache', `Comparing modified item KEY: ${keyVal}:`);
              let itemDiffFound = false;
              const allKeys = new Set([...Object.keys(newItem), ...(prevItem ? Object.keys(prevItem) : [])]);

              allKeys.forEach(k => {
                const newVal = newItem.hasOwnProperty(k) ? newItem[k] : undefined;
                const oldVal = prevItem && prevItem.hasOwnProperty(k) ? prevItem[k] : undefined;

                const valIsNew = newItem.hasOwnProperty(k);
                const valWasOld = prevItem && prevItem.hasOwnProperty(k);

                if (!valIsNew && valWasOld) {
                  debugLog('cache', `  -- Key '${k}' in OLD ('${oldVal}', type: ${typeof oldVal}) but not in NEW.`);
                  itemDiffFound = true;
                } else if (valIsNew && !valWasOld) {
                  debugLog('cache', `  -- Key '${k}' in NEW ('${newVal}', type: ${typeof newVal}) but not in OLD.`);
                  itemDiffFound = true;
                } else if (valIsNew && valWasOld) {
                  // Compare values only if key exists in both
                  const areObjects = typeof newVal === 'object' && newVal !== null && typeof oldVal === 'object' && oldVal !== null;
                  let valuesDiffer;
                  if (areObjects) {
                    valuesDiffer = !objectsAreEqual(newVal, oldVal);
                  } else {
                    if (newVal !== oldVal && String(newVal).trim() !== String(oldVal).trim()) {
                        valuesDiffer = true;
                        debugLog('cache', `    Primitive values differ with strict AND string comparison.`);
                    } else if (String(newVal).trim() !== String(oldVal).trim()) {
                        valuesDiffer = true;
                        debugLog('cache', `    Primitive values differ with string comparison, but might be equal with strict type check or vice-versa.`);
                    } else {
                        valuesDiffer = false;
                    }
                  }

                  if (valuesDiffer) {
                    debugLog('cache', `  -- Difference in key '${k}': NEW='${newVal}' (type: ${typeof newVal}) vs OLD='${oldVal}' (type: ${typeof oldVal})`);
                    itemDiffFound = true;
                  }
                }
              });
              if (!itemDiffFound) {
                debugLog('cache', `  -- No specific property differences found by this debug logic for item ${keyVal}, yet item was marked modified. newItem:`, JSON.stringify(newItem), `prevItem:`, JSON.stringify(prevItem));
              }
            });
            if (modified.length > 5) {
                debugLog('cache', `... and ${modified.length - 5} more modified items.`);
            }
          }
        }
      } catch (e) {
        console.error(`Error parsing or comparing previous cache for key ${key}:`, e);
        previousDataArray = null; 
        actualContentChanged = true; // Treat as change if old cache is corrupt
      }
    } else {
      actualContentChanged = true; // No previous cache, so this is definitely a change
    }

    // Only update localStorage if there was no previous cache or if actual content changed
    if (actualContentChanged) {
      const cacheData = {
        data,
        timestamp: Date.now(),
        version: getCurrentAppVersion()
      };
      localStorage.setItem(key, JSON.stringify(cacheData));
      debugLog('cache', `Updated cache for key: ${key}. Version: ${cacheData.version}, Timestamp: ${new Date(cacheData.timestamp).toLocaleString()}`);
      if (changes.length > 0) {
        debugLog('cache', `Changes detected: ${changes.join(', ')}`);
      } else if (!previousCacheJSON) {
        debugLog('cache', `Initialized new cache for ${key}.`);
      }
    } else if (previousCacheJSON) {
      // If no actual content change, but previous cache existed, log that no update was made to localStorage
      const parsedCache = JSON.parse(previousCacheJSON);
      debugLog('cache', `Data for key '${key}' (Version: ${parsedCache.version || 'unknown'}) is identical to fetched data. localStorage not updated.`);
    }
  }
  
  // Helper function to get the current app version
  function getCurrentAppVersion() {
    return window.APP_CONFIG.VERSION;
  }

  function getCachedData(key) {
    const cached = localStorage.getItem(key);
    if (!cached) {
      if (DEBUG_CACHE) debugLog('cache', `No cache found for key: ${key}`);
      return null;
    }
    
    try {
      const { data, timestamp, version } = JSON.parse(cached);
      const currentVersion = getCurrentAppVersion();
      
      // Check if cache is expired
      if (Date.now() - timestamp > CACHE_CONFIG.cacheExpiration) {
        if (DEBUG_CACHE) debugLog('cache', `Cache expired for key: ${key}. Last updated: ${new Date(timestamp).toLocaleString()}`);
        localStorage.removeItem(key);
        return null;
      }
      
      // Check if cache version is outdated
      // Important: Only invalidate if 'version' exists in the cache and is different.
      // This allows older caches without a version to still be used until they expire.
      if (typeof version !== 'undefined' && version !== currentVersion) {
        if (DEBUG_CACHE) debugLog('cache', `Cache version mismatch for key: ${key}. Cached: ${version}, Current: ${currentVersion}. Invalidating cache.`);
        localStorage.removeItem(key);
        return null;
      }
      
      if (DEBUG_CACHE) debugLog('cache', `Using cached data for key: ${key}. Version: ${version || 'unknown'}, Age: ${Math.round((Date.now() - timestamp) / 1000 / 60)} minutes`);
      return data; // This should be an array of yoyo/spec objects
    } catch (error) {
      console.error(`Error parsing cache for key: ${key}:`, error);
      localStorage.removeItem(key); // Remove corrupted cache
      return null;
    }
  }

  async function fetchYoyoData() {
    const mainLoadingSpinner = document.getElementById('main-loading-spinner');
    const yoyoGrid           = document.getElementById('yoyo-grid');

    if (DEBUG_DATA) {
      debugLog('data', 'Starting fetchYoyoData...');
      debugLog('data', 'CONFIG:', CONFIG);
      debugLog('data', 'yoyosDataUrl:', CONFIG.yoyosDataUrl);
    }

    // 1) Show spinner & clear grid
    if (mainLoadingSpinner) mainLoadingSpinner.style.display = 'flex';
    if (yoyoGrid) {
      yoyoGrid.style.display = 'grid';
      yoyoGrid.innerHTML = '';
    }

    const cacheKey     = CACHE_CONFIG.yoyosCacheKey;
    const cachedYoyos  = getCachedData(cacheKey);
    const hasCache     = Boolean(cachedYoyos);
    let gotFreshUpdate = false;

    // 2) If we have cached data, render it immediately
    if (hasCache) {
      if (DEBUG_CACHE) debugLog('cache', 'Using cached yoyo data');
      isLoading = false;
      yoyoData   = cachedYoyos.filter(y => y && y.model && String(y.model).trim() !== '');
      populateModelFilter();
      populateColorwayFilter();
      displayYoyoCards();
      updateFavoritesAndOwnedCounts();
      if (DEBUG_DATA) debugLog('data', 'Loaded yoyos:', yoyoData, 'Count:', yoyoData.length);
    }

    // 3) Fetch fresh in background
    try {
      if (DEBUG_DATA) {
        debugLog('data', 'Fetching latest yoyo data…');
        debugLog('data', 'URL:', CONFIG.yoyosDataUrl);
      }
      const resp = await fetch(CONFIG.yoyosDataUrl);
      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
      }
      const fresh = await resp.json();
      if (DEBUG_DATA) debugLog('data', 'Received fresh data:', fresh);

      // Fast length check: if cached and fresh data have the same length, skip cache update and UI reload
      if (hasCache && Array.isArray(fresh) && Array.isArray(cachedYoyos) && fresh.length === cachedYoyos.length) {
        debugLog('cache', 'Cached and fetched data lengths match, skipping cache update and UI reload.');
        if (mainLoadingSpinner) mainLoadingSpinner.style.display = 'none';
        isLoading = false;
        return;
      }

      // 4) If no cache yet, update UI
      if (!hasCache) {
        if (DEBUG_DATA) {
          debugLog('data', 'No cache found, updating cache & UI');
        }
        gotFreshUpdate = true;
        yoyoData = fresh.filter(y => y && y.model && String(y.model).trim() !== '');
        // Defensive: ensure yoyoData is always an array
        if (!Array.isArray(yoyoData)) {
          console.error('Received non-array data:', yoyoData);
          yoyoData = [];
        }
        setCachedData(cacheKey, yoyoData);
        populateModelFilter();
        populateColorwayFilter();
        displayYoyoCards();
        updateFavoritesAndOwnedCounts();
        if (DEBUG_DATA) debugLog('data', 'Loaded yoyos:', yoyoData, 'Count:', yoyoData.length);
      } else {
        if (DEBUG_DATA) debugLog('data', 'Yoyo data unchanged — skipping redraw');
      }
    } catch (err) {
      console.error('Error fetching yoyo data:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        url: CONFIG.yoyosDataUrl
      });
    } finally {
      // 5) Hide spinner and, if this was the first load, draw cards
      if (mainLoadingSpinner) mainLoadingSpinner.style.display = 'none';
      isLoading = false;

      // Only call displayYoyoCards() on first load (no cache).
      // If we got a fresh update we already called it above.
      if (!hasCache) {
        displayYoyoCards();
        updateFavoritesAndOwnedCounts();
      }
    }
  }

  async function fetchSpecsData() {
    // 1) Render cached specs if any
    const cacheKey    = CACHE_CONFIG.specsCacheKey;
    const cachedSpecs = getCachedData(cacheKey);
    if (cachedSpecs) {
      if (DEBUG_CACHE) debugLog('cache', 'Using cached specs data');
      specsData = cachedSpecs.filter(s => s && s.model && String(s.model).trim() !== '');
      populateModelFilter();
      populateColorwayFilter();
      if (DEBUG_DATA) debugLog('data', 'Loaded specs:', specsData, 'Count:', specsData.length);
    }

    // 2) Always fetch fresh specs
    try {
      if (DEBUG_DATA) debugLog('data', 'Fetching latest specs data…');
      const resp  = await fetch(CONFIG.specsDataUrl);
      const fresh = await resp.json();

      // 3) If no cache, or data changed, update cache & UI
      if (!cachedSpecs || JSON.stringify(fresh) !== JSON.stringify(cachedSpecs)) {
        if (DEBUG_DATA) debugLog('data', 'New specs data received, updating cache & UI');
        specsData = fresh.filter(s => s && s.model && String(s.model).trim() !== '');
        setCachedData(cacheKey, specsData);
        populateModelFilter();
        populateColorwayFilter();
        if (DEBUG_DATA) debugLog('data', 'Loaded specs:', specsData, 'Count:', specsData.length);
      } else {
        if (DEBUG_DATA) debugLog('data', 'Specs data unchanged');
      }
    } catch (err) {
      console.error('Error fetching specs data:', err);
      // keep cached specsData (or empty array if none)
    }
  }

  function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function sortOptions(options, sortType) {
    const optionsArray = Array.from(options);
    const firstOption = optionsArray.shift(); // Remove "All" option

    optionsArray.sort((a, b) => {
      if (sortType === 'quantity') {
        // Extract numbers from parentheses and sort highest to lowest
        const countA = parseInt(a.textContent.match(/\((\d+)\)/)[1]);
        const countB = parseInt(b.textContent.match(/\((\d+)\)/)[1]);
        return countB - countA;
      } else {
        // Alpha sort A-Z by text content without the count
        const textA = a.textContent.replace(/\s*\(\d+\)$/, '');
        const textB = b.textContent.replace(/\s*\(\d+\)$/, '');
        
        // Remove prefixes for sorting
        const cleanTextA = textA.replace(/^(AL[0-9]|Brass|Ti|Titanium)\s+/i, '');
        const cleanTextB = textB.replace(/^(AL[0-9]|Brass|Ti|Titanium)\s+/i, '');
        
        return cleanTextA.localeCompare(cleanTextB);
      }
    });

    // Add back "All" option at the beginning
    optionsArray.unshift(firstOption);
    return optionsArray;
  }

  function updateSortButton(button, sortType) {
    const icon = button.querySelector('.sort-icon');
    if (sortType === 'alpha') {
      icon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18M3 12h18M3 18h18"/>
        </svg>
        A-Z
      `;
    } else {
      icon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18M3 12h18M3 18h18"/>
        </svg>
        #↓
      `;
    }
    button.dataset.sort = sortType;
    
    // Set active state
    if (sortType === 'quantity') {
      button.setAttribute('data-active', 'true');
    } else {
      button.setAttribute('data-active', 'false');
    }
  }

  function populateModelFilter() {
    const modelSelect = document.getElementById('model-filter');
    const models = Array.from(new Set(yoyoData.map(y => y.model))).sort();
    
    // Count colorways per model
    const modelCounts = {};
    models.forEach(model => {
      modelCounts[model] = yoyoData.filter(y => y.model === model).length;
    });

    // Debug logging
    if (DEBUG_DATA) {
      console.log('All models:', models);
      console.log('First few yoyos with sort_key:', yoyoData.slice(0, 3).map(y => ({
        model: y.model,
        sort_key: y.sort_key
      })));
    }

    // Group models by their sort_key base name
    const modelGroups = {};
    models.forEach(model => {
      const yoyo = yoyoData.find(y => y.model === model);
      if (!yoyo) {
        console.warn(`No yoyo found for model: ${model}`);
        return;
      }

      // Get the base name from sort_key (part before underscore or space)
      let baseName = null;
      if (yoyo.sort_key) {
        // Split by underscore first to get the full name before it
        const parts = yoyo.sort_key.split('_');
        const nameBeforeUnderscore = parts[0];
        
        // Special case for Loadout
        if (nameBeforeUnderscore.includes('Loadout')) {
          baseName = 'Loadout';
        } else {
          // Check if there are other models with similar names
          const hasSimilarModels = models.some(m => {
            if (m === model) return false;
            const otherYoyo = yoyoData.find(y => y.model === m);
            if (!otherYoyo || !otherYoyo.sort_key) return false;
            
            const otherWords = otherYoyo.sort_key.split('_')[0].split(' ');
            const thisWords = nameBeforeUnderscore.split(' ');
            
            // Check if they share any significant words (excluding common prefixes/suffixes)
            const skipWords = ['Mini', 'Wide', 'T52', 'SR', 'AL6', 'AL7', 'AL7075', 'Brass', 'Ti', 'SS'];
            const thisSignificantWords = thisWords.filter(w => !skipWords.includes(w));
            const otherSignificantWords = otherWords.filter(w => !skipWords.includes(w));
            
            return thisSignificantWords.some(word => otherSignificantWords.includes(word));
          });

          if (hasSimilarModels) {
            // If similar models exist, use the main model name
            const words = nameBeforeUnderscore.split(' ');
            const mainModelName = words.find(word => {
              const skipWords = ['Mini', 'Wide', 'T52', 'SR', 'AL6', 'AL7', 'AL7075', 'Brass', 'Ti', 'SS'];
              return !skipWords.includes(word);
            });
            baseName = mainModelName || words[0];
          } else {
            // If no similar models, use the full name before underscore
            baseName = nameBeforeUnderscore;
          }
        }
      }
      
      if (DEBUG_DATA) {
        console.log(`Processing model: ${model}`);
        console.log(`- sort_key: ${yoyo.sort_key}`);
        console.log(`- base name: ${baseName}`);
      }
      
      if (!baseName) {
        console.warn(`No valid sort_key for model: ${model}`);
        return;
      }

      if (!modelGroups[baseName]) {
        modelGroups[baseName] = [];
      }
      modelGroups[baseName].push(model);
    });

    // Sort base names alphabetically
    const sortedBaseNames = Object.keys(modelGroups).sort((a, b) => a.localeCompare(b));
    
    if (DEBUG_DATA) {
      console.log('Model Groups:', modelGroups);
      console.log('Sorted Base Names:', sortedBaseNames);
    }

    // Store current value
    const currentValue = modelSelect.value;
    
    // Clear the select
    modelSelect.innerHTML = '';
    
    // Add default option with total count
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = currentValue || `All Models (${models.length})`;
    modelSelect.appendChild(defaultOption);
    
    // Add top separator
    const topSeparator = document.createElement('option');
    topSeparator.disabled = true;
    topSeparator.textContent = '────────── Models ──────────';
    modelSelect.appendChild(topSeparator);
    
    // Add grouped models
    sortedBaseNames.forEach(baseName => {
      const variants = modelGroups[baseName];
      
      // Always add a group header, even for single models
      const groupHeader = document.createElement('option');
      groupHeader.disabled = true;
      // Convert base name to uppercase
      const capitalizedName = baseName.toUpperCase();
      groupHeader.textContent = `── ${capitalizedName} ──`;
      groupHeader.className = 'group-header';
      modelSelect.appendChild(groupHeader);
      
      // Add all variants of this base model
      variants.forEach(model => {
        const opt = document.createElement('option');
        opt.value = model;
        opt.textContent = `${model} (${modelCounts[model]})`;
        modelSelect.appendChild(opt);
      });
    });

    // Restore the selected value
    if (currentValue) {
      modelSelect.value = currentValue;
    }
  }

  function populateColorwayFilter() {
    const colorwayFilter = document.getElementById('colorway-filter');

    // Get unique colorways from all yoyos, not filtered by model
    const colorways = Array.from(new Set(yoyoData.map(y => y.colorway))).sort();
    const colorwayCounts = {};
    colorways.forEach(colorway => {
      colorwayCounts[colorway] = yoyoData.filter(y => y.colorway === colorway).length;
    });

    // Store current selection
    const currentSelection = colorwayFilter.value;

    colorwayFilter.innerHTML = `<option value="">All Colorways (${colorways.length})</option>`;
    colorways.forEach(colorway => {
      const opt = document.createElement('option');
      opt.value = colorway;
      // Only show count if there's more than one
      opt.textContent = colorwayCounts[colorway] > 1 ? 
        `${colorway} (${colorwayCounts[colorway]})` : 
        colorway;
      colorwayFilter.appendChild(opt);
    });

    // Sort options based on current sort settings
    const sortedOptions = sortOptions(colorwayFilter.options, colorwaySortType);
    colorwayFilter.innerHTML = '';
    sortedOptions.forEach(opt => colorwayFilter.appendChild(opt));
    
    // Restore selection if it still exists
    if (currentSelection && colorways.includes(currentSelection)) {
      colorwayFilter.value = currentSelection;
    } else {
      colorwayFilter.selectedIndex = 0;
    }
  }

  function parseDate(dateString) {
    if (!dateString) return new Date(0);
    
    // Handle your date format "Month DD YYYY"
    const parts = dateString.match(/([A-Za-z]+)\s+(\d+)\s+(\d{4})/);
    if (parts) {
      const months = {
        'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
        'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
      };
      return new Date(parts[3], months[parts[1]], parts[2]);
    }
    return new Date(dateString);
  }

  function filterYoyos(yoyos) {
    if (!yoyos) return [];
    
    return yoyos.filter(yoyo => {
      if (!yoyo) return false;

      const searchTerms = (searchTerm || '').toLowerCase().split(' ').filter(term => term.length > 0);
      
      // Single-select filter logic
      if (
        (selectedModel && yoyo.model !== selectedModel) ||
        (selectedColorway && String(yoyo.colorway) !== selectedColorway)
      ) {
        return false;
      }
      
      // Check wishlist filter
      if (showWishlist) {
        const wishlistKey = `wishlist_${yoyo.model}_${yoyo.colorway}`;
        if (localStorage.getItem(wishlistKey) !== '1') {
          return false;
        }
      }
      
      // Check owned filter
      if (showOwned) {
        const ownedKey = `owned_${yoyo.model}_${yoyo.colorway}`;
        if (localStorage.getItem(ownedKey) !== '1') {
          return false;
        }
      }

      // If no search terms, return true (filters already applied)
      if (searchTerms.length === 0) {
        return true;
      }

      // Match all search terms
      const modelText = String(yoyo.model || '').toLowerCase();
      const colorwayText = String(yoyo.colorway || '').toLowerCase();
      const typeText = String(yoyo.type || '').toLowerCase();
      const descriptionText = String(yoyo.description || '').toLowerCase();

      return searchTerms.every(term => 
        modelText.includes(term) ||
        colorwayText.includes(term) ||
        typeText.includes(term) ||
        descriptionText.includes(term)
      );
    });
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  function updateClearFiltersButton() {
    const clearFiltersBtn = document.getElementById('clear-filters');
    const hasActiveFilters = searchTerm || selectedModel || selectedColorway || showWishlist || showOwned || !sortDateDesc;
    
    if (hasActiveFilters) {
      clearFiltersBtn.classList.add('active');
      clearFiltersBtn.setAttribute('data-active', 'true');
    } else {
      clearFiltersBtn.classList.remove('active');
      clearFiltersBtn.setAttribute('data-active', 'false');
    }
  }

  document.getElementById('search').addEventListener('input', debounce((e) => {
    searchTerm = e.target.value.toLowerCase();
    currentPage = 1;
    updateClearFiltersButton();
    scrollToTopSmooth();
    displayYoyoCards(true);
    trackEvent('Engagement', 'Search', searchTerm);
  }, 300));

  document.getElementById('clear-search').addEventListener('click', () => {
    if (selectedModel || selectedColorway || modelSortDesc || colorwaySortDesc || !sortDateDesc) {
      clearAllFilters();
    } else {
      searchTerm = '';
      document.getElementById('search').value = '';
      currentPage = 1;
      scrollToTopSmooth();
      displayYoyoCards(true);
    }
  });

  document.getElementById('model-filter').addEventListener('change', (e) => {
    selectedModel = e.target.value;
    // If manually selecting "All", clear all filters
    if (!selectedModel) {
      clearAllFilters();
      return;
    }
    // Clear search term if it exists
    if (searchTerm) {
      searchTerm = '';
      document.getElementById('search').value = '';
    }
    // Clear colorway filter
    selectedColorway = "";
    const colorwayFilter = document.getElementById('colorway-filter');
    colorwayFilter.value = "";
    populateColorwayFilter(); // Repopulate to restore counts
    currentPage = 1;
    updateClearFiltersButton();
    scrollToTopSmooth();
    displayYoyoCards(true);
    trackEvent('Engagement', 'Filter Model', selectedModel);
  });

  document.getElementById('colorway-filter').addEventListener('change', (e) => {
    selectedColorway = e.target.value;
    // If manually selecting "All", clear all filters
    if (!selectedColorway) {
      clearAllFilters();
      return;
    }
    // Clear search term if it exists
    if (searchTerm) {
      searchTerm = '';
      document.getElementById('search').value = '';
    }
    // Clear model filter
    selectedModel = "";
    const modelFilter = document.getElementById('model-filter');
    modelFilter.value = "";
    populateModelFilter(); // Repopulate to restore counts
    currentPage = 1;
    updateClearFiltersButton();
    scrollToTopSmooth();
    displayYoyoCards(true);
    trackEvent('Engagement', 'Filter Colorway', selectedColorway);
  });

  // Set initial state of date sort button
  document.addEventListener('DOMContentLoaded', function() {
    const sortDateButton = document.getElementById('sort-date');
    if (sortDateButton) {
      sortDateButton.setAttribute('data-active', 'false');
      const sortIcon = sortDateButton.querySelector('.sort-icon');
      if (sortIcon) {
        sortIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> Newest First';
      }
    }
  });

  // Date sort button click handler
  document.getElementById('sort-date').addEventListener('click', function() {
    const button = this;
    sortDateDesc = !sortDateDesc;
    currentPage = 1;
    updateClearFiltersButton();
    scrollToTopSmooth();
    
    button.style.transition = 'none';
    button.setAttribute('data-active', !sortDateDesc);
    
    button.offsetHeight;
    
    setTimeout(() => {
      button.style.transition = '';
    }, 50);
    
    displayYoyoCards(true);
    trackEvent('Engagement', 'Sort Date', sortDateDesc ? 'Newest First' : 'Oldest First');
  });

  function createSkeletonCard() {
    const card = document.createElement('div');
    card.classList.add('skeleton-card', 'skeleton');
    return card;
  }

  function updateResultsCounter(filteredCount) {
    const counter = document.getElementById('results-counter');
    const total = yoyoData.length;
    
    if (filteredCount === total) {
      counter.textContent = `Showing all ${total} yoyos`;
    } else {
      counter.textContent = `Showing ${filteredCount} of ${total} yoyos`;
    }
  }

  function updateFavoritesAndOwnedCounts() {
    // Count wishlist
    let wishlistCount = 0;
    let ownedCount = 0;
    
    // Loop through all yoyos to count wishlist and owned
    yoyoData.forEach(yoyo => {
      const wishlistKey = `wishlist_${yoyo.model}_${yoyo.colorway}`;
      const ownedKey = `owned_${yoyo.model}_${yoyo.colorway}`;
      
      if (localStorage.getItem(wishlistKey) === '1') {
        wishlistCount++;
      }
      
      if (localStorage.getItem(ownedKey) === '1') {
        ownedCount++;
      }
    });
    
    // Update button text
    const wishlistBtn = document.getElementById('show-wishlist');
    const ownedBtn = document.getElementById('show-owned');
    
    if (wishlistBtn) {
      wishlistBtn.innerHTML = `<span class="filter-text">Wishlist (${wishlistCount})</span>`;
    }
    
    if (ownedBtn) {
      ownedBtn.innerHTML = `<span class="filter-text">Owned (${ownedCount})</span>`;
    }
  }

  function displayYoyoCards(shouldClearGrid = false) {
    const yoyoGrid = document.getElementById('yoyo-grid');
    
    if (isLoading) {
      // Show skeleton loading state
      yoyoGrid.innerHTML = '';
      for (let i = 0; i < itemsPerPage; i++) {
        yoyoGrid.appendChild(createSkeletonCard());
      }
      return;
    }

    // Get filtered yoyos
    let filtered = filterYoyos(yoyoData);

    // Sort by release date
    filtered.sort((a, b) => {
      const dateA = parseDate(a.release_date);
      const dateB = parseDate(b.release_date);
      return sortDateDesc ? dateB - dateA : dateA - dateB;
    });

    // Update results counter
    updateResultsCounter(filtered.length);
    
    // Update wishlist and owned counts
    updateFavoritesAndOwnedCounts();

    // Display no results message if needed
    if (filtered.length === 0) {
      const noResults = document.createElement('div');
      noResults.classList.add('col-span-full', 'text-center', 'py-8', 'text-gray-400');
      noResults.textContent = 'No yoyos found matching your search criteria';
      yoyoGrid.innerHTML = '';
      yoyoGrid.appendChild(noResults);
      return;
    }

    // Calculate start and end indices for the current page
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = currentPage * itemsPerPage;
    const paginatedYoyos = filtered.slice(startIndex, endIndex);

    // Clear the grid if it's the first page or if filters have changed
    if (currentPage === 1 || shouldClearGrid) {
      yoyoGrid.innerHTML = '';
    }

    // Create and append yoyo cards
    paginatedYoyos.forEach(yoyo => {
      const yoyoCard = createYoyoCard(yoyo);
      yoyoGrid.appendChild(yoyoCard);
    });

    // Show/hide loading spinner based on whether there are more items to load
    const loadingSpinner = document.getElementById('main-loading-spinner');
    if (loadingSpinner) {
      loadingSpinner.style.display = endIndex < filtered.length ? 'flex' : 'none';
    }

    // Log for debugging
    if (DEBUG_UI) {
      debugLog('ui', 'Displaying yoyos:', {
        currentPage,
        itemsPerPage,
        startIndex,
        endIndex,
        totalFiltered: filtered.length,
        remaining: filtered.length - endIndex,
        shouldClearGrid,
        gridChildren: yoyoGrid.children.length
      });
    }
  }

  function createYoyoCard(yoyo) {
    const card = document.createElement('div');
    card.classList.add('card');
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `${yoyo.model} - ${yoyo.colorway}`);

    // Add loading state for image with a uniform square container
    const imageContainer = document.createElement('div');
    imageContainer.classList.add('card-image-container');

    const image = document.createElement('img');
    image.classList.add('card-image');

    image.src = CONFIG.placeholderImage; // Start with placeholder
    image.alt = `${yoyo.model} - ${yoyo.colorway}`;
    image.loading = 'lazy'; // Enable native lazy loading
    
    // Add loading spinner for image
    const imageSpinner = document.createElement('div');
    imageSpinner.classList.add('loading-spinner');
    imageContainer.appendChild(imageSpinner);

    // Handle image load
    image.onload = () => {
      imageSpinner.style.display = 'none';
    };
    imageContainer.appendChild(image);
    card.appendChild(imageContainer);

    // Load the actual image
    if (yoyo.image_url) {
      const actualImage = new Image();
      actualImage.onload = () => {
        image.src = yoyo.image_url;
        imageSpinner.style.display = 'none';
      };
      actualImage.src = yoyo.image_url;
    }

    // Card content
    const content = document.createElement('div');
    content.classList.add('card-content');

    const model = document.createElement('h3');
    model.classList.add('model-name');
    model.textContent = yoyo.model;

    const colorway = document.createElement('p');
    colorway.classList.add('colorway-name');
    colorway.textContent = yoyo.colorway;

    const details = document.createElement('div');
    details.classList.add('card-details');
    
    const formattedDate = formatDate(yoyo.release_date);
    if (yoyo.release_date && formattedDate !== 'Unknown') {
      const date = document.createElement('p');
      date.textContent = `Released: ${formattedDate}`;
      details.appendChild(date);
    }

    if (yoyo.quantity) {
      const quantity = document.createElement('p');
      quantity.textContent = `Quantity: ${yoyo.quantity}`;
      details.appendChild(quantity);
    }

    content.appendChild(model);
    content.appendChild(colorway);
    content.appendChild(details);

    // Show description on card
    if (yoyo.description) {
      const cardDesc = document.createElement('p');
      cardDesc.classList.add('card-description');
      cardDesc.textContent = yoyo.description;
      content.appendChild(cardDesc);
    }

    // Add actions container for wishlist and owned buttons
    const actions = document.createElement('div');
    actions.classList.add('card-actions');

    // Generate unique keys for localStorage
    const wishlistKey = `wishlist_${yoyo.model}_${yoyo.colorway}`;
    const ownedKey = `owned_${yoyo.model}_${yoyo.colorway}`;

    // Wishlist button
    const wishlistBtn = document.createElement('button');
    wishlistBtn.classList.add('wishlist-btn');
    wishlistBtn.setAttribute('aria-label', 'Add to Wishlist');
    wishlistBtn.setAttribute('data-tooltip', 'Add to Wishlist');
    wishlistBtn.innerHTML = localStorage.getItem(wishlistKey) ? '💖' : '🤍';
    if (localStorage.getItem(wishlistKey)) {
      wishlistBtn.classList.add('active');
      wishlistBtn.setAttribute('data-tooltip', 'Remove from Wishlist');
    }
    
    wishlistBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent modal from opening
      const isAdding = !wishlistBtn.classList.contains('active');
      
      if (isAdding) {
        localStorage.setItem(wishlistKey, '1');
        wishlistBtn.innerHTML = '💖';
        wishlistBtn.classList.add('active');
        wishlistBtn.setAttribute('data-tooltip', 'Remove from Wishlist');
        trackEvent('Engagement', 'Add to Wishlist', yoyo.model);
      } else {
        localStorage.removeItem(wishlistKey);
        wishlistBtn.innerHTML = '🤍';
        wishlistBtn.classList.remove('active');
        wishlistBtn.setAttribute('data-tooltip', 'Add to Wishlist');
        trackEvent('Engagement', 'Remove from Wishlist', yoyo.model);
      }
      
      // Update the counts immediately after changing the wishlist status
      updateFavoritesAndOwnedCounts();
    });

    // Owned button
    const ownedBtn = document.createElement('button');
    ownedBtn.classList.add('owned-btn');
    ownedBtn.setAttribute('aria-label', 'Mark as Owned');
    ownedBtn.setAttribute('data-tooltip', 'Mark as Owned');
    ownedBtn.innerHTML = localStorage.getItem(ownedKey) ? '✅' : '🛒';
    if (localStorage.getItem(ownedKey)) {
      ownedBtn.classList.add('active');
      ownedBtn.setAttribute('data-tooltip', 'Remove from Owned');
    }
    
    ownedBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent modal from opening
      const isAdding = !ownedBtn.classList.contains('active');
      
      if (isAdding) {
        localStorage.setItem(ownedKey, '1');
        ownedBtn.innerHTML = '✅';
        ownedBtn.classList.add('active');
        ownedBtn.setAttribute('data-tooltip', 'Remove from Owned');
        trackEvent('Engagement', 'Add to Owned', yoyo.model);
      } else {
        localStorage.removeItem(ownedKey);
        ownedBtn.innerHTML = '🛒';
        ownedBtn.classList.remove('active');
        ownedBtn.setAttribute('data-tooltip', 'Mark as Owned');
        trackEvent('Engagement', 'Remove from Owned', yoyo.model);
      }
      
      // Update the counts immediately after changing the owned status
      updateFavoritesAndOwnedCounts();
    });

    actions.appendChild(wishlistBtn);
    actions.appendChild(ownedBtn);
    card.appendChild(content);
    card.appendChild(actions);

    // Add click handler for modal
    card.addEventListener('click', () => openModal(yoyo));

    // Add keyboard event listener
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(yoyo);
      }
    });

    return card;
  }

  function showSpecs(model) {
    const specs = specsData.find(spec => spec.model === model);
    if (specs) {
      // Create modal content
      let html = `<h2 class="specs-title">${model} Specs</h2><ul>`;
      for (const [key, value] of Object.entries(specs)) {
        if (key !== "Model" && value && value !== "N/A" && value !== "-") {
          html += `<li><strong>${key.replace(/_/g, ' ')}:</strong> ${value}</li>`;
        }
      }
      html += "</ul>";
      // Show in modal
      modalMainImage.src = ""; // Hide main image for specs
      modalImages.innerHTML = html;
      modal.classList.remove('hidden');
    }
  }

  function closeModal() {
    const modal = document.getElementById('modal');
    const modalMainImage = document.getElementById('modal-main-image');
    const modalImages = document.getElementById('modal-images');
    const modalDetails = document.getElementById('modal-details');

    if (modal) {
    modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
    if (modalMainImage) modalMainImage.src = '';
    if (modalImages) modalImages.innerHTML = '';
    if (modalDetails) modalDetails.innerHTML = '';

    // Return focus to the last focused element
    const lastFocusedElement = document.querySelector('.yoyo-card:focus');
    if (lastFocusedElement) {
      lastFocusedElement.focus();
    }
  }

  function setupModalListeners() {
    const modal = document.getElementById('modal');
    const modalOverlay = document.getElementById('modal-overlay');
    const closeModalBtn = document.getElementById('close-modal');
    const modalMainImage = document.getElementById('modal-main-image');
    const modalImages = document.getElementById('modal-images');
    const modalContent = modal.querySelector('.modal-content');

    // Only add touch events on mobile devices
    if (window.innerWidth <= 768) {
      // Touch event variables
      let touchStartY = 0;
      let touchEndY = 0;
      const swipeThreshold = 100; // Minimum distance for swipe

      // Handle touch start
      modalContent.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
      }, { passive: true });

      // Handle touch move
      modalContent.addEventListener('touchmove', (e) => {
        touchEndY = e.touches[0].clientY;
        const swipeDistance = touchEndY - touchStartY;
        
        // Only allow downward swipe
        if (swipeDistance > 0) {
          // Add transform to follow finger
          modalContent.style.transform = `translateY(${swipeDistance}px)`;
          // Add opacity to overlay based on swipe distance
          modalOverlay.style.opacity = 1 - (swipeDistance / 500);
        }
      }, { passive: true });

      // Handle touch end
      modalContent.addEventListener('touchend', () => {
        const swipeDistance = touchEndY - touchStartY;
        
        // Reset transform and opacity
        modalContent.style.transform = '';
        modalOverlay.style.opacity = '';
        
        // If swipe distance is greater than threshold, close modal
        if (swipeDistance > swipeThreshold) {
          closeModal();
        }
      }, { passive: true });
    }

    // Handle escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        closeModal();
      }
    });

    // Handle keyboard navigation in modal
    modal.addEventListener('keydown', (e) => {
      if (modal.classList.contains('hidden')) return;

      switch (e.key) {
        case 'ArrowLeft':
          const prevThumb = document.querySelector('.modal-thumbnail.active').previousElementSibling;
          if (prevThumb) prevThumb.click();
          break;
        case 'ArrowRight':
          const nextThumb = document.querySelector('.modal-thumbnail.active').nextElementSibling;
          if (nextThumb) nextThumb.click();
          break;
      }
    });

    // Close modal when clicking the overlay
    modalOverlay.addEventListener('click', () => {
      closeModal();
    });

    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', closeModal);
      closeModalBtn.setAttribute('aria-label', 'Close modal');
    }

    // Prevent clicks inside modal content from closing the modal
    if (modalContent) {
      modalContent.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  }

  function updateThumbnails(images, activeIndex, modalMainImage, mainImageSpinner) {
    const modalImages = document.getElementById('modal-images');
    modalImages.innerHTML = '';
    modalImages.style.display = images.length > 1 ? 'flex' : 'none';
    
    if (images.length > 1) {
      // Create thumbnails for all images, highlighting the active one
      images.forEach((url, index) => {
        const thumbContainer = document.createElement('div');
        thumbContainer.classList.add('thumbnail-container');
        
        const thumb = document.createElement('img');
        thumb.src = CONFIG.placeholderImage;
        thumb.loading = 'lazy';
        thumb.classList.add('modal-thumbnail');
        
        // Add active class to the current thumbnail
        if (index === activeIndex) {
          thumb.classList.add('active');
        }
        
        const thumbSpinner = document.createElement('div');
        thumbSpinner.classList.add('loading-spinner');
        thumbContainer.appendChild(thumbSpinner);
        thumbContainer.appendChild(thumb);
        
        // Load the actual thumbnail image
        const actualThumb = new Image();
        actualThumb.onload = () => {
          thumb.src = url;
          thumbSpinner.style.display = 'none';
        };
        actualThumb.onerror = () => {
          thumbSpinner.style.display = 'none';
        };
        actualThumb.src = url;
        
        thumb.addEventListener('click', () => {
          modalMainImage.src = CONFIG.placeholderImage;
          if (mainImageSpinner) {
            mainImageSpinner.style.display = 'block';
          }
          
          const newMainImage = new Image();
          newMainImage.onload = () => {
            modalMainImage.src = url;
            if (mainImageSpinner) {
              mainImageSpinner.style.display = 'none';
            }
            // Update thumbnails after loading new image
            updateThumbnails(images, index, modalMainImage, mainImageSpinner);
          };
          newMainImage.onerror = () => {
            if (mainImageSpinner) {
              mainImageSpinner.style.display = 'none';
            }
          };
          newMainImage.src = url;
        });
        
        modalImages.appendChild(thumbContainer);
      });
    }
  }

  function openModal(yoyo) {
    const modal = document.getElementById('modal');
    const modalMainImage = document.getElementById('modal-main-image');
    const modalImages = document.getElementById('modal-images');
    const modalDetails = document.getElementById('modal-details');
    const modalContent = modal.querySelector('.modal-content');
  
    // Show modal and set focus
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    // Focus the close button
    const closeModalBtn = document.getElementById('close-modal');
    if (closeModalBtn) {
      closeModalBtn.focus();
    }
  
    // Create array of all images
    const images = [yoyo.image_url];
    if (yoyo.additional_images) {
      const additionalImages = yoyo.additional_images
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);
      images.push(...additionalImages);
    }
  
    // Load main image with loading state
    modalMainImage.src = CONFIG.placeholderImage;
    const mainImageContainer = modalMainImage.parentElement;
    const mainImageSpinner = mainImageContainer.querySelector('.loading-spinner');
    
    if (mainImageSpinner) {
      mainImageSpinner.style.display = 'block';
    }
    
    const tempImage = new Image();
    tempImage.onload = () => {
      modalMainImage.src = images[0];
      if (mainImageSpinner) {
        mainImageSpinner.style.display = 'none';
      }
      // Initialize thumbnails after loading first image
      updateThumbnails(images, 0, modalMainImage, mainImageSpinner);
    };
    tempImage.onerror = () => {
      if (mainImageSpinner) {
        mainImageSpinner.style.display = 'none';
      }
    };
    tempImage.src = images[0];
  
    // Show loading state for specs
    modalDetails.innerHTML = `
      <div class="modal-details-content">
        <div class="modal-header">
          <h2 class="modal-title">${yoyo.model}</h2>
          <p class="modal-subtitle">${yoyo.colorway}</p>
        </div>

        <div class="modal-info">
          ${yoyo.release_date && formatDate(yoyo.release_date) !== 'Unknown' ? `
            <p class="modal-info-row">
              <span class="modal-label">Released:</span>
              <span class="modal-value">${formatDate(yoyo.release_date)}</span>
            </p>
          ` : ''}
          ${yoyo.quantity ? `
            <p class="modal-info-row">
              <span class="modal-label">Quantity:</span>
              <span class="modal-value">${yoyo.quantity}</span>
            </p>
          ` : ''}
        </div>

        ${yoyo.description ? `
          <div class="modal-description">
            <h3 class="modal-section-title">Description</h3>
            <p class="modal-description-text">${yoyo.description}</p>
          </div>
        ` : ''}

        <div class="modal-specs">
          <div class="modal-specs-grid">
            <div class="loading-spinner-container">
              <div class="loading-spinner"></div>
              <p class="loading-text">Loading specs...</p>
            </div>
          </div>
        </div>
      </div>
    `;

    // Load specs data if not already loaded
    if (!specsData || specsData.length === 0) {
      fetchSpecsData().then(() => {
        updateModalSpecs(yoyo.model);
      });
    } else {
      updateModalSpecs(yoyo.model);
    }

    // Track modal view
    trackEvent('Content', 'View Yoyo Details', `${yoyo.model} - ${yoyo.colorway}`);

    // Add swipe indicator only on mobile devices
    if (window.innerWidth <= 768) {
      const swipeIndicator = document.createElement('div');
      swipeIndicator.className = 'modal-swipe-indicator';
      swipeIndicator.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 19v-14M5 12l7 7 7-7"/>
        </svg>
        <span>Swipe down to close</span>
      `;
      modalContent.insertBefore(swipeIndicator, modalContent.firstChild);

      // Hide swipe indicator after 3 seconds
      setTimeout(() => {
        swipeIndicator.classList.add('hidden');
      }, 3000);
    }
  }

  function updateModalSpecs(model) {
    const modalDetails = document.getElementById('modal-details');
    const specs = specsData.find(spec => spec.model === model);
    
    if (!specs) {
        const specsGrid = modalDetails.querySelector('.modal-specs-grid');
        if (specsGrid) {
            specsGrid.innerHTML = '<div class="modal-specs-empty">No specifications available</div>';
        }
        return;
    }

    // Compose 'Composition' from Body and Rims
    let composition = '';
    const body = specs['body'];
    const rims = specs['rims'];
    if (body && body !== 'N/A' && body !== '-') {
        if (rims && rims !== 'N/A' && rims !== '-') {
            composition = `${body} with ${rims} rims`;
        } else {
            composition = body;
        }
    }

    const specFields = [
        { key: 'info', label: 'Additional Info' },
        { key: 'dia', label: 'Diameter', unit: 'mm' },
        { key: 'wid', label: 'Width', unit: 'mm' },
        { key: 'wt', label: 'Weight', unit: 'g' },
        { key: 'pads', label: 'Response' },
        { key: 'bearing', label: 'Bearing' },
        { key: 'axle', label: 'Axle', unit: 'mm' },     
        { key: 'released', label: 'Model Released' },
        { key: 'status', label: 'Status' },
        { key: 'source', label: 'Source' }
    ];

    let specHtml = '';
    if (composition) {
        specHtml += `<div class="modal-specs-label">Composition:</div><div class="modal-specs-value">${composition}</div>`;
    }
    
    specHtml += specFields
        .filter(field => specs[field.key] && specs[field.key] !== 'N/A' && specs[field.key] !== '-')
        .map(field => {
            let value = specs[field.key];
            if (field.key === 'released') {
                const date = new Date(value);
                if (!isNaN(date)) {
                    value = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                }
            } else if (field.unit && value && !String(value).includes(field.unit)) {
                value = `${value} ${field.unit}`;
            }
            return `<div class="modal-specs-label">${field.label}:</div><div class="modal-specs-value">${value}</div>`;
        })
        .join('');

    const specsSection = modalDetails.querySelector('.modal-specs');
    if (specsSection) {
        specsSection.innerHTML = `
            <h3 class="modal-section-title">
                Specifications
                <a href="specs.html" class="specs-comparison-link" title="Compare specs across models">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                        <line x1="12" y1="22.08" x2="12" y2="12"></line>
                    </svg>
                    Compare Specs
                </a>
            </h3>
            <div class="modal-specs-grid">
                ${specHtml}
            </div>
        `;
    }
  }

  function addFilterControls() {
    // Remove this function as we're using the buttons in the HTML
    // The event listeners are added in the DOMContentLoaded event
  }

  // Add event listeners for sort buttons
  document.getElementById('sort-model-filter').addEventListener('click', () => {
    modelSortType = modelSortType === 'alpha' ? 'quantity' : 'alpha';
    updateSortButton(document.getElementById('sort-model-filter'), modelSortType);
    populateModelFilter();
    trackEvent('Engagement', 'Sort Model', modelSortType);
  });

  document.getElementById('sort-colorway-filter').addEventListener('click', () => {
    colorwaySortType = colorwaySortType === 'alpha' ? 'quantity' : 'alpha';
    updateSortButton(document.getElementById('sort-colorway-filter'), colorwaySortType);
    populateColorwayFilter();
    trackEvent('Engagement', 'Sort Colorway', colorwaySortType);
  });
  
  // Add event listeners for show wishlist and show owned buttons
  document.getElementById('show-wishlist').addEventListener('click', () => {
    showWishlist = !showWishlist;
    const wishlistBtn = document.getElementById('show-wishlist');
    const ownedBtn = document.getElementById('show-owned');
    
    // Clear all other filters
    searchTerm = '';
    document.getElementById('search').value = '';
    selectedModel = '';
    document.getElementById('model-filter').value = '';
    selectedColorway = '';
    document.getElementById('colorway-filter').value = '';
    sortDateDesc = true;
    document.getElementById('sort-date').setAttribute('data-active', 'false');
    
    // If wishlist is being activated, deactivate owned
    if (showWishlist) {
      showOwned = false;
      ownedBtn.classList.remove('active');
      ownedBtn.setAttribute('data-active', 'false');
      wishlistBtn.classList.add('active');
      wishlistBtn.setAttribute('data-active', 'true');
      trackEvent('Engagement', 'Filter', 'Show Wishlist');
    } else {
      wishlistBtn.classList.remove('active');
      wishlistBtn.setAttribute('data-active', 'false');
      trackEvent('Engagement', 'Filter', 'Hide Wishlist');
    }
    
    currentPage = 1;
    updateClearFiltersButton();
    scrollToTopSmooth();
    displayYoyoCards();
  });

  document.getElementById('show-owned').addEventListener('click', () => {
    showOwned = !showOwned;
    const ownedBtn = document.getElementById('show-owned');
    const wishlistBtn = document.getElementById('show-wishlist');
    
    // Clear all other filters
    searchTerm = '';
    document.getElementById('search').value = '';
    selectedModel = '';
    document.getElementById('model-filter').value = '';
    selectedColorway = '';
    document.getElementById('colorway-filter').value = '';
    sortDateDesc = true;
    document.getElementById('sort-date').setAttribute('data-active', 'false');
    
    // If owned is being activated, deactivate wishlist
    if (showOwned) {
      showWishlist = false;
      wishlistBtn.classList.remove('active');
      wishlistBtn.setAttribute('data-active', 'false');
      ownedBtn.classList.add('active');
      ownedBtn.setAttribute('data-active', 'true');
      trackEvent('Engagement', 'Filter', 'Show Owned');
    } else {
      ownedBtn.classList.remove('active');
      ownedBtn.setAttribute('data-active', 'false');
      trackEvent('Engagement', 'Filter', 'Hide Owned');
    }
    
    currentPage = 1;
    updateClearFiltersButton();
    scrollToTopSmooth();
    displayYoyoCards();
  });

// Add helper for smooth scroll-to-top
function scrollToTopSmooth() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

  function clearAllFilters() {
    // Reset search
    document.getElementById('search').value = '';
    searchTerm = '';

    // Reset model filter
    selectedModel = '';
    const modelFilter = document.getElementById('model-filter');
    modelFilter.value = '';
    modelFilter.selectedIndex = 0;
    modelFilter.setAttribute('data-active', 'false');

    // Reset colorway filter
    selectedColorway = '';
    const colorwayFilter = document.getElementById('colorway-filter');
    colorwayFilter.value = '';
    colorwayFilter.selectedIndex = 0;
    colorwayFilter.setAttribute('data-active', 'false');
    
    // Reset filter display flags
    showWishlist = false;
    showOwned = false;
    
    // Reset sort orders
    modelSortType = 'alpha';
    modelSortDesc = false;
    colorwaySortType = 'alpha';
    colorwaySortDesc = false;
    sortDateDesc = true;

    // Update sort button icons
    const modelSortButton = document.getElementById('sort-model-filter');
    const colorwaySortButton = document.getElementById('sort-colorway-filter');
    const dateSortButton = document.getElementById('sort-date');
    
    if (modelSortButton) {
      updateSortButton(modelSortButton, 'alpha');
    }
    
    if (colorwaySortButton) {
      updateSortButton(colorwaySortButton, 'alpha');
    }
    
    if (dateSortButton) {
      dateSortButton.setAttribute('data-active', 'false');
    }
    
    // Reset filter buttons
    const wishlistBtn = document.getElementById('show-wishlist');
    const ownedBtn = document.getElementById('show-owned');
    
    if (wishlistBtn) {
      wishlistBtn.classList.remove('bg-yellow-900');
      wishlistBtn.classList.add('bg-gray-800');
      wishlistBtn.setAttribute('data-active', 'false');
    }
    
    if (ownedBtn) {
      ownedBtn.classList.remove('bg-blue-900');
      ownedBtn.classList.add('bg-gray-800');
      ownedBtn.setAttribute('data-active', 'false');
    }

    // Repopulate filters with default sorting
    populateModelFilter();
    populateColorwayFilter();

    // Update clear filters button state
    updateClearFiltersButton();
    scrollToTopSmooth();

    // Update display
    currentPage = 1;
    displayYoyoCards();
  }

  // Add event listener for clear filters button
  document.getElementById('clear-filters').addEventListener('click', () => {
    clearAllFilters();
    trackEvent('Engagement', 'Clear Filters');
  });

  setupModalListeners();
  addFilterControls();

  // Now fetch data (after Choices.js is ready)
  async function initializeApp() {
    await fetchYoyoData();
    await fetchSpecsData();
  }
  // Call the new initializer
  initializeApp();

  // Scroll to top button functionality
  const scrollBtn = document.getElementById('scroll-to-top');
  if (scrollBtn) {
    // start hidden
    scrollBtn.classList.add('hidden');

    // toggle visibility on real window scroll
    window.addEventListener('scroll', () => {
      const shouldShow = window.scrollY > 300;
      scrollBtn.classList.toggle('hidden', !shouldShow);
    });

    // wire click to your smooth-scroll helper
    scrollBtn.addEventListener('click', () => {
      scrollToTopSmooth();
      trackEvent('Engagement', 'Scroll To Top');
    });
  }

  // Analytics helper function
  function trackEvent(category, action, label = null, value = null) {
    if (typeof gtag === 'function') {
      gtag('event', action, {
        'event_category': category,
        'event_label': label,
        'value': value
      });
    }
  }

  // Track page views with additional parameters
  function trackPageView(pageTitle = document.title) {
    if (typeof gtag === 'function') {
      gtag('config', 'G-E9G3FZFQCX', {
        'page_title': pageTitle,
        'page_location': window.location.href,
        'page_path': window.location.pathname
      });
    }
  }

  // Track user preferences
  function trackUserPreferences() {
    const preferences = {
      'wishlist_count': localStorage.getItem('wishlist') ? JSON.parse(localStorage.getItem('wishlist')).length : 0,
      'owned_count': localStorage.getItem('owned') ? JSON.parse(localStorage.getItem('owned')).length : 0,
      'theme': localStorage.getItem('theme') || 'light'
    };
    
    if (typeof gtag === 'function') {
      gtag('set', 'user_properties', preferences);
    }
  }

  // Track initial page load and user preferences
  document.addEventListener('DOMContentLoaded', () => {
    // Track initial page view
    trackPageView();
    
    // Track user preferences
    trackUserPreferences();
  });

  document.querySelectorAll('.gradient-button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      trackEvent('Engagement', 'Footer Link Click', btn.textContent.trim());
    });
  });

  // Update scroll event listener for infinite scroll
  let isLoadingMore = false;
  window.addEventListener('scroll', debounce(() => {
    if (isLoadingMore) return;

    const scrollPosition = window.innerHeight + window.scrollY;
    const scrollThreshold = document.documentElement.scrollHeight - 800;
    const footer = document.querySelector('.app-footer');
    const footerRect = footer.getBoundingClientRect();
    const footerVisible = footerRect.top <= window.innerHeight;

    // Load more if we're near the bottom (before footer becomes visible)
    if (scrollPosition >= scrollThreshold) {
      const filtered = filterYoyos(yoyoData);
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = currentPage * itemsPerPage;
      
      if (endIndex < filtered.length) {
        isLoadingMore = true;
        currentPage++;
        displayYoyoCards(false);
        isLoadingMore = false;
      }
    }
  }, 100));

  // Add resize handler to ensure proper layout on orientation changes
  window.addEventListener('resize', debounce(() => {
    const newItemsPerPage = getItemsPerPage();
    if (newItemsPerPage !== itemsPerPage) {
      itemsPerPage = newItemsPerPage;
      currentPage = 1;
      displayYoyoCards(true);
    }
  }, 250));
});
