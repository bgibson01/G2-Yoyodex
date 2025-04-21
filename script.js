// Sample data from your Google Sheet (JSON export)
const yoyos = [
  {
    model: "AL7 Brass Elite 2018",
    colorway: "Emperor",
    release_date: "November 08 2018",
    image_url: "assets/al7-brass-elite-2018/al7-brass-elite-2018_emperor.jpg",
    additional_images: ["assets/al7-brass-elite-2018/al7-brass-elite-2018_emperor_2.jpg"],
    description: "Emperor AL7 Brass Elite 2018 - Retirement Run",
    is_prototype: false,
    is_glitch: false
  },
  {
    model: "Brass Elite",
    colorway: "Island Cove (Glitch)",
    release_date: "August 03 2018",
    image_url: "assets/brass-elite/brass-elite_island-cove-(glitch).jpg",
    additional_images: ["assets/brass-elite/brass-elite_island-cove-(glitch)_2.jpg"],
    description: "Island Cove Brass Elites *Glitches*",
    is_prototype: false,
    is_glitch: true
  },
  // Add more yoyos here
];

// Render Yoyo Cards
function renderYoyoCards(yoyoData) {
  const grid = document.getElementById('yoyo-grid');
  grid.innerHTML = ''; // Clear current cards
  yoyoData.forEach(yoyo => {
    const card = document.createElement('div');
    card.classList.add('card', 'col-span-1');

    card.innerHTML = `
      <img src="${yoyo.image_url}" alt="${yoyo.model} ${yoyo.colorway}">
      <h3 class="font-bold mt-2">${yoyo.model} - ${yoyo.colorway}</h3>
      <p>${yoyo.description}</p>
      <p class="text-sm text-gray-400">${yoyo.release_date}</p>
      <span class="favorite" onclick="toggleFavorite(event)">⭐</span>
    `;
    grid.appendChild(card);
  });
}

// Search Filter
document.getElementById('search-input').addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const filteredYoyos = yoyos.filter(yoyo => 
    yoyo.model.toLowerCase().includes(searchTerm) || yoyo.colorway.toLowerCase().includes(searchTerm)
  );
  renderYoyoCards(filteredYoyos);
});

// Sorting Functions
document.getElementById('sort-az').addEventListener('click', () => {
  const sortedYoyos = [...yoyos].sort((a, b) => a.model.localeCompare(b.model));
  renderYoyoCards(sortedYoyos);
});

document.getElementById('sort-za').addEventListener('click', () => {
  const sortedYoyos = [...yoyos].sort((a, b) => b.model.localeCompare(a.model));
  renderYoyoCards(sortedYoyos);
});

document.getElementById('sort-newest').addEventListener('click', () => {
  const sortedYoyos = [...yoyos].sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
  renderYoyoCards(sortedYoyos);
});

document.getElementById('sort-oldest').addEventListener('click', () => {
  const sortedYoyos = [...yoyos].sort((a, b) => new Date(a.release_date) - new Date(b.release_date));
  renderYoyoCards(sortedYoyos);
});

// Toggle Favorite
function toggleFavorite(event) {
  const star = event.target;
  star.classList.toggle('active');
}

// Initial Render
renderYoyoCards(yoyos);
