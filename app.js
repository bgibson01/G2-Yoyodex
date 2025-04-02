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
  filterButtons: document.querySelectorAll('.filter-btn:not(#sort-newest)').forEach(button => {
    button.addEventListener('click', () => {
    // Remove active class from all buttons
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    // Add active class to clicked button
      button.classList.add('active');

      const filterValue = button.dataset.filter;
      filterYoyos(filterValue);
    });
  });
  loadingIndicator: document.getElementById('loading-indicator') || createLoadingIndicator()
};

function filterYoyos(type) {
  const cards = document.querySelectorAll('.yoyo-card');
  cards.forEach(card => {
    const cardType = card.querySelector('.yoyo-type').textContent; // Uses your existing .yoyo-type element
    if (type === 'all' || cardType === type) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

function createLoadingIndicator() {
  const loader = document.createElement('div');
  loader.id = 'loading-indicator';
  loader.className = 'loading';
  loader.innerHTML = `
    <div class="loading-spinner"></div>
    <p>Loading yoyo database...</p>
  `;
  loader.style.display = 'none';
  document.body.appendChild(loader);
  return loader;
}

// ======================
// 3. APPLICATION STATE
// ======================
let allYoyos = [];
let filteredYoyos = [];

// ======================
// 4. CORE UTILITY FUNCTIONS (Define these first)
// ======================

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

function formatDate(dateString) {
  if (!dateString) return 'Unknown date';

  try {
    // First try parsing as mm/dd/yy (Google Sheets US format)
    const parts = dateString.split('/');
    if (parts.length === 3) {
      // Handle 2-digit year (assume 21st century)
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      const isoDate = `${year}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      const date = new Date(isoDate);

      // Only proceed if date is valid
      if (!isNaN(date.getTime())) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString(undefined, options);
      }
    }

    // Fallback to default Date parsing if format doesn't match
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const options = { year: 'numeric', month: 'short', day: 'numeric' };
      return date.toLocaleDateString(undefined, options);
    }

    throw new Error('Unknown date format');
  } catch (e) {
    console.warn('Invalid date format:', dateString);
    return dateString; // Return raw string if parsing fails
  }
}

function mergeSpecs(yoyos, specs) {
  if (!Array.isArray(yoyos) || !Array.isArray(specs)) {
    console.error('Invalid data format - expected arrays');
    return [];
  }

  const specsMap = new Map();

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

  return yoyos.map(yoyo => {
    if (!yoyo || typeof yoyo !== 'object') {
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
  }).filter(Boolean);
}

// ======================
// 5. RENDERING FUNCTIONS
// ======================

function renderSpecItem(label, value, unit = '') {
  return value ? `
    <div class="spec-item">
      <span>${label}:</span>
      <span>${value}${unit}</span>
    </div>
  ` : '';
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
  if (!yoyos || !yoyos.length) {
    elements.container.innerHTML = '<p class="no-results">No yoyos found matching your criteria.</p>';
    return;
  }

  elements.container.innerHTML = yoyos.map(yoyo => {
    // Ensure type is always an array
    const types = Array.isArray(yoyo.type)
      ? yoyo.type
      : (typeof yoyo.type === 'string' ? yoyo.type.split(',') : []);

    return `
    <div class="yoyo-card" data-id="${yoyo.id}">
      <img src="${yoyo.image_url || CONFIG.placeholderImage}"
           alt="${yoyo.model} ${yoyo.colorway}"
           class="yoyo-image"
           loading="lazy"
           onerror="this.src='${CONFIG.placeholderImage}'">
      <div class="yoyo-info">
        <div class="yoyo-header">
          <h2 class="yoyo-model">${yoyo.model}</h2>
          <span class="yoyo-colorway">${yoyo.colorway}</span>
        </div>

        ${types.length ? `
          <div class="yoyo-types">
            ${types.map(t => `<span class="yoyo-type" data-type="${t.trim().toLowerCase()}">${t.trim()}</span>`).join('')}
          </div>
        ` : ''}

        <div class="yoyo-meta">
          ${yoyo.release_date ? `<p><strong>Released:</strong> ${formatDate(yoyo.release_date)}</p>` : ''}
		  ${yoyo.price ? `<p><strong>Price:</strong> $${yoyo.price}</p>` : ''}
          ${yoyo.quantity ? `<p><strong>Quantity:</strong> ${yoyo.quantity}</p>` : ''}
		  ${yoyo.glitch_quantity ? `<p><strong>Glitches:</strong> ${yoyo.glitch_quantity}</p>` : ''}
		  ${yoyo.description ? `<div class="yoyo-description">${yoyo.description}</div>` : ''}
        </div>

        ${renderSpecsSection(yoyo)}
      </div>
    </div>
    `;
  }).join('');
}

// ======================
// 6. UI FUNCTIONS
// ======================

function showLoading() {
  if (elements.loadingIndicator) {
    elements.loadingIndicator.style.display = 'block';
  }
  if (elements.container) {
    elements.container.style.display = 'none';
  }
}

function hideLoading() {
  if (elements.loadingIndicator) {
    elements.loadingIndicator.style.display = 'none';
  }
  if (elements.container) {
    elements.container.style.display = 'grid';
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

// ======================
// 7. EVENT HANDLERS
// ======================

function setupEventListeners() {
  let searchTimeout;

  elements.search.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const term = e.target.value.toLowerCase().trim();
      filteredYoyos = allYoyos.filter(yoyo =>
        yoyo.model.toLowerCase().includes(term) ||
        yoyo.colorway.toLowerCase().includes(term)
      );
      renderYoyos(filteredYoyos);
    }, 300);
  });

  elements.filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      elements.filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      const filter = button.dataset.filter;
      filteredYoyos = filter === 'all'
        ? [...allYoyos]
        : allYoyos.filter(yoyo => yoyo.type.includes(filter));

      renderYoyos(filteredYoyos);
    });
  });
}

// ======================
// 8. GLOBAL FUNCTIONS
// ======================

window.toggleSpecs = function(element) {
  const container = element.nextElementSibling;
  container.classList.toggle('expanded');
  element.textContent = container.classList.contains('expanded')
    ? '▼ Hide Technical Specifications'
    : '▶ Show Technical Specifications';
};

// ======================
// 9. INITIALIZATION
// ======================

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

// Start the application
document.addEventListener('DOMContentLoaded', init);
