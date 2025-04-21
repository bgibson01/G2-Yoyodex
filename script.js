document.addEventListener('DOMContentLoaded', () => {
  const CONFIG = {
    yoyosDataUrl: 'https://script.google.com/macros/s/AKfycby-6xXDgtZIaMa0-SV5kmNwDIh5IbCyvCH8bjgs22eUVu4HbtX6RiOYItejI5fMzJywzQ/exec?sheet=yoyos',
    specsDataUrl: 'https://script.google.com/macros/s/AKfycby-6xXDgtZIaMa0-SV5kmNwDIh5IbCyvCH8bjgs22eUVu4HbtX6RiOYItejI5fMzJywzQ/exec?sheet=specs',
    placeholderImage: 'assets/placeholder.jpg'
  };

  const yoyoGrid = document.getElementById('yoyo-grid');
  const modal = document.getElementById('modal');
  const closeModal = document.getElementById('close-modal');
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

  function getItemsPerPage() {
    const width = window.innerWidth;
    if (width >= 1280) return 16; // 4 columns x 4 rows
    if (width >= 1024) return 12; // 3 columns x 4 rows
    if (width >= 640)  return 8;  // 2 columns x 4 rows
    return 4;                     // 1 column x 4 rows
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
    let filtered = yoyoData.filter(yoyo => {
      const matchesSearch =
        !searchTerm ||
        (yoyo.model && yoyo.model.toLowerCase().includes(searchTerm)) ||
        (yoyo.colorway && yoyo.colorway.toLowerCase().includes(searchTerm));
      const matchesModel = !selectedModel || yoyo.model === selectedModel;
      return matchesSearch && matchesModel;
    });

    filtered.sort((a, b) => {
      const aDate = new Date(a.release_date);
      const bDate = new Date(b.release_date);
      return sortDateDesc ? bDate - aDate : aDate - bDate;
    });

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentYoyoPage = filtered.slice(startIndex, endIndex);

    yoyoGrid.innerHTML = '';

    currentYoyoPage.forEach(yoyo => {
      const yoyoCard = document.createElement('div');
      yoyoCard.classList.add('card');

      const yoyoImage = document.createElement('img');
      yoyoImage.src = yoyo.image_url || CONFIG.placeholderImage;
      yoyoImage.alt = `${yoyo.model} - ${yoyo.colorway}`;
      yoyoImage.classList.add('w-full', 'h-auto', 'rounded');

      const modelName = document.createElement('h3');
      modelName.textContent = yoyo.model;
      modelName.classList.add('model-name');

      const colorway = document.createElement('p');
      colorway.textContent = yoyo.colorway;
      colorway.classList.add('colorway-name');

      const releaseDate = document.createElement('p');
      releaseDate.textContent = `Release Date: ${formatDate(yoyo.release_date)}`;
      releaseDate.classList.add('text-sm', 'text-gray-400');

      if (yoyo.quantity && Number(yoyo.quantity) !== 0) {
        const quantity = document.createElement('p');
        quantity.textContent = `Quantity: ${yoyo.quantity}`;
        quantity.classList.add('text-sm', 'text-gray-400');
        yoyoCard.appendChild(quantity);
      }

      const actions = document.createElement('div');
      actions.classList.add('card-actions');

      const favKey = `fav_${yoyo.model}_${yoyo.colorway}`;
      const ownedKey = `owned_${yoyo.model}_${yoyo.colorway}`;

      const favoriteBtn = document.createElement('button');
      favoriteBtn.classList.add('favorite-btn');
      favoriteBtn.setAttribute('aria-label', 'Add to Favorites');
      favoriteBtn.innerHTML = localStorage.getItem(favKey) ? '⭐' : '☆';
      if (localStorage.getItem(favKey)) favoriteBtn.classList.add('active');
      favoriteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
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

      const ownedBtn = document.createElement('button');
      ownedBtn.classList.add('owned-btn');
      ownedBtn.setAttribute('aria-label', 'Mark as Owned');
      ownedBtn.innerHTML = localStorage.getItem(ownedKey) ? '✅' : '🔳';
      if (localStorage.getItem(ownedKey)) ownedBtn.classList.add('active');
      ownedBtn.addEventListener('click', (e) => {
        e.stopPropagation();
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

      const specs = specsData.find(spec => spec.model === yoyo.model);
      if (specs) {
        const showSpecsButton = document.createElement('button');
        showSpecsButton.textContent = 'Show Specs';
        showSpecsButton.classList.add('mt-2', 'bg-blue-600', 'text-white', 'px-4', 'py-2', 'rounded', 'hover:bg-blue-700');
        showSpecsButton.addEventListener('click', (e) => {
          e.stopPropagation();
          showSpecs(yoyo.model);
        });
        actions.appendChild(showSpecsButton);
      }

      yoyoCard.appendChild(yoyoImage);
      yoyoCard.appendChild(modelName);
      yoyoCard.appendChild(colorway);
      yoyoCard.appendChild(releaseDate);
      yoyoCard.appendChild(quantity);
      yoyoCard.appendChild(actions);

      yoyoCard.addEventListener('click', () => openModal(yoyo));

      yoyoGrid.appendChild(yoyoCard);
    });

    updatePagination(filtered.length);
  }

  function showSpecs(model) {
    const specs = specsData.find(spec => spec.model === model);
    if (specs) {
      alert(`Specs for ${model}: ${JSON.stringify(specs, null, 2)}`);
    }
  }

  function openModal(yoyo) {
    modal.classList.remove('hidden');
    modalMainImage.src = yoyo.image_url || CONFIG.placeholderImage;
    modalImages.innerHTML = '';

    let images = [];
    if (Array.isArray(yoyo.additional_images)) {
      images = yoyo.additional_images;
    } else if (typeof yoyo.additional_images === 'string' && yoyo.additional_images.trim() !== '') {
      images = yoyo.additional_images.split(',').map(s => s.trim());
    }

    if (images.length > 0) {
      images.forEach(image => {
        const img = document.createElement('img');
        img.src = image;
        img.classList.add('w-32', 'h-auto', 'rounded', 'mr-2');
        img.addEventListener('click', () => {
          modalMainImage.src = image;
        });
        modalImages.appendChild(img);
      });
    }
  }

  closeModal.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

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

  fetchYoyoData();
});
