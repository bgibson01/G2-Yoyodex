// Configurations for URLs and placeholder images
const CONFIG = {
  yoyosDataUrl: 'https://script.google.com/macros/s/AKfycby-6xXDgtZIaMa0-SV5kmNwDIh5IbCyvCH8bjgs22eUVu4HbtX6RiOYItejI5fMzJywzQ/exec?sheet=yoyos',
  specsDataUrl: 'https://script.google.com/macros/s/AKfycby-6xXDgtZIaMa0-SV5kmNwDIh5IbCyvCH8bjgs22eUVu4HbtX6RiOYItejI5fMzJywzQ/exec?sheet=specs',
  placeholderImage: 'assets/placeholder.jpg'
};

// Function to fetch yoyo data from Google Apps Script Web App
function fetchYoyoData() {
  fetch(CONFIG.yoyosDataUrl)
    .then(response => response.json())
    .then(data => {
      if (data.length > 0) {
        console.log('Fetched Yoyo Data:', data);

        // Loop through the fetched yoyo data and create the yoyo cards
        data.forEach(yoyo => {
          const yoyoCard = document.createElement('div');
          yoyoCard.classList.add('yoyo-card');
          let cardContent = `
            <h3>${yoyo.model}</h3>
            <p>Colorway: ${yoyo.colorway}</p>
            <p>Release Date: ${yoyo.release_date}</p>
            <p>Quantity: ${yoyo.quantity || 'N/A'}</p>
            <button class="view-images-btn" data-yoyo-id="${yoyo.id}">View Images</button>
          `;
          
          // Only add the "Show Specs" button if specs data is available
          if (yoyo.specs) {
            cardContent += `<button class="show-specs-btn" data-yoyo-id="${yoyo.id}">Show Specs</button>`;
          }

          cardContent += `<div class="specs-container" data-yoyo-id="${yoyo.id}"></div>`;
          yoyoCard.innerHTML = cardContent;
          
          document.querySelector('.yoyo-grid').appendChild(yoyoCard);
        });

        // Add event listeners to buttons to show additional images and specs
        document.querySelectorAll('.view-images-btn').forEach(button => {
          button.addEventListener('click', (e) => {
            const yoyoId = e.target.getAttribute('data-yoyo-id');
            showYoyoImages(yoyoId);
          });
        });

        // Add event listeners for showing specs
        document.querySelectorAll('.show-specs-btn').forEach(button => {
          button.addEventListener('click', (e) => {
            const yoyoId = e.target.getAttribute('data-yoyo-id');
            toggleYoyoSpecs(yoyoId);
          });
        });
      } else {
        console.log('No yoyos found in the sheet.');
      }
    })
    .catch(error => console.error('Error fetching yoyo data:', error));
}

// Function to display additional images in a modal
function showYoyoImages(yoyoId) {
  fetch(`${CONFIG.yoyosDataUrl}?id=${yoyoId}`)
    .then(response => response.json())
    .then(yoyo => {
      const modal = document.querySelector('.modal');
      modal.querySelector('h3').innerText = yoyo.model;
      const images = yoyo.additional_images.split(',');
      const imageContainer = modal.querySelector('.image-container');
      imageContainer.innerHTML = ''; // Clear existing images

      images.forEach(imgUrl => {
        const img = document.createElement('img');
        img.src = imgUrl || CONFIG.placeholderImage;
        img.alt = 'Additional Yoyo Image';
        imageContainer.appendChild(img);
      });

      modal.style.display = 'block';
    })
    .catch(error => console.error('Error fetching yoyo images:', error));
}

// Function to toggle the visibility of the specs for a yoyo
function toggleYoyoSpecs(yoyoId) {
  const specsContainer = document.querySelector(`.specs-container[data-yoyo-id="${yoyoId}"]`);
  const specsButton = document.querySelector(`.show-specs-btn[data-yoyo-id="${yoyoId}"]`);
  
  // If specs are already visible, hide them
  if (specsContainer.style.display === 'block') {
    specsContainer.style.display = 'none';
    specsButton.innerText = 'Show Specs';
  } else {
    // Otherwise, fetch and display the specs
    fetch(`${CONFIG.specsDataUrl}?id=${yoyoId}`)
      .then(response => response.json())
      .then(specs => {
        if (specs.length > 0) {
          const yoyoSpecs = specs[0];  // Assuming the first spec is the correct one for this yoyo
          let specsContent = `
            <p><strong>Weight:</strong> ${yoyoSpecs.weight || 'N/A'}</p>
            <p><strong>Diameter:</strong> ${yoyoSpecs.diameter || 'N/A'}</p>
            <p><strong>Width:</strong> ${yoyoSpecs.width || 'N/A'}</p>
            <p><strong>Response System:</strong> ${yoyoSpecs.response_system || 'N/A'}</p>
            <p><strong>Material:</strong> ${yoyoSpecs.material || 'N/A'}</p>
          `;
          specsContainer.innerHTML = specsContent;
          specsContainer.style.display = 'block';
          specsButton.innerText = 'Hide Specs';
        }
      })
      .catch(error => console.error('Error fetching yoyo specs:', error));
  }
}

// Function to close the modal
function closeModal() {
  const modal = document.querySelector('.modal');
  modal.style.display = 'none';
}

// Fetch the data when the page loads
document.addEventListener('DOMContentLoaded', () => {
  fetchYoyoData();

  // Close modal on close button click
  document.querySelector('.close-modal-btn').addEventListener('click', closeModal);
});