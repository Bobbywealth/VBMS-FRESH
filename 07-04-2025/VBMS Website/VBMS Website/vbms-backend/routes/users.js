const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { Pool } = require('pg');

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Get ALL users (requires authentication)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT id, email, first_name, last_name, role, is_active, created_at FROM users WHERE is_active = true ORDER BY created_at DESC');
    client.release();
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: "Failed to fetch users", error: err.message });
  }
});

// Create a NEW user (requires main_admin authentication)
router.post('/create-user', authenticateToken, async (req, res) => {
  try {
    const client = await pool.connect();
    
    // Check if the requesting user is a main admin
    const requestingUserResult = await client.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
    if (!requestingUserResult.rows[0] || requestingUserResult.rows[0].role !== 'main_admin') {
      client.release();
      return res.status(403).json({ message: 'Only main administrators can create new users.' });
    }

    const { 
      name, 
      email, 
      password, 
      role, 
      department, 
      position,
      phone,
      address
    } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      client.release();
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    // Check if user already exists
    const existingUserResult = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUserResult.rows.length > 0) {
      client.release();
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    // Create new user
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUserResult = await client.query(`
      INSERT INTO users (email, password, first_name, last_name, role, is_active, phone)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, email, first_name, last_name, role, is_active, created_at
    `, [email, hashedPassword, name.split(' ')[0], name.split(' ')[1] || '', role || 'customer', true, phone]);
    
    client.release();
    
    res.status(201).json({
      message: 'User created successfully',
      user: newUserResult.rows[0]
    });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ message: "Failed to create user", error: err.message });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT id, email, first_name, last_name, role, is_active, created_at FROM users WHERE id = $1', [req.params.id]);
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ message: "Failed to fetch user", error: err.message });
  }
});

// Update user
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const client = await pool.connect();
    
    // Check permissions
    const requestingUserResult = await client.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
    if (!requestingUserResult.rows[0] || (requestingUserResult.rows[0].role !== 'main_admin' && req.user.id !== parseInt(req.params.id))) {
      client.release();
      return res.status(403).json({ message: 'Insufficient permissions.' });
    }

    const { first_name, last_name, email, role, phone } = req.body;
    
    const result = await client.query(`
      UPDATE users 
      SET first_name = COALESCE($1, first_name), 
          last_name = COALESCE($2, last_name),
          email = COALESCE($3, email),
          role = COALESCE($4, role),
          phone = COALESCE($5, phone),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING id, email, first_name, last_name, role, is_active
    `, [first_name, last_name, email, role, phone, req.params.id]);
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ message: "Failed to update user", error: err.message });
  }
});

// Delete user (deactivate)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const client = await pool.connect();
    
    // Check permissions
    const requestingUserResult = await client.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
    if (!requestingUserResult.rows[0] || requestingUserResult.rows[0].role !== 'main_admin') {
      client.release();
      return res.status(403).json({ message: 'Only main administrators can delete users.' });
    }

    const result = await client.query(`
      UPDATE users 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email
    `, [req.params.id]);
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      message: 'User deactivated successfully',
      user: result.rows[0]
    });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ message: "Failed to delete user", error: err.message });
  }
});

module.exports = router;