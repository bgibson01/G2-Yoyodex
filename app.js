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
  filterButtons: document.querySelectorAll('.filter-btn:not([data-sort])'),
  sortButtons: document.querySelectorAll('[data-sort]'),
  loadingIndicator: document.getElementById('loading-indicator')
};

// ======================
// 3. SORTING SYSTEM
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

  // Update UI
  elements.sortButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sort === method);
  });

  renderYoyos(APP_STATE.filteredYoyos);
}

// ======================
// 4. FILTERING SYSTEM
// ======================
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

// ======================
// 5. SEARCH FUNCTIONALITY
// ======================
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
// 6. RENDERING SYSTEM
// ======================
function renderYoyos(yoyos) {
  if (!yoyos?.length) {
    elements.container.innerHTML = '<p class="no-results">No yoyos found matching your criteria.</p>';
    elements.container.classList.add('visible');
    return;
  }

  const fragment = document.createDocumentFragment();

  yoyos.forEach(yoyo => {
    const card = document.createElement('div');
    card.className = 'yoyo-card';
    card.dataset.id = yoyo.id;
    card.dataset.type = yoyo.type?.toLowerCase() || '';
    card.dataset.date = yoyo.release_date;
    card.dataset.name = yoyo.model.toLowerCase();

    card.innerHTML = `
      <img src="${CONFIG.placeholderImage}"
           data-src="${yoyo.image_url || CONFIG.placeholderImage}"
           alt="${yoyo.model} ${yoyo.colorway}"
           class="yoyo-image"
           loading="lazy">
      <div class="yoyo-info">
        <div class="yoyo-header">
          <h2 class="yoyo-model">${yoyo.model}</h2>
          <span class="yoyo-colorway">${yoyo.colorway}</span>
        </div>
        ${yoyo.type ? `
          <div class="yoyo-types">
            <span class="yoyo-type-badge">${yoyo.type}</span>
          </div>
        ` : ''}
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
    `;

    fragment.appendChild(card);
  });

  elements.container.innerHTML = '';
  elements.container.appendChild(fragment);
  elements.container.classList.add('visible');
  lazyLoadImages();
}

function lazyLoadImages() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.onload = () => img.classList.add('loaded');
        observer.unobserve(img);
      }
    });
  }, { rootMargin: '200px' });

  document.querySelectorAll('.yoyo-image').forEach(img => {
    observer.observe(img);
  });
}

// ======================
// 7. EVENT HANDLERS
// ======================
function setupEventListeners() {
  let searchTimeout;

  // Search
  elements.search.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      APP_STATE.searchTerm = e.target.value.trim().toLowerCase();
      filterYoyos(APP_STATE.currentFilter);
    }, 300);
  });

  // Filter buttons
  elements.filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      elements.filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      filterYoyos(button.dataset.filter);
    });
  });

  // Sort buttons
  elements.sortButtons.forEach(button => {
    button.addEventListener('click', () => sortYoyos(button.dataset.sort));
  });

  // Clear search
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

// Start the app
document.addEventListener('DOMContentLoaded', init);
