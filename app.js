// ======================
// 1. CONFIGURATION
// ======================
const APP_STATE = {
  yoyos: [],
  filteredYoyos: [],
  currentSort: 'newest',
  currentFilter: 'all',
  searchTerm: ''
};

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
  filterButtons: document.querySelectorAll('.filter-btn'),
  sortButtons: document.querySelectorAll('.sort-btn'),
  loadingIndicator: document.getElementById('loading-indicator')
};

// ======================
// 3. UTILITY FUNCTIONS
// ======================
async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Fetch failed:', error);
    return [];
  }
}

function formatDate(dateString) {
  if (!dateString) return 'Unknown date';
  try {
    const date = new Date(dateString);
    return isNaN(date) ? dateString : date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
}

function mergeSpecs(yoyos, specs) {
  if (!Array.isArray(yoyos)) yoyos = [];
  if (!Array.isArray(specs)) specs = [];

  const specsMap = new Map();
  specs.forEach(spec => {
    if (spec?.model) {
      specsMap.set(spec.model.toLowerCase().trim(), {
        diameter: spec.diameter,
        width: spec.width,
        weight: spec.weight,
        composition: spec.composition,
        pads: spec.pads,
        bearing: spec.bearing,
        axle: spec.axle,
        finish: spec.finish
      });
    }
  });

  return yoyos.map(yoyo => {
    if (!yoyo?.model) return null;
    const modelKey = yoyo.model.toLowerCase().trim();
    return {
      ...yoyo,
      ...(specsMap.get(modelKey) || {}),
      model: yoyo.model.trim(),
      colorway: yoyo.colorway?.trim() || '',
      id: `${modelKey}-${yoyo.colorway?.toLowerCase().trim() || 'default'}-${Date.now()}`
    };
  }).filter(Boolean);
}

// ======================
// 4. UI FUNCTIONS
// ======================
function showLoading() {
  if (elements.loadingIndicator) elements.loadingIndicator.style.display = 'block';
  if (elements.container) elements.container.style.display = 'none';
}

function hideLoading() {
  if (elements.loadingIndicator) elements.loadingIndicator.style.display = 'none';
  if (elements.container) elements.container.style.display = 'grid';
}

function showError(error) {
  console.error('Error:', error);
  if (elements.container) {
    elements.container.innerHTML = `
      <div class="error">
        <p>Failed to load data. Please try again later.</p>
        <p><small>${error.message}</small></p>
        <button onclick="window.location.reload()">Retry</button>
      </div>
    `;
  }
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
        ${renderSpecItem('Response', yoyo.response)}
        ${renderSpecItem('Bearing', yoyo.bearing)}
        ${renderSpecItem('Axle', yoyo.axle)}
        ${renderSpecItem('Finish', yoyo.finish)}
      </div>
    </div>
  `;
}

// Function to render yoyo cards
function renderYoyos(yoyos) {
  if (!yoyos?.length) {
    elements.container.innerHTML = '<p class="no-results">No yoyos found matching your criteria.</p>';
    elements.container.classList.add('visible');
    return;
  }

  elements.container.innerHTML = yoyos.map(yoyo => {
    console.log('Rendering yoyo:', yoyo);
    const yoyoTypeBadge = yoyo.type ? `<div class="yoyo-type-badge">${yoyo.type}</div>` : '';
    return `
      <div class="yoyo-card" data-id="${yoyo.id}">
        ${yoyoTypeBadge}
        <img src="${CONFIG.placeholderImage}"
             data-src="${yoyo.image_url || CONFIG.placeholderImage}"
             alt="${yoyo.model} ${yoyo.colorway}"
             class="yoyo-image"
             loading="lazy"
             onerror="this.src='${CONFIG.placeholderImage}'">
        <div class="yoyo-info">
          <div class="yoyo-header">
            <h2 class="yoyo-model">${yoyo.model}</h2>
            <span class="yoyo-colorway">${yoyo.colorway}</span>
          </div>
          <div class="yoyo-meta">
            ${yoyo.release_date ? `
              <p data-release-date="${new Date(yoyo.release_date).toISOString()}">
                <strong>Released:</strong> ${formatDate(yoyo.release_date)}
              </p>` : ''}
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

  elements.container.classList.add('visible');
  lazyLoadImages();
}

// Setting up event listeners for sort buttons
elements.sortButtons.forEach(button => {
  button.addEventListener('click', () => sortYoyos(button.dataset.sort));
});

function lazyLoadImages() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        observer.unobserve(img);
      }
    });
  });

  document.querySelectorAll('.yoyo-image').forEach(img => observer.observe(img));
}

// ======================
// 6. CORE FUNCTIONALITY
// ======================
const SORT_METHODS = {
  newest: (a, b) => new Date(b.release_date || 0) - new Date(a.release_date || 0),
  oldest: (a, b) => new Date(a.release_date || 0) - new Date(b.release_date || 0),
  'name-asc': (a, b) => a.model.localeCompare(b.model),
  'name-desc': (a, b) => b.model.localeCompare(a.model)
};

function sortYoyos(method) {
  if (!SORT_METHODS[method]) return;

  APP_STATE.currentSort = method;
  APP_STATE.filteredYoyos.sort(SORT_METHODS[method]);

  elements.sortButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sort === method);
  });

  renderYoyos(APP_STATE.filteredYoyos);
}

function filterYoyos(type) {
  APP_STATE.currentFilter = type;

  APP_STATE.filteredYoyos = type === 'all'
    ? [...APP_STATE.yoyos]
    : APP_STATE.yoyos.filter(yoyo => {
        const yoyoType = yoyo.type?.toLowerCase() || '';
        return type === 'patreon'
          ? yoyoType.includes('patreon')
          : yoyoType === type.toLowerCase();
      });

  applySearch();
  sortYoyos(APP_STATE.currentSort);
}

function applySearch() {
  if (!APP_STATE.searchTerm) {
    renderYoyos(APP_STATE.filteredYoyos);
    return;
  }

  const results = APP_STATE.filteredYoyos.filter(yoyo =>
    yoyo.model.toLowerCase().includes(APP_STATE.searchTerm) ||
    yoyo.colorway.toLowerCase().includes(APP_STATE.searchTerm) ||
    (yoyo.description && yoyo.description.toLowerCase().includes(APP_STATE.searchTerm))
  );

  renderYoyos(results);
}

// ======================
// 7. EVENT HANDLERS
// ======================
function setupEventListeners() {
  let searchTimeout;

  elements.search.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      APP_STATE.searchTerm = e.target.value.trim().toLowerCase();
      filterYoyos(APP_STATE.currentFilter);
    }, 300);
  });

  elements.filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      elements.filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      filterYoyos(button.dataset.filter);
    });
  });

  elements.sortButtons.forEach(button => {
    button.addEventListener('click', () => sortYoyos(button.dataset.sort));
  });

  document.querySelector('.clear-search')?.addEventListener('click', () => {
    elements.search.value = '';
    APP_STATE.searchTerm = '';
    filterYoyos(APP_STATE.currentFilter);
  });
}

// ======================
// 8. INITIALIZATION
// ======================
async function init() {
  showLoading();
  try {
    const [yoyos, specs] = await Promise.all([
      fetchData(CONFIG.yoyosDataUrl),
      fetchData(CONFIG.specsDataUrl)
    ]);

    APP_STATE.yoyos = mergeSpecs(yoyos, specs);
    filterYoyos('all');
    setupEventListeners();

  } catch (error) {
    showError(error);
  } finally {
    hideLoading();
  }
}

// ======================
// 9. GLOBAL FUNCTIONS
// ======================
window.toggleSpecs = function(element) {
  const container = element.nextElementSibling;
  container.classList.toggle('expanded');
  element.textContent = container.classList.contains('expanded')
    ? '▼ Hide Technical Specifications'
    : '▶ Show Technical Specifications';
};

// Start the app
document.addEventListener('DOMContentLoaded', init);
