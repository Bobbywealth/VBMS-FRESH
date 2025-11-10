const { body, param, query, validationResult } = require('express-validator');

class ValidationMiddleware {
  // Handle validation errors
  static handleValidationErrors() {
    return (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorDetails = errors.array().map(error => ({
          field: error.path,
          message: error.msg,
          value: error.value
        }));
        
        console.warn(`🔍 Validation failed for ${req.method} ${req.originalUrl}:`, errorDetails);
        
        return res.status(400).json({
          error: 'Validation failed',
          details: errorDetails
        });
      }
      next();
    };
  }

  // User registration validation
  static validateUserRegistration() {
    return [
      body('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),
      
      body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail()
        .isLength({ max: 100 })
        .withMessage('Email must not exceed 100 characters'),
      
      body('password')
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be between 8 and 128 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
      
      this.handleValidationErrors()
    ];
  }

  // User login validation
  static validateUserLogin() {
    return [
      body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
      
      body('password')
        .notEmpty()
        .withMessage('Password is required'),
      
      this.handleValidationErrors()
    ];
  }

  // Business profile validation
  static validateBusinessProfile() {
    return [
      body('businessName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Business name must be between 2 and 100 characters'),
      
      body('businessEmail')
        .optional()
        .trim()
        .isEmail()
        .withMessage('Please provide a valid business email')
        .normalizeEmail(),
      
      body('businessPhone')
        .optional()
        .trim()
        .matches(/^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/)
        .withMessage('Please provide a valid phone number'),
      
      body('businessAddress')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Business address must not exceed 200 characters'),
      
      body('businessDescription')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Business description must not exceed 500 characters'),
      
      this.handleValidationErrors()
    ];
  }

  // Onboarding validation
  static validateOnboarding() {
    return [
      body('ownerName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Owner name must be between 2 and 50 characters'),
      
      body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
      
      body('password')
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be between 8 and 128 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
      
      body('bizName')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Business name must be between 2 and 100 characters'),
      
      body('bizType')
        .trim()
        .isIn(['restaurant', 'retail', 'office', 'warehouse', 'other'])
        .withMessage('Please select a valid business type'),
      
      body('industry')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Industry must be between 2 and 50 characters'),
      
      body('teamSize')
        .isInt({ min: 1, max: 10000 })
        .withMessage('Team size must be a number between 1 and 10000'),
      
      body('hours')
        .trim()
        .isLength({ min: 5, max: 100 })
        .withMessage('Operating hours must be between 5 and 100 characters'),
      
      body('cameraCount')
        .isInt({ min: 0, max: 100 })
        .withMessage('Camera count must be a number between 0 and 100'),
      
      body('callSupport')
        .isIn(['yes', 'no'])
        .withMessage('Call support must be either "yes" or "no"'),
      
      body('features')
        .optional()
        .isArray()
        .withMessage('Features must be an array'),
      
      body('platforms')
        .optional()
        .isArray()
        .withMessage('Platforms must be an array'),
      
      body('notes')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Notes must not exceed 1000 characters'),
      
      this.handleValidationErrors()
    ];
  }

  // Task validation
  static validateTask() {
    return [
      body('title')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Task title must be between 1 and 100 characters'),
      
      body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Task description must not exceed 500 characters'),
      
      body('priority')
        .isIn(['low', 'medium', 'high', 'urgent'])
        .withMessage('Priority must be one of: low, medium, high, urgent'),
      
      body('status')
        .optional()
        .isIn(['pending', 'in_progress', 'completed', 'cancelled'])
        .withMessage('Status must be one of: pending, in_progress, completed, cancelled'),
      
      body('dueDate')
        .optional()
        .isISO8601()
        .withMessage('Due date must be a valid ISO 8601 date'),
      
      this.handleValidationErrors()
    ];
  }

  // Payment validation
  static validatePaymentIntent() {
    return [
      body('amount')
        .isInt({ min: 50, max: 999999 }) // $0.50 to $9,999.99
        .withMessage('Amount must be between 50 and 999999 cents'),
      
      body('packageName')
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Package name must be between 1 and 50 characters'),
      
      body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
      
      body('affiliateCode')
        .optional()
        .trim()
        .isAlphanumeric()
        .isLength({ max: 20 })
        .withMessage('Affiliate code must be alphanumeric and not exceed 20 characters'),
      
      this.handleValidationErrors()
    ];
  }

  // File upload validation
  static validateFileUpload() {
    return [
      body('category')
        .optional()
        .isIn(['logos', 'documents', 'images', 'videos', 'audio', 'general'])
        .withMessage('Category must be one of: logos, documents, images, videos, audio, general'),
      
      this.handleValidationErrors()
    ];
  }

  // Settings validation
  static validateSettings() {
    return [
      body('theme')
        .optional()
        .isIn(['light', 'dark'])
        .withMessage('Theme must be either "light" or "dark"'),
      
      body('language')
        .optional()
        .isIn(['en', 'es', 'fr', 'de', 'pt'])
        .withMessage('Language must be one of: en, es, fr, de, pt'),
      
      body('timezone')
        .optional()
        .isLength({ min: 3, max: 50 })
        .withMessage('Timezone must be between 3 and 50 characters'),
      
      body('emailNotifications')
        .optional()
        .isBoolean()
        .withMessage('Email notifications must be a boolean'),
      
      body('smsNotifications')
        .optional()
        .isBoolean()
        .withMessage('SMS notifications must be a boolean'),
      
      this.handleValidationErrors()
    ];
  }

  // Admin validation
  static validateAdminAccess() {
    return [
      (req, res, next) => {
        if (!req.user || req.user.role !== 'admin') {
          return res.status(403).json({ error: 'Admin access required' });
        }
        next();
      }
    ];
  }

  // ID parameter validation
  static validateMongoId(paramName = 'id') {
    return [
      param(paramName)
        .isMongoId()
        .withMessage(`${paramName} must be a valid MongoDB ID`),
      
      this.handleValidationErrors()
    ];
  }

  // Pagination validation
  static validatePagination() {
    return [
      query('page')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage('Page must be a number between 1 and 1000'),
      
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be a number between 1 and 100'),
      
      this.handleValidationErrors()
    ];
  }

  // Search query validation
  static validateSearch() {
    return [
      query('q')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Search query must be between 1 and 100 characters')
        .matches(/^[a-zA-Z0-9\s\-_.@]+$/)
        .withMessage('Search query contains invalid characters'),
      
      this.handleValidationErrors()
    ];
  }

  // Date range validation
  static validateDateRange() {
    return [
      query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO 8601 date'),
      
      query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO 8601 date')
        .custom((value, { req }) => {
          if (req.query.startDate && value) {
            const start = new Date(req.query.startDate);
            const end = new Date(value);
            if (end <= start) {
              throw new Error('End date must be after start date');
            }
          }
          return true;
        }),
      
      this.handleValidationErrors()
    ];
  }

  // Sanitize HTML content
  static sanitizeHTML() {
    return [
      body('*')
        .customSanitizer((value) => {
          if (typeof value === 'string') {
            // Remove potentially dangerous HTML tags and attributes
            return value
              .replace(/<script[^>]*>.*?<\/script>/gi, '')
              .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
              .replace(/<object[^>]*>.*?<\/object>/gi, '')
              .replace(/<embed[^>]*>/gi, '')
              .replace(/javascript:/gi, '')
              .replace(/on\w+\s*=/gi, '');
          }
          return value;
        })
    ];
  }
}

module.exports = ValidationMiddleware;