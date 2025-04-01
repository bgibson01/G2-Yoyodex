// Configuration
const CONFIG = {
  yoyosDataUrl: 'https://script.google.com/macros/s/AKfycbxrN9pRzoObtPQvvl-Yny9EU4ROmIPpT7FAi1JfjQCErlCw30_EZ_dUmfiXooRZgN7KZQ/exec?sheet=yoyos',
  specsDataUrl: 'https://script.google.com/macros/s/AKfycbxrN9pRzoObtPQvvl-Yny9EU4ROmIPpT7FAi1JfjQCErlCw30_EZ_dUmfiXooRZgN7KZQ/exec?sheet=specs'
};

// DOM Elements
const elements = {
  search: document.getElementById('search'),
  container: document.getElementById('yoyo-container'),
  filterButtons: document.querySelectorAll('.filters button'),
  loadingIndicator: document.createElement('div') // Added loading element
};

// State
let allYoyos = [];
let filteredYoyos = [];

// Initialize
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

// New loading functions
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

// Enhanced merge function with duplicate prevention
function mergeSpecs(yoyos, specs) {
  const specsMap = new Map(specs.map(spec => [spec.model, spec]));
  
  return yoyos.map((yoyo, index) => {
    // Validate required fields
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
  }).filter(Boolean); // Remove null entries
}

// Rest of your existing functions remain the same...
// (renderYoyos, setupEventListeners, etc.)

// Updated toggleSpecs with animation
function toggleSpecs(element) {
  const container = element.nextElementSibling;
  container.classList.toggle('expanded');
  element.textContent = container.classList.contains('expanded') 
    ? '▼ Hide Technical Specs' 
    : '▶ Show Technical Specs';
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
window.toggleSpecs = toggleSpecs;
