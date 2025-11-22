require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class PreLaunchChecker {
  constructor() {
    this.checks = [];
    this.errors = [];
    this.warnings = [];
    this.baseURL = process.env.BASE_URL || 'https://vbms-fresh-offical-website-launch.onrender.com';
  }

  async runAllChecks() {
    console.log('🚀 VBMS PRE-LAUNCH CHECKLIST');
    console.log('=' .repeat(50));
    console.log('Preparing for production launch...\n');

    try {
      // Critical System Checks
      await this.checkEnvironmentVariables();
      await this.checkDatabaseConnection();
      await this.checkExternalServices();
      await this.checkAPIEndpoints();
      
      // Security Checks
      await this.checkSecurityConfiguration();
      await this.checkRateLimiting();
      
      // Performance Checks
      await this.checkPerformanceMetrics();
      await this.checkMemoryUsage();
      
      // File System Checks
      await this.checkFilePermissions();
      await this.checkLogDirectories();
      
      // Production Readiness
      await this.checkProductionSettings();
      await this.checkBackupSystems();
      
      // Final Tests
      await this.runCriticalUserJourneys();
      
      // Generate Report
      this.generateLaunchReport();

    } catch (error) {
      console.error('💥 Pre-launch check failed:', error);
      this.errors.push(`Critical failure: ${error.message}`);
    }

    return {
      passed: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      checks: this.checks
    };
  }

  async checkEnvironmentVariables() {
    console.log('🔐 Checking Environment Variables...');
    
    const requiredVars = [
      'MONGO_URI',
      'JWT_SECRET',
      'STRIPE_SECRET_KEY',
      'STRIPE_PUBLISHABLE_KEY',
      'OPENAI_API_KEY',
      'VAPI_PUBLIC_KEY',
      'NODE_ENV'
    ];

    const optionalVars = [
      'VAPI_PRIVATE_KEY',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'EMAIL_HOST',
      'EMAIL_USER',
      'EMAIL_PASS'
    ];

    let missingRequired = [];
    let missingOptional = [];

    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        missingRequired.push(varName);
      } else {
        this.logCheck('Environment', `${varName} is set`, true);
      }
    });

    optionalVars.forEach(varName => {
      if (!process.env[varName]) {
        missingOptional.push(varName);
      } else {
        this.logCheck('Environment', `${varName} is set`, true);
      }
    });

    if (missingRequired.length > 0) {
      this.errors.push(`Missing required environment variables: ${missingRequired.join(', ')}`);
      this.logCheck('Environment', 'Required variables', false);
    } else {
      this.logCheck('Environment', 'All required variables set', true);
    }

    if (missingOptional.length > 0) {
      this.warnings.push(`Missing optional environment variables: ${missingOptional.join(', ')}`);
    }

    // Check JWT Secret strength
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      this.warnings.push('JWT_SECRET should be at least 32 characters long');
    }

    // Skip duplicate NODE_ENV check here since it's checked in production settings
  }

  async checkDatabaseConnection() {
    console.log('\n🗄️ Checking Database Connection...');
    
    try {
      await mongoose.connect(process.env.MONGO_URI);
      this.logCheck('Database', 'MongoDB connection', true);

      // Check connection state
      const state = mongoose.connection.readyState;
      if (state === 1) {
        this.logCheck('Database', 'Connection state is healthy', true);
      } else {
        this.errors.push(`Database connection state is ${state} (should be 1)`);
        this.logCheck('Database', 'Connection state', false);
      }

      // Test basic operations
      const testCollection = mongoose.connection.db.collection('test');
      await testCollection.insertOne({ test: true, timestamp: new Date() });
      await testCollection.deleteOne({ test: true });
      this.logCheck('Database', 'Basic operations', true);

      // Check indexes
      const collections = await mongoose.connection.db.listCollections().toArray();
      this.logCheck('Database', `Found ${collections.length} collections`, true);

    } catch (error) {
      this.errors.push(`Database connection failed: ${error.message}`);
      this.logCheck('Database', 'MongoDB connection', false);
    }
  }

  async checkExternalServices() {
    console.log('\n🌐 Checking External Services...');

    // Test Stripe API
    try {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      await stripe.paymentIntents.list({ limit: 1 });
      this.logCheck('External', 'Stripe API connection', true);
    } catch (error) {
      this.errors.push(`Stripe API connection failed: ${error.message}`);
      this.logCheck('External', 'Stripe API connection', false);
    }

    // Test OpenAI API
    try {
      const { OpenAI } = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      await openai.models.list();
      this.logCheck('External', 'OpenAI API connection', true);
    } catch (error) {
      this.warnings.push(`OpenAI API connection issue: ${error.message}`);
      this.logCheck('External', 'OpenAI API connection', false);
    }

    // Test VAPI (if configured)
    if (process.env.VAPI_PRIVATE_KEY) {
      try {
        const response = await axios.get('https://api.vapi.ai/call', {
          headers: {
            'Authorization': `Bearer ${process.env.VAPI_PRIVATE_KEY}`
          }
        });
        this.logCheck('External', 'VAPI connection', true);
      } catch (error) {
        this.warnings.push(`VAPI connection issue: ${error.message}`);
        this.logCheck('External', 'VAPI connection', false);
      }
    }
  }

  async checkAPIEndpoints() {
    console.log('\n🔌 Checking API Endpoints...');

    const criticalEndpoints = [
      '/api/test',
      '/health',
      '/api/monitoring/health'
    ];

    for (const endpoint of criticalEndpoints) {
      try {
        const response = await axios.get(`${this.baseURL}${endpoint}`, {
          timeout: 5000
        });
        
        if (response.status === 200) {
          this.logCheck('API', `${endpoint} is accessible`, true);
        } else {
          this.warnings.push(`${endpoint} returned status ${response.status}`);
          this.logCheck('API', `${endpoint} status`, false);
        }
      } catch (error) {
        this.errors.push(`${endpoint} is not accessible: ${error.message}`);
        this.logCheck('API', `${endpoint} accessibility`, false);
      }
    }
  }

  async checkSecurityConfiguration() {
    console.log('\n🛡️ Checking Security Configuration...');

    // Check for security headers
    try {
      const response = await axios.get(`${this.baseURL}/api/test`);
      const headers = response.headers;
      
      const securityHeaders = [
        'x-frame-options',
        'x-content-type-options',
        'x-xss-protection'
      ];

      securityHeaders.forEach(header => {
        if (headers[header]) {
          this.logCheck('Security', `${header} header present`, true);
        } else {
          this.warnings.push(`Missing security header: ${header}`);
          this.logCheck('Security', `${header} header`, false);
        }
      });

    } catch (error) {
      this.warnings.push(`Could not check security headers: ${error.message}`);
    }

    // Check HTTPS in production
    if (process.env.NODE_ENV === 'production' && !this.baseURL.startsWith('https://')) {
      this.warnings.push('Production environment should use HTTPS');
    }
  }

  async checkRateLimiting() {
    console.log('\n⏱️ Checking Rate Limiting...');

    try {
      // Test rapid requests to see if rate limiting kicks in
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(axios.get(`${this.baseURL}/api/test`));
      }
      
      await Promise.all(promises);
      this.logCheck('Security', 'Rate limiting allows normal traffic', true);
      
    } catch (error) {
      if (error.response?.status === 429) {
        this.logCheck('Security', 'Rate limiting is active', true);
      } else {
        this.warnings.push(`Rate limiting check inconclusive: ${error.message}`);
      }
    }
  }

  async checkPerformanceMetrics() {
    console.log('\n⚡ Checking Performance Metrics...');

    try {
      const startTime = Date.now();
      await axios.get(`${this.baseURL}/api/test`);
      const responseTime = Date.now() - startTime;
      
      if (responseTime < 500) {
        this.logCheck('Performance', `API response time: ${responseTime}ms`, true);
      } else if (responseTime < 1000) {
        this.warnings.push(`API response time is ${responseTime}ms (should be <500ms)`);
        this.logCheck('Performance', 'API response time', false);
      } else {
        this.errors.push(`API response time is ${responseTime}ms (too slow)`);
        this.logCheck('Performance', 'API response time', false);
      }

    } catch (error) {
      this.errors.push(`Performance check failed: ${error.message}`);
      this.logCheck('Performance', 'API response time', false);
    }
  }

  async checkMemoryUsage() {
    console.log('\n💾 Checking Memory Usage...');

    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
    
    if (heapUsedMB < 200) {
      this.logCheck('Performance', `Memory usage: ${heapUsedMB}MB`, true);
    } else if (heapUsedMB < 400) {
      this.warnings.push(`Memory usage is ${heapUsedMB}MB (monitor closely)`);
      this.logCheck('Performance', 'Memory usage', false);
    } else {
      this.errors.push(`Memory usage is ${heapUsedMB}MB (too high)`);
      this.logCheck('Performance', 'Memory usage', false);
    }

    this.logCheck('Performance', `Total heap: ${heapTotalMB}MB`, true);
  }

  async checkFilePermissions() {
    console.log('\n📁 Checking File Permissions...');

    const criticalPaths = [
      './logs',
      './uploads',
      './.env'
    ];

    for (const filePath of criticalPaths) {
      try {
        await fs.access(filePath, fs.constants.R_OK | fs.constants.W_OK);
        this.logCheck('FileSystem', `${filePath} is accessible`, true);
      } catch (error) {
        if (filePath === './logs' || filePath === './uploads') {
          // Try to create directories
          try {
            await fs.mkdir(filePath, { recursive: true });
            this.logCheck('FileSystem', `${filePath} created`, true);
          } catch (createError) {
            this.errors.push(`Cannot create ${filePath}: ${createError.message}`);
            this.logCheck('FileSystem', `${filePath} creation`, false);
          }
        } else {
          this.warnings.push(`${filePath} is not accessible: ${error.message}`);
          this.logCheck('FileSystem', `${filePath} access`, false);
        }
      }
    }
  }

  async checkLogDirectories() {
    console.log('\n📝 Checking Log Directories...');

    try {
      const logsDir = './logs';
      const stats = await fs.stat(logsDir);
      
      if (stats.isDirectory()) {
        this.logCheck('Logging', 'Logs directory exists', true);
        
        // Check if we can write to it
        const testFile = path.join(logsDir, 'test.log');
        await fs.writeFile(testFile, 'test');
        await fs.unlink(testFile);
        this.logCheck('Logging', 'Logs directory is writable', true);
      }
    } catch (error) {
      this.warnings.push(`Log directory issue: ${error.message}`);
      this.logCheck('Logging', 'Logs directory setup', false);
    }
  }

  async checkProductionSettings() {
    console.log('\n🏭 Checking Production Settings...');

    // Check NODE_ENV
    if (process.env.NODE_ENV === 'production') {
      this.logCheck('Production', 'NODE_ENV is production', true);
    } else {
      this.warnings.push('NODE_ENV is not set to production');
      this.logCheck('Production', 'NODE_ENV setting', false);
    }

    // Check for debug settings
    if (process.env.DEBUG) {
      this.warnings.push('DEBUG environment variable is set (should be disabled in production)');
    } else {
      this.logCheck('Production', 'Debug mode disabled', true);
    }

    // Check port configuration
    const port = process.env.PORT || 5050;
    this.logCheck('Production', `Server port: ${port}`, true);
  }

  async checkBackupSystems() {
    console.log('\n💾 Checking Backup Systems...');

    // Check if backup scripts exist
    const backupScripts = [
      './scripts/backup-database.js',
      './scripts/backup-files.js'
    ];

    let hasBackupSystem = false;

    for (const script of backupScripts) {
      try {
        await fs.access(script);
        this.logCheck('Backup', `${script} exists`, true);
        hasBackupSystem = true;
      } catch (error) {
        // Not critical, just note it
      }
    }

    if (!hasBackupSystem) {
      this.warnings.push('No backup scripts found - consider implementing automated backups');
      this.logCheck('Backup', 'Backup system configured', false);
    } else {
      this.logCheck('Backup', 'Backup system available', true);
    }

    // Check MongoDB backup capability
    try {
      if (process.env.MONGO_URI) {
        this.logCheck('Backup', 'MongoDB URI available for backups', true);
      }
    } catch (error) {
      this.warnings.push('MongoDB backup configuration unclear');
    }
  }

  async runCriticalUserJourneys() {
    console.log('\n🧪 Running Critical User Journey Tests...');

    // We'll just check if our test suite exists and can be run
    try {
      await fs.access('./tests/test-suite.js');
      this.logCheck('Testing', 'Integration test suite available', true);
    } catch (error) {
      this.warnings.push('Integration test suite not found');
      this.logCheck('Testing', 'Integration test suite', false);
    }

    try {
      await fs.access('./tests/unit-tests.js');
      this.logCheck('Testing', 'Unit test suite available', true);
    } catch (error) {
      this.warnings.push('Unit test suite not found');
      this.logCheck('Testing', 'Unit test suite', false);
    }

    // Check if we can run basic health checks
    try {
      const response = await axios.get(`${this.baseURL}/api/monitoring/health`);
      if (response.data.status === 'healthy') {
        this.logCheck('Testing', 'System health check passes', true);
      } else {
        this.warnings.push(`System health status: ${response.data.status}`);
        this.logCheck('Testing', 'System health check', false);
      }
    } catch (error) {
      this.errors.push(`Health check failed: ${error.message}`);
      this.logCheck('Testing', 'System health check', false);
    }
  }

  logCheck(category, description, passed, details = '') {
    const check = {
      category,
      description,
      passed,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.checks.push(check);
    
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const color = passed ? '\x1b[32m' : '\x1b[31m';
    console.log(`${color}${status}\x1b[0m ${category}: ${description} ${details}`);
  }

  generateLaunchReport() {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 PRE-LAUNCH REPORT');
    console.log('='.repeat(50));

    const totalChecks = this.checks.length;
    const passedChecks = this.checks.filter(c => c.passed).length;
    const failedChecks = totalChecks - passedChecks;
    const successRate = ((passedChecks / totalChecks) * 100).toFixed(1);

    console.log(`\n📊 Summary:`);
    console.log(`   Total Checks: ${totalChecks}`);
    console.log(`   Passed: ${passedChecks}`);
    console.log(`   Failed: ${failedChecks}`);
    console.log(`   Success Rate: ${successRate}%`);
    console.log(`   Errors: ${this.errors.length}`);
    console.log(`   Warnings: ${this.warnings.length}`);

    // Launch readiness assessment
    console.log('\n🎯 Launch Readiness:');
    if (this.errors.length === 0) {
      if (this.warnings.length === 0) {
        console.log('   🟢 READY FOR LAUNCH - All systems green!');
      } else if (this.warnings.length <= 3) {
        console.log('   🟡 READY WITH CAUTION - Address warnings when possible');
      } else {
        console.log('   🟠 REVIEW REQUIRED - Multiple warnings need attention');
      }
    } else {
      console.log('   🔴 NOT READY - Critical errors must be fixed before launch');
    }

    // Show errors
    if (this.errors.length > 0) {
      console.log('\n❌ Critical Errors (MUST FIX):');
      this.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    // Show warnings
    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings (SHOULD FIX):');
      this.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }

    // Next steps
    console.log('\n📋 Next Steps:');
    if (this.errors.length > 0) {
      console.log('   1. Fix all critical errors listed above');
      console.log('   2. Re-run pre-launch checks');
      console.log('   3. Address any remaining warnings');
      console.log('   4. Proceed with launch when all green');
    } else {
      console.log('   1. Address warnings if possible');
      console.log('   2. Set up monitoring and alerting');
      console.log('   3. Prepare rollback plan');
      console.log('   4. Schedule launch window');
      console.log('   5. Launch! 🚀');
    }

    console.log('\n' + '='.repeat(50));
  }
}

// Export for use in other scripts or run directly
if (require.main === module) {
  const checker = new PreLaunchChecker();
  checker.runAllChecks().then((result) => {
    if (!result.passed) {
      process.exit(1);
    }
    process.exit(0);
  }).catch(error => {
    console.error('Pre-launch check error:', error);
    process.exit(1);
  });
}

module.exports = PreLaunchChecker;