const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdminPermission } = require('../middleware/auth');
const { pgPool } = require('../config/database');

// Get payment analytics (Admin only)
router.get('/analytics', authenticateToken, requireAdminPermission, async (req, res) => {
    try {
        const { timeframe = '30 days' } = req.query;
        const client = await pgPool.connect();

        // Calculate date range
        let dateFilter = "created_at >= CURRENT_DATE - INTERVAL '30 days'";
        if (timeframe === '7 days') dateFilter = "created_at >= CURRENT_DATE - INTERVAL '7 days'";
        if (timeframe === '90 days') dateFilter = "created_at >= CURRENT_DATE - INTERVAL '90 days'";
        if (timeframe === 'year') dateFilter = "created_at >= CURRENT_DATE - INTERVAL '1 year'";

        const result = await client.query(`
            SELECT 
                COUNT(*) as total_transactions,
                SUM(amount) as total_revenue,
                AVG(amount) as avg_transaction_value,
                SUM(CASE WHEN status = 'succeeded' THEN 1 ELSE 0 END) as successful_payments,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_payments
            FROM payments
            WHERE ${dateFilter}
        `);

        // Get daily revenue for chart
        const dailyRevenue = await client.query(`
            SELECT DATE(created_at) as date, SUM(amount) as revenue
            FROM payments
            WHERE ${dateFilter} AND status = 'succeeded'
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at)
        `);

        client.release();

        const stats = result.rows[0];

        res.json({
            totalTransactions: parseInt(stats.total_transactions),
            totalRevenue: parseFloat(stats.total_revenue || 0),
            avgTransactionValue: parseFloat(stats.avg_transaction_value || 0),
            successfulPayments: parseInt(stats.successful_payments),
            failedPayments: parseInt(stats.failed_payments),
            dailyRevenue: dailyRevenue.rows
        });
    } catch (error) {
        console.error('Payment analytics error:', error);
        // Handle missing table
        if (error.code === '42P01') {
            return res.json({
                totalTransactions: 0,
                totalRevenue: 0,
                avgTransactionValue: 0,
                successfulPayments: 0,
                failedPayments: 0,
                dailyRevenue: []
            });
        }
        res.status(500).json({ error: error.message });
    }
});

// Get all payments with filters (Admin only)
router.get('/', authenticateToken, requireAdminPermission, async (req, res) => {
    try {
        const { page = 1, limit = 50, status, email } = req.query;
        const offset = (page - 1) * limit;

        const client = await pgPool.connect();

        let query = 'SELECT * FROM payments WHERE 1=1';
        const params = [];
        let idx = 1;

        if (status) {
            query += ` AND status = $${idx++}`;
            params.push(status);
        }

        if (email) {
            query += ` AND email ILIKE $${idx++}`;
            params.push(`%${email}%`);
        }

        query += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
        params.push(limit, offset);

        const result = await client.query(query, params);
        client.release();

        res.json(result.rows);
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

        const client = await pgPool.connect();
        const result = await client.query(`
            SELECT * FROM payments 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT $2 OFFSET $3
        `, [req.user.id, limit, offset]);
        client.release();

        res.json(result.rows);
    } catch (error) {
        console.error('Get user payments error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get recent transactions (Admin only)
router.get('/recent', authenticateToken, requireAdminPermission, async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        const client = await pgPool.connect();
        const result = await client.query(`
            SELECT p.*, u.first_name, u.last_name 
            FROM payments p
            LEFT JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC 
            LIMIT $1
        `, [limit]);
        client.release();

        res.json(result.rows);
    } catch (error) {
        console.error('Recent transactions error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get top customers by payment volume (Admin only)
router.get('/top-customers', authenticateToken, requireAdminPermission, async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const client = await pgPool.connect();
        const result = await client.query(`
            SELECT u.id, u.first_name, u.last_name, u.email, SUM(p.amount) as total_spent, COUNT(p.id) as transaction_count
            FROM payments p
            JOIN users u ON p.user_id = u.id
            WHERE p.status = 'succeeded'
            GROUP BY u.id, u.first_name, u.last_name, u.email
            ORDER BY total_spent DESC
            LIMIT $1
        `, [limit]);
        client.release();

        res.json(result.rows);
    } catch (error) {
        console.error('Top customers error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Search payments (Admin only)
router.get('/search/:term', authenticateToken, requireAdminPermission, async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        const term = `%${req.params.term}%`;

        const client = await pgPool.connect();
        const result = await client.query(`
            SELECT * FROM payments 
            WHERE email ILIKE $1 
            OR stripe_payment_id ILIKE $1
            OR metadata->>'description' ILIKE $1
            ORDER BY created_at DESC
            LIMIT $2
        `, [term, limit]);
        client.release();

        res.json(result.rows);
    } catch (error) {
        console.error('Search payments error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get subscription analytics (Admin only)
router.get('/subscriptions/analytics', authenticateToken, requireAdminPermission, async (req, res) => {
    try {
        const client = await pgPool.connect();
        const result = await client.query(`
            SELECT 
                COUNT(*) as total_subscriptions,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_subscriptions,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_subscriptions,
                package_type,
                COUNT(*) as count
            FROM subscriptions
            GROUP BY package_type
        `);
        client.release();

        // Process result to match expected format
        const stats = {
            totalSubscriptions: 0,
            activeSubscriptions: 0,
            cancelledSubscriptions: 0,
            byPackage: {}
        };

        result.rows.forEach(row => {
            if (row.package_type) { // Total stats are repeated in rows if grouped, so we need to be careful
                // Actually the query above returns one row per package_type with total counts being specific to that group?
                // No, COUNT(*) is per group.
                // We should do separate queries or window functions, but let's just aggregate in JS.
                stats.byPackage[row.package_type] = parseInt(row.count);
                stats.totalSubscriptions += parseInt(row.count);
                if (row.status === 'active') stats.activeSubscriptions += parseInt(row.count); // This logic is flawed in the SQL above because of GROUP BY package_type
            }
        });

        // Let's do a simpler query for totals
        const client2 = await pgPool.connect();
        const totalResult = await client2.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
            FROM subscriptions
        `);
        client2.release();

        stats.totalSubscriptions = parseInt(totalResult.rows[0].total);
        stats.activeSubscriptions = parseInt(totalResult.rows[0].active);
        stats.cancelledSubscriptions = parseInt(totalResult.rows[0].cancelled);

        res.json(stats);
    } catch (error) {
        console.error('Subscription analytics error:', error);
        if (error.code === '42P01') return res.json({});
        res.status(500).json({ error: error.message });
    }
});

// Get all subscriptions (Admin only)
router.get('/subscriptions', authenticateToken, requireAdminPermission, async (req, res) => {
    try {
        const { page = 1, limit = 50, status, packageType } = req.query;
        const offset = (page - 1) * limit;

        const client = await pgPool.connect();

        let query = 'SELECT * FROM subscriptions WHERE 1=1';
        const params = [];
        let idx = 1;

        if (status) {
            query += ` AND status = $${idx++}`;
            params.push(status);
        }

        if (packageType) {
            query += ` AND package_type = $${idx++}`;
            params.push(packageType);
        }

        query += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
        params.push(limit, offset);

        const result = await client.query(query, params);
        client.release();

        res.json(result.rows);
    } catch (error) {
        console.error('Get subscriptions error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user's subscription
router.get('/my-subscription', authenticateToken, async (req, res) => {
    try {
        const client = await pgPool.connect();
        const result = await client.query('SELECT * FROM subscriptions WHERE user_id = $1', [req.user.id]);
        client.release();

        res.json(result.rows[0] || null);
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

        const client = await pgPool.connect();

        // Create mock payment
        const result = await client.query(`
            INSERT INTO payments (
                user_id, email, amount, stripe_payment_id, status, metadata, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
            RETURNING *
        `, [
            req.user.id,
            req.user.email,
            parseFloat(amount),
            `mock_${Date.now()}_${req.user.id}`,
            'succeeded',
            JSON.stringify({
                packageType,
                description,
                userId: req.user.id
            })
        ]);

        client.release();

        res.json({
            success: true,
            payment: result.rows[0],
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

        const client = await pgPool.connect();

        const result = await client.query(`
            INSERT INTO subscriptions (
                user_id, package_type, package_name, price, status, features, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING *
        `, [
            req.user.id,
            packageType,
            packageName,
            JSON.stringify(price || { monthly: 0, perCall: 0, setup: 0 }),
            'active',
            JSON.stringify({
                liveMonitoring: true,
                orderManagement: true,
                phoneSupport: true
            })
        ]);

        client.release();

        res.json({
            success: true,
            subscription: result.rows[0],
            message: 'Subscription created successfully'
        });
    } catch (error) {
        console.error('Create subscription error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;