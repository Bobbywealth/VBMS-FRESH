const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const { authenticateToken, requireAdminPermission } = require('../middleware/auth');

// Get payment analytics (Admin only)
router.get('/analytics', authenticateToken, requireAdminPermission, async (req, res) => {
    try {
        const analytics = await Payment.getAnalytics();
        res.json(analytics);
    } catch (error) {
        console.error('Payment analytics error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all payments (Admin only)
router.get('/', authenticateToken, requireAdminPermission, async (req, res) => {
    try {
        const { page = 1, limit = 50, status, email } = req.query;
        const offset = (page - 1) * limit;
        const filters = {};
        
        if (status) filters.status = status;
        if (email) filters.email = email;
        
        const payments = await Payment.findAll(filters, parseInt(limit), offset);
        res.json(payments);
    } catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user's payments
router.get('/my-payments', authenticateToken, async (req, res) => {
    try {
        const payments = await Payment.findByUserId(req.user.id, 20, 0);
        res.json(payments);
    } catch (error) {
        console.error('Get user payments error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get recent transactions (Admin only)
router.get('/recent', authenticateToken, requireAdminPermission, async (req, res) => {
    try {
        const recentTransactions = await Payment.getRecentTransactions(20);
        res.json(recentTransactions);
    } catch (error) {
        console.error('Recent transactions error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get top customers (Admin only)
router.get('/top-customers', authenticateToken, requireAdminPermission, async (req, res) => {
    try {
        const topCustomers = await Payment.getTopCustomers(10);
        res.json(topCustomers);
    } catch (error) {
        console.error('Top customers error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get subscription analytics (Admin only)
router.get('/subscriptions/analytics', authenticateToken, requireAdminPermission, async (req, res) => {
    try {
        const analytics = await Subscription.getAnalytics();
        res.json(analytics);
    } catch (error) {
        console.error('Subscription analytics error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all subscriptions (Admin only)
router.get('/subscriptions', authenticateToken, requireAdminPermission, async (req, res) => {
    try {
        const subscriptions = await Subscription.findAll({}, 50, 0);
        res.json(subscriptions);
    } catch (error) {
        console.error('Get subscriptions error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user's subscription
router.get('/my-subscription', authenticateToken, async (req, res) => {
    try {
        const subscription = await Subscription.findByCustomerId(req.user.id);
        res.json(subscription);
    } catch (error) {
        console.error('Get user subscription error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Process payment (Mock implementation)
router.post('/process', authenticateToken, async (req, res) => {
    try {
        const { amount, packageType = 'unknown' } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }
        
        const payment = await Payment.create({
            userId: req.user.id,
            email: req.user.email,
            amount: parseFloat(amount),
            stripePaymentId: `mock_${Date.now()}_${req.user.id}`,
            status: 'succeeded',
            metadata: { packageType, userId: req.user.id }
        });
        
        res.json({ success: true, payment });
    } catch (error) {
        console.error('Process payment error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
