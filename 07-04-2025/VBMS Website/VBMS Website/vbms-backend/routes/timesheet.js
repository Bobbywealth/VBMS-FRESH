const express = require('express');
const router = express.Router();
const { pgPool } = require('../config/database');

// Clock In/Out
router.post('/clock', async (req, res) => {
    const { pin, type } = req.body; // type: 'in' or 'out'

    if (!pin || !type) {
        return res.status(400).json({ message: 'PIN and type are required' });
    }

    const client = await pgPool.connect();
    try {
        // 1. Find user by PIN
        const userRes = await client.query('SELECT id, first_name, last_name FROM users WHERE pin_code = $1', [pin]);
        const user = userRes.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Invalid PIN' });
        }

        const now = new Date();

        if (type === 'in') {
            // Check if already clocked in
            const activeLog = await client.query(
                "SELECT * FROM time_logs WHERE user_id = $1 AND status = 'active'",
                [user.id]
            );

            if (activeLog.rows.length > 0) {
                return res.status(400).json({ message: `You are already clocked in since ${new Date(activeLog.rows[0].clock_in).toLocaleTimeString()}` });
            }

            // Clock In
            await client.query(
                "INSERT INTO time_logs (user_id, clock_in, status) VALUES ($1, $2, 'active')",
                [user.id, now]
            );

            res.json({ message: `Welcome, ${user.first_name}! Clocked IN at ${now.toLocaleTimeString()}` });

        } else if (type === 'out') {
            // Find active log
            const activeLog = await client.query(
                "SELECT id FROM time_logs WHERE user_id = $1 AND status = 'active'",
                [user.id]
            );

            if (activeLog.rows.length === 0) {
                return res.status(400).json({ message: 'You are not clocked in!' });
            }

            // Clock Out
            await client.query(
                "UPDATE time_logs SET clock_out = $1, status = 'completed' WHERE id = $2",
                [now, activeLog.rows[0].id]
            );

            res.json({ message: `Goodbye, ${user.first_name}! Clocked OUT at ${now.toLocaleTimeString()}` });
        } else {
            res.status(400).json({ message: 'Invalid type' });
        }

    } catch (err) {
        console.error('Clock error:', err);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
});

// Get Logs (for dashboard)
router.get('/', async (req, res) => {
    const client = await pgPool.connect();
    try {
        const result = await client.query(`
      SELECT 
        t.id, 
        u.first_name || ' ' || u.last_name as user_name,
        t.clock_in,
        t.clock_out,
        t.status
      FROM time_logs t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.clock_in DESC
      LIMIT 50
    `);

        res.json(result.rows);
    } catch (err) {
        console.error('Get logs error:', err);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
});

module.exports = router;
