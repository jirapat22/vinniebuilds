# VinnieBuilds — Portfolio Website

A single-page portfolio website for VinnieBuilds, handcrafted in plain HTML, CSS, and JavaScript.

---

## Quick Start

Open `index.html` in your browser — that's it. No build step, no dependencies to install.

For local development with live reload, use VS Code's **Live Server** extension, or run:

```bash
npx serve .
```

---

## How to Edit Content

All editable content lives at the **top of `main.js`** — you never need to touch the HTML layout.

### Process Steps

Find `const PROCESS_STEPS` in `main.js`:

```js
const PROCESS_STEPS = [
  {
    icon: "☕",          // any emoji works
    title: "Chat",
    description: "We start with a conversation…"
  },
  // add or remove steps here
];
```

### Small Goods (products)

Find `const SMALL_GOODS` in `main.js`:

```js
const SMALL_GOODS = [
  {
    image: "images/small-1.jpg",   // path relative to index.html
    title: "Wooden Cheese Board",
    description: "Hand-shaped rimu cheese board…",
    price: "$65 NZD"               // remove this line to hide the price tag
  },
  // add more items here
];
```

### Big Builds (products)

Find `const BIG_BUILDS` — same structure as Small Goods above.

### Services

Find `const SERVICES` in `main.js`:

```js
const SERVICES = [
  {
    icon: "🪑",
    title: "Custom Furniture",
    description: "From dining tables to bedframes…",
    cta: "Start a project"         // text on the link arrow
  },
  // add or remove services here
];
```

---

## How to Replace Placeholder Images

1. Add your image files into the `images/` folder (JPG or WebP recommended).
2. Update the `image:` field in the relevant JS array in `main.js`.

**Recommended image sizes:**

| Image         | Filename example    | Recommended size    |
|---------------|---------------------|---------------------|
| Hero          | `images/hero.jpg`   | 1920 × 1080px       |
| About         | `images/about.jpg`  | 800 × 1000px        |
| Small Goods   | `images/small-1.jpg`| 800 × 600px         |
| Big Builds    | `images/big-1.jpg`  | 800 × 600px         |

Use **WebP** format for the smallest file size with no quality loss:

```bash
# Install cwebp (macOS via Homebrew)
brew install webp

# Convert a JPEG
cwebp images/hero.jpg -o images/hero.webp -q 85
```

Then update the `image:` paths to `.webp`.

---

## How to Connect Formspree (Contact Form)

1. Go to [formspree.io](https://formspree.io) and create a **free account**.
2. Click **New Form**, name it "VinnieBuilds Contact", and copy your unique endpoint URL.
   It looks like: `https://formspree.io/f/abcdefgh`
3. Open `index.html` and find this line inside the `<form>` tag:

   ```html
   action="https://formspree.io/f/YOUR_FORM_ID"
   ```

4. Replace `YOUR_FORM_ID` with your real form ID:

   ```html
   action="https://formspree.io/f/abcdefgh"
   ```

5. Done! Submissions will arrive in your Formspree dashboard (and be forwarded to your email).

> **Free plan**: 50 submissions/month. Upgrade at Formspree if you need more.

---

## How to Connect a Real Instagram Feed (Behold.so)

The Instagram section currently shows placeholder boxes. To embed your real feed:

1. Go to [behold.so](https://behold.so) and sign up (free plan available).
2. Connect your Instagram account (`@vinnie_builds`).
3. Create a feed, choose your layout, and copy the embed snippet.
4. Open `index.html` and find the comment `<!-- Placeholder grid — remove once Behold is connected -->`.
5. Delete the placeholder `<div class="instagram__grid">…</div>` block.
6. Paste your Behold snippet in its place. Example:

   ```html
   <behold-widget feed-id="YOUR_FEED_ID_HERE"></behold-widget>
   <script src="https://w.behold.so/widget.js" type="module"></script>
   ```

---

## Deployment: GitHub + Cloudflare Pages

### Step 1 — Push to GitHub

```bash
# In your project folder
git init
git add .
git commit -m "Initial site"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/vinniebuilds.git
git push -u origin main
```

### Step 2 — Deploy to Cloudflare Pages

1. Go to [pages.cloudflare.com](https://pages.cloudflare.com) and log in (free account).
2. Click **Create a Project** → **Connect to Git**.
3. Authorise Cloudflare to access your GitHub account and select the `vinniebuilds` repository.
4. Configure the build settings:

   | Setting           | Value      |
   |-------------------|------------|
   | Build command     | *(leave blank)* |
   | Build output dir  | `/`        |
   | Root directory    | `/`        |

5. Click **Save and Deploy**.

Cloudflare will deploy the site and give you a URL like `https://vinniebuilds.pages.dev`. Every `git push` to `main` automatically redeploys.

---

## How to Connect a Custom Domain (vinniebuilds.com)

### Step 1 — Add your domain to Cloudflare

1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com).
2. Click **Add a Site**, enter `vinniebuilds.com`, and choose the **Free plan**.
3. Cloudflare will scan your existing DNS records. Review and continue.
4. Cloudflare will give you **two nameservers** (e.g. `aria.ns.cloudflare.com`).
5. Log in to your domain registrar (e.g. Namecheap, GoDaddy, Squarespace) and update the **nameservers** to the ones Cloudflare gave you.
6. Wait up to 24 hours for DNS propagation (usually much faster).

### Step 2 — Connect the domain to your Pages project

1. In the Cloudflare dashboard, go to **Pages** → select your `vinniebuilds` project.
2. Click **Custom Domains** → **Set up a custom domain**.
3. Enter `vinniebuilds.com` (and optionally `www.vinniebuilds.com`).
4. Cloudflare automatically adds the required DNS records and provisions a free SSL certificate.
5. Done — your site is now live at `https://vinniebuilds.com` with HTTPS, global CDN, and automatic renewals. 🎉

---

## File Structure

```
vinniebuilds/
├── index.html      Main HTML (structure + section skeletons)
├── style.css       All styles (colours, layout, responsive, animations CSS)
├── main.js         Editable content arrays + GSAP animations
├── images/         Drop your images here
│   ├── hero.jpg
│   ├── about.jpg
│   ├── small-1.jpg … small-6.jpg
│   └── big-1.jpg  … big-6.jpg
└── README.md       This file
```

---

## Tech Stack

- Plain HTML5, CSS3, Vanilla JavaScript — no frameworks, no build tools
- [GSAP 3](https://gsap.com) + ScrollTrigger — animations (loaded from CDN)
- [Inter](https://fonts.google.com/specimen/Inter) — Google Fonts
- [Formspree](https://formspree.io) — contact form backend
- [Behold.so](https://behold.so) — Instagram feed embed (optional)
- [Cloudflare Pages](https://pages.cloudflare.com) — hosting (free)

---

*Built with love for Vinnie — handcrafted in Aotearoa 🌿*
