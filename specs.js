// Debug flags
const DEBUG = true;
const DEBUG_DATA = true;
const DEBUG_UI = false;
const DEBUG_CACHE = false;

function debugLog(area, ...args) {
  if (!DEBUG) return;
  const enabled = {
    data: DEBUG_DATA,
    ui: DEBUG_UI,
    cache: DEBUG_CACHE
  };
  if (enabled[area]) {
    console.log(...args);
  }
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
      'page_path': window.location.pathname,
      'page_type': 'specs_comparison'
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  trackPageView();

  // Ensure APP_CONFIG is loaded
  if (!window.APP_CONFIG) {
    console.error('APP_CONFIG not loaded. Make sure config.js is loaded before specs.js');
    return;
  }

  // Initialize CONFIG object
  const CONFIG = {
    specsDataUrl: window.APP_CONFIG.API.SPECS_URL
  };

  // Initialize CACHE_CONFIG object
  const CACHE_CONFIG = {
    specsCacheKey: `${window.APP_CONFIG.APP_NAME}_${window.APP_CONFIG.CACHE.KEYS.SPECS}_v${window.APP_CONFIG.VERSION}`,
    cacheExpiration: window.APP_CONFIG.CACHE.EXPIRATION
  };

  let specsData = [];

  // DOM Elements
  const model1Select = document.getElementById('model1');
  const model2Select = document.getElementById('model2');
  const model3Select = document.getElementById('model3');
  const specsTable = document.getElementById('specs-table');
  const model1Header = document.getElementById('model1-header');
  const model2Header = document.getElementById('model2-header');
  const model3Header = document.getElementById('model3-header');

  // Initialize the page
  initializePage();

  async function initializePage() {
    // Set loading state
    [model1Select, model2Select, model3Select].forEach((select, index) => {
      select.innerHTML = `<option value="">Loading models...</option>`;
      select.disabled = true;
    });

    // Hide table headers initially
    specsTable.querySelector('thead').style.display = 'none';

    await fetchSpecsData();
    populateModelSelects();
    setupEventListeners();
    updateTable();

    // Enable selects after loading
    [model1Select, model2Select, model3Select].forEach(select => {
      select.disabled = false;
    });
  }

  function getCachedData(key) {
    const cached = localStorage.getItem(key);
    if (!cached) {
      if (DEBUG_CACHE) debugLog('cache', `No cache found for key: ${key}`);
      return null;
    }
    
    try {
      const { data, timestamp, version } = JSON.parse(cached);
      const currentVersion = window.APP_CONFIG.VERSION;
      
      // Check if cache is expired
      if (Date.now() - timestamp > CACHE_CONFIG.cacheExpiration) {
        if (DEBUG_CACHE) debugLog('cache', `Cache expired for key: ${key}. Last updated: ${new Date(timestamp).toLocaleString()}`);
        localStorage.removeItem(key);
        return null;
      }
      
      // Check if cache version is outdated
      if (typeof version !== 'undefined' && version !== currentVersion) {
        if (DEBUG_CACHE) debugLog('cache', `Cache version mismatch for key: ${key}. Cached: ${version}, Current: ${currentVersion}. Invalidating cache.`);
        localStorage.removeItem(key);
        return null;
      }
      
      if (DEBUG_CACHE) debugLog('cache', `Using cached data for key: ${key}. Version: ${version || 'unknown'}, Age: ${Math.round((Date.now() - timestamp) / 1000 / 60)} minutes`);
      return data;
    } catch (error) {
      console.error(`Error parsing cache for key: ${key}:`, error);
      localStorage.removeItem(key); // Remove corrupted cache
      return null;
    }
  }

  function setCachedData(key, data) {
    const cacheData = {
      data,
      timestamp: Date.now(),
      version: window.APP_CONFIG.VERSION
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
    if (DEBUG_CACHE) debugLog('cache', `Updated cache for key: ${key}. Version: ${cacheData.version}, Timestamp: ${new Date(cacheData.timestamp).toLocaleString()}`);
  }

  async function fetchSpecsData() {
    try {
      if (DEBUG_DATA) debugLog('data', 'Fetching specs data...');
      
      // Check cache first
      const cachedSpecs = getCachedData(CACHE_CONFIG.specsCacheKey);
      if (cachedSpecs) {
        if (DEBUG_CACHE) debugLog('cache', 'Using cached specs data');
        specsData = cachedSpecs.filter(s => s && s.model && String(s.model).trim() !== '');
        return;
      }

      // Fetch fresh data if cache is invalid or missing
      const resp = await fetch(CONFIG.specsDataUrl);
      specsData = await resp.json();
      specsData = specsData.filter(s => s && s.model && String(s.model).trim() !== '');
      
      // Cache the new data
      setCachedData(CACHE_CONFIG.specsCacheKey, specsData);
      
      if (DEBUG_DATA) debugLog('data', 'Loaded specs:', specsData, 'Count:', specsData.length);
    } catch (err) {
      console.error('Error fetching specs data:', err);
    }
  }

  function populateModelSelects() {
    const models = Array.from(new Set(specsData.map(s => s.model))).sort();
    const modelCounts = {};
    models.forEach(model => {
      modelCounts[model] = specsData.filter(s => s.model === model).length;
    });

    // Debug logging
    if (DEBUG_DATA) {
      console.log('All models:', models);
      console.log('First few specs with sort_key:', specsData.slice(0, 3).map(s => ({
        model: s.model,
        sort_key: s.sort_key
      })));
    }

    // Group models by their sort_key base name (part before underscore or space)
    const modelGroups = {};
    models.forEach(model => {
      const spec = specsData.find(s => s.model === model);
      if (!spec) {
        console.warn(`No spec found for model: ${model}`);
        return;
      }

      // Get the base name from sort_key (part before underscore or space)
      let baseName = null;
      if (spec.sort_key) {
        // Split by underscore first to get the full name before it
        const parts = spec.sort_key.split('_');
        const nameBeforeUnderscore = parts[0];
        
        // Special case for Loadout
        if (nameBeforeUnderscore.includes('Loadout')) {
          baseName = 'Loadout';
        } else {
          // Check if there are other models with similar names
          const hasSimilarModels = models.some(m => {
            if (m === model) return false;
            const otherSpec = specsData.find(s => s.model === m);
            if (!otherSpec || !otherSpec.sort_key) return false;
            
            const otherWords = otherSpec.sort_key.split('_')[0].split(' ');
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
        console.log(`- sort_key: ${spec.sort_key}`);
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

    [model1Select, model2Select, model3Select].forEach((select, index) => {
      // Store current value
      const currentValue = select.value;
      
      // Clear the select
      select.innerHTML = '';
      
      // Add default option
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = currentValue || `Select Model ${index + 1}${index === 2 ? ' (Optional)' : ''}`;
      select.appendChild(defaultOption);
      
      // Add top separator
      const topSeparator = document.createElement('option');
      topSeparator.disabled = true;
      topSeparator.textContent = '────────── Models ──────────';
      select.appendChild(topSeparator);
      
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
        select.appendChild(groupHeader);
        
        // Add all variants of this base model
        variants.forEach(model => {
          const opt = document.createElement('option');
          opt.value = model;
          opt.textContent = model;
          
          // Check if this model is selected in any other dropdown
          const isSelectedElsewhere = [model1Select, model2Select, model3Select].some(
            (otherSelect, otherIndex) => otherIndex !== index && otherSelect.value === model
          );
          
          if (isSelectedElsewhere) {
            opt.disabled = true;
            opt.style.color = 'var(--text-secondary)';
          }
          
          select.appendChild(opt);
        });
      });

      // Restore the selected value
      if (currentValue) {
        select.value = currentValue;
      }
    });
  }

  function sortOptions(options, sortType) {
    const optionsArray = Array.from(options);
    const firstOption = optionsArray.shift(); // Remove "Select Model" option

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

    // Add back "Select Model" option at the beginning
    optionsArray.unshift(firstOption);
    return optionsArray;
  }

  function setupEventListeners() {
    // Model selection
    [model1Select, model2Select, model3Select].forEach((select, index) => {
      select.addEventListener('change', () => {
        // Update the default option text
        const defaultOption = select.options[0];
        defaultOption.textContent = select.value || `Select Model ${index + 1}${index === 2 ? ' (Optional)' : ''}`;
        
        updateTable();
        updateHeaders();
        // Repopulate all selects to update disabled states
        populateModelSelects();
        // Restore selected values
        [model1Select, model2Select, model3Select].forEach(s => {
          if (s.value) {
            const option = Array.from(s.options).find(opt => opt.value === s.value);
            if (option) {
              s.selectedIndex = Array.from(s.options).indexOf(option);
            }
          }
        });

        if (select.value) {
          trackEvent('Specs Comparison', 'Select Model', `${index + 1}: ${select.value}`);
        }
      });

      // Add keyboard navigation
      select.addEventListener('keydown', (e) => {
        if (e.key.length === 1 && e.key.match(/[a-zA-Z0-9]/)) {
          const prefix = e.key.toUpperCase();
          const options = Array.from(select.options);
          const targetIndex = options.findIndex(opt => 
            opt.value && opt.value !== '' && 
            !opt.textContent.startsWith('──') &&
            opt.textContent.toUpperCase().startsWith(prefix)
          );
          
          if (targetIndex !== -1) {
            select.selectedIndex = targetIndex;
            select.value = options[targetIndex].value;
            // Update the default option text
            const defaultOption = select.options[0];
            defaultOption.textContent = select.value || `Select Model ${index + 1}${index === 2 ? ' (Optional)' : ''}`;
            updateTable();
            updateHeaders();

            if (select.value) {
              trackEvent('Specs Comparison', 'Select Model', `${index + 1}: ${select.value}`);
            }
          }
        }
      });
    });

    // Clear individual model buttons
    document.querySelectorAll('.clear-model-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modelNum = btn.dataset.model;
        const select = document.getElementById(`model${modelNum}`);
        select.value = '';
        // Update the default option text
        const defaultOption = select.options[0];
        defaultOption.textContent = `Select Model ${modelNum}${modelNum === '3' ? ' (Optional)' : ''}`;
        updateTable();
        updateHeaders();
        populateModelSelects(); // Repopulate to update disabled states

        trackEvent('Specs Comparison', 'Clear Model', `Model ${modelNum}`);
      });
    });

    // Clear all models button
    document.getElementById('clear-all-models').addEventListener('click', () => {
      [model1Select, model2Select, model3Select].forEach((select, index) => {
        select.value = '';
        // Update the default option text
        const defaultOption = select.options[0];
        defaultOption.textContent = `Select Model ${index + 1}${index === 2 ? ' (Optional)' : ''}`;
      });
      updateTable();
      updateHeaders();
      populateModelSelects(); // Repopulate to update disabled states

      trackEvent('Specs Comparison', 'Clear All Models');
    });
  }

  function updateHeaders() {
    model1Header.textContent = model1Select.value || 'Model 1';
    model2Header.textContent = model2Select.value || 'Model 2';
    model3Header.textContent = model3Select.value || 'Model 3';
  }

  function updateTable() {
    const selectedModels = [
      model1Select.value,
      model2Select.value,
      model3Select.value
    ].filter(Boolean);

    if (selectedModels.length === 0) {
      specsTable.querySelector('thead').style.display = 'none';
      specsTable.querySelector('tbody').innerHTML = '<tr><td colspan="4" class="no-selection">Select models to compare their specifications</td></tr>';
      return;
    }

    // Show table headers when models are selected
    specsTable.querySelector('thead').style.display = '';

    const specs = selectedModels.map(model => specsData.find(s => s.model === model));
    const specFields = [
      { key: 'model', label: 'Model' },
      { key: 'composition', label: 'Composition', custom: true },
      { key: 'dia', label: 'Diameter', unit: 'mm' },
      { key: 'wid', label: 'Width', unit: 'mm' },
      { key: 'wt', label: 'Weight', unit: 'g' },
      { key: 'pads', label: 'Response' },
      { key: 'bearing', label: 'Bearing' },
      { key: 'axle', label: 'Axle', unit: 'mm' },
      { key: 'released', label: 'Released' },
      { key: 'status', label: 'Status' },
      { key: 'source', label: 'Source' }
    ];

    // Update table headers
    const headerRow = specsTable.querySelector('thead tr');
    headerRow.innerHTML = '<th>Specification</th>';
    selectedModels.forEach((model, index) => {
      headerRow.innerHTML += `<th id="model${index + 1}-header">${model}</th>`;
    });

    let tableHtml = '';
    specFields.forEach(field => {
      const row = document.createElement('tr');
      
      // Add specification label
      const labelCell = document.createElement('td');
      labelCell.textContent = field.label;
      row.appendChild(labelCell);

      // Add values for each selected model
      specs.forEach(spec => {
        const valueCell = document.createElement('td');
        let value = '';
        
        if (field.custom && field.key === 'composition') {
          // Handle composition display
          const body = spec.body;
          const rims = spec.rims;
          if (body && body !== 'N/A' && body !== '-') {
            if (rims && rims !== 'N/A' && rims !== '-') {
              value = `${body} with ${rims} rims`;
            } else {
              value = body;
            }
          }
        } else {
          // Handle regular fields
          value = spec[field.key];
          if (field.unit && value && !String(value).includes(field.unit)) {
            value = `${value} ${field.unit}`;
          }
          if (field.key === 'released' && value) {
            const date = new Date(value);
            if (!isNaN(date)) {
              value = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            }
          }
        }

        valueCell.textContent = value || '-';
        row.appendChild(valueCell);
      });
      
      tableHtml += row.outerHTML;
    });

    specsTable.querySelector('tbody').innerHTML = tableHtml;

    // Track successful specs load
    trackEvent('Specs Comparison', 'Load Specs', 'Success');
  }

  // Track when specs fail to load
  function handleSpecsError(error) {
    console.error('Error fetching specs data:', error);
    
    // Track error
    trackEvent('Specs Comparison', 'Load Specs', 'Error', error.message);
  }
}); 