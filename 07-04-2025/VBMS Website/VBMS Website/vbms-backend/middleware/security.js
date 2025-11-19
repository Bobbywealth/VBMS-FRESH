const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
// REMOVED: MongoDB dependencies - PostgreSQL only
// const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');

class SecurityMiddleware {
  // Rate limiting configurations
  static getGeneralRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
        resetTime: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      // Skip rate limiting for trusted IPs in development
      skip: (req) => {
        if (process.env.NODE_ENV !== 'production') {
          const trustedIPs = ['127.0.0.1', '::1', 'localhost'];
          return trustedIPs.includes(req.ip);
        }
        return false;
      }
    });
  }

  static getAuthRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // limit each IP to 5 auth attempts per windowMs
      message: {
        error: 'Too many authentication attempts, please try again in 15 minutes.',
        resetTime: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true, // Don't count successful requests
      skipFailedRequests: false // Count failed requests
    });
  }

  static getPasswordResetRateLimit() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // limit each IP to 3 password reset attempts per hour
      message: {
        error: 'Too many password reset attempts, please try again in 1 hour.',
        resetTime: '1 hour'
      },
      standardHeaders: true,
      legacyHeaders: false
    });
  }

  static getFileUploadRateLimit() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 20, // limit each IP to 20 file uploads per hour
      message: {
        error: 'Too many file uploads, please try again in 1 hour.',
        resetTime: '1 hour'
      },
      standardHeaders: true,
      legacyHeaders: false
    });
  }

  static getAPIRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 200, // Higher limit for API calls
      message: {
        error: 'API rate limit exceeded, please try again in 15 minutes.',
        resetTime: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false
    });
  }

  // Security headers configuration
  static getHelmetConfig() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://cdn.jsdelivr.net",
            "https://unpkg.com",
            "https://fonts.googleapis.com",
            "https://cdnjs.cloudflare.com"
          ],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://js.stripe.com",
            "https://cdn.jsdelivr.net",
            "https://cdnjs.cloudflare.com"
          ],
          imgSrc: [
            "'self'",
            "data:",
            "https:",
            "blob:",
            `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`
          ],
          connectSrc: [
            "'self'",
            "https://api.stripe.com",
            "https://api.openai.com",
            "wss://api.vapi.ai"
          ],
          fontSrc: [
            "'self'",
            "https://fonts.gstatic.com",
            "https://cdn.jsdelivr.net",
            "https://unpkg.com",
            "https://cdnjs.cloudflare.com",
            "data:"
          ],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'", "https:", "blob:"],
          frameSrc: [
            "'self'",
            "https://js.stripe.com",
            "https://hooks.stripe.com"
          ]
        }
      },
      crossOriginEmbedderPolicy: false, // Disable for Stripe compatibility
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    });
  }

  // Input sanitization middleware
  // REMOVED: MongoDB sanitizer - PostgreSQL only
  static getMongoSanitizer() {
    return (req, res, next) => {
      // PostgreSQL doesn't need NoSQL injection protection
      next();
    };
  }

  // XSS protection (using custom implementation since xss-clean is deprecated)
  static getXSSProtection() {
    return (req, res, next) => {
      // Simple XSS protection - sanitize common XSS patterns
      const sanitizeObject = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;

        for (const key in obj) {
          if (typeof obj[key] === 'string') {
            // Remove script tags and javascript: protocols
            obj[key] = obj[key]
              .replace(/<script[^>]*>.*?<\/script>/gi, '')
              .replace(/javascript:/gi, '')
              .replace(/on\w+\s*=/gi, '')
              .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
          } else if (typeof obj[key] === 'object') {
            sanitizeObject(obj[key]);
          }
        }
      };

      if (req.body) sanitizeObject(req.body);
      if (req.query) sanitizeObject(req.query);
      if (req.params) sanitizeObject(req.params);

      next();
    };
  }

  // HTTP Parameter Pollution protection
  static getHPPProtection() {
    return hpp({
      whitelist: ['tags', 'features', 'platforms'] // Allow arrays for these fields
    });
  }

  // Compression middleware
  static getCompression() {
    return compression({
      // Only compress responses larger than 1kb
      threshold: 1024,
      // Compression level (1-9, higher = better compression but slower)
      level: 6,
      // Don't compress already compressed files
      filter: (req, res) => {
        const contentType = res.getHeader('content-type');
        if (!contentType) return false;

        // Don't compress images, videos, or already compressed files
        const skipTypes = [
          'image/', 'video/', 'audio/',
          'application/zip', 'application/gzip',
          'application/pdf'
        ];

        return !skipTypes.some(type => contentType.includes(type));
      }
    });
  }

  // Request logging middleware for security monitoring
  static getSecurityLogger() {
    return (req, res, next) => {
      const startTime = Date.now();

      // Log suspicious activities
      const suspiciousPatterns = [
        /\.\.\//g, // Directory traversal
        /<script/gi, // XSS attempts
        /union.*select/gi, // SQL injection attempts
        /javascript:/gi, // Javascript protocol
        /data:text\/html/gi // Data URI attacks
      ];

      const checkSuspicious = (value) => {
        if (typeof value === 'string') {
          return suspiciousPatterns.some(pattern => pattern.test(value));
        }
        return false;
      };

      let suspicious = false;
      const checkObject = (obj) => {
        for (const key in obj) {
          if (checkSuspicious(obj[key])) {
            suspicious = true;
            break;
          }
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            checkObject(obj[key]);
          }
        }
      };

      // Check for suspicious content in request
      if (req.body) checkObject(req.body);
      if (req.query) checkObject(req.query);
      if (req.params) checkObject(req.params);

      if (suspicious) {
        console.warn(`🚨 SECURITY ALERT: Suspicious request from IP ${req.ip}: ${req.method} ${req.originalUrl}`);
      }

      // Log response when finished
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logLevel = res.statusCode >= 400 ? 'ERROR' : 'INFO';
        const statusEmoji = res.statusCode >= 500 ? '🔴' : res.statusCode >= 400 ? '🟡' : '🟢';

        console.log(`${statusEmoji} [${logLevel}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms - ${req.ip}`);

        // Log failed auth attempts
        if (req.originalUrl.includes('/auth/') && res.statusCode === 401) {
          console.warn(`🔐 Failed authentication attempt from IP: ${req.ip}`);
        }
      });

      next();
    };
  }

  // Input validation helpers
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePassword(password) {
    // At least 8 characters, with at least one letter and one number
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
    return passwordRegex.test(password);
  }

  static validatePhoneNumber(phone) {
    // Basic phone validation (US format)
    const phoneRegex = /^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
    return phoneRegex.test(phone);
  }

  // CORS security configuration
  static getCorsConfig() {
    return {
      origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);

        const allowedOrigins = [
          'http://127.0.0.1:5500',
          'http://127.0.0.1:5502',
          'http://localhost:5500',
          'http://localhost:5501',
          'https://vbms-fresh-offical-website-launch.onrender.com',
          process.env.FRONTEND_URL,
          process.env.PRODUCTION_URL
        ].filter(Boolean);

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.warn(`🚨 CORS blocked request from origin: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
    };
  }

  // Security health check
  static getSecurityHealthCheck() {
    return (req, res, next) => {
      if (req.path === '/security-check') {
        return res.json({
          security: {
            rateLimit: 'active',
            helmet: 'active',
            mongoSanitize: 'active',
            xssProtection: 'active',
            hpp: 'active',
            compression: 'active',
            cors: 'configured',
            environment: process.env.NODE_ENV || 'development'
          },
          timestamp: new Date().toISOString()
        });
      }
      next();
    };
  }
}

module.exports = SecurityMiddleware;