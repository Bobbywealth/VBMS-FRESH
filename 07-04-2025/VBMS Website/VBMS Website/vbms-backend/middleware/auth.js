const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme123';

// Enhanced authentication middleware with user validation
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
    
    // Fetch fresh user data from database
    const user = await User.findById(decoded.id).select('-password');
    
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

    // Update last activity
    user.lastActivity = new Date();
    await user.save();

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

    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      message: 'Authentication error',
      error: 'AUTH_ERROR'
    });
  }
};

// Role-based authorization middleware
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userRole = req.user.role;
    const hasPermission = Array.isArray(allowedRoles) 
      ? allowedRoles.includes(userRole)
      : userRole === allowedRoles;

    if (!hasPermission) {
      return res.status(403).json({ 
        message: 'Insufficient permissions',
        required: allowedRoles,
        current: userRole
      });
    }

    next();
  };
};

// Admin permission check
const requireAdminPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.role === 'main_admin') {
      return next(); // Main admin has all permissions
    }

    if (!req.user.adminPermissions || !req.user.adminPermissions[permission]) {
      return res.status(403).json({ 
        message: `Permission denied: ${permission}`,
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

// Subscription check middleware
const requireActiveSubscription = async (req, res, next) => {
  try {
    if (!req.user.subscription) {
      return res.status(403).json({ 
        message: 'Active subscription required',
        error: 'NO_SUBSCRIPTION'
      });
    }

    const user = await User.findById(req.user.id).populate('subscription');
    
    if (!user.subscription || user.subscription.status !== 'active') {
      return res.status(403).json({ 
        message: 'Active subscription required',
        error: 'INACTIVE_SUBSCRIPTION'
      });
    }

    req.subscription = user.subscription;
    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({ message: 'Subscription verification error' });
  }
};

// Feature access check
const requireFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      if (!req.user.subscription) {
        return res.status(403).json({ 
          message: `Feature "${featureName}" requires an active subscription`,
          error: 'FEATURE_REQUIRES_SUBSCRIPTION'
        });
      }

      const user = await User.findById(req.user.id).populate('subscription');
      
      if (!user.subscription.features[featureName]) {
        return res.status(403).json({ 
          message: `Feature "${featureName}" not available in your plan`,
          error: 'FEATURE_NOT_AVAILABLE',
          availableFeatures: Object.keys(user.subscription.features).filter(f => user.subscription.features[f])
        });
      }

      next();
    } catch (error) {
      console.error('Feature check error:', error);
      res.status(500).json({ message: 'Feature verification error' });
    }
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  requireAdminPermission,
  requireActiveSubscription,
  requireFeature,
  // Legacy export for backward compatibility
  auth: authenticateToken
};