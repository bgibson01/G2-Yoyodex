// --- CONFIGURATION ---
const CONFIG = {
  yoyosDataUrl: 'https://script.google.com/macros/s/AKfycbxrN9pRzoObtPQvvl-Yny9EU4ROmIPpT7FAi1JfjQCErlCw30_EZ_dUmfiXooRZgN7KZQ/exec?sheet=yoyos',
  specsDataUrl: 'https://script.google.com/macros/s/AKfycbxrN9pRzoObtPQvvl-Yny9EU4ROmIPpT7FAi1JfjQCErlCw30_EZ_dUmfiXooRZgN7KZQ/exec?sheet=specs'
};

// --- DOM ELEMENTS ---
const elements = {
  search: document.getElementById('search'),
  container: document.getElementById('yoyo-container'),
  filterButtons: document.querySelectorAll('.filters button'),
  loadingIndicator: document.createElement('div')
};

// --- STATE ---
let allYoyos = [];
let filteredYoyos = [];

// ======================
// CORE FUNCTIONS (DEFINED FIRST)
// ======================

// Fetch data from URL
async function fetchData(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

// Merge yoyo data with specs
function mergeSpecs(yoyos, specs) {
  const specsMap = new Map(specs.map(spec => [spec.model, spec]));
  return yoyos.map((yoyo, index) => {
    if (!yoyo.model || !yoyo.colorway) {
      console.warn(`Missing data at row ${index + 1}`, yoyo);
      return null;
    }
    return {
      ...(specsMap.get(yoyo.model) || {}),
      ...yoyo,
      id: `${yoyo.model.toLowerCase()}-${yoyo.colorway.toLowerCase()}-${index}`,
      image_url: yoyo.image_url || 'assets/placeholder.jpg'
    };
  }).filter(Boolean);
}

// ======================
// UI FUNCTIONS
// ======================

// Show loading spinner
function showLoading() {
  elements.loadingIndicator.className = 'loading';
  elements.loadingIndicator.innerHTML = `
    <div class="loading-spinner"></div>
    <p>Loading yoyo database...</p>
  `;
  elements.container.replaceWith(elements.loadingIndicator);
}

// Hide loading spinner
function hideLoading() {
  if (elements.loadingIndicator.parentNode) {
    elements.loadingIndicator.replaceWith(elements.container);
  }
}

// Show error message
function showError(error) {
  console.error('Error:', error);
  elements.container.innerHTML = `
    <div class="error">
      <p>Failed to load data. Please try again later.</p>
      <p><small>${error.message}</small></p>
    </div>
  `;
}

// Render yoyo cards
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

// Render specs section HTML
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
      </div>
    </div>
  `;
}

// Toggle specs visibility
function toggleSpecs(element) {
  const container = element.nextElementSibling;
  container.classList.toggle('expanded');
  element.textContent = container.classList.contains('expanded') 
    ? '▼ Hide Technical Specs' 
    : '▶ Show Technical Specs';
}

// Set up event listeners
function setupEventListeners() {
  // Search handler
  elements.search.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    filteredYoyos = allYoyos.filter(yoyo => 
      yoyo.model.toLowerCase().includes(term) || 
      yoyo.colorway.toLowerCase().includes(term)
    );
    renderYoyos(filteredYoyos);
  });
  
  // Filter buttons
  elements.filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      elements.filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      filteredYoyos = filter === 'all' ? [...allYoyos] : allYoyos.filter(yoyo => yoyo.type === filter);
      renderYoyos(filteredYoyos);
    });
  });
}

// ======================
// INITIALIZATION
// ======================

// Main initialization function
async function init() {
  showLoading();
  try {
    const [yoyos, specs] = await Promise.all([
      fetchData(CONFIG.yoyosDataUrl),
      fetchData(CONFIG.specsDataUrl)
    ]);
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

// Start the app when DOM loads
document.addEventListener('DOMContentLoaded', init);

// Make toggleSpecs available globally
window.toggleSpecs = toggleSpecs;
