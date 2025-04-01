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
  const specsMap = new Map(specs.map(spec => {
    // Clean width value (remove weight if combined)
    const rawWidth = spec.width?.toString() || '';
    const cleanWidth = parseFloat(rawWidth.split(' ')[0]);
    
    return [spec.model.trim().toLowerCase(), {
      diameter: spec.diameter,
      width: cleanWidth || spec.width,
      weight: spec.weight || rawWidth.split(' ')[1]?.replace('g', ''),
      composition: spec.composition,
      pads: spec.pads,
      bearing: spec.bearing,
      axle: spec.axle,
      finish: spec.finish
    }];
  }));

  return yoyos.map(yoyo => {
    const normalizedModel = yoyo.model.trim().toLowerCase();
    return {
      ...yoyo,
      ...(specsMap.get(normalizedModel) || {}),
      id: `${normalizedModel}-${yoyo.colorway.toLowerCase()}-${Date.now()}`
    };
  });
}

// ======================
// RENDERING FUNCTIONS
// ======================
function renderSpecsSection(yoyo) {
  const hasSpecs = yoyo.diameter || yoyo.width || yoyo.composition;
  if (!hasSpecs) return '';

  return `
    <button class="specs-toggle" onclick="toggleSpecs(this)">
      ▶ Show Full Specifications
    </button>
    <div class="specs-container">
      <div class="specs-grid">
        ${yoyo.diameter ? `<div class="spec-item"><span>Diameter:</span> ${yoyo.diameter}mm</div>` : ''}
        ${yoyo.width ? `<div class="spec-item"><span>Width:</span> ${yoyo.width}mm</div>` : ''}
        ${yoyo.weight ? `<div class="spec-item"><span>Weight:</span> ${yoyo.weight}g</div>` : ''}
        ${yoyo.composition ? `<div class="spec-item"><span>Material:</span> ${yoyo.composition}</div>` : ''}
        ${yoyo.pads ? `<div class="spec-item"><span>Pads:</span> ${yoyo.pads}</div>` : ''}
        ${yoyo.bearing ? `<div class="spec-item"><span>Bearing:</span> ${yoyo.bearing}</div>` : ''}
        ${yoyo.axle ? `<div class="spec-item"><span>Axle:</span> ${yoyo.axle}</div>` : ''}
        ${yoyo.finish ? `<div class="spec-item"><span>Finish:</span> ${yoyo.finish}</div>` : ''}
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
