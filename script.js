document.addEventListener('DOMContentLoaded', () => {
  // Register service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then((registration) => {
          console.log('ServiceWorker registration successful');
        })
        .catch((err) => {
          console.log('ServiceWorker registration failed: ', err);
        });
    });
  }

  // Handle install prompt
  let deferredPrompt;
  const installButton = document.createElement('button');
  installButton.style.display = 'none';
  installButton.textContent = 'Install App';
  installButton.className = 'install-button';
  installButton.style.position = 'fixed';
  installButton.style.bottom = '20px';
  installButton.style.right = '20px';
  installButton.style.padding = '10px 20px';
  installButton.style.backgroundColor = '#4CAF50';
  installButton.style.color = 'white';
  installButton.style.border = 'none';
  installButton.style.borderRadius = '5px';
  installButton.style.cursor = 'pointer';
  installButton.style.zIndex = '1000';
  document.body.appendChild(installButton);

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show the install button
    installButton.style.display = 'block';
  });

  installButton.addEventListener('click', () => {
    // Hide the app provided install prompt
    installButton.style.display = 'none';
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      // Clear the saved prompt since it can't be used again
      deferredPrompt = null;
    });
  });

  // Listen for successful installation
  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    installButton.style.display = 'none';
  });

  const CONFIG = {
    yoyosDataUrl: 'https://script.google.com/macros/s/AKfycby-6xXDgtZIaMa0-SV5kmNwDIh5IbCyvCH8bjgs22eUVu4HbtX6RiOYItejI5fMzJywzQ/exec?sheet=yoyos',
    specsDataUrl: 'https://script.google.com/macros/s/AKfycby-6xXDgtZIaMa0-SV5kmNwDIh5IbCyvCH8bjgs22eUVu4HbtX6RiOYItejI5fMzJywzQ/exec?sheet=specs',
    placeholderImage: 'assets/placeholder.jpg'
  };

  const CACHE_CONFIG = {
    yoyosCacheKey: 'yoyodex_yoyos_cache',
    specsCacheKey: 'yoyodex_specs_cache',
    cacheExpiration: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  };

  const yoyoGrid = document.getElementById('yoyo-grid');
  const modal = document.getElementById('modal');
  const closeModalBtn = document.getElementById('close-modal');
  const modalOverlay = document.getElementById('modal-overlay');
  const modalMainImage = document.getElementById('modal-main-image');
  const modalImages = document.getElementById('modal-images');
  const paginationContainer = document.getElementById('pagination-container'); // Pagination container

  let currentPage = 1;
  let itemsPerPage = getItemsPerPage(); // Dynamically determine items per page
  let yoyoData = [];
  let specsData = [];
  let searchTerm = '';
  let selectedModel = '';
  let sortDateDesc = true; // Default to newest first
  let showFavorites = false;
  let showOwned = false;
  let isLoading = true;
  let selectedColorway = '';
  let modelSortType = 'alpha'; // 'alpha' or 'quantity'
  let modelSortDesc = false;
  let colorwaySortType = 'alpha';
  let colorwaySortDesc = false;

  function getItemsPerPage() {
    const width = window.innerWidth;
    if (width >= 1680) return 24;
    if (width >= 1280) return 18;
    if (width >= 1024) return 14;
    if (width >= 640)  return 10;
    return 6;                     
  }

  window.addEventListener('resize', () => {
    const newItemsPerPage = getItemsPerPage();
    if (newItemsPerPage !== itemsPerPage) {
      itemsPerPage = newItemsPerPage;
      currentPage = 1;
      displayYoyoCards();
    }
  });

  function getCachedData(key) {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_CONFIG.cacheExpiration) {
      localStorage.removeItem(key);
      return null;
    }
    
    return data;
  }

  function setCachedData(key, data) {
    const cacheData = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  }

  async function fetchYoyoData() {
    const mainLoadingSpinner = document.getElementById('main-loading-spinner');
    const yoyoGrid = document.getElementById('yoyo-grid');
    
    try {
      // Show loading spinner, hide grid
      if (mainLoadingSpinner) mainLoadingSpinner.style.display = 'flex';
      if (yoyoGrid) {
        yoyoGrid.style.display = 'grid'; // Keep grid visible but empty
        yoyoGrid.innerHTML = ''; // Clear any existing content
      }
      
      // Try to get cached data first
      const cachedYoyos = getCachedData(CACHE_CONFIG.yoyosCacheKey);
      if (cachedYoyos) {
        yoyoData = cachedYoyos;
        console.log('Using cached yoyo data');
        await fetchSpecsData();
        populateModelFilter();
        populateColorwayFilter();
        return;
      }
      
      console.log('Fetching yoyo data...');
      const response = await fetch(CONFIG.yoyosDataUrl);
      yoyoData = await response.json();
      console.log('Fetched Yoyo Data:', yoyoData);
      
      // Cache the fetched data
      setCachedData(CACHE_CONFIG.yoyosCacheKey, yoyoData);
      
      await fetchSpecsData();
      populateModelFilter();
      populateColorwayFilter();
    } catch (error) {
      console.error('Error fetching yoyo data:', error);
      yoyoData = []; // Initialize as empty array if error
      populateModelFilter();
      populateColorwayFilter();
    } finally {
      // Hide loading spinner, show grid
      if (mainLoadingSpinner) mainLoadingSpinner.style.display = 'none';
      isLoading = false;
      displayYoyoCards();
    }
  }

  async function fetchSpecsData() {
    try {
      // Try to get cached specs first
      const cachedSpecs = getCachedData(CACHE_CONFIG.specsCacheKey);
      if (cachedSpecs) {
        specsData = cachedSpecs;
        console.log('Using cached specs data');
        populateModelFilter();
        populateColorwayFilter();
        return;
      }
      
      console.log('Fetching specs data...');
      const response = await fetch(CONFIG.specsDataUrl);
      specsData = await response.json();
      console.log('Fetched Specs Data:', specsData);
      
      if (!Array.isArray(specsData)) {
        console.error('Specs data is not an array:', specsData);
        specsData = [];
      }
      
      // Cache the fetched data
      setCachedData(CACHE_CONFIG.specsCacheKey, specsData);
      
      populateModelFilter();
      populateColorwayFilter();
    } catch (error) {
      console.error('Error fetching specs data:', error);
      specsData = [];
      populateModelFilter();
      populateColorwayFilter();
    }
  }

  function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function sortOptions(options, sortType) {
    const optionsArray = Array.from(options);
    const firstOption = optionsArray.shift(); // Remove "All" option

    optionsArray.sort((a, b) => {
      if (sortType === 'quantity') {
        // Extract numbers from parentheses and sort highest to lowest
        const countA = parseInt(a.textContent.match(/\((\d+)\)/)[1]);
        const countB = parseInt(b.textContent.match(/\((\d+)\)/)[1]);
        return countB - countA;
      } else {
        // Alpha sort A-Z by text content without the count
        const textA = a.textContent.replace(/\s*\(\d+\)$/, '');
        const textB = b.textContent.replace(/\s*\(\d+\)$/, '');
        return textA.localeCompare(textB);
      }
    });

    // Add back "All" option at the beginning
    optionsArray.unshift(firstOption);
    return optionsArray;
  }

  function updateSortButton(button, sortType) {
    const icon = button.querySelector('.sort-icon');
    icon.textContent = sortType === 'alpha' ? 'A↓' : '#↓';
    button.dataset.sort = sortType;
    
    // Set active state
    if (sortType === 'quantity') {
      button.setAttribute('data-active', 'true');
    } else {
      button.setAttribute('data-active', 'false');
    }
  }

  function populateModelFilter() {
    const modelFilter = document.getElementById('model-filter');
    let filteredYoyos = yoyoData;

    // If a colorway is selected, filter yoyos by that colorway first
    if (selectedColorway) {
      filteredYoyos = filteredYoyos.filter(y => y.colorway === selectedColorway);
    }

    const models = Array.from(new Set(filteredYoyos.map(y => y.model))).sort();
    const modelCounts = {};
    models.forEach(model => {
      modelCounts[model] = filteredYoyos.filter(y => y.model === model).length;
    });

    // Store current selection
    const currentSelection = modelFilter.value;

    modelFilter.innerHTML = `<option value="">All Models (${filteredYoyos.length})</option>`;
    models.forEach(model => {
      const opt = document.createElement('option');
      opt.value = model;
      opt.textContent = `${model} (${modelCounts[model]})`;
      modelFilter.appendChild(opt);
    });

    // Sort options based on current sort settings
    const sortedOptions = sortOptions(modelFilter.options, modelSortType);
    modelFilter.innerHTML = '';
    sortedOptions.forEach(opt => modelFilter.appendChild(opt));
    
    // Restore selection if it still exists in the filtered list
    if (currentSelection && models.includes(currentSelection)) {
      modelFilter.value = currentSelection;
    } else {
      modelFilter.selectedIndex = 0;
    }
  }

  function populateColorwayFilter() {
    const colorwayFilter = document.getElementById('colorway-filter');
    let filteredYoyos = yoyoData;

    // If a model is selected, filter yoyos by that model first
    if (selectedModel) {
      filteredYoyos = filteredYoyos.filter(y => y.model === selectedModel);
    }

    const colorways = Array.from(new Set(filteredYoyos.map(y => y.colorway))).sort();
    const colorwayCounts = {};
    colorways.forEach(colorway => {
      colorwayCounts[colorway] = filteredYoyos.filter(y => y.colorway === colorway).length;
    });

    // Store current selection
    const currentSelection = colorwayFilter.value;

    colorwayFilter.innerHTML = `<option value="">All Colorways (${filteredYoyos.length})</option>`;
    colorways.forEach(colorway => {
      const opt = document.createElement('option');
      opt.value = colorway;
      opt.textContent = `${colorway} (${colorwayCounts[colorway]})`;
      colorwayFilter.appendChild(opt);
    });

    // Sort options based on current sort settings
    const sortedOptions = sortOptions(colorwayFilter.options, colorwaySortType);
    colorwayFilter.innerHTML = '';
    sortedOptions.forEach(opt => colorwayFilter.appendChild(opt));
    
    // Restore selection if it still exists in the filtered list
    if (currentSelection && colorways.includes(currentSelection)) {
      colorwayFilter.value = currentSelection;
    } else {
      colorwayFilter.selectedIndex = 0;
    }
  }

  function parseDate(dateString) {
    if (!dateString) return new Date(0);
    
    // Handle your date format "Month DD YYYY"
    const parts = dateString.match(/([A-Za-z]+)\s+(\d+)\s+(\d{4})/);
    if (parts) {
      const months = {
        'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
        'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
      };
      return new Date(parts[3], months[parts[1]], parts[2]);
    }
    return new Date(dateString);
  }

  function filterYoyos(yoyos) {
    if (!yoyos) return [];
    
    return yoyos.filter(yoyo => {
      if (!yoyo) return false;

      const searchTerms = (searchTerm || '').toLowerCase().split(' ').filter(term => term.length > 0);
      
      // Check model and colorway filters
      if ((selectedModel && yoyo.model !== selectedModel) ||
          (selectedColorway && yoyo.colorway !== selectedColorway)) {
        return false;
      }
      
      // Check favorites filter
      if (showFavorites) {
        const favKey = `fav_${yoyo.model}_${yoyo.colorway}`;
        if (localStorage.getItem(favKey) !== '1') {
          return false;
        }
      }
      
      // Check owned filter
      if (showOwned) {
        const ownedKey = `owned_${yoyo.model}_${yoyo.colorway}`;
        if (localStorage.getItem(ownedKey) !== '1') {
          return false;
        }
      }

      // If no search terms, return true (filters already applied)
      if (searchTerms.length === 0) {
        return true;
      }

      // Match all search terms
      const modelText = String(yoyo.model || '').toLowerCase();
      const colorwayText = String(yoyo.colorway || '').toLowerCase();
      const typeText = String(yoyo.type || '').toLowerCase();
      const descriptionText = String(yoyo.description || '').toLowerCase();

      return searchTerms.every(term => 
        modelText.includes(term) ||
        colorwayText.includes(term) ||
        typeText.includes(term) ||
        descriptionText.includes(term)
      );
    });
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  function updateClearFiltersButton() {
    const clearFiltersBtn = document.getElementById('clear-filters');
    const hasActiveFilters = searchTerm || selectedModel || selectedColorway || showFavorites || showOwned || !sortDateDesc;
    
    if (hasActiveFilters) {
      clearFiltersBtn.classList.add('active');
      clearFiltersBtn.setAttribute('data-active', 'true');
    } else {
      clearFiltersBtn.classList.remove('active');
      clearFiltersBtn.setAttribute('data-active', 'false');
    }
  }

  document.getElementById('search').addEventListener('input', debounce((e) => {
    searchTerm = e.target.value.toLowerCase();
    currentPage = 1;
    updateClearFiltersButton();
    scrollToTopSmooth();
    displayYoyoCards();
  }, 300));

  document.getElementById('clear-search').addEventListener('click', () => {
    // If there are other active filters, clear everything
    if (selectedModel || selectedColorway || modelSortDesc || colorwaySortDesc || !sortDateDesc) {
      clearAllFilters();
    } else {
      // Otherwise just clear the search as before
    searchTerm = '';
    document.getElementById('search').value = '';
    currentPage = 1;
    scrollToTopSmooth();
    displayYoyoCards();
    }
  });

  document.getElementById('model-filter').addEventListener('change', (e) => {
    const newModel = e.target.value;
    const modelFilter = document.getElementById('model-filter');
    
    if (newModel) {
      modelFilter.setAttribute('data-active', 'true');
    } else {
      modelFilter.setAttribute('data-active', 'false');
    }
    
    if (!newModel && selectedColorway) {
      selectedModel = '';
      selectedColorway = '';
      populateColorwayFilter();
      populateModelFilter();
    } else {
      selectedModel = newModel;
      populateColorwayFilter();
    }
    currentPage = 1;
    updateClearFiltersButton();
    scrollToTopSmooth();
    displayYoyoCards();
  });

  document.getElementById('colorway-filter').addEventListener('change', (e) => {
    const newColorway = e.target.value;
    const colorwayFilter = document.getElementById('colorway-filter');
    
    if (newColorway) {
      colorwayFilter.setAttribute('data-active', 'true');
    } else {
      colorwayFilter.setAttribute('data-active', 'false');
    }
    
    if (!newColorway && selectedModel) {
      selectedModel = '';
      selectedColorway = '';
      populateModelFilter();
      populateColorwayFilter();
    } else {
      selectedColorway = newColorway;
      populateModelFilter();
    }
    currentPage = 1;
    updateClearFiltersButton();
    scrollToTopSmooth();
    displayYoyoCards();
  });

  // Set initial state of date sort button
  document.addEventListener('DOMContentLoaded', function() {
    const sortDateButton = document.getElementById('sort-date');
    if (sortDateButton) {
      sortDateButton.setAttribute('data-active', 'true');
      const sortIcon = sortDateButton.querySelector('.sort-icon');
      if (sortIcon) {
        sortIcon.textContent = '↑';
      }
    }
  });

  // Date sort button click handler
  document.getElementById('sort-date').addEventListener('click', function() {
    sortDateDesc = !sortDateDesc;
    const sortIcon = this.querySelector('.sort-icon');
    
    if (sortDateDesc) {
      // When returning to newest first (default), remove active state
      this.classList.remove('bg-purple-900');
      this.classList.add('bg-gray-800');
      this.setAttribute('data-active', 'false');
      if (sortIcon) {
        sortIcon.textContent = '↑';
      }
    } else {
      // When showing oldest first, add active state
      this.classList.remove('bg-gray-800');
      this.classList.add('bg-purple-900');
      this.setAttribute('data-active', 'true');
      if (sortIcon) {
        sortIcon.textContent = '↓';
      }
    }
    
    currentPage = 1;
    updateClearFiltersButton();
    scrollToTopSmooth();
    displayYoyoCards();
  });

  function createSkeletonCard() {
    const card = document.createElement('div');
    card.classList.add('skeleton-card', 'skeleton');
    return card;
  }

  function updateResultsCounter(filteredCount) {
    const counter = document.getElementById('results-counter');
    const total = yoyoData.length;
    
    if (filteredCount === total) {
      counter.textContent = `Showing all ${total} yoyos`;
    } else {
      counter.textContent = `Showing ${filteredCount} of ${total} yoyos`;
    }
  }

  function displayYoyoCards() {
    const yoyoGrid = document.getElementById('yoyo-grid');
    
    if (isLoading) {
      // Show skeleton loading state
      yoyoGrid.innerHTML = '';
      for (let i = 0; i < itemsPerPage; i++) {
        yoyoGrid.appendChild(createSkeletonCard());
      }
      return;
    }

    // Clear the grid
    yoyoGrid.innerHTML = '';

    // Get filtered yoyos
    let filtered = filterYoyos(yoyoData);

    // Sort by release date
    filtered.sort((a, b) => {
      const dateA = parseDate(a.release_date);
      const dateB = parseDate(b.release_date);
      return sortDateDesc ? dateB - dateA : dateA - dateB;
    });

    // Update results counter
    updateResultsCounter(filtered.length);

    // Display no results message if needed
    if (filtered.length === 0) {
      const noResults = document.createElement('div');
      noResults.classList.add('col-span-full', 'text-center', 'py-8', 'text-gray-400');
      noResults.textContent = 'No yoyos found matching your search criteria';
      yoyoGrid.appendChild(noResults);
      return;
    }

    // Create and append all yoyo cards (no pagination)
    filtered.forEach(yoyo => {
      const yoyoCard = createYoyoCard(yoyo);
      yoyoGrid.appendChild(yoyoCard);
    });
  }

  function createYoyoCard(yoyo) {
    const card = document.createElement('div');
    card.classList.add('card', 'relative', 'bg-gray-800', 'rounded-lg', 'overflow-hidden', 'shadow-lg', 'hover:shadow-xl', 'transition-shadow');
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `${yoyo.model} - ${yoyo.colorway}`);

    // Add loading state for image
    const imageContainer = document.createElement('div');
    imageContainer.classList.add('relative', 'pb-[100%]', 'w-full'); // 1:1 aspect ratio

    const image = document.createElement('img');
    image.classList.add('absolute', 'inset-0', 'w-full', 'h-full', 'object-cover');
    image.src = CONFIG.placeholderImage; // Start with placeholder
    image.alt = `${yoyo.model} - ${yoyo.colorway}`;
    image.loading = 'lazy'; // Enable native lazy loading
    
    // Add loading spinner for image
    const imageSpinner = document.createElement('div');
    imageSpinner.classList.add('loading-spinner', 'absolute', 'inset-0', 'm-auto');
    imageContainer.appendChild(imageSpinner);

    // Handle image load
    image.onload = () => {
      imageSpinner.style.display = 'none';
    };
    imageContainer.appendChild(image);
    card.appendChild(imageContainer);

    // Load the actual image
    if (yoyo.image_url) {
      const actualImage = new Image();
      actualImage.onload = () => {
        image.src = yoyo.image_url;
        imageSpinner.style.display = 'none';
      };
      actualImage.src = yoyo.image_url;
    }

    // Card content
    const content = document.createElement('div');
    content.classList.add('p-4', 'flex', 'flex-col', 'flex-grow');

    const model = document.createElement('h3');
    model.classList.add('model-name', 'text-lg', 'font-bold', 'mb-1');
    model.textContent = yoyo.model;

      const colorway = document.createElement('p');
    colorway.classList.add('colorway-name', 'mb-2');
      colorway.textContent = yoyo.colorway;

    const details = document.createElement('div');
    details.classList.add('text-sm', 'text-gray-400', 'mb-2');
    
    const date = document.createElement('p');
    date.textContent = `Released: ${formatDate(yoyo.release_date)}`;
    details.appendChild(date);

    if (yoyo.quantity) {
      const quantity = document.createElement('p');
        quantity.textContent = `Quantity: ${yoyo.quantity}`;
      details.appendChild(quantity);
    }

    content.appendChild(model);
    content.appendChild(colorway);
    content.appendChild(details);

    // Add actions container for favorite and owned buttons
      const actions = document.createElement('div');
    actions.classList.add('card-actions', 'mt-auto', 'flex', 'gap-2', 'justify-center');

    // Generate unique keys for localStorage
      const favKey = `fav_${yoyo.model}_${yoyo.colorway}`;
      const ownedKey = `owned_${yoyo.model}_${yoyo.colorway}`;

    // Favorite button
      const favoriteBtn = document.createElement('button');
    favoriteBtn.classList.add('favorite-btn', 'p-2', 'rounded-full', 'hover:bg-gray-700', 'transition-colors');
      favoriteBtn.setAttribute('aria-label', 'Add to Favorites');
    favoriteBtn.setAttribute('data-tooltip', 'Add to Favorites');
      favoriteBtn.innerHTML = localStorage.getItem(favKey) ? '⭐' : '☆';
    if (localStorage.getItem(favKey)) {
      favoriteBtn.classList.add('active');
      favoriteBtn.setAttribute('data-tooltip', 'Remove from Favorites');
    }
    
      favoriteBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent modal from opening
        if (localStorage.getItem(favKey)) {
          localStorage.removeItem(favKey);
          favoriteBtn.innerHTML = '☆';
          favoriteBtn.classList.remove('active');
        favoriteBtn.setAttribute('data-tooltip', 'Add to Favorites');
        } else {
          localStorage.setItem(favKey, '1');
          favoriteBtn.innerHTML = '⭐';
          favoriteBtn.classList.add('active');
        favoriteBtn.setAttribute('data-tooltip', 'Remove from Favorites');
        }
      });

    // Owned button
      const ownedBtn = document.createElement('button');
    ownedBtn.classList.add('owned-btn', 'p-2', 'rounded-full', 'hover:bg-gray-700', 'transition-colors');
      ownedBtn.setAttribute('aria-label', 'Mark as Owned');
    ownedBtn.setAttribute('data-tooltip', 'Mark as Owned');
      ownedBtn.innerHTML = localStorage.getItem(ownedKey) ? '✅' : '🔳';
    if (localStorage.getItem(ownedKey)) {
      ownedBtn.classList.add('active');
      ownedBtn.setAttribute('data-tooltip', 'Remove from Owned');
    }
    
      ownedBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent modal from opening
        if (localStorage.getItem(ownedKey)) {
          localStorage.removeItem(ownedKey);
          ownedBtn.innerHTML = '🔳';
          ownedBtn.classList.remove('active');
        ownedBtn.setAttribute('data-tooltip', 'Mark as Owned');
        } else {
          localStorage.setItem(ownedKey, '1');
          ownedBtn.innerHTML = '✅';
          ownedBtn.classList.add('active');
        ownedBtn.setAttribute('data-tooltip', 'Remove from Owned');
        }
      });

      actions.appendChild(favoriteBtn);
      actions.appendChild(ownedBtn);
    card.appendChild(content);
    card.appendChild(actions);

    // Add click handler for modal
    card.addEventListener('click', () => openModal(yoyo));

    // Add keyboard event listener
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(yoyo);
      }
    });

    return card;
  }

  function showSpecs(model) {
    const specs = specsData.find(spec => spec.model === model);
    if (specs) {
      // Create modal content
      let html = `<h2 class="text-lg font-bold mb-2">${model} Specs</h2><ul>`;
      for (const [key, value] of Object.entries(specs)) {
        if (key !== "model" && value && value !== "N/A" && value !== "-") {
          html += `<li><strong>${key.replace(/_/g, ' ')}:</strong> ${value}</li>`;
        }
      }
      html += "</ul>";
      // Show in modal
      modalMainImage.src = ""; // Hide main image for specs
      modalImages.innerHTML = html;
      modal.classList.remove('hidden');
    }
  }

  function closeModal() {
    const modal = document.getElementById('modal');
    const modalMainImage = document.getElementById('modal-main-image');
    const modalImages = document.getElementById('modal-images');
    const modalDetails = document.getElementById('modal-details');

    if (modal) {
    modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
    if (modalMainImage) modalMainImage.src = '';
    if (modalImages) modalImages.innerHTML = '';
    if (modalDetails) modalDetails.innerHTML = '';

    // Return focus to the last focused element
    const lastFocusedElement = document.querySelector('.yoyo-card:focus');
    if (lastFocusedElement) {
      lastFocusedElement.focus();
    }
  }

  function setupModalListeners() {
    const modal = document.getElementById('modal');
    const modalOverlay = document.getElementById('modal-overlay');
    const closeModalBtn = document.getElementById('close-modal');
    const modalMainImage = document.getElementById('modal-main-image');
    const modalImages = document.getElementById('modal-images');

    // Handle escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        closeModal();
      }
    });

    // Handle keyboard navigation in modal
    modal.addEventListener('keydown', (e) => {
      if (modal.classList.contains('hidden')) return;

      switch (e.key) {
        case 'ArrowLeft':
          const prevThumb = document.querySelector('.modal-thumbnail.active').previousElementSibling;
          if (prevThumb) prevThumb.click();
          break;
        case 'ArrowRight':
          const nextThumb = document.querySelector('.modal-thumbnail.active').nextElementSibling;
          if (nextThumb) nextThumb.click();
          break;
      }
    });

    // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', closeModal);
      closeModalBtn.setAttribute('aria-label', 'Close modal');
    }

    // Prevent clicks inside modal content from closing the modal
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
      modalContent.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  }

  function openModal(yoyo) {
    const modal = document.getElementById('modal');
    const modalMainImage = document.getElementById('modal-main-image');
    const modalImages = document.getElementById('modal-images');
    const modalDetails = document.getElementById('modal-details');
  
    // Show modal and set focus
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    // Focus the close button
    const closeModalBtn = document.getElementById('close-modal');
    if (closeModalBtn) {
      closeModalBtn.focus();
    }
  
    // Create array of all images
    const images = [yoyo.image_url];
    if (yoyo.additional_images) {
      const additionalImages = yoyo.additional_images
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);
      images.push(...additionalImages);
    }
  
    // Load main image with loading state
    modalMainImage.src = CONFIG.placeholderImage;
    const mainImageSpinner = document.createElement('div');
    mainImageSpinner.classList.add('loading-spinner', 'absolute', 'inset-0', 'm-auto');
    modalMainImage.parentElement.appendChild(mainImageSpinner);
    
    const tempImage = new Image();
    tempImage.onload = () => {
      modalMainImage.src = images[0];
      mainImageSpinner.style.display = 'none';
    };
    tempImage.src = images[0];
  
    // Clear and populate thumbnails with lazy loading
    modalImages.innerHTML = '';
    modalImages.style.display = images.length > 1 ? 'flex' : 'none';
    
    if (images.length > 1) {
      images.forEach((url, index) => {
        const thumbContainer = document.createElement('div');
        thumbContainer.classList.add('relative', 'w-20', 'h-20', 'flex-shrink-0');
        
        const thumb = document.createElement('img');
        thumb.src = CONFIG.placeholderImage;
        thumb.loading = 'lazy';
        thumb.classList.add('modal-thumbnail', 'w-full', 'h-full', 'object-cover', 'rounded');
        if (index === 0) thumb.classList.add('active');
        
        const thumbSpinner = document.createElement('div');
        thumbSpinner.classList.add('loading-spinner', 'absolute', 'inset-0', 'm-auto');
        thumbContainer.appendChild(thumbSpinner);
        thumbContainer.appendChild(thumb);
        
        // Load the actual thumbnail image
        const actualThumb = new Image();
        actualThumb.onload = () => {
          thumb.src = url;
          thumbSpinner.style.display = 'none';
        };
        actualThumb.src = url;
        
        thumb.addEventListener('click', () => {
          modalMainImage.src = CONFIG.placeholderImage;
          mainImageSpinner.style.display = 'block';
          
          const newMainImage = new Image();
          newMainImage.onload = () => {
            modalMainImage.src = url;
            mainImageSpinner.style.display = 'none';
          };
          newMainImage.src = url;
          
          // Update active thumbnail
          document.querySelectorAll('.modal-thumbnail').forEach(t => t.classList.remove('active'));
          thumb.classList.add('active');
        });
        
        modalImages.appendChild(thumbContainer);
      });
    }
  
    // Populate details with model and colorway at the top
    const specs = specsData.find(spec => spec.model === yoyo.model);
    modalDetails.innerHTML = `
      <div class="space-y-4">
        <div>
          <h2 class="modal-title">
            ${yoyo.model}
          </h2>
          <p class="modal-subtitle">
            ${yoyo.colorway}
          </p>
        </div>
  
        <div class="space-y-2 text-gray-300">
          <p class="flex items-center gap-2">
            <span class="text-gray-400">Released:</span>
            <span class="text-white">${formatDate(yoyo.release_date)}</span>
          </p>
          ${yoyo.quantity ? `
            <p class="flex items-center gap-2">
              <span class="text-gray-400">Quantity:</span>
              <span class="text-white">${yoyo.quantity}</span>
            </p>
          ` : ''}
        </div>
  
        ${yoyo.description ? `
          <div class="mt-4">
            <h3 class="text-lg font-semibold mb-2 text-gray-200">Description</h3>
            <p class="text-gray-300">${yoyo.description}</p>
          </div>
        ` : ''}
  
        ${specs ? `
          <div class="specs-section mt-4">
            <h3 class="text-lg font-semibold mb-3 text-gray-200">Specifications</h3>
            <div class="grid grid-cols-2 gap-2">
              ${Object.entries(specs)
                .filter(([key, value]) => key !== 'model' && value && value !== 'N/A' && value !== '-')
                .map(([key, value]) => 
                  `<div class="text-gray-400">${key.replace(/_/g, ' ')}:</div><div class="text-white">${value}</div>`
                ).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  function updatePagination(totalCount = yoyoData.length) {
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    paginationContainer.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
      const pageButton = document.createElement('button');
      pageButton.textContent = i;
      pageButton.classList.add('pagination-button');
      pageButton.addEventListener('click', () => {
        currentPage = i;
        displayYoyoCards();
      });
      if (i === currentPage) {
        pageButton.classList.add('active');
      }
      paginationContainer.appendChild(pageButton);
    }
  }

  function addFilterControls() {
    // Remove this function as we're using the buttons in the HTML
    // The event listeners are added in the DOMContentLoaded event
  }

  // Add event listeners for sort buttons
  document.getElementById('sort-model-filter').addEventListener('click', () => {
    modelSortType = modelSortType === 'alpha' ? 'quantity' : 'alpha';
    updateSortButton(document.getElementById('sort-model-filter'), modelSortType);
    populateModelFilter();
  });

  document.getElementById('sort-colorway-filter').addEventListener('click', () => {
    colorwaySortType = colorwaySortType === 'alpha' ? 'quantity' : 'alpha';
    updateSortButton(document.getElementById('sort-colorway-filter'), colorwaySortType);
    populateColorwayFilter();
  });
  
  // Add event listeners for show favorites and show owned buttons
  document.getElementById('show-favorites').addEventListener('click', () => {
    showFavorites = !showFavorites;
    const button = document.getElementById('show-favorites');
    
    if (showFavorites) {
      button.classList.remove('bg-gray-800');
      button.classList.add('bg-yellow-900');
      button.setAttribute('data-active', 'true');
    } else {
      button.classList.remove('bg-yellow-900');
      button.classList.add('bg-gray-800');
      button.setAttribute('data-active', 'false');
    }
    
    currentPage = 1;
    updateClearFiltersButton();
    scrollToTopSmooth();
    displayYoyoCards();
  });

  document.getElementById('show-owned').addEventListener('click', () => {
    showOwned = !showOwned;
    const button = document.getElementById('show-owned');
    
    if (showOwned) {
      button.classList.remove('bg-gray-800');
      button.classList.add('bg-blue-900');
      button.setAttribute('data-active', 'true');
    } else {
      button.classList.remove('bg-blue-900');
      button.classList.add('bg-gray-800');
      button.setAttribute('data-active', 'false');
    }
    
    currentPage = 1;
    updateClearFiltersButton();
    scrollToTopSmooth();
    displayYoyoCards();
  });

// Add helper for smooth scroll-to-top
function scrollToTopSmooth() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

  function clearAllFilters() {
    // Reset search
    document.getElementById('search').value = '';
    searchTerm = '';

    // Reset model filter
    selectedModel = '';
    const modelFilter = document.getElementById('model-filter');
    modelFilter.value = '';
    modelFilter.selectedIndex = 0;
    modelFilter.setAttribute('data-active', 'false');

    // Reset colorway filter
    selectedColorway = '';
    const colorwayFilter = document.getElementById('colorway-filter');
    colorwayFilter.value = '';
    colorwayFilter.selectedIndex = 0;
    colorwayFilter.setAttribute('data-active', 'false');
    
    // Reset filter display flags
    showFavorites = false;
    showOwned = false;
    
    // Reset sort orders
    modelSortType = 'alpha';
    modelSortDesc = false;
    colorwaySortType = 'alpha';
    colorwaySortDesc = false;
    sortDateDesc = true;

    // Update sort button icons
    const modelSortButton = document.getElementById('sort-model-filter');
    const colorwaySortButton = document.getElementById('sort-colorway-filter');
    const dateSortButton = document.getElementById('sort-date');
    
    if (modelSortButton) {
      updateSortButton(modelSortButton, 'alpha');
    }
    
    if (colorwaySortButton) {
      updateSortButton(colorwaySortButton, 'alpha');
    }
    
    if (dateSortButton) {
      dateSortButton.setAttribute('data-active', 'false');
      const sortIcon = dateSortButton.querySelector('.sort-icon');
      if (sortIcon) {
        sortIcon.textContent = '↑';
      }
    }
    
    // Reset filter buttons
    const favoritesBtn = document.getElementById('show-favorites');
    const ownedBtn = document.getElementById('show-owned');
    
    if (favoritesBtn) {
      favoritesBtn.classList.remove('bg-yellow-900');
      favoritesBtn.classList.add('bg-gray-800');
      favoritesBtn.setAttribute('data-active', 'false');
    }
    
    if (ownedBtn) {
      ownedBtn.classList.remove('bg-blue-900');
      ownedBtn.classList.add('bg-gray-800');
      ownedBtn.setAttribute('data-active', 'false');
    }

    // Repopulate filters with default sorting
    populateModelFilter();
    populateColorwayFilter();

    // Update clear filters button state
    updateClearFiltersButton();
    scrollToTopSmooth();

    // Update display
    currentPage = 1;
    displayYoyoCards();
  }

  // Add event listener for clear filters button
  document.getElementById('clear-filters').addEventListener('click', clearAllFilters);

  setupModalListeners();
  addFilterControls();
  fetchYoyoData();

  // Scroll to top button functionality
  const scrollBtn = document.getElementById('scroll-to-top');
  if (scrollBtn) {
    // start hidden
    scrollBtn.classList.add('hidden');

    // toggle visibility on real window scroll
    window.addEventListener('scroll', () => {
      const shouldShow = window.scrollY > 300;
      scrollBtn.classList.toggle('hidden', !shouldShow);
    });

    // wire click to your smooth-scroll helper
    scrollBtn.addEventListener('click', scrollToTopSmooth);
  }
});
