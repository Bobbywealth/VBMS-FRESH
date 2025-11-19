const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const taskScheduler = require('../services/taskScheduler');

// Get upcoming tasks
router.get('/tasks/upcoming', authenticateToken, async (req, res) => {
    try {
        const days = req.query.days || 7;
        const upcomingTasks = await taskScheduler.getUpcomingTasks(req.user.id, days);
        res.json(upcomingTasks);
    } catch (error) {
        console.error('Error fetching upcoming tasks:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get overdue tasks
router.get('/tasks/overdue', authenticateToken, async (req, res) => {
    try {
        const overdueTasks = await taskScheduler.getOverdueTasks(req.user.id);
        res.json(overdueTasks);
    } catch (error) {
        console.error('Error fetching overdue tasks:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin endpoint to manually trigger recurring task processing
router.post('/admin/tasks/process-recurring', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'main_admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        await taskScheduler.processNow();
        res.json({ message: 'Recurring tasks processed successfully' });
    } catch (error) {
        console.error('Error processing recurring tasks:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
