
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    await client.query('SELECT NOW()');
    client.release();
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    return false;
  }
}

// Initialize database tables
async function initializeTables() {
  const client = await pool.connect();
  try {
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'client',
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        order_number VARCHAR(100) UNIQUE NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        total_amount DECIMAL(10,2),
        order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        delivery_date TIMESTAMP,
        items TEXT,
        notes TEXT
      )
    `);

    // Tasks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        priority VARCHAR(50) DEFAULT 'medium',
        due_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        setting_key VARCHAR(255) NOT NULL,
        setting_value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Inventory table
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        item_name VARCHAR(255) NOT NULL,
        sku VARCHAR(100),
        quantity INTEGER DEFAULT 0,
        price DECIMAL(10,2),
        category VARCHAR(100),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Monitoring logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS monitoring_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        event_type VARCHAR(100),
        event_data TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database tables initialized successfully');
  } catch (err) {
    console.error('❌ Error initializing tables:', err.message);
  } finally {
    client.release();
  }
}

// Seed default admin user
async function seedDefaultUsers() {
  const client = await pool.connect();
  try {
    // Check if admin exists
    const adminExists = await client.query('SELECT id FROM users WHERE email = $1', ['admin@vbms.com']);
    
    if (adminExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      await client.query(`
        INSERT INTO users (name, email, password, role, status) 
        VALUES ($1, $2, $3, $4, $5)
      `, ['Super Admin', 'admin@vbms.com', hashedPassword, 'admin', 'Active']);
      console.log('✅ Default admin user created');
    }

    // Check if customer exists
    const customerExists = await client.query('SELECT id FROM users WHERE email = $1', ['customer@gmail.com']);
    
    if (customerExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('customer123', 12);
      await client.query(`
        INSERT INTO users (name, email, password, role, status) 
        VALUES ($1, $2, $3, $4, $5)
      `, ['Gmail Customer', 'customer@gmail.com', hashedPassword, 'client', 'Active']);
      console.log('✅ Default customer user created');
    }
  } catch (err) {
    console.error('❌ Error seeding users:', err.message);
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  testConnection,
  initializeTables,
  seedDefaultUsers
};
