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

// Add a variable to track pagination
const PAGE_SIZE = 12; // Number of yoyos to load per page
let currentPage = 1;

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

// Add favorites functionality
const favorites = new Set(JSON.parse(localStorage.getItem('favorites')) || []);

// Function to toggle a favorite
function toggleFavorite(yoyoId) {
  if (favorites.has(yoyoId)) {
    favorites.delete(yoyoId);
  } else {
    favorites.add(yoyoId);
  }
  localStorage.setItem('favorites', JSON.stringify([...favorites]));
  renderYoyos(APP_STATE.filteredYoyos); // Re-render to update the favorite state
}

// Function to dynamically generate filter buttons
function generateFilterButtons(yoyos) {
  const filterContainer = document.querySelector('.filters'); // Matches your HTML structure
  if (!filterContainer) return;

  // Extract unique types from yoyos
  const types = Array.from(new Set(yoyos.map(yoyo => yoyo.type?.toLowerCase().trim()).filter(Boolean)));

  // Ensure "Patreon" and "Lottery" are separate buttons
  const normalizedTypes = types.flatMap(type => {
    if (type.includes('patreon') && type.includes('lottery')) {
      return ['patreon', 'lottery'];
    }
    return type === 'misc/other' ? 'misc' : type; // Rename "Misc/other" to "Misc"
  });

  // Remove duplicates after normalization
  const uniqueTypes = Array.from(new Set(normalizedTypes));

  // Add "All" and "Favorites" filter buttons
  filterContainer.innerHTML = `
    <button class="filter-btn active" data-filter="all">All</button>
    <button class="filter-btn" data-filter="favorites">Favorites</button>
    ${uniqueTypes.map(type => `
      <button class="filter-btn" data-filter="${type}">${type.charAt(0).toUpperCase() + type.slice(1)}</button>
    `).join('')}
  `;

  // Reattach event listeners to the new buttons
  elements.filterButtons = document.querySelectorAll('.filter-btn');
  elements.filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      elements.filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      filterYoyos(button.dataset.filter);
    });
  });
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

// Define the toggleSpecs function
function toggleSpecs(button) {
  const specsContainer = button.nextElementSibling;
  if (specsContainer) {
    const isExpanded = specsContainer.classList.toggle('expanded');
    button.innerHTML = isExpanded ? '&#9660; Hide Technical Specifications' : '&#9654; Show Technical Specifications';
  }
}

function renderSpecsSection(yoyo) {
  const hasSpecs = yoyo.diameter || yoyo.width || yoyo.composition;
  if (!hasSpecs) return '';

  return `
    <button class="specs-toggle" onclick="event.stopPropagation(); toggleSpecs(this)">
      \u25b6 Show Technical Specifications
    </button>
    <div class="specs-container">
      <div class="specs-grid">
        ${renderSpecItem('Diameter', yoyo.diameter, 'mm')}
        ${renderSpecItem('Width', yoyo.width, 'mm')}
        ${renderSpecItem('Weight', yoyo.weight, 'g')}
        ${renderSpecItem('Composition', yoyo.composition)}
        ${renderSpecItem('Pads', yoyo.pads)}
        ${renderSpecItem('Bearing', yoyo.bearing)}
        ${renderSpecItem('Axle', yoyo.axle)}
        ${renderSpecItem('Finish', yoyo.finish)}
      </div>
    </div>
  `;
}


function renderYoyos(yoyos, append = false) {
  if (!yoyos?.length && currentPage === 1) {
    elements.container.innerHTML = '<p class="no-results">No yoyos found matching your criteria.</p>';
    elements.container.classList.add('visible');
    return;
  }

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = currentPage * PAGE_SIZE;
  const yoyosToRender = yoyos.slice(startIndex, endIndex);

  const yoyoCards = yoyosToRender.map(yoyo => `
    <div class="yoyo-card" data-id="${yoyo.id}" onclick="showYoyoDetails(${JSON.stringify(yoyo).replace(/"/g, '&quot;')})">
      <button class="favorite-btn ${favorites.has(yoyo.id) ? 'favorited' : ''}" 
              onclick="event.stopPropagation(); toggleFavorite('${yoyo.id}')">
        ${favorites.has(yoyo.id) ? '★' : '☆'}
      </button>
      ${yoyo.type ? `<div class="yoyo-type-badge">${yoyo.type.replace(/,/g, ' ')}</div>` : ''}
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
  `).join('');

  if (append) {
    elements.container.innerHTML += yoyoCards;
  } else {
    elements.container.innerHTML = yoyoCards;
  }

  elements.container.classList.add('visible');
  lazyLoadImages();

  // Show or hide the "Load More" button
  const loadMoreButton = document.getElementById('load-more');
  if (yoyos.length > endIndex) {
    loadMoreButton.style.display = 'block';
  } else {
    loadMoreButton.style.display = 'none';
  }
}

// Add a "Load More" button to the HTML
document.querySelector('main').insertAdjacentHTML('beforeend', `
  <button id="load-more" class="load-more-btn">Load More</button>
`);

// Add event listener for the "Load More" button
document.getElementById('load-more').addEventListener('click', () => {
  currentPage++;
  renderYoyos(APP_STATE.filteredYoyos, true);
});

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

  if (type === 'favorites') {
    APP_STATE.filteredYoyos = APP_STATE.yoyos.filter(yoyo => favorites.has(yoyo.id));
  } else if (type === 'all') {
    APP_STATE.filteredYoyos = [...APP_STATE.yoyos];
  } else {
    APP_STATE.filteredYoyos = APP_STATE.yoyos.filter(yoyo => {
      const yoyoType = yoyo.type?.toLowerCase() || '';
      const typeList = yoyoType.split(',').map(t => t.trim()); // Split multiple types into an array
      return typeList.includes(type.toLowerCase()); // Check if the selected type exists in the array
    });
  }

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

function showYoyoDetails(yoyo) {
  const modal = document.getElementById('yoyo-modal');
  const modalBody = document.getElementById('modal-body');

  // Combine the main image and additional images
  const images = [yoyo.image_url || CONFIG.placeholderImage, ...(yoyo.additional_images || [])];

  // Populate the modal with yoyo details and image carousel
  modalBody.innerHTML = `
    <div class="image-carousel">
      <button class="carousel-arrow left-arrow" onclick="navigateCarousel(-1)">&#9664;</button>
      <img src="${images[0]}" alt="${yoyo.model} ${yoyo.colorway}" class="modal-image" id="carousel-image">
      <button class="carousel-arrow right-arrow" onclick="navigateCarousel(1)">&#9654;</button>
    </div>
    <h2>${yoyo.model}</h2>
    <p><strong>Colorway:</strong> ${yoyo.colorway}</p>
    ${yoyo.release_date ? `<p><strong>Release Date:</strong> ${formatDate(yoyo.release_date)}</p>` : ''}
    ${yoyo.price ? `<p><strong>Price:</strong> $${yoyo.price}</p>` : ''}
    ${yoyo.quantity ? `<p><strong>Quantity:</strong> ${yoyo.quantity}</p>` : ''}
    ${yoyo.glitch_quantity ? `<p><strong>Glitches:</strong> ${yoyo.glitch_quantity}</p>` : ''}
    ${yoyo.description ? `<p><strong>Description:</strong> ${yoyo.description}</p>` : ''}
    <div class="specs-container">
      <h3>Technical Specifications</h3>
      <div class="specs-grid">
        ${renderSpecItem('Diameter', yoyo.diameter, 'mm')}
        ${renderSpecItem('Width', yoyo.width, 'mm')}
        ${renderSpecItem('Weight', yoyo.weight, 'g')}
        ${renderSpecItem('Composition', yoyo.composition)}
        ${renderSpecItem('Pads', yoyo.pads)}
        ${renderSpecItem('Bearing', yoyo.bearing)}
        ${renderSpecItem('Axle', yoyo.axle)}
        ${renderSpecItem('Finish', yoyo.finish)}
      </div>
    </div>
  `;

  // Store the images in the modal for navigation
  modal.dataset.images = JSON.stringify(images);
  modal.dataset.currentIndex = 0;

  // Show the modal
  modal.style.display = 'flex';
}

// Function to navigate the carousel
function navigateCarousel(direction) {
  const modal = document.getElementById('yoyo-modal');
  const images = JSON.parse(modal.dataset.images);
  let currentIndex = parseInt(modal.dataset.currentIndex, 10);

  // Calculate the new index
  currentIndex = (currentIndex + direction + images.length) % images.length;

  // Update the image and current index
  document.getElementById('carousel-image').src = images[currentIndex];
  modal.dataset.currentIndex = currentIndex;
}

// Function to close the modal
function closeModal() {
  const modal = document.getElementById('yoyo-modal');
  modal.style.display = 'none';
  document.getElementById('yoyo-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
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
// Update the initialization function to generate filter buttons
async function init() {
  showLoading();
  try {
    const [yoyos, specs] = await Promise.all([
      fetchData(CONFIG.yoyosDataUrl),
      fetchData(CONFIG.specsDataUrl)
    ]);

    APP_STATE.yoyos = mergeSpecs(yoyos, specs);

    // Generate filter buttons based on fetched data
    generateFilterButtons(APP_STATE.yoyos);

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
// Update the toggleExpand function
window.toggleExpand = function(element) {
  const card = element.closest('.yoyo-card');
  const container = card.querySelector('.specs-container');
  const image = card.querySelector('.yoyo-image');
  container.classList.toggle('expanded');
  card.classList.toggle('expanded');
  image.classList.toggle('expanded');
  document.body.classList.toggle('expanded'); // Add this line to darken the background
};

// Start the app
document.addEventListener('DOMContentLoaded', init);
