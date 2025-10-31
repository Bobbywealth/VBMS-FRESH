const express = require('express');
const router = express.Router();
const TimeLog = require('../models/TimeLog');
const EmployeePin = require('../models/EmployeePin');

/**
 * Create a new time log entry
 * POST /api/time-logs
 */
router.post('/', async (req, res) => {
  try {
    const {
      employee_name,
      action,
      timestamp_local,
      timestamp_utc
    } = req.body;

    // Validate required fields
    if (!employee_name || !action || !timestamp_local || !timestamp_utc) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: employee_name, action, timestamp_local, timestamp_utc'
      });
    }

    // Validate action type
    const validActions = ['clock_in', 'clock_out', 'break_start', 'break_end'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: `Invalid action type. Must be one of: ${validActions.join(', ')}`
      });
    }

    // Validate employee name
    if (employee_name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Employee name must be at least 2 characters long'
      });
    }

    const timeLog = await TimeLog.create({
      employee_name: employee_name.trim(),
      action,
      timestamp_local,
      timestamp_utc
    });

    res.status(201).json({
      success: true,
      message: 'Time log created successfully',
      data: timeLog
    });

  } catch (error) {
    console.error('Error creating time log:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

/**
 * Get time logs with optional filters
 * GET /api/time-logs
 */
router.get('/', async (req, res) => {
  try {
    const {
      employee_name,
      action,
      date_from,
      date_to,
      page = 1,
      limit = 50,
      sort_by = 'timestamp_local',
      sort_order = 'DESC'
    } = req.query;

    const filter = {};
    if (employee_name) filter.employee_name = employee_name;
    if (action) filter.action = action;
    if (date_from) filter.date_from = date_from;
    if (date_to) filter.date_to = date_to;

    const options = {
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      sort_by,
      sort_order: sort_order.toUpperCase()
    };

    const timeLogs = await TimeLog.find(filter, options);

    res.json({
      success: true,
      data: timeLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: timeLogs.length
      }
    });

  } catch (error) {
    console.error('Error fetching time logs:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

/**
 * Get time logs for a specific employee
 * GET /api/time-logs/:employeeName
 */
router.get('/:employeeName', async (req, res) => {
  try {
    const { employeeName } = req.params;
    const {
      page = 1,
      limit = 50,
      sort_by = 'timestamp_local',
      sort_order = 'DESC'
    } = req.query;

    if (!employeeName || employeeName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee name'
      });
    }

    const options = {
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      sort_by,
      sort_order: sort_order.toUpperCase()
    };

    const timeLogs = await TimeLog.findByEmployee(decodeURIComponent(employeeName), options);

    res.json({
      success: true,
      data: timeLogs,
      employee_name: employeeName,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: timeLogs.length
      }
    });

  } catch (error) {
    console.error('Error fetching employee time logs:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

/**
 * Get time log statistics
 * GET /api/time-logs/stats/overview
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const {
      employee_name,
      date_from,
      date_to
    } = req.query;

    const filter = {};
    if (employee_name) filter.employee_name = employee_name;
    if (date_from) filter.date_from = date_from;
    if (date_to) filter.date_to = date_to;

    const stats = await TimeLog.getStats(filter);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching time log stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

/**
 * Get work hours for an employee
 * GET /api/time-logs/hours/:employeeName
 */
router.get('/hours/:employeeName', async (req, res) => {
  try {
    const { employeeName } = req.params;
    const {
      date_from,
      date_to
    } = req.query;

    if (!employeeName || employeeName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee name'
      });
    }

    if (!date_from || !date_to) {
      return res.status(400).json({
        success: false,
        message: 'date_from and date_to are required'
      });
    }

    const workHours = await TimeLog.getWorkHours(
      decodeURIComponent(employeeName),
      date_from,
      date_to
    );

    res.json({
      success: true,
      data: workHours,
      employee_name: employeeName,
      date_range: {
        from: date_from,
        to: date_to
      }
    });

  } catch (error) {
    console.error('Error fetching work hours:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

/**
 * Get all unique employee names
 * GET /api/time-logs/employees/list
 */
router.get('/employees/list', async (req, res) => {
  try {
    const employeeNames = await TimeLog.getEmployeeNames();

    res.json({
      success: true,
      data: employeeNames
    });

  } catch (error) {
    console.error('Error fetching employee names:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

/**
 * Get recent activity (last 24 hours)
 * GET /api/time-logs/activity/recent
 */
router.get('/activity/recent', async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const recentActivity = await TimeLog.getRecentActivity(parseInt(limit));

    res.json({
      success: true,
      data: recentActivity
    });

  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

/**
 * Get a specific time log by ID
 * GET /api/time-logs/entry/:id
 */
router.get('/entry/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time log ID'
      });
    }

    const timeLog = await TimeLog.findById(parseInt(id));

    if (!timeLog) {
      return res.status(404).json({
        success: false,
        message: 'Time log not found'
      });
    }

    res.json({
      success: true,
      data: timeLog
    });

  } catch (error) {
    console.error('Error fetching time log:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

/**
 * Verify employee PIN
 * POST /api/time-logs/verify-pin
 */
router.post('/verify-pin', async (req, res) => {
  try {
    const { employee_name, pin } = req.body;

    if (!employee_name || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Employee name and PIN are required'
      });
    }

    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message: 'PIN must be exactly 4 digits'
      });
    }

    const isValid = await EmployeePin.verifyPin(employee_name, pin);

    if (isValid) {
      res.json({
        success: true,
        message: 'PIN verified successfully',
        employee_name
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid PIN'
      });
    }

  } catch (error) {
    console.error('Error verifying PIN:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

/**
 * Set employee PIN (admin only)
 * POST /api/time-logs/set-pin
 */
router.post('/set-pin', async (req, res) => {
  try {
    const { employee_name, pin } = req.body;

    if (!employee_name || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Employee name and PIN are required'
      });
    }

    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message: 'PIN must be exactly 4 digits'
      });
    }

    const employeePin = await EmployeePin.setPin(employee_name, pin);

    res.json({
      success: true,
      message: 'PIN set successfully',
      data: {
        employee_name: employeePin.employee_name,
        created_at: employeePin.created_at,
        updated_at: employeePin.updated_at
      }
    });

  } catch (error) {
    console.error('Error setting PIN:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

/**
 * Delete a time log entry
 * DELETE /api/time-logs/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time log ID'
      });
    }

    const deleted = await TimeLog.delete(parseInt(id));

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Time log not found'
      });
    }

    res.json({
      success: true,
      message: 'Time log deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting time log:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

module.exports = router;
