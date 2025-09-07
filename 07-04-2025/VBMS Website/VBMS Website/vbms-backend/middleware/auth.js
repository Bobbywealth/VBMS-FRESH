const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme123';

// Enhanced authentication middleware with user validation - PostgreSQL version
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    if (!token) {
      return res.status(401).json({ 
        message: 'Access denied. No token provided.',
        error: 'NO_TOKEN'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch fresh user data from database - PostgreSQL version
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ 
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    if (user.status !== 'active') {
      return res.status(401).json({ 
        message: 'Account is inactive',
        error: 'ACCOUNT_INACTIVE'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired',
        error: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid token',
        error: 'INVALID_TOKEN'
      });
    }

    console.error('Authentication error:', error);
    return res.status(401).json({ 
      message: 'Authentication error',
      error: 'AUTH_ERROR'
    });
  }
};

// Role-based authorization middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED'
      });
    }

    const userRole = req.user.role.toLowerCase();
    const allowedRoles = Array.isArray(roles) ? roles.map(r => r.toLowerCase()) : [roles.toLowerCase()];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        message: 'Insufficient permissions',
        error: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: userRole
      });
    }

    next();
  };
};

// Admin permission middleware
const requireAdminPermission = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Authentication required',
      error: 'NOT_AUTHENTICATED'
    });
  }

  const userRole = req.user.role.toLowerCase();
  const adminRoles = ['main_admin', 'admin'];

  if (!adminRoles.includes(userRole)) {
    return res.status(403).json({ 
      message: 'Admin access required',
      error: 'ADMIN_REQUIRED',
      current: userRole
    });
  }

  next();
};

// Master admin permission middleware
const requireMasterAdminPermission = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Authentication required',
      error: 'NOT_AUTHENTICATED'
    });
  }

  if (req.user.role.toLowerCase() !== 'main_admin') {
    return res.status(403).json({ 
      message: 'Master admin access required',
      error: 'MASTER_ADMIN_REQUIRED',
      current: req.user.role
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  requireAdminPermission,
  requireMasterAdminPermission
};