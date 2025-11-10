require('dotenv').config();
const mongoose = require('mongoose');

// Import services and models for testing
const ReportingService = require('../services/reportingService');
const MonitoringService = require('../services/monitoringService');
const InventoryService = require('../services/inventoryService');
const VAPIService = require('../services/vapiService');

class UnitTestRunner {
  constructor() {
    this.testResults = [];
  }

  async runAllUnitTests() {
    console.log('🧪 Running VBMS Unit Tests');
    console.log('=' .repeat(40));

    try {
      // Connect to MongoDB
      await mongoose.connect(process.env.MONGO_URI);
      console.log('✅ Connected to MongoDB for unit tests');

      // Test Services
      await this.testReportingService();
      await this.testMonitoringService();
      await this.testInventoryService();
      await this.testVAPIService();

      // Generate Report
      this.generateReport();

    } catch (error) {
      console.error('Unit test suite error:', error);
    } finally {
      await mongoose.disconnect();
    }
  }

  async testReportingService() {
    console.log('\n📊 Testing Reporting Service...');

    // Test 1: Get Available Models
    try {
      const models = ReportingService.getAvailableModels();
      const modelKeys = Object.keys(models);
      
      if (modelKeys.length > 0 && modelKeys.includes('users') && modelKeys.includes('inventoryitems')) {
        this.logTest('ReportingService', 'getAvailableModels', true, `Found ${modelKeys.length} models`);
      } else {
        throw new Error('Missing expected models');
      }
    } catch (error) {
      this.logTest('ReportingService', 'getAvailableModels', false, error.message);
    }

    // Test 2: Get Report Templates
    try {
      const templates = ReportingService.getReportTemplates();
      
      if (Array.isArray(templates) && templates.length > 0) {
        const hasInventoryTemplate = templates.some(t => t.name === 'Inventory Summary');
        if (hasInventoryTemplate) {
          this.logTest('ReportingService', 'getReportTemplates', true, `Found ${templates.length} templates`);
        } else {
          throw new Error('Missing expected templates');
        }
      } else {
        throw new Error('No templates returned');
      }
    } catch (error) {
      this.logTest('ReportingService', 'getReportTemplates', false, error.message);
    }

    // Test 3: Build Date Filter
    try {
      const filter = ReportingService.buildDateFilter({ period: 'last_7_days' });
      
      if (filter && filter.start && filter.end) {
        const daysDiff = Math.ceil((filter.end - filter.start) / (1000 * 60 * 60 * 24));
        if (daysDiff === 7) {
          this.logTest('ReportingService', 'buildDateFilter', true, 'Date filter built correctly');
        } else {
          throw new Error(`Incorrect date range: ${daysDiff} days`);
        }
      } else {
        throw new Error('Invalid date filter returned');
      }
    } catch (error) {
      this.logTest('ReportingService', 'buildDateFilter', false, error.message);
    }

    // Test 4: Format Value
    try {
      const currencyFormatted = ReportingService.formatValue(1234.56, 'currency');
      const percentageFormatted = ReportingService.formatValue(0.75, 'percentage');
      const numberFormatted = ReportingService.formatValue(1000000, 'number');
      
      if (currencyFormatted.includes('$') && 
          percentageFormatted.includes('%') && 
          numberFormatted.includes(',')) {
        this.logTest('ReportingService', 'formatValue', true, 'Value formatting works correctly');
      } else {
        throw new Error('Value formatting failed');
      }
    } catch (error) {
      this.logTest('ReportingService', 'formatValue', false, error.message);
    }
  }

  async testMonitoringService() {
    console.log('\n🔍 Testing Monitoring Service...');

    // Test 1: Initialize Monitoring
    try {
      await MonitoringService.initialize();
      this.logTest('MonitoringService', 'initialize', true, 'Monitoring service initialized');
    } catch (error) {
      this.logTest('MonitoringService', 'initialize', false, error.message);
    }

    // Test 2: Log Event
    try {
      await MonitoringService.logEvent('info', 'Unit test event', { test: true });
      this.logTest('MonitoringService', 'logEvent', true, 'Event logged successfully');
    } catch (error) {
      this.logTest('MonitoringService', 'logEvent', false, error.message);
    }

    // Test 3: Track API Call
    try {
      MonitoringService.trackAPICall('test-service', '/test/endpoint', 100, true);
      this.logTest('MonitoringService', 'trackAPICall', true, 'API call tracked');
    } catch (error) {
      this.logTest('MonitoringService', 'trackAPICall', false, error.message);
    }

    // Test 4: Get Metrics
    try {
      const metrics = MonitoringService.getMetrics();
      
      if (metrics && 
          typeof metrics.requests === 'object' && 
          typeof metrics.system === 'object' && 
          metrics.timestamp) {
        this.logTest('MonitoringService', 'getMetrics', true, 'Metrics retrieved successfully');
      } else {
        throw new Error('Invalid metrics structure');
      }
    } catch (error) {
      this.logTest('MonitoringService', 'getMetrics', false, error.message);
    }

    // Test 5: Health Check
    try {
      const health = await MonitoringService.getHealthStatus();
      
      if (health && 
          health.status && 
          health.services && 
          health.timestamp) {
        this.logTest('MonitoringService', 'getHealthStatus', true, `System status: ${health.status}`);
      } else {
        throw new Error('Invalid health status structure');
      }
    } catch (error) {
      this.logTest('MonitoringService', 'getHealthStatus', false, error.message);
    }
  }

  async testInventoryService() {
    console.log('\n📦 Testing Inventory Service...');

    // Test 1: Calculate Reorder Amount
    try {
      const reorderAmount = InventoryService.calculateReorderAmount(50, 10, 200);
      
      if (typeof reorderAmount === 'number' && reorderAmount >= 0) {
        this.logTest('InventoryService', 'calculateReorderAmount', true, `Reorder amount: ${reorderAmount}`);
      } else {
        throw new Error('Invalid reorder amount calculation');
      }
    } catch (error) {
      this.logTest('InventoryService', 'calculateReorderAmount', false, error.message);
    }

    // Test 2: Format Currency
    try {
      const formatted = InventoryService.formatCurrency(1234.56);
      
      if (typeof formatted === 'string' && formatted.includes('$')) {
        this.logTest('InventoryService', 'formatCurrency', true, `Formatted: ${formatted}`);
      } else {
        throw new Error('Currency formatting failed');
      }
    } catch (error) {
      this.logTest('InventoryService', 'formatCurrency', false, error.message);
    }

    // Test 3: Validate SKU Format
    try {
      const validSKU = InventoryService.validateSKUFormat('ABC-123-XYZ');
      const invalidSKU = InventoryService.validateSKUFormat('invalid sku with spaces');
      
      if (validSKU === true && invalidSKU === false) {
        this.logTest('InventoryService', 'validateSKUFormat', true, 'SKU validation works correctly');
      } else {
        throw new Error('SKU validation failed');
      }
    } catch (error) {
      this.logTest('InventoryService', 'validateSKUFormat', false, error.message);
    }
  }

  async testVAPIService() {
    console.log('\n📞 Testing VAPI Service...');

    // Test 1: Build Assistant Config
    try {
      const config = VAPIService.buildAssistantConfig({
        name: 'Test Assistant',
        instructions: 'Test instructions'
      });
      
      if (config && 
          config.name === 'Test Assistant' && 
          config.model && 
          config.voice) {
        this.logTest('VAPIService', 'buildAssistantConfig', true, 'Assistant config built correctly');
      } else {
        throw new Error('Invalid assistant config');
      }
    } catch (error) {
      this.logTest('VAPIService', 'buildAssistantConfig', false, error.message);
    }

    // Test 2: Format Phone Number
    try {
      const formatted = VAPIService.formatPhoneNumber('1234567890');
      
      if (typeof formatted === 'string' && formatted.includes('-')) {
        this.logTest('VAPIService', 'formatPhoneNumber', true, `Formatted: ${formatted}`);
      } else {
        throw new Error('Phone number formatting failed');
      }
    } catch (error) {
      this.logTest('VAPIService', 'formatPhoneNumber', false, error.message);
    }

    // Test 3: Calculate Call Cost
    try {
      const cost = VAPIService.calculateCallCost(120); // 2 minutes
      
      if (typeof cost === 'number' && cost > 0) {
        this.logTest('VAPIService', 'calculateCallCost', true, `Cost for 2 minutes: $${cost}`);
      } else {
        throw new Error('Call cost calculation failed');
      }
    } catch (error) {
      this.logTest('VAPIService', 'calculateCallCost', false, error.message);
    }
  }

  logTest(service, method, passed, details) {
    const result = {
      service,
      method,
      passed,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.testResults.push(result);
    
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const color = passed ? '\x1b[32m' : '\x1b[31m';
    console.log(`${color}${status}\x1b[0m ${service}.${method}() - ${details}`);
  }

  generateReport() {
    console.log('\n' + '='.repeat(40));
    console.log('📋 UNIT TEST REPORT');
    console.log('='.repeat(40));

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(t => t.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);

    console.log(`\n📊 Summary:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${failedTests}`);
    console.log(`   Success Rate: ${successRate}%`);

    // Group by service
    const services = {};
    this.testResults.forEach(result => {
      if (!services[result.service]) {
        services[result.service] = { passed: 0, failed: 0, tests: [] };
      }
      services[result.service].tests.push(result);
      if (result.passed) {
        services[result.service].passed++;
      } else {
        services[result.service].failed++;
      }
    });

    console.log('\n🔧 By Service:');
    Object.entries(services).forEach(([service, data]) => {
      const serviceSuccess = ((data.passed / data.tests.length) * 100).toFixed(1);
      console.log(`   ${service}: ${data.passed}/${data.tests.length} (${serviceSuccess}%)`);
    });

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults.filter(t => !t.passed).forEach(result => {
        console.log(`   • ${result.service}.${result.method}() - ${result.details}`);
      });
    }

    console.log('\n' + '='.repeat(40));
  }
}

// Run unit tests if called directly
if (require.main === module) {
  const runner = new UnitTestRunner();
  runner.runAllUnitTests().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Unit test error:', error);
    process.exit(1);
  });
}

module.exports = UnitTestRunner;