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
  const itemsPerPage = 12; // Number of yoyos per page
  let yoyoData = [];
  let specsData = [];

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
      displayYoyoCards();
    } catch (error) {
      console.error('Error fetching specs data:', error);
    }
  }

  function displayYoyoCards() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentYoyoPage = yoyoData.slice(startIndex, endIndex);

    yoyoGrid.innerHTML = '';  // Clear the grid before adding new cards

    currentYoyoPage.forEach(yoyo => {
      const yoyoCard = document.createElement('div');
      yoyoCard.classList.add('card'); // Use 'card' for consistent styling

      const yoyoImage = document.createElement('img');
      yoyoImage.src = yoyo.image_url || CONFIG.placeholderImage; // Fallback to placeholder if no image
      yoyoImage.alt = `${yoyo.model} - ${yoyo.colorway}`;
      yoyoImage.classList.add('w-full', 'h-auto', 'rounded');

      const modelName = document.createElement('h3');
      modelName.textContent = yoyo.model;
      modelName.classList.add('text-lg', 'font-semibold');

      const colorway = document.createElement('p');
      colorway.textContent = `Colorway: ${yoyo.colorway}`;
      colorway.classList.add('text-sm', 'text-gray-400');

      const releaseDate = document.createElement('p');
      releaseDate.textContent = `Release Date: ${yoyo.release_date}`;
      releaseDate.classList.add('text-sm', 'text-gray-400');

      const quantity = document.createElement('p');
      quantity.textContent = yoyo.quantity ? `Quantity: ${yoyo.quantity}` : 'Quantity: N/A';
      quantity.classList.add('text-sm', 'text-gray-400');

      const showSpecsButton = document.createElement('button');
      showSpecsButton.textContent = 'Show Specs';
      showSpecsButton.classList.add('mt-2', 'bg-blue-600', 'text-white', 'px-4', 'py-2', 'rounded', 'hover:bg-blue-700');
      showSpecsButton.addEventListener('click', () => showSpecs(yoyo.model));

      yoyoCard.appendChild(yoyoImage);
      yoyoCard.appendChild(modelName);
      yoyoCard.appendChild(colorway);
      yoyoCard.appendChild(releaseDate);
      yoyoCard.appendChild(quantity);

      // Show specs button only if specs data is available for the model
      const specs = specsData.find(spec => spec.model === yoyo.model);
      if (specs) {
        yoyoCard.appendChild(showSpecsButton);
      }

      yoyoCard.addEventListener('click', () => openModal(yoyo));

      yoyoGrid.appendChild(yoyoCard);
    });

    updatePagination();
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

    // Populate modal with additional images if available
    if (yoyo.additional_images && yoyo.additional_images.length > 0) {
      yoyo.additional_images.forEach(image => {
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

  // Pagination logic
  function updatePagination() {
    const totalPages = Math.ceil(yoyoData.length / itemsPerPage);

    paginationContainer.innerHTML = ''; // Clear previous pagination

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

  // Fetch yoyo data on page load
  fetchYoyoData();
});
