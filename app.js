// ======================
// 1. CONFIGURATION
// ======================
const CONFIG = {
  yoyosDataUrl: 'https://script.google.com/macros/s/AKfycby-6xXDgtZIaMa0-SV5kmNwDIh5IbCyvCH8bjgs22eUVu4HbtX6RiOYItejI5fMzJywzQ/exec?sheet=yoyos',
  specsDataUrl: 'https://script.google.com/macros/s/AKfycby-6xXDgtZIaMa0-SV5kmNwDIh5IbCyvCH8bjgs22eUVu4HbtX6RiOYItejI5fMzJywzQ/exec?sheet=specs',
  placeholderImage: 'assets/placeholder.jpg'
};

// ======================
// 2. DOM ELEMENTS
// ======================
const elements = {
  search: document.getElementById('search'),
  container: document.getElementById('yoyo-container'),
  filterButtons: document.querySelectorAll('.filters button'),
  loadingIndicator: document.getElementById('loading-indicator') || createLoadingIndicator()
};

function createLoadingIndicator() {
  const loader = document.createElement('div');
  loader.className = 'loading';
  loader.innerHTML = `
    <div class="loading-spinner"></div>
    <p>Loading yoyo database...</p>
  `;
  return loader;
}

// ======================
// 3. APPLICATION STATE
// ======================
let allYoyos = [];
let filteredYoyos = [];
let currentSort = { key: 'release_date', descending: true };

// ======================
// 4. CORE FUNCTIONS (Safe Updates)
// ======================

/**
 * Improved mergeSpecs with better error handling
 */
function mergeSpecs(yoyos, specs) {
  // First, validate inputs
  if (!Array.isArray(yoyos) || !Array.isArray(specs)) {
    console.error('Invalid data format - expected arrays');
    return [];
  }

  const specsMap = new Map();
  
  // Process specs with null checks
  specs.forEach(spec => {
    if (!spec || typeof spec !== 'object') return;
    
    const model = spec?.model?.toString().trim().toLowerCase();
    if (!model) return;
    
    specsMap.set(model, {
      diameter: spec.diameter,
      width: spec.width,
      weight: spec.weight,
      composition: spec.composition,
      pads: spec.pads,
      bearing: spec.bearing,
      axle: spec.axle,
      finish: spec.finish
    });
  });

  // Process yoyos with null checks - THIS IS WHERE THE FIX IS
  return yoyos.map(yoyo => {
    if (!yoyo || typeof yoyo !== 'object') {  // Added proper parentheses
      console.warn('Invalid yoyo object:', yoyo);
      return null;
    }

    const model = yoyo?.model?.toString().trim().toLowerCase();
    const colorway = yoyo?.colorway?.toString().trim().toLowerCase() || 'unknown';
    
    if (!model) {
      console.warn('Yoyo missing model:', yoyo);
      return null;
    }

    const specsData = specsMap.get(model) || {};
    
    return {
      ...yoyo,
      ...specsData,
      model: yoyo.model.toString().trim(), // Preserve original casing
      colorway: yoyo.colorway.toString().trim(), // Preserve original casing
      id: `${model}-${colorway}-${Date.now()}`.replace(/\s+/g, '-')
    };
  }).filter(Boolean); // Remove any null entries
}

/**
 * Safer date formatting
 */
function formatDate(dateString) {
  if (!dateString) return 'Date not available';
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) 
      ? dateString 
      : date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
  } catch (e) {
    return dateString;
  }
}

// ======================
// 5. RENDERING FUNCTIONS (Non-breaking changes)
// ======================

function renderSpecItem(label, value, unit = '') {
  if (!value) return '';
  return `
    <div class="spec-item">
      <span class="spec-name">${label}:</span>
      <span class="spec-value">${value}${unit}</span>
    </div>
  `;
}

function renderSpecsSection(yoyo) {
  const hasSpecs = yoyo.diameter || yoyo.width || yoyo.composition;
  if (!hasSpecs) return '';

  return `
    <button class="specs-toggle" onclick="toggleSpecs(this)">
      ▶ Show Technical Specifications
    </button>
    <div class="specs-container">
      <div class="specs-grid">
        ${renderSpecItem('Diameter', yoyo.diameter, 'mm')}
        ${renderSpecItem('Width', yoyo.width, 'mm')}
        ${renderSpecItem('Weight', yoyo.weight, 'g')}
        ${renderSpecItem('Material', yoyo.composition)}
        ${renderSpecItem('Response Pads', yoyo.pads)}
        ${renderSpecItem('Bearing', yoyo.bearing)}
        ${renderSpecItem('Axle', yoyo.axle)}
        ${renderSpecItem('Finish', yoyo.finish)}
      </div>
    </div>
  `;
}

function renderYoyos(yoyos) {
  if (!Array.isArray(yoyos) || !yoyos.length) {
    elements.container.innerHTML = `
      <div class="no-results">
        <p>No yoyos found matching your criteria.</p>
        <button onclick="resetFilters()">Reset filters</button>
      </div>
    `;
    return;
  }

  elements.container.innerHTML = yoyos.map(yoyo => `
    <div class="yoyo-card" data-id="${yoyo.id}" data-type="${yoyo.type.join(' ')}">
      <img src="${yoyo.image_url}" 
           alt="${yoyo.model} ${yoyo.colorway}" 
           class="yoyo-image"
           loading="lazy"
           onerror="this.src='${CONFIG.placeholderImage}'">
      
      <div class="yoyo-info">
        <div class="yoyo-header">
          <h2 class="yoyo-model">${yoyo.model}</h2>
          <span class="yoyo-colorway">${yoyo.colorway}</span>
        </div>
        
        ${yoyo.type?.length ? `
          <div class="yoyo-types">
            ${yoyo.type.map(t => `<span class="yoyo-type" data-type="${t.toLowerCase()}">${t}</span>`).join('')}
          </div>
        ` : ''}
        
        <div class="yoyo-meta">
          ${yoyo.release_date ? `<p><strong>Released:</strong> ${formatDate(yoyo.release_date)}</p>` : ''}
          ${yoyo.quantity ? `<p><strong>Quantity:</strong> ${yoyo.quantity}</p>` : ''}
          ${yoyo.glitch_quantity ? `<p><strong>Glitch Versions:</strong> ${yoyo.glitch_quantity}</p>` : ''}
        </div>
        
        ${yoyo.description ? `<div class="yoyo-description">${yoyo.description}</div>` : ''}
        
        ${renderSpecsSection(yoyo)}
      </div>
    </div>
  `).join('');
}

// ======================
// 6. FILTER/SORT FUNCTIONS (New but safe)
// ======================

function filterYoyos(searchTerm = '', filterType = 'all') {
  const term = searchTerm.toLowerCase().trim();
  
  return allYoyos.filter(yoyo => {
    const matchesSearch = term === '' ||
      yoyo.model.toLowerCase().includes(term) ||
      yoyo.colorway.toLowerCase().includes(term);
    
    const matchesFilter = filterType === 'all' || 
      yoyo.type.includes(filterType);
    
    return matchesSearch && matchesFilter;
  });
}

function sortYoyos(yoyos, key = 'release_date', descending = true) {
  return [...yoyos].sort((a, b) => {
    // Handle missing values
    const valA = a[key] || '';
    const valB = b[key] || '';
    
    // Special handling for dates
    if (key === 'release_date') {
      const dateA = new Date(valA).getTime();
      const dateB = new Date(valB).getTime();
      return descending ? dateB - dateA : dateA - dateB;
    }
    
    // Default string comparison
    return descending 
      ? valB.toString().localeCompare(valA.toString())
      : valA.toString().localeCompare(valB.toString());
  });
}

// ======================
// 7. EVENT HANDLERS (Updated carefully)
// ======================

function setupEventListeners() {
  // Debounced search
  let searchTimeout;
  elements.search.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      filteredYoyos = filterYoyos(e.target.value, getActiveFilter());
      renderYoyos(sortYoyos(filteredYoyos, currentSort.key, currentSort.descending));
    }, 300);
  });

  // Filter buttons
  elements.filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      elements.filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      filteredYoyos = filterYoyos(
        elements.search.value, 
        button.dataset.filter
      );
      renderYoyos(sortYoyos(filteredYoyos, currentSort.key, currentSort.descending));
    });
  });
}

function getActiveFilter() {
  const activeBtn = document.querySelector('.filters button.active');
  return activeBtn ? activeBtn.dataset.filter : 'all';
}

// ======================
// 8. UTILITY FUNCTIONS
// ======================

function showLoading() {
  elements.loadingIndicator.style.display = 'block';
  elements.container.style.display = 'none';
}

function hideLoading() {
  elements.loadingIndicator.style.display = 'none';
  elements.container.style.display = 'grid';
}

function showError(error) {
  console.error('Error:', error);
  elements.container.innerHTML = `
    <div class="error">
      <p>Failed to load data. Please try again later.</p>
      ${error.message ? `<p><small>${error.message}</small></p>` : ''}
      <button onclick="window.location.reload()">Retry</button>
    </div>
  `;
}

// ======================
// 9. INITIALIZATION (Safe)
// ======================

async function init() {
  showLoading();
  try {
    const [yoyos, specs] = await Promise.all([
      fetchData(CONFIG.yoyosDataUrl),
      fetchData(CONFIG.specsDataUrl)
    ]);
    
    allYoyos = mergeSpecs(yoyos, specs);
    filteredYoyos = sortYoyos([...allYoyos]);
    
    renderYoyos(filteredYoyos);
    setupEventListeners();
    
  } catch (error) {
    showError(error);
  } finally {
    hideLoading();
  }
}

// ======================
// 10. GLOBAL FUNCTIONS
// ======================

window.toggleSpecs = function(element) {
  const container = element.nextElementSibling;
  container.classList.toggle('expanded');
  element.textContent = container.classList.contains('expanded') 
    ? '▼ Hide Technical Specs' 
    : '▶ Show Technical Specs';
};

window.resetFilters = function() {
  elements.search.value = '';
  document.querySelector('.filters button[data-filter="all"]').click();
};

// Start the app
document.addEventListener('DOMContentLoaded', init);