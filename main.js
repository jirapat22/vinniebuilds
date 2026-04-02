/* ============================================================
   VinnieBuilds — main.js
   All editable content is at the TOP of this file.
   Look for the ✏️  comments to find what you can change.
   ============================================================ */

// ─────────────────────────────────────────────────────────────
// ✏️  EDIT YOUR PROCESS STEPS HERE
// Fields: icon (emoji), title, description
// ─────────────────────────────────────────────────────────────
const PROCESS_STEPS = [
  {
    icon: "☕",
    title: "Chat",
    description: "Tell us what you're after — your space, your budget, your vibe. No jargon, just a good yarn."
  },
  {
    icon: "✏️",
    title: "Design",
    description: "We draw it up and go back and forth until it looks right. You'll see exactly what you're getting before we start."
  },
  {
    icon: "🪵",
    title: "Build",
    description: "We pick the timber, head into the workshop, and build it properly. No shortcuts."
  },
  {
    icon: "🚚",
    title: "Deliver",
    description: "We bring it to you, get it in place, and make sure you're happy. Job done."
  }
];

// ─────────────────────────────────────────────────────────────
// ✏️  EDIT YOUR SMALL GOODS HERE
// Fields: image (put file in images/ folder), title, description, price (optional — remove to hide)
// ─────────────────────────────────────────────────────────────
const SMALL_GOODS = [
  {
    image: "images/small-1.jpg",
    title: "Wooden Cheese Board",
    description: "Hand-shaped rimu cheese board with juice groove. A perfect housewarming gift."
  },
  {
    image: "images/small-2.jpg",
    title: "Bud Vase Set",
    description: "Set of three turned wooden bud vases — each one subtly different, beautifully unique."
  },
  {
    image: "images/small-3.jpg",
    title: "Oak Serving Spoon",
    description: "Hand-carved solid oak serving spoon. Smooth, food-safe finish, built to last."
  },
  {
    image: "images/small-4.jpg",
    title: "Peg Hooks Rail",
    description: "Slim wall-mounted rail with three solid brass pegs. Perfect for entryways."
  },
  {
    image: "images/small-5.jpg",
    title: "Trinket Tray",
    description: "A little catch-all tray carved from a single piece of timber. Desk essential."
  },
  {
    image: "images/small-6.jpg",
    title: "Gift Box Set",
    description: "Seasonal gift sets — locally made, beautifully wrapped. Contact for current stock."
  }
];

// ─────────────────────────────────────────────────────────────
// ✏️  EDIT YOUR BIG BUILDS HERE
// Fields: image, title, description, price (optional — use "POA" or remove)
// ─────────────────────────────────────────────────────────────
const BIG_BUILDS = [
  {
    image: "images/big-1.jpg",
    title: "Dining Table — Blackwood",
    description: "6-seat dining table in Australian blackwood. Waterfall edge, hairpin legs. 1800 × 900mm."
  },
  {
    image: "images/big-2.jpg",
    title: "Floating Bedhead",
    description: "King-size bedhead in white oak with integrated reading lights and bedside ledges."
  },
  {
    image: "images/big-3.jpg",
    title: "Shelving Unit",
    description: "Modular open shelving in solid pine. Four adjustable shelves, floor-to-ceiling options available."
  },
  {
    image: "images/big-4.jpg",
    title: "Coffee Table",
    description: "Live-edge coffee table in native NZ timber. No two are alike — each piece celebrates the grain."
  },
  {
    image: "images/big-5.jpg",
    title: "Kitchen Bench Seats",
    description: "Built-in bench seating for kitchen nooks or bay windows. Custom sizes available."
  },
  {
    image: "images/big-6.jpg",
    title: "Entryway Console",
    description: "Slim, elegant console table with a single lower shelf. Perfect for hallways."
  }
];

// ─────────────────────────────────────────────────────────────
// ✏️  EDIT YOUR SERVICES HERE
// Fields: icon (emoji), title, description, cta (link text)
// ─────────────────────────────────────────────────────────────
const SERVICES = [
  {
    icon: "🌿",
    title: "Sustainable Sourcing",
    description: "We use NZ and Aussie timber — sustainably sourced where we can, reclaimed when it makes sense. Good wood, used well.",
    cta: "Learn more"
  },
  {
    icon: "🪑",
    title: "Custom Furniture",
    description: "Tables, beds, shelves, whatever you need built — we'll design it around your space and make it to last.",
    cta: "Start a project"
  },
  {
    icon: "🏠",
    title: "Interior Fit-outs",
    description: "Kitchens, bathrooms, built-ins — we've done it all. We work alongside your architect or just directly with you.",
    cta: "Discuss your space"
  },
  {
    icon: "📐",
    title: "Design Consultation",
    description: "Not sure what you want yet? Come have a chat. We'll figure it out together.",
    cta: "Book a consult"
  },
  {
    icon: "🎁",
    title: "Corporate & Gifting",
    description: "Custom wooden pieces for businesses and gift sets. Talk to us about what you need.",
    cta: "Get a quote"
  },
  {
    icon: "🔧",
    title: "Repairs & Restoration",
    description: "Old piece of furniture that needs some love? Send us a photo and we'll take a look.",
    cta: "Send a photo"
  }
];

// ─────────────────────────────────────────────────────────────
//  END OF EDITABLE CONTENT — don't edit below unless you know
//  what you're doing 🙂
// ─────────────────────────────────────────────────────────────

// Active data — starts as static defaults, replaced by API data if available
let activeData = {
  process_steps: PROCESS_STEPS,
  small_goods:   SMALL_GOODS,
  big_builds:    BIG_BUILDS,
  services:      SERVICES,
};

/* ── DOM READY ── */
document.addEventListener('DOMContentLoaded', async () => {

  // Footer year
  document.getElementById('footerYear').textContent = new Date().getFullYear();

  // Show admin link in footer if logged in
  if (localStorage.getItem('vb_token')) {
    const link = document.getElementById('footerAdminLink');
    if (link) link.style.display = 'inline';
  }

  // 1. Render immediately from localStorage cache or static defaults
  const cached = localStorage.getItem('vb_content');
  if (cached) {
    try { Object.assign(activeData, JSON.parse(cached)); } catch {}
  }
  renderAll();

  // 2. Fetch fresh data from Railway API in background
  if (typeof CONFIG !== 'undefined' && CONFIG.API_READY) {
    try {
      const res = await Promise.race([
        fetch(`${CONFIG.API_URL}/api/content`),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))
      ]);
      if (res.ok) {
        const data = await res.json();
        // Merge API data, keeping static defaults for any missing keys
        const merged = {
          process_steps: data.process_steps || PROCESS_STEPS,
          small_goods:   data.small_goods   || SMALL_GOODS,
          big_builds:    data.big_builds    || BIG_BUILDS,
          services:      data.services      || SERVICES,
        };
        // Only re-render if data actually changed
        if (JSON.stringify(merged) !== JSON.stringify(activeData)) {
          Object.assign(activeData, merged);
          localStorage.setItem('vb_content', JSON.stringify(merged));
          renderAll();
        }
      }
    } catch {
      // API unavailable — static/cached data already rendered, nothing to do
    }
  }

  // UI interactions
  initNav();
  initDotNav();
  initContactForm();

  // Wait for GSAP to be available (loaded via CDN defer)
  waitForGSAP(() => {
    initHeroAnimations();
    initScrollAnimations();
    initParallax();
  });
});


/* ── RENDER ALL ── */
function renderAll() {
  renderProcessSteps();
  renderProductGrid('smallGoodsGrid', activeData.small_goods);
  renderProductGrid('bigBuildsGrid',  activeData.big_builds);
  renderServices();
}

/* ── RENDER: PROCESS STEPS ── */
function renderProcessSteps() {
  const container = document.getElementById('processSteps');
  if (!container) return;

  container.innerHTML = activeData.process_steps.map((step, i) => `
    <div class="process-step reveal">
      <span class="process-step__icon">${step.icon}</span>
      <div class="process-step__number">${i + 1}</div>
      <h3>${escapeHTML(step.title)}</h3>
      <p>${escapeHTML(step.description)}</p>
    </div>
  `).join('');
}


/* ── RENDER: PRODUCT GRID ── */
function renderProductGrid(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = items.map(item => `
    <div class="product-card reveal">
      <div class="product-card__img-wrap">
        <img
          src="${escapeHTML(item.image)}"
          alt="${escapeHTML(item.title)}"
          loading="lazy"
          onerror="this.parentElement.style.background='linear-gradient(135deg,#e8dfd0,#d4c4ac)';this.style.display='none'"
        />
      </div>
      <div class="product-card__body">
        <h4 class="product-card__title">${escapeHTML(item.title)}</h4>
        <p class="product-card__desc">${escapeHTML(item.description)}</p>
      </div>
    </div>
  `).join('');
}


/* ── RENDER: SERVICES ── */
function renderServices() {
  const container = document.getElementById('servicesGrid');
  if (!container) return;

  container.innerHTML = activeData.services.map(service => `
    <div class="service-card reveal">
      <span class="service-card__icon">${service.icon}</span>
      <h3 class="service-card__title">${escapeHTML(service.title)}</h3>
      <p class="service-card__desc">${escapeHTML(service.description)}</p>
      <a href="#contact" class="service-card__cta">${escapeHTML(service.cta)}</a>
    </div>
  `).join('');
}


/* ── NAV ── */
function initDotNav() {
  const sections = [...document.querySelectorAll('#hero, section[id]')];
  if (!sections.length) return;

  const nav = document.createElement('nav');
  nav.className = 'dot-nav';
  nav.setAttribute('aria-label', 'Page sections');

  sections.forEach(section => {
    const btn = document.createElement('button');
    btn.className = 'dot-nav__dot';
    btn.setAttribute('aria-label', `Go to ${section.id}`);
    btn.dataset.target = section.id;
    btn.addEventListener('click', () => section.scrollIntoView({ behavior: 'smooth' }));
    nav.appendChild(btn);
  });

  document.body.appendChild(nav);

  const dots = nav.querySelectorAll('.dot-nav__dot');
  const darkSections = new Set(['hero', 'projects-preview']);

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      dots.forEach(d => d.classList.toggle('active', d.dataset.target === id));
      nav.classList.toggle('over-dark', darkSections.has(id));
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach(s => observer.observe(s));
}

function initNav() {
  const burger    = document.getElementById('sidenavBurger');
  const overlay   = document.getElementById('sidenavOverlay');
  const sidenav   = document.getElementById('sidenav');
  const adminLink = document.getElementById('sidenavAdminLink');

  if (!burger || !sidenav) return;

  // Show admin link if logged in
  if (adminLink && localStorage.getItem('vb_token')) {
    adminLink.style.display = 'block';
  }

  // Mobile open/close
  function openNav() {
    sidenav.classList.add('open');
    burger.classList.add('active');
    if (overlay) overlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }
  function closeNav() {
    sidenav.classList.remove('open');
    burger.classList.remove('active');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  burger.addEventListener('click', () => {
    sidenav.classList.contains('open') ? closeNav() : openNav();
  });
  if (overlay) overlay.addEventListener('click', closeNav);

  // Close on link/cta click (mobile)
  sidenav.querySelectorAll('.sidenav__link, .sidenav__cta').forEach(a => {
    a.addEventListener('click', closeNav);
  });

  // Active section highlighting via IntersectionObserver
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.sidenav__link[data-section]');

  if (sections.length && navLinks.length) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navLinks.forEach(l => l.classList.toggle('active', l.dataset.section === entry.target.id));
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });

    sections.forEach(s => observer.observe(s));
  }

  // Switch link colour: white over dark hero, blue over light sections
  const hero = document.getElementById('hero');
  if (hero) {
    const heroObserver = new IntersectionObserver(([entry]) => {
      sidenav.classList.toggle('over-dark', entry.isIntersecting);
    }, { threshold: 0.1 });
    heroObserver.observe(hero);
  }
}


/* ── CONTACT FORM ── */
function initContactForm() {
  const form = document.getElementById('contactForm');
  const success = document.getElementById('formSuccess');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    const action = form.getAttribute('action');
    // If still using placeholder, let default HTML submit work
    if (action.includes('YOUR_FORM_ID')) return;

    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Sending…';

    try {
      const res = await fetch(action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });

      if (res.ok) {
        // Save to order queue for admin
        try {
          const name    = form.querySelector('[name="name"]')?.value?.trim() || '';
          const email   = form.querySelector('[name="email"]')?.value?.trim() || '';
          const project = form.querySelector('[name="project"]')?.value || '';
          const message = form.querySelector('[name="message"]')?.value?.trim() || '';
          const order = {
            id: 'ord_' + Date.now(),
            name, nickname: '', email, phone: '',
            product_interest: project, details: message,
            stage: 'enquiry', notes: '',
            created_at: new Date().toISOString().split('T')[0],
            est_completion: '', source: 'contact_form'
          };
          const existing = JSON.parse(localStorage.getItem('vb_orders') || '[]');
          existing.unshift(order);
          localStorage.setItem('vb_orders', JSON.stringify(existing));
        } catch {}

        form.reset();
        success.style.display = 'block';
        btn.textContent = 'Sent!';
      } else {
        btn.textContent = 'Try again';
        btn.disabled = false;
      }
    } catch {
      btn.textContent = 'Try again';
      btn.disabled = false;
    }
  });
}


/* ── GSAP: HERO ANIMATIONS ── */
function initHeroAnimations() {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  tl.fromTo('.hero__eyebrow',
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.8 }, 0.2)
    .fromTo('.hero__wordmark',
      { opacity: 0, y: 48 },
      { opacity: 1, y: 0, duration: 1.0 }, 0.42)
    .fromTo('.hero__tagline',
      { opacity: 0, y: 32 },
      { opacity: 1, y: 0, duration: 0.9 }, 0.68)
    .fromTo('.hero__actions',
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.8 }, 0.9);
}


/* ── GSAP: PARALLAX ── */
function initParallax() {
  const parallax = document.getElementById('heroParallax');
  if (!parallax) return;

  gsap.to(parallax, {
    yPercent: 30,
    ease: 'none',
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true
    }
  });
}


/* ── GSAP: SCROLL ANIMATIONS ── */
function initScrollAnimations() {
  gsap.registerPlugin(ScrollTrigger);

  // Generic .reveal elements (process steps, product cards, service cards)
  gsap.utils.toArray('.reveal').forEach(el => {
    gsap.fromTo(el,
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 0.75,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none none'
        }
      }
    );
  });

  // About section — image slides from left, text from right
  gsap.fromTo('.about__image-wrap',
    { opacity: 0, x: -60 },
    {
      opacity: 1, x: 0, duration: 0.9, ease: 'power2.out',
      scrollTrigger: { trigger: '.about__grid', start: 'top 80%' }
    }
  );

  gsap.fromTo('.about__text',
    { opacity: 0, x: 60 },
    {
      opacity: 1, x: 0, duration: 0.9, ease: 'power2.out',
      scrollTrigger: { trigger: '.about__grid', start: 'top 80%' }
    }
  );

  // Section headers
  gsap.utils.toArray('.section-header').forEach(el => {
    gsap.fromTo(el,
      { opacity: 0, y: 36 },
      {
        opacity: 1, y: 0, duration: 0.8, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 85%' }
      }
    );
  });

  // Contact grid
  gsap.fromTo('.contact__intro',
    { opacity: 0, x: -50 },
    {
      opacity: 1, x: 0, duration: 0.85, ease: 'power2.out',
      scrollTrigger: { trigger: '.contact__grid', start: 'top 80%' }
    }
  );

  gsap.fromTo('.contact__form-wrap',
    { opacity: 0, x: 50 },
    {
      opacity: 1, x: 0, duration: 0.85, ease: 'power2.out',
      scrollTrigger: { trigger: '.contact__grid', start: 'top 80%' }
    }
  );

  // Instagram placeholders stagger
  gsap.fromTo('.instagram__placeholder',
    { opacity: 0, scale: 0.9 },
    {
      opacity: 1, scale: 1, duration: 0.5, stagger: 0.07, ease: 'power2.out',
      scrollTrigger: { trigger: '.instagram__grid', start: 'top 85%' }
    }
  );
}


/* ── UTILS ── */

// Escape HTML to prevent XSS when inserting user-edited content
function escapeHTML(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}

// Poll for GSAP availability (CDN scripts loaded with defer)
function waitForGSAP(cb, attempts = 0) {
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    cb();
  } else if (attempts < 50) {
    setTimeout(() => waitForGSAP(cb, attempts + 1), 100);
  } else {
    console.warn('VinnieBuilds: GSAP did not load. Animations skipped.');
    // Make elements visible without animation
    document.querySelectorAll('.hero__eyebrow, .hero__wordmark, .hero__tagline, .hero__actions')
      .forEach(el => { el.style.opacity = '1'; });
  }
}
