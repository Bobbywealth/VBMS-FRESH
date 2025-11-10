const express = require('express');
const router  = express.Router();
const Task    = require('../models/Task');
const { authenticateToken } = require('../middleware/auth');
const User    = require('../models/User');

// GET /api/tasks - Get user's tasks with filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      status, 
      priority, 
      type, 
      search, 
      isAdminTask,
      assignee,
      overdue,
      page = 1, 
      limit = 50 
    } = req.query;
    
    // Build filter object
    const filter = { owner: req.user.id };
    
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (type) filter.type = type;
    if (assignee) filter.assignee = { $regex: assignee, $options: 'i' };
    if (isAdminTask !== undefined) filter.isAdminTask = isAdminTask === 'true';
    
    // Handle search
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { assignee: { $regex: search, $options: 'i' } },
        { project: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Handle overdue filter
    if (overdue === 'true') {
      filter.due = { $lt: new Date() };
      filter.status = { $ne: 'done' };
    }
    
    const tasks = await Task.find(filter)
      .sort({ 
        priority: -1, // High priority first
        createdAt: -1 
      })
      .limit(limit * 1)
      .skip((page - 1) * limit);
      
    // Update next due dates for recurring tasks
    const updatedTasks = tasks.map(task => {
      if (task.type === 'recurring' && !task.nextDue) {
        task.nextDue = task.calculateNextDue();
        task.save();
      }
      return task;
    });
    
    const total = await Task.countDocuments(filter);
    
    res.json({
      tasks: updatedTasks,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/tasks - Create new task
router.post('/', authenticateToken, async (req, res) => {
  try {
    const taskData = { 
      ...req.body, 
      owner: req.user.id,
      isAdminTask: req.user.role === 'admin' || req.user.role === 'main_admin'
    };
    
    // Calculate next due date for recurring tasks
    const task = new Task(taskData);
    if (task.type === 'recurring') {
      task.nextDue = task.calculateNextDue();
    }
    
    await task.save();
    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, owner: req.user.id });
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Update task fields
    Object.assign(task, req.body);
    
    // Handle status change to completed
    if (req.body.status === 'done' && task.status !== 'done') {
      task.completed = true;
      task.progress = 100;
      
      // For recurring tasks, set lastCompleted and calculate nextDue
      if (task.type === 'recurring') {
        task.lastCompleted = new Date();
        
        if (!task.shouldEndRecurrence()) {
          task.nextDue = task.calculateNextDue();
          task.status = 'todo'; // Reset status for next occurrence
          task.completed = false;
          task.progress = 0;
        }
      }
    }
    
    // Recalculate next due for recurring tasks if frequency changed
    if (task.type === 'recurring' && req.body.recurringFrequency) {
      task.nextDue = task.calculateNextDue();
    }
    
    await task.save();
    res.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PATCH /api/tasks/:id/progress - Update task progress
router.patch('/:id/progress', authenticateToken, async (req, res) => {
  try {
    const { progress } = req.body;
    
    if (progress < 0 || progress > 100) {
      return res.status(400).json({ message: 'Progress must be between 0 and 100' });
    }
    
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { 
        progress,
        status: progress === 100 ? 'done' : progress > 0 ? 'progress' : 'todo',
        completed: progress === 100
      },
      { new: true }
    );
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    res.json(task);
  } catch (error) {
    console.error('Error updating task progress:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/tasks/:id/subtasks - Add subtask
router.post('/:id/subtasks', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    
    const task = await Task.findOne({ _id: req.params.id, owner: req.user.id });
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    task.subtasks.push({ text, completed: false });
    await task.save();
    
    res.json(task);
  } catch (error) {
    console.error('Error adding subtask:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/tasks/:id/subtasks/:subtaskId - Update subtask
router.put('/:id/subtasks/:subtaskId', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, owner: req.user.id });
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    const subtask = task.subtasks.id(req.params.subtaskId);
    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }
    
    Object.assign(subtask, req.body);
    await task.save();
    
    res.json(task);
  } catch (error) {
    console.error('Error updating subtask:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/tasks/:id/subtasks/:subtaskId - Delete subtask
router.delete('/:id/subtasks/:subtaskId', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, owner: req.user.id });
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    task.subtasks.id(req.params.subtaskId).remove();
    await task.save();
    
    res.json(task);
  } catch (error) {
    console.error('Error deleting subtask:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await Task.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    
    if (!result) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/tasks/admin/all - Admin only: Get all tasks from all users
router.get('/admin/all', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'main_admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    
    const { 
      status, 
      priority, 
      type, 
      search, 
      assignee,
      page = 1, 
      limit = 50 
    } = req.query;
    
    // Build filter object
    const filter = { isAdminTask: true };
    
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (type) filter.type = type;
    if (assignee) filter.assignee = { $regex: assignee, $options: 'i' };
    
    // Handle search
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { assignee: { $regex: search, $options: 'i' } },
        { project: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Get all admin tasks with owner information populated
    const tasks = await Task.find(filter)
      .populate('owner', 'name email')
      .sort({ 
        priority: -1, 
        createdAt: -1 
      })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    // Add owner info to task objects for easier display
    const tasksWithOwner = tasks.map(task => ({
      ...task.toJSON(),
      ownerName: task.owner ? task.owner.name : 'Unknown',
      ownerEmail: task.owner ? task.owner.email : 'Unknown'
    }));
    
    const total = await Task.countDocuments(filter);
    
    res.json({
      tasks: tasksWithOwner,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching all admin tasks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/tasks/admin/customer/:userId - Admin only: Get tasks for specific customer
router.get('/admin/customer/:userId', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'main_admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    
    const tasks = await Task.find({ 
      owner: req.params.userId,
      isAdminTask: false 
    })
    .populate('owner', 'name email')
    .sort('-createdAt');
    
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching customer tasks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/tasks/stats - Get task statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const filter = { owner: req.user.id };
    
    // If admin, can get stats for admin tasks
    if ((req.user.role === 'admin' || req.user.role === 'main_admin') && req.query.admin === 'true') {
      filter.isAdminTask = true;
      delete filter.owner; // Get all admin tasks
    }
    
    const [
      totalTasks,
      completedTasks,
      todoTasks,
      inProgressTasks,
      reviewTasks,
      overdueTasks,
      recurringTasks,
      highPriorityTasks
    ] = await Promise.all([
      Task.countDocuments(filter),
      Task.countDocuments({ ...filter, status: 'done' }),
      Task.countDocuments({ ...filter, status: 'todo' }),
      Task.countDocuments({ ...filter, status: 'progress' }),
      Task.countDocuments({ ...filter, status: 'review' }),
      Task.countDocuments({ 
        ...filter, 
        due: { $lt: new Date() }, 
        status: { $ne: 'done' } 
      }),
      Task.countDocuments({ ...filter, type: 'recurring' }),
      Task.countDocuments({ ...filter, priority: 'high' })
    ]);
    
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : 0;
    
    res.json({
      totalTasks,
      completedTasks,
      todoTasks,
      inProgressTasks,
      reviewTasks,
      overdueTasks,
      recurringTasks,
      highPriorityTasks,
      completionRate: parseFloat(completionRate)
    });
  } catch (error) {
    console.error('Error fetching task stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/tasks/bulk - Bulk operations on tasks
router.post('/bulk', authenticateToken, async (req, res) => {
  try {
    const { action, taskIds, data } = req.body;
    
    if (!action || !taskIds || !Array.isArray(taskIds)) {
      return res.status(400).json({ message: 'Invalid bulk operation data' });
    }
    
    const filter = { 
      _id: { $in: taskIds }, 
      owner: req.user.id 
    };
    
    let result;
    
    switch (action) {
      case 'delete':
        result = await Task.deleteMany(filter);
        break;
      case 'update':
        result = await Task.updateMany(filter, data);
        break;
      case 'complete':
        result = await Task.updateMany(filter, { 
          status: 'done', 
          completed: true, 
          progress: 100 
        });
        break;
      default:
        return res.status(400).json({ message: 'Invalid bulk action' });
    }
    
    res.json({ 
      message: `Bulk ${action} completed`, 
      affected: result.modifiedCount || result.deletedCount 
    });
  } catch (error) {
    console.error('Error performing bulk operation:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
