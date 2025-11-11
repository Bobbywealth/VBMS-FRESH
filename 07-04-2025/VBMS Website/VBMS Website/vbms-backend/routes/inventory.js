const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { Pool } = require('pg');

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Get all inventory items with basic pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const client = await pool.connect();
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    const result = await client.query(`
      SELECT * FROM inventory 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    const countResult = await client.query('SELECT COUNT(*) FROM inventory');
    
    client.release();
    
    res.json({
      success: true,
      items: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inventory items',
      details: error.message
    });
  }
});

// Get single inventory item
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM inventory WHERE id = $1', [req.params.id]);
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    
    res.json({
      success: true,
      item: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(404).json({
      success: false,
      error: 'Item not found',
      details: error.message
    });
  }
});

// Create new inventory item
router.post('/', authenticateToken, async (req, res) => {
  try {
    const client = await pool.connect();
    const { name, description, category, quantity, price, sku } = req.body;
    
    if (!name || quantity === undefined) {
      client.release();
      return res.status(400).json({
        success: false,
        error: 'Name and quantity are required'
      });
    }
    
    const result = await client.query(`
      INSERT INTO inventory (name, description, category, quantity, price, sku, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [name, description || '', category || 'General', quantity, price || 0, sku]);
    
    client.release();
    
    res.status(201).json({
      success: true,
      message: 'Inventory item created successfully',
      item: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create inventory item',
      details: error.message
    });
  }
});

// Update inventory item
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const client = await pool.connect();
    const { name, description, category, quantity, price, sku } = req.body;
    
    const result = await client.query(`
      UPDATE inventory 
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          category = COALESCE($3, category),
          quantity = COALESCE($4, quantity),
          price = COALESCE($5, price),
          sku = COALESCE($6, sku),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [name, description, category, quantity, price, sku, req.params.id]);
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Inventory item updated successfully',
      item: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update inventory item',
      details: error.message
    });
  }
});

// Delete inventory item
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('DELETE FROM inventory WHERE id = $1 RETURNING id, name', [req.params.id]);
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Inventory item deleted successfully',
      item: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete inventory item',
      details: error.message
    });
  }
});

// Get low stock items
router.get('/alerts/low-stock', authenticateToken, async (req, res) => {
  try {
    const client = await pool.connect();
    const threshold = req.query.threshold || 10;
    
    const result = await client.query(`
      SELECT * FROM inventory 
      WHERE quantity < $1 AND quantity >= 0
      ORDER BY quantity ASC
    `, [threshold]);
    
    client.release();
    
    res.json({
      success: true,
      items: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch low stock items',
      details: error.message
    });
  }
});

// Get out of stock items
router.get('/alerts/out-of-stock', authenticateToken, async (req, res) => {
  try {
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT * FROM inventory 
      WHERE quantity = 0
      ORDER BY name ASC
    `);
    
    client.release();
    
    res.json({
      success: true,
      items: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching out of stock items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch out of stock items',
      details: error.message
    });
  }
});

module.exports = router;