const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Registration Route
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, business, position, role } = req.body;
    
    // Check if user exists using PostgreSQL method
    const exists = await User.findByEmail(email);
    if (exists) return res.status(409).json({ message: 'Email already exists' });

    // Create new user using PostgreSQL method
    const newUser = await User.create({
      firstName: name?.split(' ')[0] || name,
      lastName: name?.split(' ').slice(1).join(' ') || '',
      email,
      password,
      role: role || "customer"
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.getFullName(),
        email: newUser.email,
        role: newUser.role,
        firstName: newUser.firstName,
        lastName: newUser.lastName
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

    // Find user using PostgreSQL method
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(400).json({ message: "No user found" });
    }

    // Verify password using PostgreSQL method
    const isMatch = await user.verifyPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Wrong password" });
    }

    // Update last login
    await user.updateLastLogin();

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    
    res.json({ 
      token, 
      user: { 
        id: user.id,
        name: user.getFullName(),
        email: user.email, 
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      } 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});

module.exports = router;
