/* ============================================================
   VinnieBuilds — admin.js
   Admin panel logic: login, content editing, project management
   ============================================================ */

/* ── STATE ── */
let token       = localStorage.getItem('vb_token') || null;
let currentUser = localStorage.getItem('vb_user')  || null;
let modalSaveFn = null; // function to call on modal Save

// Working copies of content (editable, saved on demand)
let adminData = {
  process_steps: [],
  small_goods:   [],
  big_builds:    [],
  services:      [],
};

let adminProjects   = [];
let adminCategories = [];

/* ════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  if (token) {
    verifyAndShowDashboard();
  }

  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);

  // Sidebar navigation
  document.querySelectorAll('.sidebar__nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchPanel(btn.dataset.panel));
  });

  // Modal controls
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalCancel').addEventListener('click', closeModal);
  document.getElementById('modalSave').addEventListener('click', () => { if (modalSaveFn) modalSaveFn(); });
  document.getElementById('modalBackdrop').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Add project button
  document.getElementById('addProjectBtn').addEventListener('click', () => openProjectModal(null));

  // Password change form
  document.getElementById('changePasswordForm').addEventListener('submit', handlePasswordChange);
});

/* ════════════════════════════════════════════════
   AUTH
════════════════════════════════════════════════ */
async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const errEl = document.getElementById('loginError');
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  btn.disabled = true;
  btn.textContent = 'Signing in…';
  errEl.textContent = '';

  if (!CONFIG.API_READY) {
    errEl.textContent = 'API not configured. Set API_URL in config.js first.';
    btn.disabled = false;
    btn.textContent = 'Sign In';
    return;
  }

  try {
    const res = await fetch(`${CONFIG.API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok) {
      errEl.textContent = data.error || 'Login failed.';
      btn.disabled = false;
      btn.textContent = 'Sign In';
      return;
    }

    token = data.token;
    currentUser = data.username;
    localStorage.setItem('vb_token', token);
    localStorage.setItem('vb_user', currentUser);
    showDashboard();

  } catch {
    errEl.textContent = 'Could not reach the server. Check your connection.';
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

async function verifyAndShowDashboard() {
  if (!CONFIG.API_READY) {
    // Offline mode: show dashboard with cached/static data, no save capability
    showDashboard();
    showToast('API not connected — view only mode', 'err');
    return;
  }

  try {
    const res = await fetch(`${CONFIG.API_URL}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      showDashboard();
    } else {
      clearAuth();
    }
  } catch {
    // Network issue — show dashboard anyway with cached data
    showDashboard();
    showToast('Offline — changes cannot be saved', 'err');
  }
}

function handleLogout() {
  clearAuth();
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
}

function clearAuth() {
  token = null;
  currentUser = null;
  localStorage.removeItem('vb_token');
  localStorage.removeItem('vb_user');
}

/* ════════════════════════════════════════════════
   DASHBOARD
════════════════════════════════════════════════ */
async function showDashboard() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'grid';
  if (currentUser) document.getElementById('sidebarUser').textContent = `Signed in as ${currentUser}`;

  await Promise.all([
    loadContent(),
    loadProjects(),
    loadCategories(),
  ]);

  renderContentPanel();
  renderProjectsPanel();
  renderCategoriesPanel();
  checkApiStatus();
}

/* ── PANEL SWITCHING ── */
function switchPanel(name) {
  document.querySelectorAll('.sidebar__nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.panel === name);
  });
  document.querySelectorAll('.panel').forEach(p => {
    p.style.display = p.dataset.panel === name ? 'block' : 'none';
  });
}

/* ════════════════════════════════════════════════
   DATA LOADING
════════════════════════════════════════════════ */
async function loadContent() {
  // Try cache
  const cached = localStorage.getItem('vb_content');
  if (cached) {
    try {
      const d = JSON.parse(cached);
      adminData.process_steps = d.process_steps || DEFAULT_PROCESS_STEPS();
      adminData.small_goods   = d.small_goods   || DEFAULT_SMALL_GOODS();
      adminData.big_builds    = d.big_builds    || DEFAULT_BIG_BUILDS();
      adminData.services      = d.services      || DEFAULT_SERVICES();
    } catch {}
  } else {
    adminData.process_steps = DEFAULT_PROCESS_STEPS();
    adminData.small_goods   = DEFAULT_SMALL_GOODS();
    adminData.big_builds    = DEFAULT_BIG_BUILDS();
    adminData.services      = DEFAULT_SERVICES();
  }

  if (!CONFIG.API_READY) return;
  try {
    const res = await apiFetch('/api/content');
    if (res.ok) {
      const d = await res.json();
      if (d.process_steps) adminData.process_steps = d.process_steps;
      if (d.small_goods)   adminData.small_goods   = d.small_goods;
      if (d.big_builds)    adminData.big_builds    = d.big_builds;
      if (d.services)      adminData.services      = d.services;
    }
  } catch {}
}

async function loadProjects() {
  const cached = localStorage.getItem('vb_projects');
  if (cached) { try { adminProjects = JSON.parse(cached); } catch {} }
  else { adminProjects = DEFAULT_PROJECTS; }

  if (!CONFIG.API_READY) return;
  try {
    const res = await apiFetch('/api/projects');
    if (res.ok) {
      adminProjects = await res.json();
      localStorage.setItem('vb_projects', JSON.stringify(adminProjects));
    }
  } catch {}
}

async function loadCategories() {
  const cached = localStorage.getItem('vb_categories');
  if (cached) { try { adminCategories = JSON.parse(cached); } catch {} }
  else { adminCategories = DEFAULT_CATEGORIES; }

  if (!CONFIG.API_READY) return;
  try {
    const res = await apiFetch('/api/categories');
    if (res.ok) {
      adminCategories = await res.json();
      localStorage.setItem('vb_categories', JSON.stringify(adminCategories));
    }
  } catch {}
}

/* ════════════════════════════════════════════════
   CONTENT PANEL — process steps, products, services
════════════════════════════════════════════════ */
function renderContentPanel() {
  renderProcessList();
  renderProductList('smallGoodsList', adminData.small_goods, 'small_goods');
  renderProductList('bigBuildsList',  adminData.big_builds,  'big_builds');
  renderServicesList();
}

/* ── PROCESS STEPS ── */
function renderProcessList() {
  const list = document.getElementById('processList');
  list.innerHTML = adminData.process_steps.map((step, i) => `
    <div class="item-row" data-index="${i}" data-type="process">
      <span class="item-row__drag" draggable="true">⠿</span>
      <div class="item-row__icon">${escapeHTML(step.icon)}</div>
      <div class="item-row__info">
        <p class="item-row__title">${escapeHTML(step.title)}</p>
        <p class="item-row__meta">${escapeHTML(step.description.substring(0, 60))}…</p>
      </div>
      <div class="item-row__actions">
        <button class="a-btn a-btn--sm a-btn--outline" onclick="editProcessStep(${i})">Edit</button>
        <button class="a-btn a-btn--sm a-btn--danger" onclick="deleteItem('process_steps', ${i})">Delete</button>
      </div>
    </div>
  `).join('') || '<p style="color:var(--text-light);font-size:.85rem;padding:8px 0">No steps yet.</p>';
}

function editProcessStep(i) {
  const step = i === -1
    ? { icon: '🔨', title: '', description: '' }
    : { ...adminData.process_steps[i] };

  openModal(i === -1 ? 'Add Process Step' : 'Edit Process Step', `
    <div class="a-form-group"><label>Icon (emoji)</label>
      <input type="text" id="mStepIcon" value="${escapeHTML(step.icon)}" placeholder="🔨" maxlength="4" /></div>
    <div class="a-form-group"><label>Title</label>
      <input type="text" id="mStepTitle" value="${escapeHTML(step.title)}" placeholder="e.g. Chat" /></div>
    <div class="a-form-group"><label>Description</label>
      <textarea id="mStepDesc" rows="3" placeholder="Short description…">${escapeHTML(step.description)}</textarea></div>
  `, async () => {
    const updated = {
      icon:        document.getElementById('mStepIcon').value.trim()  || '🔨',
      title:       document.getElementById('mStepTitle').value.trim(),
      description: document.getElementById('mStepDesc').value.trim(),
    };
    if (!updated.title) return showToast('Title is required', 'err');
    if (i === -1) adminData.process_steps.push(updated);
    else          adminData.process_steps[i] = updated;
    await saveContent('process_steps');
    renderProcessList();
    closeModal();
  });
}

function addProcessStep() { editProcessStep(-1); }

/* ── PRODUCTS ── */
function renderProductList(containerId, items, key) {
  const list = document.getElementById(containerId);
  list.innerHTML = items.map((item, i) => `
    <div class="item-row" data-index="${i}">
      <span class="item-row__drag">⠿</span>
      <div class="item-row__icon">
        ${item.image
          ? `<img class="item-row__img" src="${escapeHTML(item.image)}" onerror="this.style.display='none'">`
          : '🪵'}
      </div>
      <div class="item-row__info">
        <p class="item-row__title">${escapeHTML(item.title)}</p>
        <p class="item-row__meta">${item.price ? escapeHTML(item.price) : 'No price set'}</p>
      </div>
      <div class="item-row__actions">
        <button class="a-btn a-btn--sm a-btn--outline" onclick="editProduct('${key}', ${i})">Edit</button>
        <button class="a-btn a-btn--sm a-btn--danger" onclick="deleteItem('${key}', ${i})">Delete</button>
      </div>
    </div>
  `).join('') || '<p style="color:var(--text-light);font-size:.85rem;padding:8px 0">No items yet.</p>';
}

function editProduct(key, i) {
  const item = i === -1
    ? { image: '', title: '', description: '', price: '' }
    : { ...adminData[key][i] };

  openModal(i === -1 ? 'Add Product' : 'Edit Product', `
    <div class="a-form-group"><label>Title</label>
      <input type="text" id="mPTitle" value="${escapeHTML(item.title)}" placeholder="e.g. Cheese Board" /></div>
    <div class="a-form-group"><label>Description</label>
      <textarea id="mPDesc" rows="3">${escapeHTML(item.description)}</textarea></div>
    <div class="a-form-group"><label>Price (optional)</label>
      <input type="text" id="mPPrice" value="${escapeHTML(item.price || '')}" placeholder="$65 NZD" /></div>
    <div class="a-form-group"><label>Image URL or Path</label>
      <input type="text" id="mPImage" value="${escapeHTML(item.image || '')}" placeholder="images/small-1.jpg" />
      ${CONFIG.CLOUDINARY_READY ? `
        <button type="button" class="a-btn a-btn--sm a-btn--outline" style="margin-top:6px" onclick="uploadImageToField('mPImage')">
          Upload image ↑
        </button>` : '<p style="font-size:.75rem;color:var(--text-light);margin-top:4px">Configure Cloudinary in config.js to enable uploads.</p>'}
    </div>
  `, async () => {
    const updated = {
      title:       document.getElementById('mPTitle').value.trim(),
      description: document.getElementById('mPDesc').value.trim(),
      price:       document.getElementById('mPPrice').value.trim() || undefined,
      image:       document.getElementById('mPImage').value.trim(),
    };
    if (!updated.title) return showToast('Title is required', 'err');
    if (i === -1) adminData[key].push(updated);
    else          adminData[key][i] = updated;
    await saveContent(key);
    renderProductList(key === 'small_goods' ? 'smallGoodsList' : 'bigBuildsList', adminData[key], key);
    closeModal();
  });
}

function addProduct(key) { editProduct(key, -1); }

/* ── SERVICES ── */
function renderServicesList() {
  const list = document.getElementById('servicesList');
  list.innerHTML = adminData.services.map((svc, i) => `
    <div class="item-row" data-index="${i}">
      <span class="item-row__drag">⠿</span>
      <div class="item-row__icon">${escapeHTML(svc.icon)}</div>
      <div class="item-row__info">
        <p class="item-row__title">${escapeHTML(svc.title)}</p>
        <p class="item-row__meta">${escapeHTML(svc.description.substring(0, 60))}…</p>
      </div>
      <div class="item-row__actions">
        <button class="a-btn a-btn--sm a-btn--outline" onclick="editService(${i})">Edit</button>
        <button class="a-btn a-btn--sm a-btn--danger" onclick="deleteItem('services', ${i})">Delete</button>
      </div>
    </div>
  `).join('') || '<p style="color:var(--text-light);font-size:.85rem;padding:8px 0">No services yet.</p>';
}

function editService(i) {
  const svc = i === -1
    ? { icon: '🔧', title: '', description: '', cta: 'Get in touch' }
    : { ...adminData.services[i] };

  openModal(i === -1 ? 'Add Service' : 'Edit Service', `
    <div class="a-form-group"><label>Icon (emoji)</label>
      <input type="text" id="mSIcon" value="${escapeHTML(svc.icon)}" maxlength="4" /></div>
    <div class="a-form-group"><label>Title</label>
      <input type="text" id="mSTitle" value="${escapeHTML(svc.title)}" /></div>
    <div class="a-form-group"><label>Description</label>
      <textarea id="mSDesc" rows="4">${escapeHTML(svc.description)}</textarea></div>
    <div class="a-form-group"><label>Link Text (CTA)</label>
      <input type="text" id="mSCta" value="${escapeHTML(svc.cta)}" placeholder="Start a project" /></div>
  `, async () => {
    const updated = {
      icon:        document.getElementById('mSIcon').value.trim()  || '🔧',
      title:       document.getElementById('mSTitle').value.trim(),
      description: document.getElementById('mSDesc').value.trim(),
      cta:         document.getElementById('mSCta').value.trim()   || 'Get in touch',
    };
    if (!updated.title) return showToast('Title is required', 'err');
    if (i === -1) adminData.services.push(updated);
    else          adminData.services[i] = updated;
    await saveContent('services');
    renderServicesList();
    closeModal();
  });
}

function addService() { editService(-1); }

/* ── SAVE CONTENT TO API ── */
async function saveContent(key) {
  // Always update cache
  const cached = {};
  try { Object.assign(cached, JSON.parse(localStorage.getItem('vb_content') || '{}')); } catch {}
  cached[key] = adminData[key];
  localStorage.setItem('vb_content', JSON.stringify(cached));

  if (!CONFIG.API_READY) {
    showToast('Saved locally (API not connected)', 'ok');
    return;
  }
  try {
    const res = await apiFetch(`/api/content/${key}`, 'PUT', { value: adminData[key] });
    if (res.ok) showToast('Saved ✓', 'ok');
    else        showToast('Save failed — check console', 'err');
  } catch {
    showToast('Save failed — check connection', 'err');
  }
}

/* ── DELETE CONTENT ITEM ── */
function deleteItem(key, index) {
  if (!confirm('Delete this item?')) return;
  adminData[key].splice(index, 1);
  saveContent(key);
  renderContentPanel();
}

/* ════════════════════════════════════════════════
   PROJECTS PANEL
════════════════════════════════════════════════ */
function renderProjectsPanel() {
  const grid = document.getElementById('projectAdminGrid');
  if (!adminProjects.length) {
    grid.innerHTML = '<p style="color:var(--text-light)">No projects yet. Click "+ New Project" to add one.</p>';
    return;
  }

  grid.innerHTML = adminProjects.map(p => {
    const cat = adminCategories.find(c => c.id === p.category_id);
    return `
      <div class="project-admin-card">
        <div class="project-admin-card__thumb">
          ${p.cover_photo
            ? `<img src="${escapeHTML(p.cover_photo)}" alt="${escapeHTML(p.title)}" loading="lazy" onerror="this.style.display='none'">`
            : `<div class="project-admin-card__placeholder">🪵</div>`}
          ${p.featured ? '<span class="project-admin-card__featured-badge">Featured</span>' : ''}
        </div>
        <div class="project-admin-card__body">
          <p class="project-admin-card__title">${escapeHTML(p.title)}</p>
          <p class="project-admin-card__cat">${cat ? escapeHTML(cat.name) : ''} ${p.year ? '· ' + p.year : ''}</p>
          <div class="project-admin-card__actions">
            <button class="a-btn a-btn--sm a-btn--outline" onclick="openProjectModal(${p.id})">Edit</button>
            <button class="a-btn a-btn--sm a-btn--danger"  onclick="deleteProject(${p.id})">Delete</button>
            <a href="project.html?id=${encodeURIComponent(p.slug)}" target="_blank" class="a-btn a-btn--sm a-btn--ghost">View ↗</a>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openProjectModal(projectId) {
  const isNew = projectId === null;
  const p = isNew ? {
    slug: '', title: '', category_id: '', description: '', materials: [],
    photos: [], cover_photo: '', year: new Date().getFullYear(),
    client_type: '', featured: false, sort_order: adminProjects.length
  } : adminProjects.find(x => x.id === projectId);

  if (!p) { showToast('Project not found', 'err'); return; }

  const catOptions = adminCategories.map(c =>
    `<option value="${escapeHTML(c.id)}" ${p.category_id === c.id ? 'selected' : ''}>${escapeHTML(c.name)}</option>`
  ).join('');

  const materialsVal = Array.isArray(p.materials) ? p.materials.join(', ') : (p.materials || '');
  const photosVal    = Array.isArray(p.photos)    ? p.photos.join('\n')    : (p.photos    || '');

  openModal(isNew ? 'New Project' : `Edit: ${p.title}`, `
    <div class="form-grid-2">
      <div class="a-form-group"><label>Title *</label>
        <input type="text" id="mProjTitle" value="${escapeHTML(p.title)}" placeholder="Blackwood Dining Table" /></div>
      <div class="a-form-group"><label>Slug (URL) *</label>
        <input type="text" id="mProjSlug" value="${escapeHTML(p.slug)}" placeholder="blackwood-dining-table" /></div>
    </div>

    <div class="form-grid-2">
      <div class="a-form-group"><label>Category</label>
        <select id="mProjCat"><option value="">— None —</option>${catOptions}</select></div>
      <div class="a-form-group"><label>Year</label>
        <input type="number" id="mProjYear" value="${p.year || ''}" min="2000" max="2099" /></div>
    </div>

    <div class="a-form-group"><label>Client / Location</label>
      <input type="text" id="mProjClient" value="${escapeHTML(p.client_type || '')}" placeholder="Residential · Auckland" /></div>

    <div class="a-form-group"><label>Description</label>
      <textarea id="mProjDesc" rows="5" placeholder="Tell the story of this project…">${escapeHTML(p.description || '')}</textarea></div>

    <div class="a-form-group"><label>Materials (comma-separated)</label>
      <input type="text" id="mProjMaterials" value="${escapeHTML(materialsVal)}" placeholder="NZ Rimu, Brass Hardware, Osmo Oil" /></div>

    <div class="a-form-group"><label>Cover Photo URL</label>
      <input type="text" id="mProjCover" value="${escapeHTML(p.cover_photo || '')}" placeholder="images/projects/bt-1.jpg" />
      ${CONFIG.CLOUDINARY_READY ? `<button type="button" class="a-btn a-btn--sm a-btn--outline" style="margin-top:6px" onclick="uploadImageToField('mProjCover')">Upload ↑</button>` : ''}
    </div>

    <div class="a-form-group"><label>All Photo URLs (one per line)</label>
      <textarea id="mProjPhotos" rows="4" placeholder="images/projects/bt-1.jpg&#10;images/projects/bt-2.jpg">${escapeHTML(photosVal)}</textarea>
      ${CONFIG.CLOUDINARY_READY ? `<button type="button" class="a-btn a-btn--sm a-btn--outline" style="margin-top:6px" onclick="uploadMultipleImages('mProjPhotos')">Upload images ↑</button>` : ''}
    </div>

    <div class="toggle-wrap">
      <input type="checkbox" id="mProjFeatured" ${p.featured ? 'checked' : ''} />
      <label for="mProjFeatured">Featured (shows larger on projects page)</label>
    </div>
  `, async () => {
    const title       = document.getElementById('mProjTitle').value.trim();
    const slug        = document.getElementById('mProjSlug').value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const category_id = document.getElementById('mProjCat').value;
    const year        = parseInt(document.getElementById('mProjYear').value) || null;
    const client_type = document.getElementById('mProjClient').value.trim();
    const description = document.getElementById('mProjDesc').value.trim();
    const materials   = document.getElementById('mProjMaterials').value.split(',').map(s => s.trim()).filter(Boolean);
    const cover_photo = document.getElementById('mProjCover').value.trim();
    const photos      = document.getElementById('mProjPhotos').value.split('\n').map(s => s.trim()).filter(Boolean);
    const featured    = document.getElementById('mProjFeatured').checked;

    if (!title || !slug) return showToast('Title and slug are required', 'err');

    const payload = { slug, title, category_id, description, materials, photos, cover_photo, year, client_type, featured };

    if (!CONFIG.API_READY) {
      showToast('API not connected — cannot save project', 'err'); return;
    }

    const url    = isNew ? '/api/projects' : `/api/projects/${p.id}`;
    const method = isNew ? 'POST' : 'PUT';

    try {
      const res = await apiFetch(url, method, payload);
      if (res.ok) {
        const saved = await res.json();
        if (isNew) adminProjects.unshift(saved);
        else {
          const idx = adminProjects.findIndex(x => x.id === p.id);
          if (idx > -1) adminProjects[idx] = saved;
        }
        localStorage.setItem('vb_projects', JSON.stringify(adminProjects));
        renderProjectsPanel();
        closeModal();
        showToast(isNew ? 'Project created ✓' : 'Project updated ✓', 'ok');
      } else {
        const err = await res.json();
        showToast(err.error || 'Save failed', 'err');
      }
    } catch {
      showToast('Connection error', 'err');
    }
  });

  // Auto-generate slug from title
  document.getElementById('mProjTitle').addEventListener('input', e => {
    if (isNew) {
      document.getElementById('mProjSlug').value =
        e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
  });
}

async function deleteProject(id) {
  if (!confirm('Delete this project? This cannot be undone.')) return;
  if (!CONFIG.API_READY) { showToast('API not connected', 'err'); return; }

  try {
    const res = await apiFetch(`/api/projects/${id}`, 'DELETE');
    if (res.ok) {
      adminProjects = adminProjects.filter(p => p.id !== id);
      localStorage.setItem('vb_projects', JSON.stringify(adminProjects));
      renderProjectsPanel();
      showToast('Project deleted', 'ok');
    }
  } catch {
    showToast('Delete failed', 'err');
  }
}

/* ════════════════════════════════════════════════
   CATEGORIES PANEL
════════════════════════════════════════════════ */
function renderCategoriesPanel() {
  const list = document.getElementById('categoriesList');
  list.innerHTML = adminCategories.map((cat, i) => `
    <div class="item-row" data-id="${escapeHTML(cat.id)}">
      <div class="item-row__info">
        <p class="item-row__title">${escapeHTML(cat.name)}</p>
        <p class="item-row__meta">ID: ${escapeHTML(cat.id)}</p>
      </div>
      <div class="item-row__actions">
        <button class="a-btn a-btn--sm a-btn--outline" onclick="editCategory('${escapeHTML(cat.id)}')">Rename</button>
        <button class="a-btn a-btn--sm a-btn--danger" onclick="deleteCategory('${escapeHTML(cat.id)}')">Delete</button>
      </div>
    </div>
  `).join('') || '<p style="color:var(--text-light);font-size:.85rem;padding:8px 0">No categories yet.</p>';
}

function addCategory() {
  openModal('Add Category', `
    <div class="a-form-group"><label>Name *</label>
      <input type="text" id="mCatName" placeholder="e.g. Furniture" /></div>
    <div class="a-form-group"><label>ID (slug) *</label>
      <input type="text" id="mCatId" placeholder="e.g. furniture" /></div>
  `, async () => {
    const name = document.getElementById('mCatName').value.trim();
    const id   = document.getElementById('mCatId').value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (!name || !id) return showToast('Name and ID are required', 'err');
    if (!CONFIG.API_READY) { showToast('API not connected', 'err'); return; }

    try {
      const res = await apiFetch('/api/categories', 'POST', { id, name });
      if (res.ok) {
        adminCategories.push(await res.json());
        localStorage.setItem('vb_categories', JSON.stringify(adminCategories));
        renderCategoriesPanel();
        closeModal();
        showToast('Category added ✓', 'ok');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed', 'err');
      }
    } catch { showToast('Connection error', 'err'); }
  });

  document.getElementById('mCatName').addEventListener('input', e => {
    document.getElementById('mCatId').value =
      e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  });
}

function editCategory(id) {
  const cat = adminCategories.find(c => c.id === id);
  if (!cat) return;

  openModal('Rename Category', `
    <div class="a-form-group"><label>Name *</label>
      <input type="text" id="mCatRename" value="${escapeHTML(cat.name)}" /></div>
  `, async () => {
    const name = document.getElementById('mCatRename').value.trim();
    if (!name) return showToast('Name is required', 'err');
    if (!CONFIG.API_READY) { showToast('API not connected', 'err'); return; }

    try {
      const res = await apiFetch(`/api/categories/${encodeURIComponent(id)}`, 'PUT', { name });
      if (res.ok) {
        const idx = adminCategories.findIndex(c => c.id === id);
        if (idx > -1) adminCategories[idx].name = name;
        localStorage.setItem('vb_categories', JSON.stringify(adminCategories));
        renderCategoriesPanel();
        closeModal();
        showToast('Renamed ✓', 'ok');
      }
    } catch { showToast('Connection error', 'err'); }
  });
}

async function deleteCategory(id) {
  if (!confirm('Delete this category? Projects using it will have no category.')) return;
  if (!CONFIG.API_READY) { showToast('API not connected', 'err'); return; }

  try {
    const res = await apiFetch(`/api/categories/${encodeURIComponent(id)}`, 'DELETE');
    if (res.ok) {
      adminCategories = adminCategories.filter(c => c.id !== id);
      localStorage.setItem('vb_categories', JSON.stringify(adminCategories));
      renderCategoriesPanel();
      showToast('Category deleted', 'ok');
    }
  } catch { showToast('Connection error', 'err'); }
}

/* ════════════════════════════════════════════════
   SETTINGS PANEL
════════════════════════════════════════════════ */
async function handlePasswordChange(e) {
  e.preventDefault();
  const msgEl = document.getElementById('passwordMsg');
  const current = document.getElementById('currentPassword').value;
  const next    = document.getElementById('newPassword').value;
  const confirm = document.getElementById('confirmPassword').value;

  if (next !== confirm) {
    msgEl.textContent = 'New passwords do not match.';
    msgEl.className = 'settings-msg settings-msg--err';
    return;
  }
  if (next.length < 8) {
    msgEl.textContent = 'Password must be at least 8 characters.';
    msgEl.className = 'settings-msg settings-msg--err';
    return;
  }

  try {
    const res = await apiFetch('/api/auth/password', 'PUT', { currentPassword: current, newPassword: next });
    if (res.ok) {
      msgEl.textContent = 'Password updated successfully.';
      msgEl.className = 'settings-msg settings-msg--ok';
      e.target.reset();
    } else {
      const err = await res.json();
      msgEl.textContent = err.error || 'Update failed.';
      msgEl.className = 'settings-msg settings-msg--err';
    }
  } catch {
    msgEl.textContent = 'Connection error.';
    msgEl.className = 'settings-msg settings-msg--err';
  }
}

async function checkApiStatus() {
  const el = document.getElementById('apiStatus');
  if (!CONFIG.API_READY) {
    el.textContent = 'API_URL not set in config.js — running in offline/static mode.';
    el.className = 'api-status api-status--err';
    return;
  }
  try {
    const res = await fetch(`${CONFIG.API_URL}/api/health`);
    if (res.ok) {
      const d = await res.json();
      el.textContent = `✓ Connected — ${CONFIG.API_URL} (${d.timestamp})`;
      el.className = 'api-status api-status--ok';
    } else {
      throw new Error();
    }
  } catch {
    el.textContent = `✗ Cannot reach ${CONFIG.API_URL}`;
    el.className = 'api-status api-status--err';
  }
}

/* ════════════════════════════════════════════════
   IMAGE UPLOAD (Cloudinary)
════════════════════════════════════════════════ */
async function uploadImageToField(inputId) {
  if (!CONFIG.CLOUDINARY_READY) { showToast('Cloudinary not configured', 'err'); return; }

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.click();

  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    showToast('Uploading…');

    const url = await uploadToCloudinary(file);
    if (url) {
      document.getElementById(inputId).value = url;
      showToast('Image uploaded ✓', 'ok');
    }
  };
}

async function uploadMultipleImages(textareaId) {
  if (!CONFIG.CLOUDINARY_READY) { showToast('Cloudinary not configured', 'err'); return; }

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.click();

  input.onchange = async () => {
    const files = Array.from(input.files);
    if (!files.length) return;
    showToast(`Uploading ${files.length} image(s)…`);

    const urls = await Promise.all(files.map(uploadToCloudinary));
    const valid = urls.filter(Boolean);
    if (valid.length) {
      const ta = document.getElementById(textareaId);
      const existing = ta.value.trim();
      ta.value = existing ? `${existing}\n${valid.join('\n')}` : valid.join('\n');
      showToast(`${valid.length} image(s) uploaded ✓`, 'ok');
    }
  };
}

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CONFIG.CLOUDINARY_UPLOAD_PRESET);

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CONFIG.CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    );
    const data = await res.json();
    return data.secure_url || null;
  } catch {
    showToast('Upload failed', 'err');
    return null;
  }
}

/* ════════════════════════════════════════════════
   MODAL
════════════════════════════════════════════════ */
function openModal(title, bodyHTML, onSave) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  modalSaveFn = onSave;
  document.getElementById('modalBackdrop').style.display = 'flex';
  // Focus first input
  setTimeout(() => {
    const first = document.querySelector('#modalBody input, #modalBody textarea, #modalBody select');
    if (first) first.focus();
  }, 50);
}

function closeModal() {
  document.getElementById('modalBackdrop').style.display = 'none';
  document.getElementById('modalBody').innerHTML = '';
  modalSaveFn = null;
}

/* ════════════════════════════════════════════════
   UTILS
════════════════════════════════════════════════ */
async function apiFetch(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
  };
  if (body) opts.body = JSON.stringify(body);
  return fetch(`${CONFIG.API_URL}${path}`, opts);
}

function escapeHTML(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str || '')));
  return d.innerHTML;
}

let toastTimer = null;
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast show${type ? ' toast--' + type : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove('show'); }, 2800);
}

/* ── Static default helpers (mirrors main.js defaults) ── */
function DEFAULT_PROCESS_STEPS() { return typeof PROCESS_STEPS !== 'undefined' ? [...PROCESS_STEPS] : []; }
function DEFAULT_SMALL_GOODS()   { return typeof SMALL_GOODS   !== 'undefined' ? [...SMALL_GOODS]   : []; }
function DEFAULT_BIG_BUILDS()    { return typeof BIG_BUILDS    !== 'undefined' ? [...BIG_BUILDS]    : []; }
function DEFAULT_SERVICES()      { return typeof SERVICES      !== 'undefined' ? [...SERVICES]      : []; }
