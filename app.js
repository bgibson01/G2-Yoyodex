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
    const [yoyos, specs] = await Promise.all([
      fetchData(CONFIG.yoyosDataUrl),
      fetchData(CONFIG.specsDataUrl)
    ]);
    
    allYoyos = mergeSpecs(yoyos, specs);
    filteredYoyos = [...allYoyos];
    renderYoyos(filteredYoyos);
    setupEventListeners();
    
  } catch (error) {
    console.error('Error:', error);
    elements.container.innerHTML = '<p>Error loading data. Please try again later.</p>';
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
    ...(specsMap.get(yoyo.model) || {}),
    ...yoyo
  }));
}

// Rendering
function renderYoyos(yoyos) {
  elements.container.innerHTML = yoyos.map(yoyo => `
    <div class="yoyo-card">
      <img src="${yoyo.image_url || 'assets/placeholder.jpg'}" 
           alt="${yoyo.model}" 
           class="yoyo-image">
      <div class="yoyo-info">
        <h2 class="yoyo-model">${yoyo.model}</h2>
        <p class="yoyo-colorway">${yoyo.colorway}</p>
        ${renderSpecs(yoyo)}
      </div>
    </div>
  `).join('');
}

function renderSpecs(yoyo) {
  if (!yoyo.diameter) return '';
  return `
    <button class="specs-toggle" onclick="toggleSpecs(this)">
      ▶ Show Specs
    </button>
    <div class="specs-container">
      <div class="specs-grid">
        <div class="spec-item">
          <span class="spec-name">Diameter:</span>
          <span class="spec-value">${yoyo.diameter}mm</span>
        </div>
        ${yoyo.width ? `
        <div class="spec-item">
          <span class="spec-name">Width:</span>
          <span class="spec-value">${yoyo.width}mm</span>
        </div>` : ''}
      </div>
    </div>
  `;
}

// Event Handlers
function setupEventListeners() {
  elements.search.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    filteredYoyos = allYoyos.filter(yoyo => 
      yoyo.model.toLowerCase().includes(term) || 
      yoyo.colorway.toLowerCase().includes(term)
    );
    renderYoyos(filteredYoyos);
  });

  elements.filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      filteredYoyos = filter === 'all' 
        ? [...allYoyos] 
        : allYoyos.filter(yoyo => yoyo.type === filter);
      renderYoyos(filteredYoyos);
    });
  });
}

function toggleSpecs(element) {
  const container = element.nextElementSibling;
  container.style.display = container.style.display === 'none' ? 'block' : 'none';
  element.textContent = container.style.display === 'none' 
    ? '▶ Show Specs' 
    : '▼ Hide Specs';
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
window.toggleSpecs = toggleSpecs;
