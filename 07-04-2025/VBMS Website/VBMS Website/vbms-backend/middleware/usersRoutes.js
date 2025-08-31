const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Adjust path if needed
const auth = require('../middleware/auth'); // If you want the route protected

// Get ALL users (for Team page)
router.get('/', auth, async (req, res) => {
  try {
    const users = await User.find();
    res.json(users); // Send as JSON!
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users", error: err.message });
  }
});

module.exports = router;
