
require('dotenv').config();
const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool, testConnection, initializeTables, seedDefaultUsers } = require('./07-04-2025/VBMS Website/VBMS Website/database.js');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'development-jwt-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const DEFAULT_CORS = process.env.CORS_ORIGINS || 'https://vbms-fresh-official-website-launch.onrender.com';
const ALLOWED_ORIGINS = DEFAULT_CORS.split(',').map(origin => origin.trim()).filter(Boolean);

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    created_at: user.created_at
  };
}

function generateToken(user) {
  const payload = { sub: user.id, role: user.role };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token missing' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.sub, role: decoded.role };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
}

// Add JSON middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Secure CORS configuration
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Serve static files from the VBMS Website directory
app.use(express.static(path.join(__dirname, '07-04-2025/VBMS Website/VBMS Website')));

// Default route to serve the login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '07-04-2025/VBMS Website/VBMS Website/login.html'));
});

// Authentication route
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    let passwordMatches = await bcrypt.compare(password, user.password);

    // Support legacy plaintext passwords by hashing them on the fly
    if (!passwordMatches && user.password === password) {
      const newHash = await bcrypt.hash(password, 12);
      await client.query('UPDATE users SET password = $1 WHERE id = $2', [newHash, user.id]);
      passwordMatches = true;
    }

    if (!passwordMatches) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user);
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  } finally {
    client.release();
  }
});

// Protected routes
app.get('/api/users', authenticateToken, authorizeRoles('admin', 'main_admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ message: 'Server error fetching users' });
  } finally {
    client.release();
  }
});

app.get('/api/orders', authenticateToken, authorizeRoles('admin', 'main_admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT o.*, u.name as user_name 
      FROM orders o 
      LEFT JOIN users u ON o.user_id = u.id 
      ORDER BY o.order_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ message: 'Server error fetching orders' });
  } finally {
    client.release();
  }
});

app.get('/api/tasks', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  const isAdmin = ['admin', 'main_admin'].includes(req.user.role);
  try {
    const query = isAdmin
      ? `
        SELECT t.*, u.name as user_name 
        FROM tasks t 
        LEFT JOIN users u ON t.user_id = u.id 
        ORDER BY t.created_at DESC
      `
      : `
        SELECT t.*, u.name as user_name 
        FROM tasks t 
        LEFT JOIN users u ON t.user_id = u.id 
        WHERE t.user_id = $1
        ORDER BY t.created_at DESC
      `;
    const params = isAdmin ? [] : [req.user.id];
    const result = await client.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ message: 'Server error fetching tasks' });
  } finally {
    client.release();
  }
});

app.get('/api/inventory', authenticateToken, authorizeRoles('admin', 'main_admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT i.*, u.name as user_name 
      FROM inventory i 
      LEFT JOIN users u ON i.user_id = u.id 
      ORDER BY i.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get inventory error:', err);
    res.status(500).json({ message: 'Server error fetching inventory' });
  } finally {
    client.release();
  }
});

// Unknown API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

// Serve other HTML pages
app.get('/:page', (req, res) => {
  const page = req.params.page;
  const filePath = path.join(__dirname, '07-04-2025/VBMS Website/VBMS Website', `${page}.html`);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).send('Page not found');
    }
  });
});

// Initialize database and start server
async function startServer() {
  console.log('🔄 Starting VBMS Server...');
  
  // Test database connection
  const dbConnected = await testConnection();
  
  if (dbConnected) {
    // Initialize tables and seed data
    await initializeTables();
    await seedDefaultUsers();
    console.log('🗄️ Database setup complete');
  }
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 VBMS Preview Server running on port ${PORT}`);
    console.log(`🌐 Visit your preview at the webview URL`);
    console.log(`📊 Database status: ${dbConnected ? '✅ Connected' : '❌ Disconnected'}`);
  });
}

startServer();

