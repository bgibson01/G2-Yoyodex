// ======================
// CONFIGURATION
// ======================
const CONFIG = {
  yoyosDataUrl: 'https://script.google.com/macros/s/AKfycbxrN9pRzoObtPQvvl-Yny9EU4ROmIPpT7FAi1JfjQCErlCw30_EZ_dUmfiXooRZgN7KZQ/exec?sheet=yoyos',
  specsDataUrl: 'https://script.google.com/macros/s/AKfycbxrN9pRzoObtPQvvl-Yny9EU4ROmIPpT7FAi1JfjQCErlCw30_EZ_dUmfiXooRZgN7KZQ/exec?sheet=specs'
};

// ======================
// DOM ELEMENTS
// ======================
const elements = {
  search: document.getElementById('search'),
  container: document.getElementById('yoyo-container'),
  filterButtons: document.querySelectorAll('.filters button'),
  loadingIndicator: document.createElement('div')
};

// ======================
// APPLICATION STATE
// ======================
let allYoyos = [];
let filteredYoyos = [];

// ======================
// HELPER FUNCTIONS
// ======================
function formatDate(dateString) {
  if (!dateString) return 'Unknown date';
  try {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  } catch (e) {
    console.warn('Invalid date format:', dateString);
    return dateString;
  }
}

async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Fetch failed:', error);
    throw error;
  }
}

function mergeSpecs(yoyos, specs) {
  // Create a normalized specs map
  const specsMap = new Map();
  
  specs.forEach(spec => {
    if (!spec.model) return;
    
    // Normalize model name (trim and lowercase)
    const normalizedModel = spec.model.toString().trim().toLowerCase();
    
    // Parse combined width/weight if needed
    let width = spec.width;
    let weight = spec.weight;
    
    if (width && typeof width === 'string') {
      const parts = width.split(' ');
      width = parseFloat(parts[0]);
      if (parts[1] && !weight) {
        weight = parts[1].replace('g', '');
      }
    }
    
    specsMap.set(normalizedModel, {
      diameter: spec.diameter,
      width: width,
      weight: weight,
      composition: spec.composition,
      pads: spec.pads,
      bearing: spec.bearing,
      axle: spec.axle,
      finish: spec.finish
    });
  });

  // Merge with yoyos
  return yoyos.map(yoyo => {
    const normalizedModel = yoyo.model.toString().trim().toLowerCase();
    const specsData = specsMap.get(normalizedModel) || {};
    
    console.log(`Merging ${yoyo.model}`, {
      found: specsMap.has(normalizedModel),
      specs: specsData
    });
    
    return {
      ...yoyo,
      ...specsData,
      id: `${normalizedModel}-${yoyo.colorway.toLowerCase()}-${Date.now()}`
    };
  });
}

// ======================
// RENDERING FUNCTIONS
// ======================
function renderSpecsSection(yoyo) {
  const hasSpecs = yoyo.diameter || yoyo.width || yoyo.composition;
  if (!hasSpecs) {
    console.log(`No specs found for ${yoyo.model}`);
    return '';
  }

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

function renderSpecItem(label, value, unit = '') {
  return value ? `
    <div class="spec-item">
      <span>${label}:</span>
      <span>${value}${unit}</span>
    </div>
  ` : '';
}

function renderYoyos(yoyos) {
  if (!yoyos || !yoyos.length) {
    elements.container.innerHTML = '<p class="no-results">No yoyos found matching your criteria.</p>';
    return;
  }

  elements.container.innerHTML = yoyos.map(yoyo => `
    <div class="yoyo-card" data-id="${yoyo.id}">
      <img src="${yoyo.image_url}" 
           alt="${yoyo.model} ${yoyo.colorway}" 
           class="yoyo-image"
           loading="lazy"
           onerror="this.src='assets/placeholder.jpg'">
      <div class="yoyo-info">
        <h2 class="yoyo-model">${yoyo.model}</h2>
        <p class="yoyo-colorway">${yoyo.colorway}</p>
        
        <div class="yoyo-meta">
          ${yoyo.release_date ? `<p><strong>Released:</strong> ${formatDate(yoyo.release_date)}</p>` : ''}
          ${yoyo.quantity ? `<p><strong>Quantity:</strong> ${yoyo.quantity}</p>` : ''}
          ${yoyo.glitch_quantity > 0 ? `<p><strong>Glitch Versions:</strong> ${yoyo.glitch_quantity}</p>` : ''}
        </div>
        
        ${yoyo.description ? `<div class="yoyo-description">${yoyo.description}</div>` : ''}
        
        ${renderSpecsSection(yoyo)}
      </div>
    </div>
  `).join('');
}

// ======================
// UI FUNCTIONS
// ======================
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

function toggleSpecs(element) {
  const container = element.nextElementSibling;
  container.classList.toggle('expanded');
  element.textContent = container.classList.contains('expanded') 
    ? '▼ Hide Technical Specs' 
    : '▶ Show Technical Specs';
}

// ======================
// EVENT HANDLERS
// ======================
function setupEventListeners() {
  elements.search.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    filteredYoyos = allYoyos.filter(yoyo => 
      yoyo.model.toLowerCase().includes(term) || 
      yoyo.colorway.toLowerCase().includes(term) ||
      (yoyo.description && yoyo.description.toLowerCase().includes(term))
    );
    renderYoyos(filteredYoyos);
  });

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

// ======================
// INITIALIZATION
// ======================
async function init() {
  showLoading();
  try {
    const [yoyos, specs] = await Promise.all([
      fetchData(CONFIG.yoyosDataUrl),
      fetchData(CONFIG.specsDataUrl)
    ]);
    
    // DEBUG: RAW DATA CHECK
    console.log("Raw specs data sample:", specs.slice(0, 3));
    console.log("Sample model matching:", {
      yoyoModel: yoyos[0].model,
      specsModel: specs[0]?.model,
      normalizedYoyo: yoyos[0].model.trim().toLowerCase(),
      normalizedSpecs: specs[0]?.model?.trim().toLowerCase()
    });
    
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

// Start the application
document.addEventListener('DOMContentLoaded', init);

// Make toggleSpecs available globally
window.toggleSpecs = toggleSpecs;
