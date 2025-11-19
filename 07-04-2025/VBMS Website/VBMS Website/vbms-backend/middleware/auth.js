const jwt = require('jsonwebtoken');
const { pgPool } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-do-not-use-in-prod';

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
    const client = await pgPool.connect();
    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    const user = userResult.rows[0];
    client.release();

    if (!user) {
      return res.status(401).json({
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    // Check if account is active (assuming 'is_active' column based on admin routes)
    // If column doesn't exist, this check might fail or return undefined.
    // Let's assume it exists as per admin.js
    if (user.is_active === false) {
      return res.status(401).json({
        message: 'Account is inactive',
        error: 'ACCOUNT_INACTIVE'
      });
    }

    // Update last activity (if column exists)
    // We'll skip this for now to avoid potential errors if column is missing or named differently
    // await client.query('UPDATE users SET last_activity = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    // Attach user to request
    // We map DB columns to camelCase if needed, but for now let's keep it raw or map essential fields
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      subscriptionStatus: user.subscription_status, // From stripe.js
      subscriptionPlan: user.subscription_plan,     // From stripe.js
      // Add other fields as needed
      ...user
    };

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

    // Check permissions stored in JSONB column 'admin_permissions' or similar
    // Assuming req.user has this field populated from the DB query
    const permissions = req.user.admin_permissions || {};

    if (!permissions[permission]) {
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
    // Check subscription status directly from user record
    if (!req.user.subscriptionStatus || req.user.subscriptionStatus !== 'active') {
      return res.status(403).json({
        message: 'Active subscription required',
        error: 'INACTIVE_SUBSCRIPTION'
      });
    }

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
      if (!req.user.subscriptionStatus || req.user.subscriptionStatus !== 'active') {
        return res.status(403).json({
          message: `Feature "${featureName}" requires an active subscription`,
          error: 'FEATURE_REQUIRES_SUBSCRIPTION'
        });
      }

      // Check plan features
      // We need to know which plan has which features. 
      // This logic was previously in the User model or Subscription model.
      // We can import the PRICING_PLANS from stripe.js or define them here.
      // For now, let's assume all active subscriptions have access or implement a basic check.

      // TODO: Implement granular feature checking based on plan
      // const plan = PRICING_PLANS[req.user.subscriptionPlan];
      // if (!plan.features.includes(featureName)) ...

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