// ======================
// CONFIGURATION
// ======================
const CONFIG = {
  yoyosDataUrl: 'https://script.google.com/macros/s/AKfycby-6xXDgtZIaMa0-SV5kmNwDIh5IbCyvCH8bjgs22eUVu4HbtX6RiOYItejI5fMzJywzQ/exec?sheet=yoyos',
  specsDataUrl: 'https://script.google.com/macros/s/AKfycby-6xXDgtZIaMa0-SV5kmNwDIh5IbCyvCH8bjgs22eUVu4HbtX6RiOYItejI5fMzJywzQ/exec?sheet=specs'
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
  if (!dateString) return 'Date not available';
  
  try {
    // Handle both date formats (3/25/25 and 01/04/2025 21:27:22)
    const date = new Date(dateString.includes(' ') ? dateString : dateString + ' 00:00:00');
    
    if (isNaN(date.getTime())) {
      // Fallback for other formats
      return dateString;
    }
    
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    console.warn('Date formatting error:', e);
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

// ======================
// DATA PROCESSING UPDATES
// ======================
function mergeSpecs(yoyos, specs) {
  const specsMap = new Map();
  
  specs.forEach(spec => {
    if (!spec?.model) return;
    
    const normalizedModel = spec.model.toString().trim().toLowerCase();
    
    specsMap.set(normalizedModel, {
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

  return yoyos.map(yoyo => {
    const normalizedModel = yoyo.model?.toString().trim().toLowerCase() || '';
    const specsData = specsMap.get(normalizedModel) || {};
    
    // Process all columns with proper fallbacks
    return {
      model: yoyo.model || 'Unknown Model',
      colorway: yoyo.colorway || 'Standard',
      type: yoyo.type ? yoyo.type.split(',').map(t => t.trim()) : ['standard'],
      release_date: yoyo.release_date,
      quantity: yoyo.quantity ? parseInt(yoyo.quantity) : null,
      glitch_quantity: yoyo.glitch_quantity ? parseInt(yoyo.glitch_quantity) : null,
      price: yoyo.price ? `$${parseFloat(yoyo.price.replace(/[^0-9.]/g, ''))}` : null,
      image_url: yoyo.image_url || 'assets/placeholder.jpg',
      description: yoyo.description || '',
      last_updated: yoyo.last_updated || new Date().toISOString(),
      ...specsData,
      id: `${normalizedModel}-${(yoyo.colorway || 'standard').toLowerCase().replace(/\s+/g, '-')}`
    };
  });
}

// ======================
// UPDATED RENDER FUNCTION
// ======================
function renderYoyos(yoyos) {
  if (!yoyos?.length) {
    elements.container.innerHTML = '<p class="no-results">No yoyos found matching your criteria.</p>';
    return;
  }

  elements.container.innerHTML = yoyos.map(yoyo => `
    <div class="yoyo-card" data-id="${yoyo.id}" data-type="${yoyo.type.join(' ')}">
      <img src="${yoyo.image_url}" 
           alt="${yoyo.model} ${yoyo.colorway}" 
           class="yoyo-image"
           loading="lazy"
           onerror="this.src='assets/placeholder.jpg'">
      <div class="yoyo-info">
        <h2 class="yoyo-model">${yoyo.model}</h2>
        <p class="yoyo-colorway">${yoyo.colorway}</p>
        
        ${yoyo.price ? `<p class="yoyo-price">${yoyo.price}</p>` : ''}
        
        <div class="yoyo-meta">
          ${yoyo.release_date ? `<p><strong>Released:</strong> ${formatDate(yoyo.release_date)}</p>` : ''}
          ${yoyo.quantity !== null ? `<p><strong>Quantity:</strong> ${yoyo.quantity}</p>` : ''}
          ${yoyo.glitch_quantity ? `<p><strong>Glitch Versions:</strong> ${yoyo.glitch_quantity}</p>` : ''}
          ${yoyo.last_updated ? `<p class="last-updated"><small>Updated: ${formatDate(yoyo.last_updated)}</small></p>` : ''}
        </div>
        
        ${yoyo.description ? `<div class="yoyo-description">${yoyo.description}</div>` : ''}
        
        ${renderSpecsSection(yoyo)}
      </div>
    </div>
  `).join('');
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
  // Search functionality
  elements.search.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    filteredYoyos = allYoyos.filter(yoyo => 
      yoyo.model.toLowerCase().includes(term) || 
      yoyo.colorway.toLowerCase().includes(term) ||
      (yoyo.description && yoyo.description.toLowerCase().includes(term))
    );
    renderYoyos(filteredYoyos);
  });

  // Filter buttons
  elements.filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      elements.filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      filteredYoyos = filter === 'all' 
        ? [...allYoyos] 
        : allYoyos.filter(yoyo => yoyo.type.includes(filter));
      
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
