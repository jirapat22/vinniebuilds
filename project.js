/* ============================================================
   VinnieBuilds — project.js
   Handles the single project case study page (project.html)
   Reads ?id=<slug> from the URL
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('footerYear').textContent = new Date().getFullYear();

  if (localStorage.getItem('vb_token')) {
    const adminLink = document.getElementById('footerAdminLink');
    if (adminLink) adminLink.style.display = 'inline';
  }

  const slug = new URLSearchParams(window.location.search).get('id');

  if (!slug) {
    showError('No project specified.');
    return;
  }

  let project = null;
  let projectList = DEFAULT_PROJECTS; // from projects.js (loaded before this file)

  // Try to load from API first
  if (typeof CONFIG !== 'undefined' && CONFIG.API_READY) {
    try {
      const [projRes, allRes] = await Promise.all([
        fetch(`${CONFIG.API_URL}/api/projects/${encodeURIComponent(slug)}`),
        fetch(`${CONFIG.API_URL}/api/projects`)
      ]);
      if (projRes.ok) {
        project = await projRes.json();
      }
      if (allRes.ok) {
        projectList = await allRes.json();
        localStorage.setItem('vb_projects', JSON.stringify(projectList));
      }
    } catch {
      // Fall through to local lookup
    }
  }

  // Fall back to cached or default data
  if (!project) {
    const cached = localStorage.getItem('vb_projects');
    if (cached) { try { projectList = JSON.parse(cached); } catch {} }
    project = projectList.find(p => p.slug === slug);
  }

  if (!project) {
    showError(`Project "${slug}" not found.`);
    return;
  }

  // Load categories
  let categories = DEFAULT_CATEGORIES;
  const cachedCats = localStorage.getItem('vb_categories');
  if (cachedCats) { try { categories = JSON.parse(cachedCats); } catch {} }

  renderProject(project, projectList, categories);
  initNav();

  // GSAP animations
  waitForGSAP(() => {
    initProjectAnimations();
  });
});

/* ── RENDER PROJECT ── */
function renderProject(project, projectList, categories) {
  // Page meta
  document.getElementById('pageTitle').textContent = `${project.title} — VinnieBuilds`;
  document.getElementById('pageDesc').setAttribute('content',
    project.description ? project.description.split('\n')[0] : `A project by VinnieBuilds`);

  // Hero
  const heroImg = document.getElementById('pdHeroImg');
  if (project.cover_photo) {
    heroImg.src = project.cover_photo;
    heroImg.alt = project.title;
  } else {
    document.getElementById('pdHero').style.background =
      'linear-gradient(135deg, #3a3028 0%, #2c2320 100%)';
    heroImg.style.display = 'none';
  }

  // Category badge
  const catEl = document.getElementById('pdCat');
  const cat = categories.find(c => c.id === project.category_id);
  if (cat) {
    catEl.textContent = cat.name;
    catEl.style.display = 'inline-block';
  } else {
    catEl.style.display = 'none';
  }

  // Title
  document.getElementById('pdTitle').textContent = project.title;

  // Meta
  const metaEl = document.getElementById('pdMeta');
  const metaParts = [];
  if (project.year)        metaParts.push(`<span><strong>${project.year}</strong></span>`);
  if (project.client_type) metaParts.push(`<span>${escapeHTML(project.client_type)}</span>`);
  metaEl.innerHTML = metaParts.join('');

  // Description
  const descEl = document.getElementById('pdDesc');
  if (project.description) {
    descEl.innerHTML = project.description
      .split('\n\n')
      .filter(Boolean)
      .map(p => `<p>${escapeHTML(p)}</p>`)
      .join('');
  }

  // Sidebar
  const sidebarEl = document.getElementById('pdSidebar');
  let sidebarHTML = '';

  if (project.materials && project.materials.length) {
    sidebarHTML += `
      <div class="pd-sidebar__block">
        <p class="pd-sidebar__label">Materials</p>
        <div class="pd-materials">
          ${project.materials.map(m => `<span class="pd-material-tag">${escapeHTML(m)}</span>`).join('')}
        </div>
      </div>`;
  }

  if (project.year) {
    sidebarHTML += `
      <div class="pd-sidebar__block">
        <p class="pd-sidebar__label">Year</p>
        <p class="pd-sidebar__text">${escapeHTML(String(project.year))}</p>
      </div>`;
  }

  if (project.client_type) {
    sidebarHTML += `
      <div class="pd-sidebar__block">
        <p class="pd-sidebar__label">Client</p>
        <p class="pd-sidebar__text">${escapeHTML(project.client_type)}</p>
      </div>`;
  }

  // Add "enquire about project" link with prefill
  sidebarHTML += `
    <div class="pd-sidebar__block">
      <a href="index.html#contact" class="btn btn--red btn--full">Enquire about this</a>
    </div>`;

  sidebarEl.innerHTML = sidebarHTML;

  // Gallery — skip cover photo (already in hero), show remaining
  const galleryEl = document.getElementById('pdGallery');
  const galleryPhotos = (project.photos || []).filter(p => p !== project.cover_photo);

  if (galleryPhotos.length) {
    galleryEl.innerHTML = galleryPhotos.map((src, i) => `
      <div class="pd-gallery__item">
        <img class="pd-gallery__img"
             src="${escapeHTML(src)}"
             alt="${escapeHTML(project.title)} — photo ${i + 2}"
             loading="lazy"
             onerror="this.parentElement.style.background='linear-gradient(135deg,#e8dfd0,#d4c4ac)';this.style.display='none'">
      </div>
    `).join('');
  } else {
    galleryEl.style.display = 'none';
  }

  // Prev / Next
  const sortedList = [...projectList].sort((a, b) => a.sort_order - b.sort_order);
  const currentIdx = sortedList.findIndex(p => p.slug === project.slug);

  const prevEl = document.getElementById('pdPrev');
  const nextEl = document.getElementById('pdNext');

  if (currentIdx > 0) {
    const prev = sortedList[currentIdx - 1];
    prevEl.href = `project.html?id=${encodeURIComponent(prev.slug)}`;
    document.getElementById('pdPrevTitle').textContent = prev.title;
    prevEl.classList.remove('pd-prevnext__item--disabled');
  }

  if (currentIdx < sortedList.length - 1) {
    const next = sortedList[currentIdx + 1];
    nextEl.href = `project.html?id=${encodeURIComponent(next.slug)}`;
    document.getElementById('pdNextTitle').textContent = next.title;
    nextEl.classList.remove('pd-prevnext__item--disabled');
  }
}

/* ── ERROR STATE ── */
function showError(msg) {
  document.getElementById('pdTitle').textContent = 'Project not found';
  document.getElementById('pdDesc').innerHTML =
    `<p>${escapeHTML(msg)} <a href="projects.html">← Back to Projects</a></p>`;
  document.getElementById('pdHeroImg').style.display = 'none';
  document.getElementById('pdHero').style.minHeight = '300px';
}

/* ── NAV ── */
function initNav() {
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

/* ── GSAP ANIMATIONS ── */
function initProjectAnimations() {
  gsap.registerPlugin(ScrollTrigger);

  // Hero content
  gsap.fromTo('.pd-back',
    { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.6, delay: 0.2, ease: 'power2.out' });
  gsap.fromTo('.pd-hero__cat',
    { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, delay: 0.35, ease: 'power2.out' });
  gsap.fromTo('.pd-hero__title',
    { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.8, delay: 0.5, ease: 'power3.out' });
  gsap.fromTo('.pd-hero__meta',
    { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, delay: 0.7, ease: 'power2.out' });

  // Body
  gsap.fromTo('.pd-body__desc',
    { opacity: 0, y: 40 },
    { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out',
      scrollTrigger: { trigger: '.pd-body', start: 'top 80%' } });

  gsap.fromTo('.pd-sidebar',
    { opacity: 0, x: 30 },
    { opacity: 1, x: 0, duration: 0.8, ease: 'power2.out',
      scrollTrigger: { trigger: '.pd-body', start: 'top 80%' } });

  // Gallery items
  gsap.utils.toArray('.pd-gallery__item').forEach((item, i) => {
    gsap.fromTo(item,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.65, delay: i * 0.08, ease: 'power2.out',
        scrollTrigger: { trigger: item, start: 'top 88%' } });
  });

  // Enquire section
  gsap.fromTo('.pd-enquire',
    { opacity: 0, y: 24 },
    { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out',
      scrollTrigger: { trigger: '.pd-enquire', start: 'top 85%' } });
}

/* ── UTILS ── */
function escapeHTML(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str || '')));
  return d.innerHTML;
}

function waitForGSAP(cb, attempts = 0) {
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    cb();
  } else if (attempts < 50) {
    setTimeout(() => waitForGSAP(cb, attempts + 1), 100);
  }
}
