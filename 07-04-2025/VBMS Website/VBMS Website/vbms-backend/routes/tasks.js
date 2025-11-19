const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { pgPool } = require('../config/database');

// GET /api/tasks - Get user's tasks with filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const client = await pgPool.connect();
    const { status, priority, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM tasks WHERE user_id = $1';
    let params = [req.user.id];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    if (priority) {
      query += ` AND priority = $${params.length + 1}`;
      params.push(priority);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await client.query(query, params);
    client.release();

    res.json({
      success: true,
      tasks: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks',
      details: error.message
    });
  }
});

// POST /api/tasks - Create a new task
router.post('/', authenticateToken, async (req, res) => {
  try {
    const client = await pgPool.connect();
    const { title, description, priority, due_date, category } = req.body;

    if (!title) {
      client.release();
      return res.status(400).json({
        success: false,
        error: 'Task title is required'
      });
    }

    const result = await client.query(`
      INSERT INTO tasks (user_id, title, description, priority, due_date, category, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [req.user.id, title, description || '', priority || 'medium', due_date, category || 'general']);

    client.release();

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create task',
      details: error.message
    });
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const client = await pgPool.connect();
    const { title, description, status, priority, due_date } = req.body;

    const result = await client.query(`
      UPDATE tasks 
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          status = COALESCE($3, status),
          priority = COALESCE($4, priority),
          due_date = COALESCE($5, due_date),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 AND user_id = $7
      RETURNING *
    `, [title, description, status, priority, due_date, req.params.id, req.user.id]);

    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found or unauthorized'
      });
    }

    res.json({
      success: true,
      message: 'Task updated successfully',
      task: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update task',
      details: error.message
    });
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const client = await pgPool.connect();

    const result = await client.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id, title',
      [req.params.id, req.user.id]
    );

    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found or unauthorized'
      });
    }

    res.json({
      success: true,
      message: 'Task deleted successfully',
      task: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete task',
      details: error.message
    });
  }
});

module.exports = router;