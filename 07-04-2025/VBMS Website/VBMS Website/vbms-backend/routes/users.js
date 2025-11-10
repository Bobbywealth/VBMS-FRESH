const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

// Get ALL users (requires authentication)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const users = await User.findAll({ isActive: true });
    // Remove passwords from response
    const safeUsers = users.map(user => user.toJSON());
    res.json(safeUsers);
  } catch (err) {
    console.error('Error fetching users:', err);
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
      position,
      phone,
      address
    } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    // Create new user
    const newUser = await User.create({
      firstName: name.split(' ')[0] || name,
      lastName: name.split(' ').slice(1).join(' ') || '',
      email,
      password,
      role: role || 'customer',
      phone,
      isActive: true,
      emailVerified: false
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: newUser.toJSON()
    });

  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create user', 
      error: err.message 
    });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.toJSON());
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ message: 'Failed to fetch user', error: err.message });
  }
});

// Update user
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check permissions - users can only update themselves unless they're admin
    const requestingUser = await User.findById(req.user.id);
    if (req.user.id !== parseInt(req.params.id) && 
        !['admin', 'main_admin'].includes(requestingUser?.role)) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    const updateData = {};
    const { firstName, lastName, email, phone, role } = req.body;

    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    
    // Only admins can change roles
    if (role && ['admin', 'main_admin'].includes(requestingUser?.role)) {
      updateData.role = role;
    }

    await user.update(updateData);

    res.json({
      success: true,
      message: 'User updated successfully',
      user: user.toJSON()
    });

  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ message: 'Failed to update user', error: err.message });
  }
});

// Delete user (soft delete)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const requestingUser = await User.findById(req.user.id);
    if (!['admin', 'main_admin'].includes(requestingUser?.role)) {
      return res.status(403).json({ message: 'Only administrators can delete users' });
    }

    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.delete(); // Soft delete

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ message: 'Failed to delete user', error: err.message });
  }
});

// Get user statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const requestingUser = await User.findById(req.user.id);
    if (!['admin', 'main_admin'].includes(requestingUser?.role)) {
      return res.status(403).json({ message: 'Only administrators can view user statistics' });
    }

    const totalUsers = await User.getCount();
    const activeUsers = await User.getCount({ isActive: true });
    const adminUsers = await User.getCount({ role: 'admin' });
    const customerUsers = await User.getCount({ role: 'customer' });

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        adminUsers,
        customerUsers,
        mainAdminUsers: await User.getCount({ role: 'main_admin' })
      }
    });

  } catch (err) {
    console.error('Error fetching user statistics:', err);
    res.status(500).json({ message: 'Failed to fetch user statistics', error: err.message });
  }
});

module.exports = router;