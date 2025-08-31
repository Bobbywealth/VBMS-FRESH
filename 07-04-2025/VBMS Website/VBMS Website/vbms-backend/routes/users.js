const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

// Get ALL users (requires authentication)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const users = await User.find().select('-password'); // Don't return passwords
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users", error: err.message });
  }
});

// Create a NEW user (requires main_admin authentication)
router.post('/create-user', authenticateToken, async (req, res) => {
  try {
    // Check if the requesting user is a main admin
    const requestingUser = await User.findById(req.user.id);
    if (!requestingUser || requestingUser.role !== 'main_admin') {
      return res.status(403).json({ message: 'Only main administrators can create new users.' });
    }

    const { 
      name, 
      email, 
      password, 
      role, 
      department, 
      adminPermissions, 
      status = 'active',
      createdBy 
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password, and role are required.' });
    }

    // Validate role
    const validRoles = ['admin', 'main_admin', 'support', 'customer', 'client'];
    if (!validRoles.includes(role.toLowerCase())) {
      return res.status(400).json({ message: 'Invalid role specified.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'A user with this email already exists.' });
    }

    console.log(`👑 Main admin ${requestingUser.name} creating new ${role} user: ${name}`);

    // Create new user object
    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password, // Will be hashed by the User model
      role: role.toLowerCase(),
      status: status || 'active',
      profile: {
        department: department || '',
        createdBy: requestingUser._id,
        createdAt: new Date()
      }
    };

    // Add admin permissions if provided
    if (adminPermissions && (role.toLowerCase() === 'admin' || role.toLowerCase() === 'support')) {
      userData.adminPermissions = adminPermissions;
    }

    const newUser = new User(userData);
    await newUser.save();

    // Remove password from response
    const userResponse = newUser.toObject();
    delete userResponse.password;

    console.log(`✅ User created successfully: ${newUser.name} (${newUser.email})`);

    res.status(201).json({ 
      message: 'User created successfully.', 
      user: userResponse 
    });

  } catch (err) {
    console.error('❌ Error creating user:', err);
    res.status(500).json({ message: 'Error creating user.', error: err.message });
  }
});

module.exports = router;
