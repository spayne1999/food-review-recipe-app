// Food Review & Recipe Lookup (TheMealDB)
// Works on GitHub Pages (static). No API keys required.

const content = document.getElementById("content");
const toolbar = document.getElementById("toolbar");
const backBtn = document.getElementById("backBtn");
const contextTitle = document.getElementById("contextTitle");
const toast = document.getElementById("toast");

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const randomBtn = document.getElementById("randomBtn");
const favoritesBtn = document.getElementById("favoritesBtn");
const favCount = document.getElementById("favCount");

const categorySelect = document.getElementById("categorySelect");
const areaSelect = document.getElementById("areaSelect");
const sortSelect = document.getElementById("sortSelect");
const themeBtn = document.getElementById("themeBtn");

let navStack = [];

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add("hidden"), 2200);
}
function setToolbar(visible, title = "") {
  if (!visible) {
    toolbar.classList.add("hidden");
    contextTitle.textContent = "";
    return;
  }
  toolbar.classList.remove("hidden");
  contextTitle.textContent = title;
}
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function stars(n) {
  const r = Math.max(0, Math.min(5, Number(n) || 0));
  return "★★★★★☆☆☆☆☆".slice(5 - r, 10 - r);
}

// localStorage
function getFavorites() { return JSON.parse(localStorage.getItem("favorites") || "[]"); }
function setFavorites(ids) { localStorage.setItem("favorites", JSON.stringify(ids)); updateFavCount(); }
function isFavorite(id) { return getFavorites().includes(id); }
function updateFavCount() { favCount.textContent = String(getFavorites().length); }

function reviewsKey(id) { return `reviews_${id}`; }
function getReviews(id) { return JSON.parse(localStorage.getItem(reviewsKey(id)) || "[]"); }
function setReviews(id, reviews) { localStorage.setItem(reviewsKey(id), JSON.stringify(reviews)); }

function getTheme() { return localStorage.getItem("theme") || "light"; }
function setTheme(t) {
  document.documentElement.setAttribute("data-theme", t === "dark" ? "dark" : "light");
  localStorage.setItem("theme", t);
  themeBtn.textContent = t === "dark" ? "☀️" : "🌙";
}

// API helpers
async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Network error");
  return await res.json();
}

// TheMealDB endpoints
async function mealdbSearch(query) {
  return fetchJson(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`);
}
async function mealdbLookup(id) {
  return fetchJson(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(id)}`);
}
async function mealdbRandom() {
  return fetchJson(`https://www.themealdb.com/api/json/v1/1/random.php`);
}
async function mealdbCategories() {
  return fetchJson(`https://www.themealdb.com/api/json/v1/1/categories.php`);
}
async function mealdbAreas() {
  return fetchJson(`https://www.themealdb.com/api/json/v1/1/list.php?a=list`);
}

function extractIngredientsMealdb(meal) {
  const items = [];
  for (let i = 1; i <= 20; i++) {
    const ing = meal[`strIngredient${i}`];
    const meas = meal[`strMeasure${i}`];
    if (ing && ing.trim()) {
      const text = `${(meas || "").trim()} ${(ing || "").trim()}`.trim();
      items.push(text);
    }
  }
  return items;
}

function avgRating(reviews) {
  if (!reviews.length) return null;
  const nums = reviews.map(r => Number(r.rating) || 0).filter(n => n > 0);
  if (!nums.length) return null;
  const avg = nums.reduce((a,b)=>a+b,0)/nums.length;
  return Math.round(avg * 10) / 10;
}

// Navigation
function pushView(fn) { navStack.push(fn); }
function goBack() {
  navStack.pop();
  const prev = navStack[navStack.length - 1];
  if (prev) prev();
  else renderHome();
}

// Home
function renderHome() {
  setToolbar(false);
  content.innerHTML = `
    <div class="section">
      <h3>Quick Start</h3>
      <p class="muted">
        Type a food and press Enter. Example searches: <b>chicken</b>, <b>pasta</b>, <b>tacos</b>.
      </p>
      <p class="muted">
        Features: search, random recipe, filters, favorites, reviews, CSV export, dark mode.
      </p>
    </div>
  `;
  navStack = [renderHome];
}

function applyFilters(items) {
  const cat = categorySelect.value;
  const area = areaSelect.value;

  let filtered = items.slice();
  if (cat) filtered = filtered.filter(m => (m.strCategory || "") === cat);
  if (area) filtered = filtered.filter(m => (m.strArea || "") === area);

  const sortMode = sortSelect.value;
  filtered.sort((a,b) => {
    const A = (a.strMeal || "").toLowerCase();
    const B = (b.strMeal || "").toLowerCase();
    return sortMode === "za" ? (B.localeCompare(A)) : (A.localeCompare(B));
  });

  return filtered;
}

// Search results view
async function renderSearch(query) {
  setToolbar(true, `Search: "${query}"`);
  content.innerHTML = `<div class="loading">Searching recipes…</div>`;

  try {
    const data = await mealdbSearch(query);
    const meals = data.meals || [];

    if (meals.length === 0) {
      content.innerHTML = `
        <div class="section">
          <h3>No results</h3>
          <p class="muted">Try another keyword (ex: burger, soup, rice).</p>
        </div>
      `;
      return;
    }

    const filtered = applyFilters(meals);

    if (filtered.length === 0) {
      content.innerHTML = `
        <div class="section">
          <h3>0 matches after filters</h3>
          <p class="muted">Try clearing Category/Area filters.</p>
        </div>
      `;
      return;
    }

    content.innerHTML = `
      <div class="section" style="margin-top:0">
        <h3>Results</h3>
        <p class="muted">Showing <b>${filtered.length}</b> result(s).</p>
      </div>
      <div class="grid">
        ${filtered.map(m => `
          <div class="card">
            <img class="thumb" src="${escapeHtml(m.strMealThumb || "")}" alt="${escapeHtml(m.strMeal)}" />
            <div class="cardBody">
              <h3 class="cardTitle">${escapeHtml(m.strMeal)}</h3>
              <p class="cardMeta">${escapeHtml(m.strArea || "Unknown")} • ${escapeHtml(m.strCategory || "Recipe")}</p>
              <div class="cardActions">
                <button class="smallBtn" onclick="viewRecipe('${escapeHtml(m.idMeal)}')">View</button>
                <button class="smallBtn alt" onclick="toggleFavorite('${escapeHtml(m.idMeal)}')">
                  ${isFavorite(m.idMeal) ? "★ Favorited" : "☆ Favorite"}
                </button>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  } catch (e) {
    content.innerHTML = `
      <div class="section">
        <h3>Error</h3>
        <p class="muted">Could not reach recipe API. Try again.</p>
      </div>
    `;
  }
}

// Details view
async function viewRecipe(id) {
  setToolbar(true, "Recipe details");
  content.innerHTML = `<div class="loading">Loading recipe…</div>`;

  try {
    const data = await mealdbLookup(id);
    const meal = (data.meals || [])[0];
    if (!meal) throw new Error("Not found");

    const title = meal.strMeal;
    const image = meal.strMealThumb;
    const area = meal.strArea || "Unknown";
    const category = meal.strCategory || "Recipe";
    const ingredients = extractIngredientsMealdb(meal);
    const instructions = meal.strInstructions || "";
    const yt = meal.strYoutube || "";

    const reviews = getReviews(id);
    const avg = avgRating(reviews);
    const fav = isFavorite(id);

    content.innerHTML = `
      <div class="detailsHeader">
        <img class="heroImg" src="${escapeHtml(image)}" alt="${escapeHtml(title)}" />
        <div>
          <div class="section" style="margin-top:0">
            <h3>${escapeHtml(title)}</h3>
            <p class="muted">
              ${escapeHtml(area)} • ${escapeHtml(category)}
              ${avg ? ` • Avg rating: <b>${avg}</b>/5` : ""}
            </p>
            <div class="cardActions" style="margin-top:10px">
              <button class="smallBtn alt" onclick="toggleFavorite('${escapeHtml(id)}')">
                ${fav ? "★ Remove Favorite" : "☆ Save Favorite"}
              </button>
              <button class="smallBtn alt" onclick="printRecipe()">Print</button>
              <button class="smallBtn alt" onclick="exportReviewsCsv('${escapeHtml(id)}','${escapeHtml(title)}')">Export Reviews CSV</button>
              ${yt ? `<a class="smallBtn" style="text-decoration:none; display:inline-block;" href="${escapeHtml(yt)}" target="_blank" rel="noreferrer">YouTube</a>` : ""}
            </div>
          </div>

          <div class="section">
            <h3>Ingredients</h3>
            <ul class="list">
              ${ingredients.map(x => `<li>${escapeHtml(x)}</li>`).join("") || "<li class='muted'>No ingredients listed.</li>"}
            </ul>
          </div>
        </div>
      </div>

      <div class="section">
        <h3>Instructions</h3>
        <p>${escapeHtml(instructions).replaceAll("\\n", "<br>")}</p>
      </div>

      <div class="section">
        <h3>Reviews</h3>
        <p class="muted">Add your rating and comment for this recipe.</p>

        <div class="reviewRow">
          <div>
            <h4 style="margin:0 0 10px">Add a review</h4>
            <input class="textInput" id="revName" placeholder="Your name" />
            <div style="height:10px"></div>
            <input class="numInput" id="revRating" type="number" min="1" max="5" placeholder="Rating (1–5)" />
            <div style="height:10px"></div>
            <textarea id="revComment" placeholder="Write a comment…"></textarea>
            <div style="height:10px"></div>
            <div class="formActions">
              <button class="smallBtn" onclick="addReview('${escapeHtml(id)}')">Submit</button>
              <span class="hint">Tip: keep it short and helpful.</span>
            </div>
          </div>

          <div>
            <h4 style="margin:0 0 10px">All reviews</h4>
            <div id="reviewsList"></div>
          </div>
        </div>
      </div>
    `;

    renderReviewsList(id);
  } catch (e) {
    content.innerHTML = `
      <div class="section">
        <h3>Could not load recipe</h3>
        <p class="muted">Try again from search.</p>
      </div>
    `;
  }
}

function printRecipe() { window.print(); }

// Reviews
function renderReviewsList(id) {
  const list = document.getElementById("reviewsList");
  if (!list) return;
  const reviews = getReviews(id);

  if (!reviews.length) {
    list.innerHTML = `<p class="muted">No reviews yet. Be the first!</p>`;
    return;
  }

  list.innerHTML = reviews.slice().reverse().map((r, idxFromEnd) => {
    const idx = reviews.length - 1 - idxFromEnd;
    return `
      <div class="reviewItem">
        <div><b>${escapeHtml(r.name)}</b> <span class="muted">• ${new Date(r.createdAt).toLocaleString()}</span></div>
        <div class="stars" aria-label="rating">${stars(r.rating)}</div>
        <div>${escapeHtml(r.comment)}</div>
        <div style="margin-top:8px">
          <button class="smallBtn danger" onclick="deleteReview('${escapeHtml(id)}', ${idx})">Delete</button>
        </div>
      </div>
    `;
  }).join("");
}

function addReview(id) {
  const nameEl = document.getElementById("revName");
  const ratingEl = document.getElementById("revRating");
  const commentEl = document.getElementById("revComment");

  const name = (nameEl.value || "").trim();
  const rating = Number(ratingEl.value);
  const comment = (commentEl.value || "").trim();

  if (!name) return showToast("Please enter your name.");
  if (!rating || rating < 1 || rating > 5) return showToast("Rating must be 1 to 5.");
  if (!comment) return showToast("Please write a comment.");

  const reviews = getReviews(id);
  reviews.push({ name, rating, comment, createdAt: new Date().toISOString() });
  setReviews(id, reviews);

  nameEl.value = "";
  ratingEl.value = "";
  commentEl.value = "";

  showToast("Review added!");
  renderReviewsList(id);
}

function deleteReview(id, index) {
  const reviews = getReviews(id);
  if (index < 0 || index >= reviews.length) return;
  reviews.splice(index, 1);
  setReviews(id, reviews);
  showToast("Review deleted.");
  renderReviewsList(id);
}

// Favorites
function toggleFavorite(id) {
  const favs = getFavorites();
  const idx = favs.indexOf(id);
  if (idx >= 0) {
    favs.splice(idx, 1);
    setFavorites(favs);
    showToast("Removed from favorites.");
  } else {
    favs.push(id);
    setFavorites(favs);
    showToast("Saved to favorites!");
  }
  const current = navStack[navStack.length - 1];
  if (current) current();
}

async function renderFavorites() {
  setToolbar(true, "Your favorites");
  const favs = getFavorites();

  if (!favs.length) {
    content.innerHTML = `
      <div class="section">
        <h3>No favorites yet</h3>
        <p class="muted">Save a recipe from Search or Details using ☆ Favorite.</p>
      </div>
    `;
    return;
  }

  content.innerHTML = `<div class="loading">Loading favorites…</div>`;

  const cards = [];
  for (const id of favs) {
    try {
      const data = await mealdbLookup(id);
      const meal = (data.meals || [])[0];
      if (meal) {
        cards.push({
          id,
          title: meal.strMeal,
          image: meal.strMealThumb,
          meta: `${meal.strArea || "Unknown"} • ${meal.strCategory || "Recipe"}`
        });
      }
    } catch {}
  }

  if (!cards.length) {
    content.innerHTML = `
      <div class="section">
        <h3>Favorites couldn't load</h3>
        <p class="muted">Try again.</p>
      </div>
    `;
    return;
  }

  content.innerHTML = `
    <div class="section" style="margin-top:0">
      <h3>Favorites</h3>
      <p class="muted">You have <b>${cards.length}</b> favorite recipe(s).</p>
    </div>
    <div class="grid">
      ${cards.map(m => `
        <div class="card">
          <img class="thumb" src="${escapeHtml(m.image || "")}" alt="${escapeHtml(m.title)}" />
          <div class="cardBody">
            <h3 class="cardTitle">${escapeHtml(m.title)}</h3>
            <p class="cardMeta">${escapeHtml(m.meta)}</p>
            <div class="cardActions">
              <button class="smallBtn" onclick="viewRecipe('${escapeHtml(m.id)}')">View</button>
              <button class="smallBtn danger" onclick="removeFavorite('${escapeHtml(m.id)}')">Remove</button>
            </div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function removeFavorite(id) {
  const favs = getFavorites().filter(x => x !== id);
  setFavorites(favs);
  showToast("Removed.");
  const current = navStack[navStack.length - 1];
  if (current) current();
}

// Export reviews CSV
function exportReviewsCsv(id, recipeName) {
  const reviews = getReviews(id);
  if (!reviews.length) return showToast("No reviews to export.");

  const rows = [
    ["recipe_id", "recipe_name", "name", "rating", "comment", "created_at"],
    ...reviews.map(r => [id, recipeName, r.name, String(r.rating), r.comment, r.createdAt])
  ];

  const csv = rows.map(row =>
    row.map(cell => {
      const s = String(cell ?? "");
      const needsQuotes = /[",\n]/.test(s);
      const escaped = s.replaceAll('"', '""');
      return needsQuotes ? `"${escaped}"` : escaped;
    }).join(",")
  ).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reviews_${encodeURIComponent(id)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  showToast("CSV downloaded!");
}

// Wiring
async function onSearch() {
  const q = (searchInput.value || "").trim();
  if (!q) return showToast("Type something to search.");
  pushView(() => renderSearch(q));
  await renderSearch(q);
}

async function onRandom() {
  setToolbar(true, "Random recipe");
  content.innerHTML = `<div class="loading">Picking a random recipe…</div>`;
  try {
    const data = await mealdbRandom();
    const meal = (data.meals || [])[0];
    if (!meal) throw new Error("No random recipe");
    pushView(() => viewRecipe(meal.idMeal));
    await viewRecipe(meal.idMeal);
  } catch {
    showToast("Could not load random recipe.");
    renderHome();
  }
}

function rerunCurrent() {
  const current = navStack[navStack.length - 1];
  if (current) current();
}

searchBtn.addEventListener("click", onSearch);
randomBtn.addEventListener("click", onRandom);
favoritesBtn.addEventListener("click", () => { pushView(renderFavorites); renderFavorites(); });
searchInput.addEventListener("keydown", (e) => { if (e.key === "Enter") onSearch(); });
backBtn.addEventListener("click", goBack);

categorySelect.addEventListener("change", rerunCurrent);
areaSelect.addEventListener("change", rerunCurrent);
sortSelect.addEventListener("change", rerunCurrent);

themeBtn.addEventListener("click", () => {
  const next = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  showToast(next === "dark" ? "Dark mode on" : "Light mode on");
});

// Load filters (categories + areas)
async function loadFilters() {
  try {
    const [cats, areas] = await Promise.all([mealdbCategories(), mealdbAreas()]);

    const catNames = (cats.categories || []).map(c => c.strCategory).filter(Boolean).sort();
    for (const c of catNames) {
      const opt = document.createElement("option");
      opt.value = c; opt.textContent = c;
      categorySelect.appendChild(opt);
    }

    const areaNames = (areas.meals || []).map(a => a.strArea).filter(Boolean).sort();
    for (const a of areaNames) {
      const opt = document.createElement("option");
      opt.value = a; opt.textContent = a;
      areaSelect.appendChild(opt);
    }
  } catch {
    // ok if filters fail
  }
}

// Expose functions for inline onclick
window.viewRecipe = viewRecipe;
window.toggleFavorite = toggleFavorite;
window.addReview = addReview;
window.deleteReview = deleteReview;
window.exportReviewsCsv = exportReviewsCsv;
window.printRecipe = printRecipe;
window.removeFavorite = removeFavorite;

setTheme(getTheme());
updateFavCount();
loadFilters();
renderHome();
