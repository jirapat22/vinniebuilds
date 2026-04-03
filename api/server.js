/* ============================================================
   VinnieBuilds API — server.js
   Node.js / Express backend deployed on Railway
   Uses Railway's PostgreSQL plugin for persistent storage
   ============================================================ */

const express    = require('express');
const cors       = require('cors');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { Pool }   = require('pg');
require('dotenv').config();

/* ── Email transporter (Outlook SMTP) ── */
const mailer = nodemailer.createTransport({
  host: 'smtp-mail.outlook.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: { ciphers: 'SSLv3' }
});

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';

/* ── PostgreSQL connection ──
   Railway injects DATABASE_URL automatically when you add the
   PostgreSQL plugin to your project.
──────────────────────────── */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

/* ── Middleware ── */
const allowedOrigins = process.env.ALLOWED_ORIGINS || '*';
app.use(cors({
  origin: allowedOrigins === '*'
    ? '*'
    : allowedOrigins.split(',').map(s => s.trim()),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '2mb' }));

/* ════════════════════════════════════════════════
   DATABASE SETUP
════════════════════════════════════════════════ */
async function setupDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        username      VARCHAR(50)  UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role          VARCHAR(20)  DEFAULT 'admin',
        created_at    TIMESTAMP    DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS content (
        key        VARCHAR(100) PRIMARY KEY,
        value      JSONB        NOT NULL,
        updated_at TIMESTAMP    DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS projects (
        id           SERIAL       PRIMARY KEY,
        slug         VARCHAR(100) UNIQUE NOT NULL,
        title        VARCHAR(255) NOT NULL,
        category_id  VARCHAR(100),
        description  TEXT,
        materials    TEXT[],
        photos       TEXT[],
        cover_photo  TEXT,
        year         INTEGER,
        client_type  VARCHAR(255),
        featured     BOOLEAN      DEFAULT false,
        sort_order   INTEGER      DEFAULT 0,
        created_at   TIMESTAMP    DEFAULT NOW(),
        updated_at   TIMESTAMP    DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS categories (
        id         VARCHAR(100) PRIMARY KEY,
        name       VARCHAR(100) NOT NULL,
        sort_order INTEGER      DEFAULT 0
      );
    `);

    /* Seed default categories if empty */
    const { rows: catRows } = await client.query('SELECT COUNT(*) FROM categories');
    if (parseInt(catRows[0].count) === 0) {
      await client.query(`
        INSERT INTO categories (id, name, sort_order) VALUES
          ('furniture',   'Furniture',   0),
          ('small-goods', 'Small Goods', 1),
          ('custom',      'Custom Work', 2)
      `);
      console.log('Seeded default categories');
    }

    /* Seed/update admin users from env vars */
    const adminUsers = [
      { username: process.env.VINNIE_USERNAME || 'vinnie', password: process.env.VINNIE_PASSWORD },
      { username: process.env.DEV_USERNAME    || 'dev',    password: process.env.DEV_PASSWORD    },
    ].filter(u => u.username && u.password);

    for (const user of adminUsers) {
      const hash = await bcrypt.hash(user.password, 12);
      await client.query(`
        INSERT INTO users (username, password_hash)
        VALUES ($1, $2)
        ON CONFLICT (username) DO UPDATE SET password_hash = $2
      `, [user.username, hash]);
    }

    console.log(`DB ready. ${adminUsers.length} admin user(s) configured.`);
  } finally {
    client.release();
  }
}

/* ════════════════════════════════════════════════
   AUTH MIDDLEWARE
════════════════════════════════════════════════ */
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorised' });
  }
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/* ════════════════════════════════════════════════
   HEALTH CHECK
════════════════════════════════════════════════ */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/* ════════════════════════════════════════════════
   AUTH ROUTES
════════════════════════════════════════════════ */

/* POST /api/auth/login */
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE username = $1', [username.trim()]
    );
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: rows[0].id, username: rows[0].username, role: rows[0].role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, username: rows[0].username });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* GET /api/auth/verify */
app.get('/api/auth/verify', requireAuth, (req, res) => {
  res.json({ valid: true, user: req.user });
});

/* PUT /api/auth/password */
app.put('/api/auth/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ════════════════════════════════════════════════
   CONTENT ROUTES  (products, services, process steps)
════════════════════════════════════════════════ */
const ALLOWED_CONTENT_KEYS = ['process_steps', 'small_goods', 'big_builds', 'services'];

/* GET /api/content — public, used by live site on load */
app.get('/api/content', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT key, value FROM content');
    const out = {};
    rows.forEach(r => { out[r.key] = r.value; });
    res.json(out);
  } catch (err) {
    console.error('Content fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* PUT /api/content/:key — admin only */
app.put('/api/content/:key', requireAuth, async (req, res) => {
  const { key } = req.params;
  if (!ALLOWED_CONTENT_KEYS.includes(key)) {
    return res.status(400).json({ error: `Key must be one of: ${ALLOWED_CONTENT_KEYS.join(', ')}` });
  }
  const { value } = req.body;
  if (!Array.isArray(value)) {
    return res.status(400).json({ error: 'value must be an array' });
  }

  try {
    await pool.query(`
      INSERT INTO content (key, value, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
    `, [key, JSON.stringify(value)]);
    res.json({ success: true });
  } catch (err) {
    console.error('Content update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ════════════════════════════════════════════════
   PROJECTS ROUTES
════════════════════════════════════════════════ */

/* GET /api/projects — public */
app.get('/api/projects', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM projects ORDER BY featured DESC, sort_order ASC, created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Projects fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* GET /api/projects/:slug — public */
app.get('/api/projects/:slug', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM projects WHERE slug = $1', [req.params.slug]);
    if (!rows.length) return res.status(404).json({ error: 'Project not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* POST /api/projects — admin only */
app.post('/api/projects', requireAuth, async (req, res) => {
  const {
    slug, title, category_id, description, materials,
    photos, cover_photo, year, client_type, featured, sort_order
  } = req.body;

  if (!slug || !title) {
    return res.status(400).json({ error: 'slug and title are required' });
  }

  try {
    const { rows } = await pool.query(`
      INSERT INTO projects
        (slug, title, category_id, description, materials, photos, cover_photo, year, client_type, featured, sort_order)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
    `, [slug, title, category_id || null, description || null,
        materials || [], photos || [], cover_photo || null,
        year || null, client_type || null, featured || false, sort_order || 0]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A project with that slug already exists' });
    console.error('Project create error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* PUT /api/projects/:id — admin only */
app.put('/api/projects/:id', requireAuth, async (req, res) => {
  const ALLOWED = ['slug','title','category_id','description','materials','photos',
                   'cover_photo','year','client_type','featured','sort_order'];
  const sets   = [];
  const values = [];
  let   i      = 1;

  ALLOWED.forEach(field => {
    if (req.body[field] !== undefined) {
      sets.push(`${field} = $${i++}`);
      values.push(req.body[field]);
    }
  });

  if (!sets.length) return res.status(400).json({ error: 'No fields provided to update' });

  sets.push(`updated_at = NOW()`);
  values.push(parseInt(req.params.id, 10));

  try {
    const { rows } = await pool.query(
      `UPDATE projects SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    if (!rows.length) return res.status(404).json({ error: 'Project not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Project update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* DELETE /api/projects/:id — admin only */
app.delete('/api/projects/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM projects WHERE id = $1', [parseInt(req.params.id, 10)]);
    res.json({ success: true });
  } catch (err) {
    console.error('Project delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ════════════════════════════════════════════════
   CATEGORIES ROUTES
════════════════════════════════════════════════ */

/* GET /api/categories — public */
app.get('/api/categories', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM categories ORDER BY sort_order ASC, name ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* POST /api/categories — admin only */
app.post('/api/categories', requireAuth, async (req, res) => {
  const { id, name, sort_order } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'id and name are required' });

  const safeId = id.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  try {
    const { rows } = await pool.query(
      'INSERT INTO categories (id, name, sort_order) VALUES ($1,$2,$3) RETURNING *',
      [safeId, name, sort_order || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Category ID already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

/* PUT /api/categories/:id — admin only */
app.put('/api/categories/:id', requireAuth, async (req, res) => {
  const { name, sort_order } = req.body;
  try {
    const { rows } = await pool.query(`
      UPDATE categories
      SET name = COALESCE($1, name), sort_order = COALESCE($2, sort_order)
      WHERE id = $3
      RETURNING *
    `, [name || null, sort_order ?? null, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Category not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* DELETE /api/categories/:id — admin only */
app.delete('/api/categories/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ════════════════════════════════════════════════
   CONTACT ROUTE
════════════════════════════════════════════════ */

/* POST /api/contact — public */
app.post('/api/contact', async (req, res) => {
  const { name, email, project, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'name, email and message are required' });
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return res.status(503).json({ error: 'Email not configured' });
  }

  try {
    await mailer.sendMail({
      from: `"VinnieBuilds Website" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      replyTo: `"${name}" <${email}>`,
      subject: `New enquiry from ${name}`,
      html: `
        <h2 style="color:#42459E">New enquiry — VinnieBuilds</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Project type:</strong> ${project || 'Not specified'}</p>
        <hr>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <hr>
        <p style="color:#999;font-size:12px">Sent from the VinnieBuilds contact form. Hit reply to respond directly to the customer.</p>
      `
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Email error:', err);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

/* ════════════════════════════════════════════════
   START SERVER
════════════════════════════════════════════════ */
setupDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`VinnieBuilds API running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to set up database:', err);
    process.exit(1);
  });
