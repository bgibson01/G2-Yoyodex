document.addEventListener('DOMContentLoaded', () => {
  const CONFIG = {
    yoyosDataUrl: 'https://script.google.com/macros/s/AKfycby-6xXDgtZIaMa0-SV5kmNwDIh5IbCyvCH8bjgs22eUVu4HbtX6RiOYItejI5fMzJywzQ/exec?sheet=yoyos',
    specsDataUrl: 'https://script.google.com/macros/s/AKfycby-6xXDgtZIaMa0-SV5kmNwDIh5IbCyvCH8bjgs22eUVu4HbtX6RiOYItejI5fMzJywzQ/exec?sheet=specs',
    placeholderImage: 'assets/placeholder.jpg'
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
  let sortDateDesc = true;
  let showFavorites = false;
  let showOwned = false;

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

  async function fetchYoyoData() {
    try {
      const response = await fetch(CONFIG.yoyosDataUrl);
      yoyoData = await response.json();
      console.log('Fetched Yoyo Data:', yoyoData);
      fetchSpecsData();
    } catch (error) {
      console.error('Error fetching yoyo data:', error);
    }
  }

  async function fetchSpecsData() {
    try {
      const response = await fetch(CONFIG.specsDataUrl);
      specsData = await response.json();
      console.log('Fetched Specs Data:', specsData);
      populateModelFilter();
      displayYoyoCards();
    } catch (error) {
      console.error('Error fetching specs data:', error);
    }
  }

  function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function populateModelFilter() {
    const modelFilter = document.getElementById('model-filter');
    const models = Array.from(new Set(yoyoData.map(y => y.model))).sort();
    modelFilter.innerHTML = '<option value="">All Models</option>';
    models.forEach(model => {
      const opt = document.createElement('option');
      opt.value = model;
      opt.textContent = model;
      modelFilter.appendChild(opt);
    });
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
    return yoyos.filter(yoyo => {
      if (!yoyo) return false;

      const searchTerms = searchTerm.toLowerCase().split(' ');
      const modelText = (yoyo.model || '').toLowerCase();
      const colorwayText = (yoyo.colorway || '').toLowerCase();
      const typeText = (yoyo.type || '').toLowerCase();
      const descriptionText = (yoyo.description || '').toLowerCase();

      // Check if matches search terms
      const matchesSearch = searchTerms.every(term => 
        modelText.includes(term) ||
        colorwayText.includes(term) ||
        typeText.includes(term) ||
        descriptionText.includes(term)
      );

      // Check favorites and owned status
      const favKey = `fav_${yoyo.model}_${yoyo.colorway}`;
      const ownedKey = `owned_${yoyo.model}_${yoyo.colorway}`;
      const isFavorite = localStorage.getItem(favKey);
      const isOwned = localStorage.getItem(ownedKey);

      // Apply filters
      const matchesFavorites = !showFavorites || isFavorite;
      const matchesOwned = !showOwned || isOwned;

      return matchesSearch && matchesFavorites && matchesOwned;
    });
  }

  document.getElementById('search').addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase();
    currentPage = 1;
    displayYoyoCards();
  });

  document.getElementById('clear-search').addEventListener('click', () => {
    searchTerm = '';
    document.getElementById('search').value = '';
    currentPage = 1;
    displayYoyoCards();
  });

  document.getElementById('model-filter').addEventListener('change', (e) => {
    selectedModel = e.target.value;
    currentPage = 1;
    displayYoyoCards();
  });

  document.getElementById('sort-date').addEventListener('click', () => {
    sortDateDesc = !sortDateDesc;
    displayYoyoCards();
  });

  function displayYoyoCards() {
    // Show loading indicator
    const loadingSpinner = document.createElement('div');
    loadingSpinner.classList.add('loading-spinner');
    loadingSpinner.style.display = 'block';
    yoyoGrid.innerHTML = '';
    yoyoGrid.appendChild(loadingSpinner);

    // Filter yoyos
    let filtered = filterYoyos(yoyoData);

    // Apply model filter
    if (selectedModel) {
      filtered = filtered.filter(yoyo => yoyo.model === selectedModel);
    }

    // Sort by release date
    filtered.sort((a, b) => {
      const dateA = parseDate(a.release_date);
      const dateB = parseDate(b.release_date);
      return sortDateDesc ? dateB - dateA : dateA - dateB;
    });

    // Update sort button text
    const sortButton = document.getElementById('sort-date');
    sortButton.textContent = `Sort by Date ${sortDateDesc ? '(Newest First)' : '(Oldest First)'}`; 

    // Pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentYoyoPage = filtered.slice(startIndex, endIndex);

    // Clear grid and remove loading spinner
    yoyoGrid.innerHTML = '';

    // Display no results message if needed
    if (filtered.length === 0) {
      const noResults = document.createElement('div');
      noResults.classList.add('col-span-full', 'text-center', 'py-8', 'text-gray-400');
      noResults.textContent = 'No yoyos found matching your search criteria';
      yoyoGrid.appendChild(noResults);
      return;
    }

    // Create and append yoyo cards
    currentYoyoPage.forEach(yoyo => {
      const yoyoCard = createYoyoCard(yoyo);
      yoyoGrid.appendChild(yoyoCard);
    });

    updatePagination(filtered.length);
  }

  function createYoyoCard(yoyo) {
    const card = document.createElement('div');
    card.classList.add('card', 'relative', 'bg-gray-800', 'rounded-lg', 'overflow-hidden', 'shadow-lg', 'hover:shadow-xl', 'transition-shadow');

    // Add loading state for image
    const imageContainer = document.createElement('div');
    imageContainer.classList.add('relative', 'pb-[100%]'); // 1:1 aspect ratio

    const image = document.createElement('img');
    image.classList.add('absolute', 'inset-0', 'w-full', 'h-full', 'object-cover');
    image.src = yoyo.image_url || CONFIG.placeholderImage;
    image.alt = `${yoyo.model} - ${yoyo.colorway}`;
    
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

    // Card content
    const content = document.createElement('div');
    content.classList.add('p-4');

    const model = document.createElement('h3');
    model.classList.add('text-lg', 'font-bold', 'mb-1');
    model.textContent = yoyo.model;

    const colorway = document.createElement('p');
    colorway.classList.add('text-gray-300', 'mb-2');
    colorway.textContent = yoyo.colorway;

    const details = document.createElement('div');
    details.classList.add('text-sm', 'text-gray-400');
    
    if (yoyo.quantity) {
      const quantity = document.createElement('p');
      quantity.textContent = `Quantity: ${yoyo.quantity}`;
      details.appendChild(quantity);
    }

    const date = document.createElement('p');
    date.textContent = `Released: ${formatDate(yoyo.release_date)}`;
    details.appendChild(date);

    content.appendChild(model);
    content.appendChild(colorway);
    content.appendChild(details);

    // Add actions container for favorite and owned buttons
    const actions = document.createElement('div');
    actions.classList.add('card-actions', 'mt-2', 'flex', 'gap-2', 'justify-end');

    // Generate unique keys for localStorage
    const favKey = `fav_${yoyo.model}_${yoyo.colorway}`;
    const ownedKey = `owned_${yoyo.model}_${yoyo.colorway}`;

    // Favorite button
    const favoriteBtn = document.createElement('button');
    favoriteBtn.classList.add('favorite-btn', 'p-2', 'rounded-full', 'hover:bg-gray-700', 'transition-colors');
    favoriteBtn.setAttribute('aria-label', 'Add to Favorites');
    favoriteBtn.innerHTML = localStorage.getItem(favKey) ? '⭐' : '☆';
    if (localStorage.getItem(favKey)) favoriteBtn.classList.add('active');
    
    favoriteBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent modal from opening
      if (localStorage.getItem(favKey)) {
        localStorage.removeItem(favKey);
        favoriteBtn.innerHTML = '☆';
        favoriteBtn.classList.remove('active');
      } else {
        localStorage.setItem(favKey, '1');
        favoriteBtn.innerHTML = '⭐';
        favoriteBtn.classList.add('active');
      }
    });

    // Owned button
    const ownedBtn = document.createElement('button');
    ownedBtn.classList.add('owned-btn', 'p-2', 'rounded-full', 'hover:bg-gray-700', 'transition-colors');
    ownedBtn.setAttribute('aria-label', 'Mark as Owned');
    ownedBtn.innerHTML = localStorage.getItem(ownedKey) ? '✅' : '🔳';
    if (localStorage.getItem(ownedKey)) ownedBtn.classList.add('active');
    
    ownedBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent modal from opening
      if (localStorage.getItem(ownedKey)) {
        localStorage.removeItem(ownedKey);
        ownedBtn.innerHTML = '🔳';
        ownedBtn.classList.remove('active');
      } else {
        localStorage.setItem(ownedKey, '1');
        ownedBtn.innerHTML = '✅';
        ownedBtn.classList.add('active');
      }
    });

    actions.appendChild(favoriteBtn);
    actions.appendChild(ownedBtn);
    content.appendChild(actions);
    card.appendChild(content);

    // Add click handler for modal
    card.addEventListener('click', () => openModal(yoyo));

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
    modal.classList.add('hidden');
    modalMainImage.src = '';
    modalImages.innerHTML = '';
    document.getElementById('modal-details').innerHTML = '';
  }

  modalOverlay.addEventListener('click', closeModal);
  closeModalBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  function openModal(yoyo) {
    const loadingSpinner = document.getElementById('loading-spinner');
    modal.classList.remove('hidden');
    loadingSpinner.style.display = 'block';

    // Create array of all images
    const images = [yoyo.image_url];
    if (yoyo.additional_images) {
      images.push(...yoyo.additional_images.split(',').map(url => url.trim()));
    }

    // Load main image
    modalMainImage.src = images[0];
    modalMainImage.onload = () => {
      loadingSpinner.style.display = 'none';
    };

    // Populate thumbnails
    modalImages.innerHTML = '';
    images.forEach((url, index) => {
      const thumb = document.createElement('img');
      thumb.src = url;
      thumb.classList.add('modal-thumbnail');
      if (index === 0) thumb.classList.add('active');
      thumb.addEventListener('click', () => {
        modalMainImage.src = url;
        document.querySelectorAll('.modal-thumbnail').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      });
      modalImages.appendChild(thumb);
    });

    // Populate details
    const details = document.getElementById('modal-details');
    const specs = specsData.find(spec => spec.model === yoyo.model);
    
    details.innerHTML = `
      <h2 class="text-xl font-bold mb-2">${yoyo.model}</h2>
      <p class="text-lg text-gray-300 mb-2">${yoyo.colorway}</p>
      <p class="text-sm text-gray-400">Released: ${formatDate(yoyo.release_date)}</p>
      ${yoyo.quantity ? `<p class="text-sm text-gray-400">Quantity: ${yoyo.quantity}</p>` : ''}
      ${specs ? `
        <div class="specs-details mt-4">
          <h3 class="text-lg font-semibold mb-2">Specifications</h3>
          <div class="grid grid-cols-2 gap-2">
            ${Object.entries(specs)
              .filter(([key, value]) => key !== 'model' && value && value !== 'N/A' && value !== '-')
              .map(([key, value]) => `
                <div class="text-gray-400">${key.replace(/_/g, ' ')}:</div>
                <div class="text-white">${value}</div>
              `).join('')}
          </div>
        </div>
      ` : ''}
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
    const controlsContainer = document.querySelector('.controls-container');
    
    // Add filter buttons for favorites and owned
    const favoritesBtn = document.createElement('button');
    favoritesBtn.classList.add('bg-yellow-700', 'text-white', 'px-3', 'py-1', 'rounded', 'hover:bg-yellow-800');
    favoritesBtn.textContent = 'Show Favorites';
    favoritesBtn.addEventListener('click', () => {
      showFavorites = !showFavorites;
      favoritesBtn.classList.toggle('bg-yellow-900');
      currentPage = 1;
      displayYoyoCards();
    });

    const ownedBtn = document.createElement('button');
    ownedBtn.classList.add('bg-green-700', 'text-white', 'px-3', 'py-1', 'rounded', 'hover:bg-green-800');
    ownedBtn.textContent = 'Show Owned';
    ownedBtn.addEventListener('click', () => {
      showOwned = !showOwned;
      ownedBtn.classList.toggle('bg-green-900');
      currentPage = 1;
      displayYoyoCards();
    });

    controlsContainer.appendChild(favoritesBtn);
    controlsContainer.appendChild(ownedBtn);
  }

  fetchYoyoData();
  addFilterControls();
});
