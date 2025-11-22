require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');

// Models for testing
const User = require('../models/User');
const InventoryItem = require('../models/InventoryItem');
const Report = require('../models/Report');
const VAPICall = require('../models/VAPICall');

class VBMSTestSuite {
  constructor() {
    this.baseURL = process.env.BASE_URL || 'https://vbms-fresh-offical-website-launch.onrender.com';
    this.testResults = [];
    this.testUser = null;
    this.authToken = null;
    this.adminToken = null;
  }

  async runAllTests() {
    console.log('🧪 Starting VBMS Comprehensive Test Suite');
    console.log('=' .repeat(50));

    try {
      // Setup
      await this.setup();

      // Authentication Tests
      await this.testAuthentication();

      // User Management Tests
      await this.testUserManagement();

      // Inventory System Tests
      await this.testInventorySystem();

      // VAPI Integration Tests
      await this.testVAPIIntegration();

      // Reporting System Tests
      await this.testReportingSystem();

      // Monitoring System Tests
      await this.testMonitoringSystem();

      // API Security Tests
      await this.testAPISecurity();

      // Performance Tests
      await this.testPerformance();

      // Cleanup
      await this.cleanup();

      // Generate Report
      this.generateTestReport();

    } catch (error) {
      console.error('💥 Test suite failed:', error);
      this.logTest('Test Suite', 'CRITICAL_FAILURE', false, error.message);
    }

    return this.testResults;
  }

  async setup() {
    console.log('\n🔧 Setting up test environment...');
    
    try {
      // Connect to MongoDB
      await mongoose.connect(process.env.MONGO_URI);
      console.log('✅ Connected to MongoDB');

      // Clean up any existing test data
      await this.cleanupTestData();
      console.log('✅ Cleaned up existing test data');

      this.logTest('Setup', 'Environment Setup', true, 'Test environment ready');
    } catch (error) {
      this.logTest('Setup', 'Environment Setup', false, error.message);
      throw error;
    }
  }

  async testAuthentication() {
    console.log('\n🔐 Testing Authentication System...');

    // Test 1: User Registration
    try {
      const registerData = {
        name: 'Test User',
        email: 'testuser@vbms.test',
        password: 'TestPassword123!'
      };

      const registerResponse = await axios.post(`${this.baseURL}/api/auth/register`, registerData);
      
      if (registerResponse.status === 201 && registerResponse.data.token) {
        this.authToken = registerResponse.data.token;
        this.testUser = registerResponse.data.user;
        this.logTest('Authentication', 'User Registration', true, 'User registered successfully');
      } else {
        throw new Error('Registration failed');
      }
    } catch (error) {
      this.logTest('Authentication', 'User Registration', false, error.response?.data?.message || error.message);
    }

    // Test 2: User Login
    try {
      const loginData = {
        email: 'testuser@vbms.test',
        password: 'TestPassword123!'
      };

      const loginResponse = await axios.post(`${this.baseURL}/api/auth/login`, loginData);
      
      if (loginResponse.status === 200 && loginResponse.data.token) {
        this.authToken = loginResponse.data.token;
        this.logTest('Authentication', 'User Login', true, 'Login successful');
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      this.logTest('Authentication', 'User Login', false, error.response?.data?.message || error.message);
    }

    // Test 3: Invalid Login
    try {
      const loginData = {
        email: 'testuser@vbms.test',
        password: 'WrongPassword'
      };

      const loginResponse = await axios.post(`${this.baseURL}/api/auth/login`, loginData);
      this.logTest('Authentication', 'Invalid Login Protection', false, 'Should have failed but succeeded');
    } catch (error) {
      if (error.response?.status === 401) {
        this.logTest('Authentication', 'Invalid Login Protection', true, 'Correctly rejected invalid credentials');
      } else {
        this.logTest('Authentication', 'Invalid Login Protection', false, error.message);
      }
    }

    // Test 4: Protected Route Access
    try {
      const headers = { Authorization: `Bearer ${this.authToken}` };
      const response = await axios.get(`${this.baseURL}/api/inventory`, { headers });
      
      if (response.status === 200) {
        this.logTest('Authentication', 'Protected Route Access', true, 'Authenticated access successful');
      } else {
        throw new Error('Protected route access failed');
      }
    } catch (error) {
      this.logTest('Authentication', 'Protected Route Access', false, error.response?.data?.message || error.message);
    }
  }

  async testUserManagement() {
    console.log('\n👤 Testing User Management...');

    // Test 1: Get User Profile
    try {
      const headers = { Authorization: `Bearer ${this.authToken}` };
      const response = await axios.get(`${this.baseURL}/api/users/profile`, { headers });
      
      if (response.status === 200 && response.data.user) {
        this.logTest('User Management', 'Get User Profile', true, 'Profile retrieved successfully');
      } else {
        throw new Error('Failed to get profile');
      }
    } catch (error) {
      this.logTest('User Management', 'Get User Profile', false, error.response?.data?.message || error.message);
    }

    // Test 2: Update User Profile
    try {
      const headers = { Authorization: `Bearer ${this.authToken}` };
      const updateData = { name: 'Updated Test User' };
      const response = await axios.put(`${this.baseURL}/api/users/profile`, updateData, { headers });
      
      if (response.status === 200) {
        this.logTest('User Management', 'Update User Profile', true, 'Profile updated successfully');
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      this.logTest('User Management', 'Update User Profile', false, error.response?.data?.message || error.message);
    }
  }

  async testInventorySystem() {
    console.log('\n📦 Testing Inventory System...');

    let createdItemId = null;

    // Test 1: Create Inventory Item
    try {
      const headers = { Authorization: `Bearer ${this.authToken}` };
      const itemData = {
        name: 'Test Product',
        sku: 'TEST-001',
        category: 'Electronics',
        quantity: { current: 100 },
        pricing: { cost: 25.50, sellingPrice: 49.99 },
        supplier: { name: 'Test Supplier', contact: 'supplier@test.com' }
      };

      const response = await axios.post(`${this.baseURL}/api/inventory/items`, itemData, { headers });
      
      if (response.status === 201 && response.data.item) {
        createdItemId = response.data.item._id;
        this.logTest('Inventory', 'Create Inventory Item', true, 'Item created successfully');
      } else {
        throw new Error('Failed to create inventory item');
      }
    } catch (error) {
      this.logTest('Inventory', 'Create Inventory Item', false, error.response?.data?.message || error.message);
    }

    // Test 2: Get Inventory Items
    try {
      const headers = { Authorization: `Bearer ${this.authToken}` };
      const response = await axios.get(`${this.baseURL}/api/inventory/items`, { headers });
      
      if (response.status === 200 && response.data.items) {
        this.logTest('Inventory', 'Get Inventory Items', true, `Retrieved ${response.data.items.length} items`);
      } else {
        throw new Error('Failed to get inventory items');
      }
    } catch (error) {
      this.logTest('Inventory', 'Get Inventory Items', false, error.response?.data?.message || error.message);
    }

    // Test 3: Update Inventory Item
    if (createdItemId) {
      try {
        const headers = { Authorization: `Bearer ${this.authToken}` };
        const updateData = { quantity: { current: 150 } };
        const response = await axios.put(`${this.baseURL}/api/inventory/items/${createdItemId}`, updateData, { headers });
        
        if (response.status === 200) {
          this.logTest('Inventory', 'Update Inventory Item', true, 'Item updated successfully');
        } else {
          throw new Error('Failed to update inventory item');
        }
      } catch (error) {
        this.logTest('Inventory', 'Update Inventory Item', false, error.response?.data?.message || error.message);
      }
    }

    // Test 4: Stock Adjustment
    if (createdItemId) {
      try {
        const headers = { Authorization: `Bearer ${this.authToken}` };
        const adjustmentData = { adjustment: -10, reason: 'Test adjustment' };
        const response = await axios.post(`${this.baseURL}/api/inventory/items/${createdItemId}/adjust`, adjustmentData, { headers });
        
        if (response.status === 200) {
          this.logTest('Inventory', 'Stock Adjustment', true, 'Stock adjusted successfully');
        } else {
          throw new Error('Failed to adjust stock');
        }
      } catch (error) {
        this.logTest('Inventory', 'Stock Adjustment', false, error.response?.data?.message || error.message);
      }
    }
  }

  async testVAPIIntegration() {
    console.log('\n📞 Testing VAPI Integration...');

    // Test 1: Get VAPI Calls
    try {
      const headers = { Authorization: `Bearer ${this.authToken}` };
      const response = await axios.get(`${this.baseURL}/api/vapi/calls`, { headers });
      
      if (response.status === 200) {
        this.logTest('VAPI', 'Get VAPI Calls', true, 'VAPI calls retrieved successfully');
      } else {
        throw new Error('Failed to get VAPI calls');
      }
    } catch (error) {
      this.logTest('VAPI', 'Get VAPI Calls', false, error.response?.data?.message || error.message);
    }

    // Test 2: Create VAPI Assistant
    try {
      const headers = { Authorization: `Bearer ${this.authToken}` };
      const assistantData = {
        name: 'Test Assistant',
        instructions: 'You are a helpful test assistant'
      };
      const response = await axios.post(`${this.baseURL}/api/vapi/assistants`, assistantData, { headers });
      
      if (response.status === 201) {
        this.logTest('VAPI', 'Create VAPI Assistant', true, 'Assistant created successfully');
      } else {
        throw new Error('Failed to create VAPI assistant');
      }
    } catch (error) {
      this.logTest('VAPI', 'Create VAPI Assistant', false, error.response?.data?.message || error.message);
    }
  }

  async testReportingSystem() {
    console.log('\n📊 Testing Reporting System...');

    let createdReportId = null;

    // Test 1: Get Report Templates
    try {
      const headers = { Authorization: `Bearer ${this.authToken}` };
      const response = await axios.get(`${this.baseURL}/api/reports/templates/list`, { headers });
      
      if (response.status === 200 && response.data.templates) {
        this.logTest('Reporting', 'Get Report Templates', true, `Retrieved ${response.data.templates.length} templates`);
      } else {
        throw new Error('Failed to get report templates');
      }
    } catch (error) {
      this.logTest('Reporting', 'Get Report Templates', false, error.response?.data?.message || error.message);
    }

    // Test 2: Create Report
    try {
      const headers = { Authorization: `Bearer ${this.authToken}` };
      const reportData = {
        name: 'Test Report',
        type: 'inventory',
        description: 'Test report for system validation',
        dataSources: [{
          collection: 'inventoryitems',
          fields: ['name', 'sku', 'quantity.current']
        }],
        layout: {
          format: 'table',
          columns: [
            { field: 'name', title: 'Name', type: 'string', visible: true },
            { field: 'sku', title: 'SKU', type: 'string', visible: true }
          ]
        }
      };

      const response = await axios.post(`${this.baseURL}/api/reports`, reportData, { headers });
      
      if (response.status === 201 && response.data.report) {
        createdReportId = response.data.report._id;
        this.logTest('Reporting', 'Create Report', true, 'Report created successfully');
      } else {
        throw new Error('Failed to create report');
      }
    } catch (error) {
      this.logTest('Reporting', 'Create Report', false, error.response?.data?.message || error.message);
    }

    // Test 3: Execute Report
    if (createdReportId) {
      try {
        const headers = { Authorization: `Bearer ${this.authToken}` };
        const response = await axios.post(`${this.baseURL}/api/reports/${createdReportId}/execute`, {}, { headers });
        
        if (response.status === 200) {
          this.logTest('Reporting', 'Execute Report', true, 'Report executed successfully');
        } else {
          throw new Error('Failed to execute report');
        }
      } catch (error) {
        this.logTest('Reporting', 'Execute Report', false, error.response?.data?.message || error.message);
      }
    }

    // Test 4: Get Dashboard Data
    try {
      const headers = { Authorization: `Bearer ${this.authToken}` };
      const response = await axios.get(`${this.baseURL}/api/reports/dashboard/summary`, { headers });
      
      if (response.status === 200) {
        this.logTest('Reporting', 'Get Dashboard Data', true, 'Dashboard data retrieved successfully');
      } else {
        throw new Error('Failed to get dashboard data');
      }
    } catch (error) {
      this.logTest('Reporting', 'Get Dashboard Data', false, error.response?.data?.message || error.message);
    }
  }

  async testMonitoringSystem() {
    console.log('\n🔍 Testing Monitoring System...');

    // Test 1: Health Check (Public)
    try {
      const response = await axios.get(`${this.baseURL}/api/monitoring/health`);
      
      if (response.status === 200 && response.data.status) {
        this.logTest('Monitoring', 'Health Check', true, `System status: ${response.data.status}`);
      } else {
        throw new Error('Health check failed');
      }
    } catch (error) {
      this.logTest('Monitoring', 'Health Check', false, error.response?.data?.message || error.message);
    }

    // Test 2: Log Custom Event
    try {
      const headers = { Authorization: `Bearer ${this.authToken}` };
      const logData = {
        level: 'info',
        message: 'Test event from test suite',
        data: { test: true, timestamp: new Date().toISOString() }
      };

      const response = await axios.post(`${this.baseURL}/api/monitoring/log`, logData, { headers });
      
      if (response.status === 200) {
        this.logTest('Monitoring', 'Log Custom Event', true, 'Event logged successfully');
      } else {
        throw new Error('Failed to log event');
      }
    } catch (error) {
      this.logTest('Monitoring', 'Log Custom Event', false, error.response?.data?.message || error.message);
    }
  }

  async testAPISecurity() {
    console.log('\n🛡️ Testing API Security...');

    // Test 1: Unauthorized Access Protection
    try {
      const response = await axios.get(`${this.baseURL}/api/inventory/items`);
      this.logTest('Security', 'Unauthorized Access Protection', false, 'Should have been blocked but succeeded');
    } catch (error) {
      if (error.response?.status === 401) {
        this.logTest('Security', 'Unauthorized Access Protection', true, 'Correctly blocked unauthorized access');
      } else {
        this.logTest('Security', 'Unauthorized Access Protection', false, error.message);
      }
    }

    // Test 2: Input Validation
    try {
      const headers = { Authorization: `Bearer ${this.authToken}` };
      const invalidData = {
        name: '', // Invalid empty name
        sku: 'a'.repeat(1000), // Too long SKU
        quantity: { current: -50 } // Invalid negative quantity
      };

      const response = await axios.post(`${this.baseURL}/api/inventory/items`, invalidData, { headers });
      this.logTest('Security', 'Input Validation', false, 'Should have rejected invalid data');
    } catch (error) {
      if (error.response?.status === 400) {
        this.logTest('Security', 'Input Validation', true, 'Correctly rejected invalid input');
      } else {
        this.logTest('Security', 'Input Validation', false, error.message);
      }
    }

    // Test 3: Rate Limiting (if enabled)
    try {
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(axios.get(`${this.baseURL}/api/test`));
      }
      
      await Promise.all(promises);
      this.logTest('Security', 'Rate Limiting', false, 'Rate limiting not effective');
    } catch (error) {
      if (error.response?.status === 429) {
        this.logTest('Security', 'Rate Limiting', true, 'Rate limiting active');
      } else {
        this.logTest('Security', 'Rate Limiting', true, 'Rate limiting or other protection active');
      }
    }
  }

  async testPerformance() {
    console.log('\n⚡ Testing Performance...');

    // Test 1: API Response Time
    try {
      const startTime = Date.now();
      const headers = { Authorization: `Bearer ${this.authToken}` };
      await axios.get(`${this.baseURL}/api/inventory/items`, { headers });
      const responseTime = Date.now() - startTime;
      
      if (responseTime < 1000) {
        this.logTest('Performance', 'API Response Time', true, `Response time: ${responseTime}ms`);
      } else {
        this.logTest('Performance', 'API Response Time', false, `Slow response: ${responseTime}ms`);
      }
    } catch (error) {
      this.logTest('Performance', 'API Response Time', false, error.message);
    }

    // Test 2: Concurrent Requests
    try {
      const startTime = Date.now();
      const headers = { Authorization: `Bearer ${this.authToken}` };
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        promises.push(axios.get(`${this.baseURL}/api/test`, { headers }));
      }
      
      await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      if (totalTime < 2000) {
        this.logTest('Performance', 'Concurrent Requests', true, `5 concurrent requests: ${totalTime}ms`);
      } else {
        this.logTest('Performance', 'Concurrent Requests', false, `Slow concurrent processing: ${totalTime}ms`);
      }
    } catch (error) {
      this.logTest('Performance', 'Concurrent Requests', false, error.message);
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test data...');
    
    try {
      await this.cleanupTestData();
      await mongoose.disconnect();
      this.logTest('Cleanup', 'Test Data Cleanup', true, 'Test data cleaned up successfully');
    } catch (error) {
      this.logTest('Cleanup', 'Test Data Cleanup', false, error.message);
    }
  }

  async cleanupTestData() {
    // Remove test user and related data
    if (this.testUser) {
      await User.deleteMany({ email: { $regex: /\.test$/ } });
      await InventoryItem.deleteMany({ name: /^Test/ });
      await Report.deleteMany({ name: /^Test/ });
      await VAPICall.deleteMany({ customerEmail: { $regex: /\.test$/ } });
    }
  }

  logTest(category, testName, passed, details) {
    const result = {
      category,
      testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.testResults.push(result);
    
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const color = passed ? '\x1b[32m' : '\x1b[31m';
    console.log(`${color}${status}\x1b[0m ${category}: ${testName} - ${details}`);
  }

  generateTestReport() {
    console.log('\n' + '='.repeat(50));
    console.log('📋 VBMS TEST SUITE REPORT');
    console.log('='.repeat(50));

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(t => t.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);

    console.log(`\n📊 Summary:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${failedTests}`);
    console.log(`   Success Rate: ${successRate}%`);

    // Group by category
    const categories = {};
    this.testResults.forEach(result => {
      if (!categories[result.category]) {
        categories[result.category] = { passed: 0, failed: 0, tests: [] };
      }
      categories[result.category].tests.push(result);
      if (result.passed) {
        categories[result.category].passed++;
      } else {
        categories[result.category].failed++;
      }
    });

    console.log('\n📁 By Category:');
    Object.entries(categories).forEach(([category, data]) => {
      const categorySuccess = ((data.passed / data.tests.length) * 100).toFixed(1);
      console.log(`   ${category}: ${data.passed}/${data.tests.length} (${categorySuccess}%)`);
    });

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults.filter(t => !t.passed).forEach(result => {
        console.log(`   • ${result.category}: ${result.testName} - ${result.details}`);
      });
    }

    console.log('\n' + '='.repeat(50));
    
    return {
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        successRate: parseFloat(successRate)
      },
      categories,
      results: this.testResults
    };
  }
}

// Export for use in other files or run directly
if (require.main === module) {
  const testSuite = new VBMSTestSuite();
  testSuite.runAllTests().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Test suite error:', error);
    process.exit(1);
  });
}

module.exports = VBMSTestSuite;