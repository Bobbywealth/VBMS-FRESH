const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const { authenticateToken, requireAdminPermission } = require('../middleware/auth');

// Get payment analytics (Admin only)
router.get('/analytics', authenticateToken, requireAdminPermission, async (req, res) => {
    try {
        const { timeframe = '30 days' } = req.query;
        const analytics = await Payment.getAnalytics(timeframe);
        res.json(analytics);
    } catch (error) {
        console.error('Payment analytics error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all payments with filters (Admin only)
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
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        
        const payments = await Payment.findByUserId(req.user.id, parseInt(limit), offset);
        res.json(payments);
    } catch (error) {
        console.error('Get user payments error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get recent transactions (Admin only)
router.get('/recent', authenticateToken, requireAdminPermission, async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        const recentTransactions = await Payment.getRecentTransactions(parseInt(limit));
        res.json(recentTransactions);
    } catch (error) {
        console.error('Recent transactions error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get top customers by payment volume (Admin only)
router.get('/top-customers', authenticateToken, requireAdminPermission, async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const topCustomers = await Payment.getTopCustomers(parseInt(limit));
        res.json(topCustomers);
    } catch (error) {
        console.error('Top customers error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Search payments (Admin only)
router.get('/search/:term', authenticateToken, requireAdminPermission, async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        const payments = await Payment.search(req.params.term, parseInt(limit));
        res.json(payments);
    } catch (error) {
        console.error('Search payments error:', error);
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
        const { page = 1, limit = 50, status, packageType } = req.query;
        const offset = (page - 1) * limit;
        const filters = {};
        
        if (status) filters.status = status;
        if (packageType) filters.packageType = packageType;
        
        const subscriptions = await Subscription.findAll(filters, parseInt(limit), offset);
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

// Process payment (Mock implementation for now)
router.post('/process', authenticateToken, async (req, res) => {
    try {
        const { amount, packageType = 'unknown', description = 'VBMS Payment' } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }
        
        // Create mock payment
        const payment = await Payment.create({
            userId: req.user.id,
            email: req.user.email,
            amount: parseFloat(amount),
            stripePaymentId: `mock_${Date.now()}_${req.user.id}`,
            status: 'succeeded',
            metadata: {
                packageType,
                description,
                userId: req.user.id
            }
        });
        
        res.json({
            success: true,
            payment,
            message: 'Payment processed successfully'
        });
    } catch (error) {
        console.error('Process payment error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create subscription
router.post('/subscriptions', authenticateToken, async (req, res) => {
    try {
        const { packageType, packageName, price } = req.body;

        if (!packageType || !packageName) {
            return res.status(400).json({ error: 'Package type and name are required' });
        }

        const subscription = await Subscription.create({
            customerId: req.user.id,
            packageType,
            packageName,
            price: price || { monthly: 0, perCall: 0, setup: 0 },
            status: 'active',
            features: {
                liveMonitoring: true,
                orderManagement: true,
                phoneSupport: true
            }
        });

        res.json({
            success: true,
            subscription,
            message: 'Subscription created successfully'
        });
    } catch (error) {
        console.error('Create subscription error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;