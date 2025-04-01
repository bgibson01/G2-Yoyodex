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
  console.log("=== MERGE SPECS DEBUG ===");
  
  // Debug model name matching
  const sampleYoyoModel = yoyos[0]?.model;
  const sampleSpecModel = specs[0]?.model;
  console.log(`Name matching test - Yoyo: "${sampleYoyoModel}" vs Spec: "${sampleSpecModel}"`);
  console.log(`Normalized comparison: "${sampleYoyoModel?.toLowerCase()}" vs "${sampleSpecModel?.toLowerCase()}"`);

  const specsMap = new Map();
  specs.forEach(spec => {
    const normalizedModel = spec.model?.toString().trim().toLowerCase();
    console.log(`Mapping specs for: ${normalizedModel}`, {
      diameter: spec.diameter,
      width: spec.width,
      composition: spec.composition
    });
    specsMap.set(normalizedModel, spec);
  });

  // Debug first 3 matches
  const merged = yoyos.map(yoyo => {
    const normalizedModel = yoyo.model?.toString().trim().toLowerCase();
    const foundSpecs = specsMap.get(normalizedModel);
    
    console.log(`Matching ${normalizedModel}:`, {
      found: !!foundSpecs,
      specs: foundSpecs || 'NO SPECS FOUND'
    });

    return {
      ...yoyo,
      ...foundSpecs,
      id: `${normalizedModel}-${yoyo.colorway?.toLowerCase()}-${Date.now()}`
    };
  });

  console.log("Final merged data sample:", merged.slice(0, 3));
  return merged;
}
// ======================
// RENDERING FUNCTIONS
// ======================
function renderSpecsSection(yoyo) {
  console.log(`Rendering specs for ${yoyo.model}:`, {
    diameter: yoyo.diameter,
    width: yoyo.width,
    composition: yoyo.composition
  });

  // First check if we have any specs to show
  const hasSpecs = yoyo.diameter || yoyo.width || yoyo.composition;
  if (!hasSpecs) {
    console.log(`No specs found for ${yoyo.model}`);
    return '';
  }

  return `
    <button class="specs-toggle" onclick="toggleSpecs(this)">
      ▶ Show Technical Specs
    </button>
    <div class="specs-container">
      <div class="specs-grid">
        ${yoyo.diameter ? `<div class="spec-item"><span>Diameter:</span> ${yoyo.diameter}mm</div>` : ''}
        ${yoyo.width ? `<div class="spec-item"><span>Width:</span> ${yoyo.width}mm</div>` : ''}
        ${yoyo.composition ? `<div class="spec-item"><span>Material:</span> ${yoyo.composition}</div>` : ''}
      </div>
    </div>
  `;
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
    console.log("=== RAW DATA DEBUG ===");
    console.log("First 3 yoyos:", JSON.parse(JSON.stringify(yoyos.slice(0, 3))));
    console.log("First 3 specs:", JSON.parse(JSON.stringify(specs.slice(0, 3))));
    console.log("Does specs data have diameter property?", specs[0]?.diameter !== undefined);
    console.log("Column headers from specs:", Object.keys(specs[0] || {}));
    
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
