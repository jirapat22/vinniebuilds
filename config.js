/* ============================================================
   VinnieBuilds — config.js
   ✏️  Edit this file after deploying your Railway backend.
   Load this BEFORE main.js / projects.js / admin.js
   ============================================================ */

const CONFIG = {

  // ✏️  YOUR RAILWAY API URL
  // After deploying the api/ folder to Railway, paste the URL here.
  // Example: 'https://vinniebuilds-api.up.railway.app'
  // Leave as-is during local development — site falls back to static data.
  API_URL: 'YOUR_RAILWAY_URL',

  // ✏️  CLOUDINARY (for image uploads in the admin panel)
  // 1. Sign up at cloudinary.com (free)
  // 2. Go to Settings → Upload → Add upload preset
  // 3. Set "Signing Mode" to UNSIGNED, save, copy the preset name
  // 4. Copy your Cloud Name from the Dashboard home page
  CLOUDINARY_CLOUD_NAME:    'YOUR_CLOUD_NAME',
  CLOUDINARY_UPLOAD_PRESET: 'YOUR_UNSIGNED_PRESET',

  // ✏️  ADMIN ROUTE (relative path to the admin panel)
  ADMIN_PATH: '/admin.html',

};

// Detect whether the API is configured (not still a placeholder)
CONFIG.API_READY = CONFIG.API_URL !== 'YOUR_RAILWAY_URL' && CONFIG.API_URL !== '';
CONFIG.CLOUDINARY_READY = CONFIG.CLOUDINARY_CLOUD_NAME !== 'YOUR_CLOUD_NAME';
