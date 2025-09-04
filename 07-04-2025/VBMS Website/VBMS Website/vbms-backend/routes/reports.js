const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// TEMPORARY STUB - All report routes disabled until PostgreSQL models are created

// Get all reports for user
router.get('/', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    message: 'Reports system temporarily disabled during database migration',
    data: {
      reports: [],
      totalCount: 0
    }
  });
});

// Generate new report
router.post('/generate', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    message: 'Reports system temporarily disabled during database migration'
  });
});

module.exports = router;