const express = require('express');
const router = express.Router();
const { pgPool } = require('../config/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // Changed from 'bcrypt' to 'bcryptjs' as it's in package.json

// Registration Route
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, business, position, role } = req.body;

    const client = await pgPool.connect();

    // Check if user exists
    const userCheck = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      client.release();
      return res.status(409).json({ message: 'Email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const firstName = name?.split(' ')[0] || name;
    const lastName = name?.split(' ').slice(1).join(' ') || '';
    const userRole = role || "customer";

    const newUserResult = await client.query(`
      INSERT INTO users (first_name, last_name, email, password, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, first_name, last_name, email, role
    `, [firstName, lastName, email, hashedPassword, userRole]);

    const newUser = newUserResult.rows[0];
    client.release();

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET || 'dev-secret-do-not-use-in-prod',
      { expiresIn: "1d" }
    );

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: `${newUser.first_name} ${newUser.last_name}`.trim(),
        email: newUser.email,
        role: newUser.role,
        firstName: newUser.first_name,
        lastName: newUser.last_name
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const client = await pgPool.connect();

    // Find user
    const userResult = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];

    if (!user) {
      client.release();
      return res.status(400).json({ message: "No user found" });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      client.release();
      return res.status(400).json({ message: "Wrong password" });
    }

    // Update last login
    await client.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
    client.release();

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'dev-secret-do-not-use-in-prod',
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`.trim(),
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});

module.exports = router;
