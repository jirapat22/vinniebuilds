/* ============================================================
   VinnieBuilds — projects.js
   Handles the projects archive page (projects.html)
   ============================================================ */

// ─────────────────────────────────────────────────────────────
// ✏️  STATIC FALLBACK PROJECTS
// Used when Railway API is not yet connected.
// Delete or comment out once the API is live.
// ─────────────────────────────────────────────────────────────
const DEFAULT_PROJECTS = [
  {
    id: 1,
    slug: 'blackwood-dining-table',
    title: 'Blackwood Dining Table',
    category_id: 'furniture',
    description: 'A six-seat dining table crafted from Australian blackwood. The waterfall edge showcases the grain\'s natural figuring. Finished with a hand-rubbed oil that brings out the warm chocolate tones of the timber.\n\nDesigned for a family in Ponsonby who wanted something that would become a heirloom piece. The hairpin legs are custom-made by a local metalworker.',
    materials: ['Australian Blackwood', 'Mild Steel Hairpin Legs', 'Osmo Hardwax Oil'],
    photos: ['images/projects/bt-1.jpg', 'images/projects/bt-2.jpg', 'images/projects/bt-3.jpg'],
    cover_photo: 'images/projects/bt-1.jpg',
    year: 2024,
    client_type: 'Residential · Ponsonby, Auckland',
    featured: true,
    sort_order: 0
  },
  {
    id: 2,
    slug: 'oak-bedhead-king',
    title: 'Oak Bedhead & Side Ledges',
    category_id: 'furniture',
    description: 'King-size floating bedhead in white oak with integrated side ledges and recessed LED lighting channel. The client wanted something minimal that still felt warm and crafted.\n\nThe bedhead is wall-mounted and appears to float, keeping the bedroom feeling open and uncluttered.',
    materials: ['White Oak', 'Brass Fixings', 'LED Strip Lighting', 'Danish Oil'],
    photos: ['images/projects/bh-1.jpg', 'images/projects/bh-2.jpg'],
    cover_photo: 'images/projects/bh-1.jpg',
    year: 2024,
    client_type: 'Residential · Grey Lynn, Auckland',
    featured: false,
    sort_order: 1
  },
  {
    id: 3,
    slug: 'rimu-cheese-board-set',
    title: 'Rimu Cheese Board Collection',
    category_id: 'small-goods',
    description: 'A limited run of hand-shaped rimu cheese boards, each one different. Sourced from reclaimed rimu salvaged from a 1960s villa renovation in Wellington.\n\nEvery board has a juice groove, a hanging hole, and a food-safe beeswax finish. Sold as a set of three or individually.',
    materials: ['Reclaimed NZ Rimu', 'Beeswax Finish'],
    photos: ['images/projects/cb-1.jpg', 'images/projects/cb-2.jpg'],
    cover_photo: 'images/projects/cb-1.jpg',
    year: 2023,
    client_type: 'Small Goods · Limited Run',
    featured: false,
    sort_order: 2
  },
  {
    id: 4,
    slug: 'kitchen-joinery-mt-eden',
    title: 'Kitchen Joinery — Mt Eden Villa',
    category_id: 'custom',
    description: 'Full kitchen joinery for a restored villa in Mt Eden. The brief was to keep the character of the original home while adding modern functionality. Rimu panels, integrated handles, and a custom island bench.\n\nWorked alongside the homeowners and their architect over a six-month project.',
    materials: ['NZ Rimu', 'Plywood Carcasses', 'Integrated Handles', 'Stone Benchtop (by others)'],
    photos: ['images/projects/kj-1.jpg', 'images/projects/kj-2.jpg', 'images/projects/kj-3.jpg'],
    cover_photo: 'images/projects/kj-1.jpg',
    year: 2023,
    client_type: 'Residential · Mt Eden, Auckland',
    featured: true,
    sort_order: 3
  },
  {
    id: 5,
    slug: 'walnut-shelving-unit',
    title: 'Walnut Modular Shelving',
    category_id: 'furniture',
    description: 'A floor-to-ceiling modular shelving system in American walnut. Designed to work around an existing fireplace — each shelf is individually supported to avoid the chimney breast.',
    materials: ['American Walnut', 'Brass Shelf Pins', 'Satin Lacquer'],
    photos: ['images/projects/ws-1.jpg', 'images/projects/ws-2.jpg'],
    cover_photo: 'images/projects/ws-1.jpg',
    year: 2024,
    client_type: 'Residential · Remuera, Auckland',
    featured: false,
    sort_order: 4
  },
  {
    id: 6,
    slug: 'turned-bud-vases',
    title: 'Turned Bud Vase Series',
    category_id: 'small-goods',
    description: 'A series of lathe-turned bud vases in mixed native NZ timbers — totara, kahikatea, and puriri. Each has a small brass insert for the water vessel.\n\nPart of an ongoing small goods range sold through local design stores.',
    materials: ['NZ Totara', 'NZ Kahikatea', 'NZ Puriri', 'Brass Vessel Inserts'],
    photos: ['images/projects/bv-1.jpg'],
    cover_photo: 'images/projects/bv-1.jpg',
    year: 2023,
    client_type: 'Small Goods · Retail',
    featured: false,
    sort_order: 5
  }
];

// ─────────────────────────────────────────────────────────────
// ✏️  STATIC FALLBACK CATEGORIES
// ─────────────────────────────────────────────────────────────
const DEFAULT_CATEGORIES = [
  { id: 'furniture',    name: 'Furniture',    sort_order: 0 },
  { id: 'small-goods',  name: 'Small Goods',  sort_order: 1 },
  { id: 'custom',       name: 'Custom Work',  sort_order: 2 },
];

// ─────────────────────────────────────────────────────────────
// Runtime state
// ─────────────────────────────────────────────────────────────
let allProjects   = DEFAULT_PROJECTS;
let allCategories = DEFAULT_CATEGORIES;
let activeFilter  = 'all';

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('footerYear').textContent = new Date().getFullYear();

  if (localStorage.getItem('vb_token')) {
    const adminLink = document.getElementById('footerAdminLink');
    if (adminLink) adminLink.style.display = 'inline';
  }

  // Load from cache first for instant render
  const cachedProjects   = localStorage.getItem('vb_projects');
  const cachedCategories = localStorage.getItem('vb_categories');
  if (cachedProjects)   { try { allProjects   = JSON.parse(cachedProjects);   } catch {} }
  if (cachedCategories) { try { allCategories = JSON.parse(cachedCategories); } catch {} }

  buildFilterBar();
  renderGrid(allProjects);

  // Fetch fresh from API
  if (typeof CONFIG !== 'undefined' && CONFIG.API_READY) {
    try {
      const [projRes, catRes] = await Promise.all([
        fetch(`${CONFIG.API_URL}/api/projects`),
        fetch(`${CONFIG.API_URL}/api/categories`)
      ]);
      if (projRes.ok)  {
        allProjects = await projRes.json();
        localStorage.setItem('vb_projects', JSON.stringify(allProjects));
      }
      if (catRes.ok) {
        allCategories = await catRes.json();
        localStorage.setItem('vb_categories', JSON.stringify(allCategories));
      }
      buildFilterBar();
      renderGrid(filteredProjects());
    } catch {
      // API down — cached/default data already shown
    }
  }

  // Mobile nav
  initMobileNav();

  // Animate header on load
  animateHeader();
});

/* ── FILTER BAR ── */
function buildFilterBar() {
  const bar = document.querySelector('.pj-filter__inner');
  if (!bar) return;

  // Keep the "All" button, rebuild category buttons
  const allBtn = bar.querySelector('[data-cat="all"]');
  bar.innerHTML = '';
  bar.appendChild(allBtn);

  allCategories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'pj-filter__btn';
    btn.dataset.cat = cat.id;
    btn.textContent = cat.name;
    btn.addEventListener('click', () => setFilter(cat.id));
    bar.appendChild(btn);
  });

  allBtn.addEventListener('click', () => setFilter('all'));
  updateFilterActive();
}

function setFilter(cat) {
  activeFilter = cat;
  updateFilterActive();
  renderGrid(filteredProjects());
}

function updateFilterActive() {
  document.querySelectorAll('.pj-filter__btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === activeFilter);
  });
}

function filteredProjects() {
  if (activeFilter === 'all') return allProjects;
  return allProjects.filter(p => p.category_id === activeFilter);
}

/* ── RENDER GRID ── */
function renderGrid(projects) {
  const grid  = document.getElementById('projectsGrid');
  const empty = document.getElementById('projectsEmpty');
  if (!grid) return;

  if (!projects.length) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';

  grid.innerHTML = projects.map((p, i) => {
    const catName = getCategoryName(p.category_id);
    const isFeatured = p.featured && i < 2;

    return `
      <a href="project.html?id=${encodeURIComponent(p.slug)}"
         class="pj-card${isFeatured ? ' pj-card--featured' : ''}"
         data-id="${p.id}">

        ${p.cover_photo
          ? `<img class="pj-card__img" src="${escapeHTML(p.cover_photo)}" alt="${escapeHTML(p.title)}" loading="lazy"
                  onerror="this.style.display='none'">`
          : `<div class="pj-card__placeholder">🪵</div>`
        }

        <div class="pj-card__overlay"></div>

        <div class="pj-card__body">
          ${catName ? `<span class="pj-card__cat">${escapeHTML(catName)}</span>` : ''}
          <h2 class="pj-card__title">${escapeHTML(p.title)}</h2>
          <p class="pj-card__meta">
            ${p.year ? escapeHTML(String(p.year)) : ''}
            ${p.year && p.client_type ? ' · ' : ''}
            ${p.client_type ? escapeHTML(p.client_type.split('·')[0].trim()) : ''}
          </p>
        </div>
      </a>
    `;
  }).join('');

  // Animate cards in
  animateCards();
}

/* ── HELPERS ── */
function getCategoryName(id) {
  const cat = allCategories.find(c => c.id === id);
  return cat ? cat.name : '';
}

function escapeHTML(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str || '')));
  return d.innerHTML;
}

/* ── ANIMATIONS ── */
function animateHeader() {
  if (typeof gsap === 'undefined') return;
  gsap.fromTo('.pj-back',
    { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', delay: 0.1 });
  gsap.fromTo('.pj-header__label',
    { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', delay: 0.2 });
  gsap.fromTo('.pj-header__title',
    { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: 0.3 });
  gsap.fromTo('.pj-header__sub',
    { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', delay: 0.5 });
}

function animateCards() {
  if (typeof gsap === 'undefined') return;
  // Small delay to let DOM settle
  requestAnimationFrame(() => {
    gsap.fromTo('.pj-card',
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.55, stagger: 0.07, ease: 'power2.out' }
    );
  });
}

/* ── MOBILE NAV ── */
function initMobileNav() {
  const burger = document.getElementById('navBurger');
  const links  = document.getElementById('navLinks');
  if (!burger || !links) return;

  burger.addEventListener('click', () => {
    const isOpen = links.classList.toggle('open');
    burger.classList.toggle('active', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      links.classList.remove('open');
      burger.classList.remove('active');
      document.body.style.overflow = '';
    });
  });
}
