const API_RANDOM = "https://www.thecocktaildb.com/api/json/v1/1/random.php";

let currentDrink = null;

function getIngredients(drink) {
  const result = [];
  for (let i = 1; i <= 15; i++) {
    const name = drink[`strIngredient${i}`];
    const measure = drink[`strMeasure${i}`];
    if (name && name.trim()) {
      result.push({ name: name.trim(), measure: measure ? measure.trim() : "" });
    }
  }
  return result;
}

function getShortDesc(drink) {
  if (!drink.strInstructions) return "";
  const first = drink.strInstructions.split(/\.\s+/)[0].replace(/\.$/, "");
  return first.length > 120 ? first.slice(0, 117) + "…" : first + ".";
}

function getDifficulty(drink) {
  const count = getIngredients(drink).length;
  if (count <= 8)  return "Easy";
  if (count <= 12) return "Medium";
  return "Hard";
}

function getTime(drink) {
  const diff = getDifficulty(drink);
  if (diff === "Easy")   return "5 min";
  if (diff === "Medium") return "10 min";
  return "15 min";
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

const heartSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;

async function fetchRandom() {
  const response = await fetch(API_RANDOM); 
  const data = await response.json();        
  return data.drinks[0];                     
}

function renderCard(drink) {
  const ingredients = getIngredients(drink);
  const card = document.getElementById("cocktail-card");

  const ingredientsList = ingredients
    .map(i => `<li>${i.measure ? i.measure + " " : ""}${i.name}</li>`)
    .join("");

  card.classList.add("has-content");
  card.innerHTML = `
    <div class="card-body">
      <h2 class="card-name">${drink.strDrink}</h2>
      <p class="card-desc">${getShortDesc(drink)}</p>
      <hr class="card-divider">
      <div class="card-meta-row">
        <div class="meta-col">
          <span class="meta-label">Difficulty</span>
          <span class="meta-value">${getDifficulty(drink)}</span>
        </div>
        <div class="meta-col">
          <span class="meta-label">Time</span>
          <span class="meta-value">${getTime(drink)}</span>
        </div>
        <div class="meta-col">
          <span class="meta-label">Glass</span>
          <span class="meta-value">${drink.strGlass || "Glass"}</span>
        </div>
      </div>
      <hr class="card-divider">
      <div class="card-ingredients">
        <strong>Ingredients:</strong>
        <ul>${ingredientsList}</ul>
      </div>
    </div>
    <div class="card-image-side">
      <button class="card-heart" aria-label="Favorit">${heartSVG}</button>
      <img src="${drink.strDrinkThumb}" alt="${drink.strDrink}">
    </div>
  `;
  currentDrink = drink;
}

function renderLoading() {
  const card = document.getElementById("cocktail-card");
  card.classList.remove("has-content");
  card.innerHTML = `<div class="loading"><div class="spinner"></div><p>Finding your drink…</p></div>`;
}

function renderError() {
  const card = document.getElementById("cocktail-card");
  card.classList.remove("has-content");
  card.innerHTML = `<div class="empty-state">⚠️<br><br>API not reachable.</div>`;
}

async function spin() {
  const card = document.getElementById("cocktail-card");
  const btn = document.getElementById("spin-btn");
  btn.disabled = true;

  card.classList.add("fade-out");
  await wait(240);
  renderLoading();
  card.classList.remove("fade-out");

  try {
    const drink = await fetchRandom();
    card.classList.add("fade-out");
    await wait(180);
    renderCard(drink);
    card.classList.remove("fade-out");
  } catch {
    renderError();
  }

  btn.disabled = false;
}

document.getElementById("spin-btn").addEventListener("click", spin);

function getFavorites() {
  return JSON.parse(localStorage.getItem("sip-favorites") || "[]");
}

function saveFavorites(favs) {
  localStorage.setItem("sip-favorites", JSON.stringify(favs));
}

function isFavorite(id) {
  return getFavorites().some(f => f.idDrink === String(id));
}

function toggleFavorite(drink) {
  const sid = String(drink.idDrink);
  let favs = getFavorites();
  if (favs.some(f => f.idDrink === sid)) {
    favs = favs.filter(f => f.idDrink !== sid); // entfernen
  } else {
    favs.push({ idDrink: sid, strDrink: drink.strDrink, strDrinkThumb: drink.strDrinkThumb });
  }
  saveFavorites(favs);
  renderFavorites();
}

function renderFavorites() {
  const favs = getFavorites().filter(f => f.strDrink && f.strDrink !== "undefined");
  const section = document.getElementById("favorites-section");
  const list = document.getElementById("favorites-list");

  section.style.display = "block";

  if (favs.length === 0) {
    list.innerHTML = `<p class="favorites-empty">You don't have any favorites yet.</p>`;
    return;
  }

  list.innerHTML = favs.map(f => `
    <div class="fav-card">
      <div class="fav-img-wrap">
        <img class="fav-img" src="${f.strDrinkThumb}" alt="${f.strDrink}">
        <button class="fav-heart active" data-id="${f.idDrink}" aria-label="Remove">
          ${heartSVG}
        </button>
      </div>
      <div class="fav-name">${f.strDrink}</div>
    </div>
  `).join("");
}

document.getElementById("cocktail-card").addEventListener("click", function(e) {
  const btn = e.target.closest(".card-heart");
  if (!btn || !currentDrink) return;
  toggleFavorite(currentDrink);
  btn.classList.toggle("active");
});

document.getElementById("favorites-list").addEventListener("click", function(e) {
  const btn = e.target.closest(".fav-heart");
  if (!btn) return;
  const id = btn.dataset.id;
  let favs = getFavorites();
  favs = favs.filter(f => f.idDrink !== id);
  saveFavorites(favs);
  const cardHeart = document.querySelector(".card-heart");
  if (cardHeart && currentDrink && String(currentDrink.idDrink) === id) {
    cardHeart.classList.remove("active");
  }
  renderFavorites();
});

renderFavorites(); 

spin(); 