const express = require('express');
const router = express.Router();
const { pgPool } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Middleware to get current user from token (for dashboard access)
const authenticate = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = decoded;
        next();
    });
};

// Clock In/Out/Break
router.post('/clock', async (req, res) => {
    const { pin, type } = req.body; // type: 'in', 'out', 'break_start', 'break_end'

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

        // Find active log (if any)
        const activeLogRes = await client.query(
            "SELECT * FROM time_logs WHERE user_id = $1 AND status IN ('active', 'on_break')",
            [user.id]
        );
        const activeLog = activeLogRes.rows[0];

        if (type === 'in') {
            if (activeLog) {
                return res.status(400).json({ message: `Already clocked in!` });
            }
            await client.query(
                "INSERT INTO time_logs (user_id, clock_in, status) VALUES ($1, $2, 'active')",
                [user.id, now]
            );
            res.json({ message: `Welcome, ${user.first_name}! Clocked IN at ${now.toLocaleTimeString()}` });

        } else if (type === 'out') {
            if (!activeLog) {
                return res.status(400).json({ message: 'You are not clocked in!' });
            }
            // If on break, end it first
            if (activeLog.status === 'on_break') {
                await client.query(
                    "UPDATE breaks SET end_time = $1 WHERE time_log_id = $2 AND end_time IS NULL",
                    [now, activeLog.id]
                );
            }

            await client.query(
                "UPDATE time_logs SET clock_out = $1, status = 'completed' WHERE id = $2",
                [now, activeLog.id]
            );
            res.json({ message: `Goodbye, ${user.first_name}! Clocked OUT at ${now.toLocaleTimeString()}` });

        } else if (type === 'break_start') {
            if (!activeLog) return res.status(400).json({ message: 'You must clock in first!' });
            if (activeLog.status === 'on_break') return res.status(400).json({ message: 'Already on break!' });

            await client.query("UPDATE time_logs SET status = 'on_break' WHERE id = $1", [activeLog.id]);
            await client.query("INSERT INTO breaks (time_log_id, start_time) VALUES ($1, $2)", [activeLog.id, now]);

            res.json({ message: `Enjoy your break, ${user.first_name}!` });

        } else if (type === 'break_end') {
            if (!activeLog) return res.status(400).json({ message: 'You are not clocked in!' });
            if (activeLog.status !== 'on_break') return res.status(400).json({ message: 'You are not on a break!' });

            await client.query("UPDATE time_logs SET status = 'active' WHERE id = $1", [activeLog.id]);
            await client.query("UPDATE breaks SET end_time = $1 WHERE time_log_id = $2 AND end_time IS NULL", [now, activeLog.id]);

            res.json({ message: `Welcome back, ${user.first_name}!` });
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

// Get Logs (Protected - Only for Employer)
router.get('/', authenticate, async (req, res) => {
    const client = await pgPool.connect();
    try {
        // Get logs for users where employer_id = req.user.id OR user_id = req.user.id (self)
        const result = await client.query(`
      SELECT 
        t.id, 
        u.first_name || ' ' || u.last_name as user_name,
        t.clock_in,
        t.clock_out,
        t.status,
        (SELECT COUNT(*) FROM breaks b WHERE b.time_log_id = t.id) as break_count
      FROM time_logs t
      JOIN users u ON t.user_id = u.id
      WHERE u.employer_id = $1 OR u.id = $1
      ORDER BY t.clock_in DESC
      LIMIT 50
    `, [req.user.id]);

        res.json(result.rows);
    } catch (err) {
        console.error('Get logs error:', err);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
});

// Create Employee (Protected)
router.post('/employees', authenticate, async (req, res) => {
    const { firstName, lastName, email, pin } = req.body;

    if (!firstName || !email || !pin) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const client = await pgPool.connect();
    try {
        // Check if email exists
        const check = await client.query("SELECT id FROM users WHERE email = $1", [email]);
        if (check.rows.length > 0) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        // Hash dummy password (employees log in via PIN mostly, but need a pass for DB constraint)
        const hash = await bcrypt.hash('employee123', 10);

        await client.query(`
      INSERT INTO users (first_name, last_name, email, password, role, pin_code, employer_id, is_active, email_verified)
      VALUES ($1, $2, $3, $4, 'employee', $5, $6, true, true)
    `, [firstName, lastName, email, hash, pin, req.user.id]);

        res.json({ message: 'Employee created successfully' });
    } catch (err) {
        console.error('Create employee error:', err);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
});

// List Employees (Protected)
router.get('/employees', authenticate, async (req, res) => {
    const client = await pgPool.connect();
    try {
        const result = await client.query(
            `SELECT id, first_name, last_name, email, pin_code, created_at
             FROM users
             WHERE employer_id = $1
             ORDER BY first_name ASC, last_name ASC`,
            [req.user.id]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('List employees error:', err);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
});

// Delete Employee (Protected)
router.delete('/employees/:id', authenticate, async (req, res) => {
    const employeeId = parseInt(req.params.id, 10);
    if (Number.isNaN(employeeId)) {
        return res.status(400).json({ message: 'Invalid employee ID' });
    }

    const client = await pgPool.connect();
    try {
        await client.query('BEGIN');

        const employee = await client.query(
            'SELECT id FROM users WHERE id = $1 AND employer_id = $2',
            [employeeId, req.user.id]
        );

        if (employee.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Employee not found' });
        }

        const logIdsResult = await client.query(
            'SELECT id FROM time_logs WHERE user_id = $1',
            [employeeId]
        );
        const logIds = logIdsResult.rows.map(row => row.id);

        if (logIds.length > 0) {
            await client.query(
                'DELETE FROM breaks WHERE time_log_id = ANY($1::int[])',
                [logIds]
            );
        }

        await client.query(
            'DELETE FROM time_logs WHERE user_id = $1',
            [employeeId]
        );

        await client.query(
            'DELETE FROM users WHERE id = $1',
            [employeeId]
        );

        await client.query('COMMIT');
        res.json({ message: 'Employee deleted successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Delete employee error:', err);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
});

module.exports = router;
