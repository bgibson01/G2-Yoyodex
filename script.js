// Google Sheets API URL (replace with your actual Sheet ID)
const SHEET_ID = '1aI5GpU3k5JSvqduidJZPI-6BV3LWBWYdtAq9Zeekh04';  // Replace this with your Google Sheet ID
const RANGE = 'yoyos';  // Adjust if needed, such as 'Sheet1!A1:D100'

// Function to fetch data from the Google Sheet
function fetchData() {
  const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=YOUR_API_KEY`;  // Add your API key here
  
  fetch(sheetUrl)
    .then(response => response.json())
    .then(data => {
      const rows = data.values;
      if (rows && rows.length > 0) {
        updateYoyoCards(rows);
      } else {
        console.log("No data found.");
      }
    })
    .catch(error => console.error("Error fetching data from Google Sheets: ", error));
}

// Function to update the grid with yoyos
function updateYoyoCards(data) {
  const yoyoGrid = document.getElementById('yoyo-grid');
  yoyoGrid.innerHTML = '';  // Clear the grid before adding new cards

  // Loop through the rows and create yoyo cards
  data.slice(1).forEach(row => { // Skip the header row
    const [model, colorway, releaseDate, quantity, imageUrl, additionalImages] = row;

    const yoyoCard = document.createElement('div');
    yoyoCard.classList.add('yoyo-card', 'bg-gray-800', 'p-4', 'rounded-lg', 'cursor-pointer', 'hover:bg-gray-700');
    
    yoyoCard.innerHTML = `
      <img src="${imageUrl}" alt="${model}" class="w-full h-auto rounded mb-4">
      <h3 class="text-xl font-semibold">${model}</h3>
      <p>${colorway}</p>
      <p>Release Date: ${releaseDate}</p>
      <p>Quantity: ${quantity || 'N/A'}</p>
    `;
    
    // Add event listener for modal on click
    yoyoCard.addEventListener('click', () => showModal(imageUrl, additionalImages));
    
    yoyoGrid.appendChild(yoyoCard);
  });
}

// Function to display the modal with additional images
function showModal(mainImage, additionalImages) {
  const modal = document.getElementById('modal');
  const modalMainImage = document.getElementById('modal-main-image');
  const modalImages = document.getElementById('modal-images');

  modal.style.display = 'flex';
  modalMainImage.src = mainImage;

  // Add additional images to the modal
  modalImages.innerHTML = '';  // Clear previous images
  if (additionalImages) {
    additionalImages.split(',').forEach(image => {
      const imgElement = document.createElement('img');
      imgElement.src = image.trim();
      imgElement.classList.add('w-32', 'h-auto', 'rounded');
      modalImages.appendChild(imgElement);
    });
  }
}

// Close the modal
document.getElementById('close-modal').addEventListener('click', () => {
  document.getElementById('modal').style.display = 'none';
});

// Fetch the data on page load
window.onload = fetchData;
