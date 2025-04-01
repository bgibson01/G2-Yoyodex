/* ======================
   CONSTANTS & CONFIGURATION
   ====================== */

/**
 * API endpoint configuration
 * @constant
 * @type {Object}
 * @property {string} yoyosDataUrl - URL for yoyos data
 * @property {string} specsDataUrl - URL for specs data
 */
const CONFIG = {
  yoyosDataUrl: 'https://script.google.com/macros/s/AKfycbxrN9pRzoObtPQvvl-Yny9EU4ROmIPpT7FAi1JfjQCErlCw30_EZ_dUmfiXooRZgN7KZQ/exec?sheet=yoyos',
  specsDataUrl: 'https://script.google.com/macros/s/AKfycbxrN9pRzoObtPQvvl-Yny9EU4ROmIPpT7FAi1JfjQCErlCw30_EZ_dUmfiXooRZgN7KZQ/exec?sheet=specs'
};

/* ======================
   DOM ELEMENTS
   ====================== */
/**
 * Cached DOM elements for better performance
 * @constant
 * @type {Object}
 */
const elements = {
  search: document.getElementById('search'),
  container: document.getElementById('yoyo-container'),
  filterButtons: document.querySelectorAll('.filters button'),
  loadingIndicator: document.createElement('div') // Dynamically created loading element
};

/* ======================
   APPLICATION STATE
   ====================== */
let allYoyos = [];       // Master list of all yoyos
let filteredYoyos = [];  // Currently displayed yoyos

/* ======================
   CORE DATA FUNCTIONS
   ====================== */

/**
 * Fetches JSON data from a URL
 * @async
 * @param {string} url - API endpoint
 * @returns {Promise<Object>} Parsed JSON data
 * @throws {Error} If network response is not OK
 */
async function fetchData(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

/**
 * Merges yoyo data with specifications
 * @param {Array} yoyos - Yoyo colorway data
 * @param {Array} specs - Technical specifications
 * @returns {Array} Merged data with unique IDs
 */
function mergeSpecs(yoyos, specs) {
  // Create a Map for O(1) model lookups
  const specsMap = new Map(specs.map(spec => [spec.model, spec]));
  
  return yoyos.map((yoyo, index) => {
    // Data validation
    if (!yoyo.model || !yoyo.colorway) {
      console.warn(`Missing data at row ${index + 1}`, yoyo);
      return null;
    }

    return {
      ...(specsMap.get(yoyo.model) || {}), // Spread specs first (default values)
      ...yoyo,                            // Then spread yoyo data (overrides)
      id: `${yoyo.model.toLowerCase()}-${yoyo.colorway.toLowerCase()}-${index}`,
      image_url: yoyo.image_url || 'assets/placeholder.jpg'
    };
  }).filter(Boolean); // Remove null entries
}

/* ======================
   UI RENDERING FUNCTIONS
   ====================== */

/**
 * Renders yoyo cards to the DOM
 * @param {Array} yoyos - Array of yoyo objects to render
 */
function renderYoyos(yoyos) {
  if (!yoyos.length) {
    elements.container.innerHTML = '<p class="no-results">No yoyos match your search.</p>';
    return;
  }
  
  elements.container.innerHTML = yoyos.map(yoyo => `
    <div class="yoyo-card">
      <img src="${yoyo.image_url}" 
           alt="${yoyo.model} ${yoyo.colorway}" 
           class="yoyo-image"
           loading="lazy">
      <div class="yoyo-info">
        <h2 class="yoyo-model">${yoyo.model}</h2>
        <p class="yoyo-colorway">${yoyo.colorway}</p>
        ${renderSpecsSection(yoyo)}
      </div>
    </div>
  `).join('');
}

/**
 * Generates HTML for specs section
 * @param {Object} yoyo - Yoyo data object
 * @returns {string} HTML string
 */
function renderSpecsSection(yoyo) {
  if (!yoyo.diameter && !yoyo.width) return '';
  
  return `
    <button class="specs-toggle" onclick="toggleSpecs(this)">
      ▶ Show Technical Specs
    </button>
    <div class="specs-container">
      <div class="specs-grid">
        ${yoyo.diameter ? `<div class="spec-item"><span class="spec-name">Diameter:</span> <span class="spec-value">${yoyo.diameter}mm</span></div>` : ''}
        ${yoyo.width ? `<div class="spec-item"><span class="spec-name">Width:</span> <span class="spec-value">${yoyo.width}mm</span></div>` : ''}
        ${yoyo.composition ? `<div class="spec-item"><span class="spec-name">Material:</span> <span class="spec-value">${yoyo.composition}</span></div>` : ''}
      </div>
    </div>
  `;
}

/* ======================
   UI STATE MANAGEMENT
   ====================== */

function showLoading() {
  elements.loadingIndicator.className = 'loading';
  elements.loadingIndicator.innerHTML = `
    <div class="loading-spinner"></div>
    <p>Loading yoyo database...</p>
  `;
  elements.container.replaceWith(elements.loadingIndicator);
}

function hideLoading() {
  if (elements.loadingIndicator.parentNode) {
    elements.loadingIndicator.replaceWith(elements.container);
  }
}

function showError(error) {
  console.error('Error:', error);
  elements.container.innerHTML = `
    <div class="error">
      <p>Failed to load data. Please try again later.</p>
      <p><small>${error.message}</small></p>
    </div>
  `;
}

/* ======================
   EVENT HANDLERS
   ====================== */

/**
 * Sets up all event listeners
 */
function setupEventListeners() {
  // Search input handler
  elements.search.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    filteredYoyos = allYoyos.filter(yoyo => 
      yoyo.model.toLowerCase().includes(term) || 
      yoyo.colorway.toLowerCase().includes(term)
    );
    renderYoyos(filteredYoyos);
  });
  
  // Filter button handlers
  elements.filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      elements.filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      filteredYoyos = filter === 'all' 
        ? [...allYoyos] 
        : allYoyos.filter(yoyo => yoyo.type === filter);
      
      renderYoyos(filteredYoyos);
    });
  });
}

/**
 * Toggles specs visibility
 * @param {HTMLElement} element - The clicked toggle button
 */
function toggleSpecs(element) {
  const container = element.nextElementSibling;
  container.classList.toggle('expanded');
  element.textContent = container.classList.contains('expanded') 
    ? '▼ Hide Technical Specs' 
    : '▶ Show Technical Specs';
}

/* ======================
   APPLICATION BOOTSTRAP
   ====================== */

/**
 * Initializes the application
 * @async
 */
async function init() {
  showLoading();
  try {
    // Fetch data in parallel
    const [yoyos, specs] = await Promise.all([
      fetchData(CONFIG.yoyosDataUrl),
      fetchData(CONFIG.specsDataUrl)
    ]);
    
    // Process and render data
    allYoyos = mergeSpecs(yoyos, specs);
    filteredYoyos = [...allYoyos];
    renderYoyos(filteredYoyos);
    setupEventListeners();
    
  } catch (error) {
    showError(error);
  } finally {
    hideLoading();
  }
}

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// Make toggleSpecs available globally
window.toggleSpecs = toggleSpecs;
