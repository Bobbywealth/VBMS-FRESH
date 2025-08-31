
const express = require('express');
const path = require('path');
const { pool, testConnection, initializeTables, seedDefaultUsers } = require('./07-04-2025/VBMS Website/VBMS Website/database.js');

const app = express();
const PORT = process.env.PORT || 5000;

// Add JSON middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Serve static files from the VBMS Website directory
app.use(express.static(path.join(__dirname, '07-04-2025/VBMS Website/VBMS Website')));

// Default route to serve the login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '07-04-2025/VBMS Website/VBMS Website/login.html'));
});

// API Routes
app.use('/api', async (req, res) => {
  if (req.path === '/auth/login' && req.method === 'POST') {
    const { email, password } = req.body;
    
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);
      client.release();
      
      if (result.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      
      const user = result.rows[0];
      const token = 'jwt-token-' + Date.now();
      
      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ message: 'Server error during login' });
    }
  } 
  else if (req.path === '/users' && req.method === 'GET') {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC');
      client.release();
      res.json(result.rows);
    } catch (err) {
      console.error('Get users error:', err);
      res.status(500).json({ message: 'Server error fetching users' });
    }
  }
  else if (req.path === '/orders' && req.method === 'GET') {
    try {
      const client = await pool.connect();
      const result = await client.query(`
        SELECT o.*, u.name as user_name 
        FROM orders o 
        LEFT JOIN users u ON o.user_id = u.id 
        ORDER BY o.order_date DESC
      `);
      client.release();
      res.json(result.rows);
    } catch (err) {
      console.error('Get orders error:', err);
      res.status(500).json({ message: 'Server error fetching orders' });
    }
  }
  else if (req.path === '/tasks' && req.method === 'GET') {
    try {
      const client = await pool.connect();
      const result = await client.query(`
        SELECT t.*, u.name as user_name 
        FROM tasks t 
        LEFT JOIN users u ON t.user_id = u.id 
        ORDER BY t.created_at DESC
      `);
      client.release();
      res.json(result.rows);
    } catch (err) {
      console.error('Get tasks error:', err);
      res.status(500).json({ message: 'Server error fetching tasks' });
    }
  }
  else if (req.path === '/inventory' && req.method === 'GET') {
    try {
      const client = await pool.connect();
      const result = await client.query(`
        SELECT i.*, u.name as user_name 
        FROM inventory i 
        LEFT JOIN users u ON i.user_id = u.id 
        ORDER BY i.created_at DESC
      `);
      client.release();
      res.json(result.rows);
    } catch (err) {
      console.error('Get inventory error:', err);
      res.status(500).json({ message: 'Server error fetching inventory' });
    }
  }
  else {
    res.status(404).json({ message: 'API endpoint not found' });
  }
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
