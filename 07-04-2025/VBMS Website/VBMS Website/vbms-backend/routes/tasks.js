const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { authenticateToken, requireAdminPermission } = require('../middleware/auth');

/**
 * Get all tasks with filtering and pagination
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      status,
      priority,
      assigned_to,
      overdue_only,
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assigned_to) filter.assigned_to = parseInt(assigned_to);
    if (overdue_only === 'true') filter.overdue_only = true;

    // Non-admin users can only see tasks assigned to them or created by them
    if (req.user.role !== 'main_admin' && req.user.role !== 'admin') {
      filter.assigned_to = req.user.id;
      // Also include tasks created by them
      filter.created_by = req.user.id;
    }

    const options = {
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      sort_by,
      sort_order: sort_order.toUpperCase()
    };

    const tasks = await Task.find(filter, options);

    res.json({
      success: true,
      data: {
        tasks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: tasks.length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tasks',
      error: error.message
    });
  }
});

/**
 * Get task by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions - users can only see their own tasks unless admin
    if (req.user.role !== 'main_admin' && req.user.role !== 'admin') {
      if (task.assigned_to !== req.user.id && task.created_by !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching task',
      error: error.message
    });
  }
});

/**
 * Create new task
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      description,
      status = 'pending',
      priority = 'medium',
      assigned_to,
      due_date,
      tags = [],
      metadata = {}
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Task title is required'
      });
    }

    const taskData = {
      title,
      description,
      status,
      priority,
      assigned_to: assigned_to ? parseInt(assigned_to) : null,
      created_by: req.user.id,
      due_date,
      tags,
      metadata
    };

    const task = await Task.create(taskData);

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating task',
      error: error.message
    });
  }
});

/**
 * Update task
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { title, description, status, priority, assigned_to, due_date, tags, metadata } = req.body;
    
    // Check if task exists and user has permission
    const existingTask = await Task.findById(req.params.id);
    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'main_admin' && req.user.role !== 'admin') {
      if (existingTask.assigned_to !== req.user.id && existingTask.created_by !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (assigned_to !== undefined) updates.assigned_to = assigned_to ? parseInt(assigned_to) : null;
    if (due_date !== undefined) updates.due_date = due_date;
    if (tags !== undefined) updates.tags = tags;
    if (metadata !== undefined) updates.metadata = metadata;

    const task = await Task.update(req.params.id, updates);

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: task
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating task',
      error: error.message
    });
  }
});

/**
 * Delete task (Admin only)
 */
router.delete('/:id', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const deleted = await Task.delete(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting task',
      error: error.message
    });
  }
});

/**
 * Get task statistics
 */
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    // Admin gets all stats, users get their own stats
    const userId = (req.user.role === 'main_admin' || req.user.role === 'admin') ? null : req.user.id;
    const stats = await Task.getStats(userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching task stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching task statistics',
      error: error.message
    });
  }
});

/**
 * Get my tasks (shortcut for current user's tasks)
 */
router.get('/my/tasks', authenticateToken, async (req, res) => {
  try {
    const { status, priority, limit = 20 } = req.query;

    const filter = {
      assigned_to: req.user.id
    };
    
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const options = {
      limit: parseInt(limit),
      sort_by: 'due_date',
      sort_order: 'ASC'
    };

    const tasks = await Task.find(filter, options);

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Error fetching my tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching your tasks',
      error: error.message
    });
  }
});

module.exports = router;