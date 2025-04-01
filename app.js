// Configuration
const CONFIG = {
  yoyosDataUrl: 'https://script.google.com/macros/s/AKfycbxrN9pRzoObtPQvvl-Yny9EU4ROmIPpT7FAi1JfjQCErlCw30_EZ_dUmfiXooRZgN7KZQ/exec?sheet=yoyos',
  specsDataUrl: 'https://script.google.com/macros/s/AKfycbxrN9pRzoObtPQvvl-Yny9EU4ROmIPpT7FAi1JfjQCErlCw30_EZ_dUmfiXooRZgN7KZQ/exec?sheet=specs'
};

// DOM Elements
const elements = {
  search: document.getElementById('search'),
  container: document.getElementById('yoyo-container'),
  filterButtons: document.querySelectorAll('.filters button')
};

// State
let allYoyos = [];
let filteredYoyos = [];

// Initialize
async function init() {
  try {
    // Load both datasets in parallel
    const [yoyos, specs] = await Promise.all([
      fetchData(CONFIG.yoyosDataUrl),
      fetchData(CONFIG.specsDataUrl)
    ]);
    
    // Merge specs into yoyos
    allYoyos = mergeSpecs(yoyos, specs);
    filteredYoyos = [...allYoyos];
    
    renderYoyos(filteredYoyos);
    setupEventListeners();
    
  } catch (error) {
    console.error('Initialization error:', error);
    elements.container.innerHTML = `
      <div class="error">
        <p>Failed to load data. Please try again later.</p>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// Data functions
async function fetchData(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

function mergeSpecs(yoyos, specs) {
  const specsMap = new Map(specs.map(spec => [spec.model, spec]));
  return yoyos.map(yoyo => ({
    ...yoyo,
    ...specsMap.get(yoyo.model)
  }));
}

// Rendering
function renderYoyos(yoyos) {
  if (!yoyos.length) {
    elements.container.innerHTML = '<p class="no-results">No yoyos match your search.</p>';
    return;
  }
  
  elements.container.innerHTML = yoyos.map(yoyo => `
    <div class="yoyo-card">
      <img src="${yoyo.image_url || 'assets/placeholder.jpg'}" 
           alt="${yoyo.model} ${yoyo.colorway}" 
           class="yoyo-image"
           loading="lazy">
      <div class="yoyo-info">
        <h2 class="yoyo-model">${yoyo.model}</h2>
        <p class="yoyo-colorway">${yoyo.colorway}</p>
        
        <p><strong>Released:</strong> ${formatDate(yoyo.release_date)}</p>
        ${yoyo.quantity ? `<p><strong>Quantity:</strong> ${yoyo.quantity}</p>` : ''}
        
        ${renderSpecsSection(yoyo)}
        ${yoyo.description ? `<p class="description">${yoyo.description}</p>` : ''}
      </div>
    </div>
  `).join('');
}

function renderSpecsSection(yoyo) {
  if (!yoyo.diameter && !yoyo.width) return '';
  
  return `
    <div class="specs-toggle" onclick="toggleSpecs(this)">
      ▶ Show Technical Specs
    </div>
    <div class="specs-container">
      <div class="specs-grid">
        ${yoyo.diameter ? `<div class="spec-item"><span class="spec-name">Diameter:</span> <span class="spec-value">${yoyo.diameter}mm</span></div>` : ''}
        ${yoyo.width ? `<div class="spec-item"><span class="spec-name">Width:</span> <span class="spec-value">${yoyo.width}mm</span></div>` : ''}
        ${yoyo.composition ? `<div class="spec-item"><span class="spec-name">Material:</span> <span class="spec-value">${yoyo.composition}</span></div>` : ''}
        ${yoyo.finish ? `<div class="spec-item"><span class="spec-name">Finish:</span> <span class="spec-value">${yoyo.finish}</span></div>` : ''}
        ${yoyo.pads ? `<div class="spec-item"><span class="spec-name">Pads:</span> <span class="spec-value">${yoyo.pads}</span></div>` : ''}
        ${yoyo.bearing ? `<div class="spec-item"><span class="spec-name">Bearing:</span> <span class="spec-value">${yoyo.bearing}</span></div>` : ''}
        ${yoyo.axle ? `<div class="spec-item"><span class="spec-name">Axle:</span> <span class="spec-value">${yoyo.axle}</span></div>` : ''}
      </div>
    </div>
  `;
}

// UI Interactions
function setupEventListeners() {
  // Search
  elements.search.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    filteredYoyos = allYoyos.filter(yoyo => 
      yoyo.model.toLowerCase().includes(term) || 
      yoyo.colorway.toLowerCase().includes(term)
    );
    renderYoyos(filteredYoyos);
  });
  
  // Filters
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

// Helper functions
function formatDate(dateString) {
  if (!dateString) return 'Unknown';
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

function toggleSpecs(element) {
  const container = element.nextElementSibling;
  container.style.maxHeight = container.style.maxHeight ? null : `${container.scrollHeight}px`;
  element.textContent = container.style.maxHeight 
    ? '▼ Hide Technical Specs' 
    : '▶ Show Technical Specs';
}

// Start the app
document.addEventListener('DOMContentLoaded', init);

// Make toggleSpecs available globally
window.toggleSpecs = toggleSpecs;

// Refresh data every 5 minutes
setInterval(async () => {
  allYoyos = await loadData();
}, 60000);
