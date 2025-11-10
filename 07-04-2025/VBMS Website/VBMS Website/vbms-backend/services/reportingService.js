const mongoose = require('mongoose');
const Report = require('../models/Report');
const User = require('../models/User');
const InventoryItem = require('../models/InventoryItem');
const InventoryTransaction = require('../models/InventoryTransaction');
const VAPICall = require('../models/VAPICall');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');

class ReportingService {
  
  // Get available data models for reports
  getAvailableModels() {
    return {
      users: User,
      inventoryitems: InventoryItem,
      inventorytransactions: InventoryTransaction,
      vapicalls: VAPICall,
      subscriptions: Subscription,
      payments: Payment
    };
  }
  
  // Create a new report
  async createReport(customerId, reportData) {
    try {
      const report = new Report({
        ...reportData,
        customerId: customerId
      });
      
      await report.save();
      return report;
    } catch (error) {
      throw new Error(`Failed to create report: ${error.message}`);
    }
  }
  
  // Execute a report and return data
  async executeReport(customerId, reportId) {
    try {
      const report = await Report.findOne({
        _id: reportId,
        customerId: customerId
      });
      
      if (!report) {
        throw new Error('Report not found');
      }
      
      const startTime = Date.now();
      report.execution.status = 'running';
      report.execution.lastRun = new Date();
      await report.save();
      
      try {
        // Build and execute the query
        const data = await this.buildAndExecuteQuery(customerId, report);
        
        // Calculate execution metrics
        const duration = Date.now() - startTime;
        report.execution.status = 'completed';
        report.execution.duration = duration;
        report.execution.recordCount = data.length;
        report.stats.avgExecutionTime = report.stats.avgExecutionTime 
          ? (report.stats.avgExecutionTime + duration) / 2 
          : duration;
        
        await report.save();
        
        // Format the data based on report layout
        const formattedData = await this.formatReportData(data, report);
        
        return {
          report: report,
          data: formattedData,
          metadata: {
            executionTime: duration,
            recordCount: data.length,
            generatedAt: new Date()
          }
        };
      } catch (queryError) {
        report.execution.status = 'failed';
        report.execution.errorMessage = queryError.message;
        await report.save();
        throw queryError;
      }
    } catch (error) {
      throw new Error(`Failed to execute report: ${error.message}`);
    }
  }
  
  // Build and execute MongoDB query based on report parameters
  async buildAndExecuteQuery(customerId, report) {
    try {
      const models = this.getAvailableModels();
      const { dataSources, parameters } = report;
      
      if (!dataSources || dataSources.length === 0) {
        throw new Error('No data sources specified');
      }
      
      const primarySource = dataSources[0];
      const Model = models[primarySource.collection];
      
      if (!Model) {
        throw new Error(`Invalid data source: ${primarySource.collection}`);
      }
      
      // Build base query
      let query = Model.find({ customerId: customerId });
      
      // Apply date range filters
      if (parameters.dateRange) {
        const dateFilter = this.buildDateFilter(parameters.dateRange);
        if (dateFilter) {
          query = query.where('createdAt').gte(dateFilter.start).lte(dateFilter.end);
        }
      }
      
      // Apply additional filters
      if (parameters.filters && parameters.filters.length > 0) {
        for (const filter of parameters.filters) {
          query = this.applyFilter(query, filter);
        }
      }
      
      // Apply sorting
      if (parameters.sorting && parameters.sorting.length > 0) {
        const sortObj = {};
        parameters.sorting.forEach(sort => {
          sortObj[sort.field] = sort.direction === 'desc' ? -1 : 1;
        });
        query = query.sort(sortObj);
      }
      
      // Apply limit
      if (parameters.limit) {
        query = query.limit(parameters.limit);
      }
      
      // Apply field selection
      if (primarySource.fields && primarySource.fields.length > 0) {
        query = query.select(primarySource.fields.join(' '));
      }
      
      // Execute query
      const results = await query.exec();
      
      // Apply grouping if specified
      if (parameters.grouping && parameters.grouping.length > 0) {
        return this.groupResults(results, parameters.grouping);
      }
      
      return results;
    } catch (error) {
      throw new Error(`Query execution failed: ${error.message}`);
    }
  }
  
  // Build date filter based on period
  buildDateFilter(dateRange) {
    const now = new Date();
    let start, end;
    
    switch (dateRange.period) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
        break;
      
      case 'yesterday':
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        start = new Date(end.getTime() - 24 * 60 * 60 * 1000 + 1);
        break;
      
      case 'last_7_days':
        end = now;
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      
      case 'last_30_days':
        end = now;
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      
      case 'custom':
        start = dateRange.start ? new Date(dateRange.start) : null;
        end = dateRange.end ? new Date(dateRange.end) : null;
        break;
      
      default:
        return null;
    }
    
    return { start, end };
  }
  
  // Apply individual filter to query
  applyFilter(query, filter) {
    const { field, operator, value } = filter;
    
    switch (operator) {
      case 'equals':
        return query.where(field).equals(value);
      
      case 'not_equals':
        return query.where(field).ne(value);
      
      case 'contains':
        return query.where(field).regex(new RegExp(value, 'i'));
      
      case 'not_contains':
        return query.where(field).not().regex(new RegExp(value, 'i'));
      
      case 'greater_than':
        return query.where(field).gt(value);
      
      case 'less_than':
        return query.where(field).lt(value);
      
      case 'between':
        if (Array.isArray(value) && value.length === 2) {
          return query.where(field).gte(value[0]).lte(value[1]);
        }
        return query;
      
      case 'in':
        return query.where(field).in(Array.isArray(value) ? value : [value]);
      
      case 'not_in':
        return query.where(field).nin(Array.isArray(value) ? value : [value]);
      
      default:
        return query;
    }
  }
  
  // Group results by specified fields
  groupResults(results, grouping) {
    if (!grouping || grouping.length === 0) return results;
    
    const grouped = {};
    
    results.forEach(item => {
      let key = '';
      grouping.forEach(group => {
        const value = this.getNestedValue(item, group.field);
        key += `${group.field}:${value}|`;
      });
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });
    
    return grouped;
  }
  
  // Get nested value from object
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }
  
  // Format report data based on layout settings
  async formatReportData(data, report) {
    const { layout } = report;
    
    switch (layout.format) {
      case 'table':
        return this.formatTableData(data, layout);
      
      case 'chart':
        return this.formatChartData(data, layout);
      
      case 'summary':
        return this.formatSummaryData(data, layout);
      
      case 'pivot':
        return this.formatPivotData(data, layout);
      
      default:
        return data;
    }
  }
  
  // Format data for table display
  formatTableData(data, layout) {
    if (!layout.columns || layout.columns.length === 0) {
      return data;
    }
    
    const visibleColumns = layout.columns.filter(col => col.visible);
    
    return {
      columns: visibleColumns,
      rows: data.map(item => {
        const row = {};
        visibleColumns.forEach(col => {
          const value = this.getNestedValue(item, col.field);
          row[col.field] = this.formatValue(value, col.type, col.format);
        });
        return row;
      }),
      summary: this.calculateSummary(data, layout.summary || [])
    };
  }
  
  // Format data for chart display
  formatChartData(data, layout) {
    if (!data || data.length === 0) {
      return { labels: [], datasets: [] };
    }
    
    // Simple implementation - can be expanded based on chart type
    const labels = data.map((item, index) => `Item ${index + 1}`);
    const values = data.map(item => {
      // Get first numeric field
      for (const key in item) {
        if (typeof item[key] === 'number') {
          return item[key];
        }
      }
      return 0;
    });
    
    return {
      labels: labels,
      datasets: [{
        label: 'Data',
        data: values,
        backgroundColor: this.generateColors(values.length)
      }]
    };
  }
  
  // Format data for summary display
  formatSummaryData(data, layout) {
    const summary = this.calculateSummary(data, layout.summary || []);
    
    return {
      totalRecords: data.length,
      summary: summary,
      keyMetrics: this.extractKeyMetrics(data)
    };
  }
  
  // Calculate summary statistics
  calculateSummary(data, summaryConfig) {
    const summary = {};
    
    summaryConfig.forEach(config => {
      const values = data.map(item => this.getNestedValue(item, config.field))
        .filter(val => val !== null && val !== undefined);
      
      switch (config.function) {
        case 'sum':
          summary[config.field] = values.reduce((sum, val) => sum + (Number(val) || 0), 0);
          break;
        
        case 'avg':
          summary[config.field] = values.length > 0 
            ? values.reduce((sum, val) => sum + (Number(val) || 0), 0) / values.length 
            : 0;
          break;
        
        case 'count':
          summary[config.field] = values.length;
          break;
        
        case 'min':
          summary[config.field] = values.length > 0 ? Math.min(...values.map(Number)) : 0;
          break;
        
        case 'max':
          summary[config.field] = values.length > 0 ? Math.max(...values.map(Number)) : 0;
          break;
        
        case 'distinct_count':
          summary[config.field] = new Set(values).size;
          break;
      }
    });
    
    return summary;
  }
  
  // Extract key metrics from data
  extractKeyMetrics(data) {
    if (!data || data.length === 0) return {};
    
    const metrics = {
      totalRecords: data.length,
      dateRange: {
        earliest: null,
        latest: null
      }
    };
    
    // Find date range if createdAt exists
    const dates = data.map(item => item.createdAt).filter(Boolean);
    if (dates.length > 0) {
      metrics.dateRange.earliest = new Date(Math.min(...dates.map(d => new Date(d))));
      metrics.dateRange.latest = new Date(Math.max(...dates.map(d => new Date(d))));
    }
    
    return metrics;
  }
  
  // Format individual values based on type
  formatValue(value, type, format) {
    if (value === null || value === undefined) return '';
    
    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(Number(value) || 0);
      
      case 'percentage':
        return `${(Number(value) || 0).toFixed(2)}%`;
      
      case 'date':
        return new Date(value).toLocaleDateString();
      
      case 'number':
        return (Number(value) || 0).toLocaleString();
      
      case 'boolean':
        return value ? 'Yes' : 'No';
      
      default:
        return String(value);
    }
  }
  
  // Generate colors for charts
  generateColors(count) {
    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
      '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
    ];
    
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }
    return result;
  }
  
  // Get predefined report templates
  getReportTemplates() {
    return [
      {
        name: 'Inventory Summary',
        type: 'inventory',
        description: 'Overview of current inventory levels and values',
        dataSources: [{
          collection: 'inventoryitems',
          fields: ['name', 'sku', 'category', 'quantity.current', 'pricing.cost', 'pricing.sellingPrice']
        }],
        layout: {
          format: 'table',
          columns: [
            { field: 'name', title: 'Item Name', type: 'string' },
            { field: 'sku', title: 'SKU', type: 'string' },
            { field: 'category', title: 'Category', type: 'string' },
            { field: 'quantity.current', title: 'Current Stock', type: 'number' },
            { field: 'pricing.cost', title: 'Cost', type: 'currency' },
            { field: 'pricing.sellingPrice', title: 'Selling Price', type: 'currency' }
          ],
          summary: [
            { field: 'quantity.current', function: 'sum', title: 'Total Stock' },
            { field: 'pricing.cost', function: 'sum', title: 'Total Cost Value' }
          ]
        }
      },
      {
        name: 'Sales Performance',
        type: 'sales',
        description: 'Sales transactions and performance metrics',
        dataSources: [{
          collection: 'inventorytransactions',
          fields: ['type', 'quantity', 'totalPrice', 'createdAt']
        }],
        parameters: {
          filters: [
            { field: 'type', operator: 'equals', value: 'stock_out' }
          ]
        },
        layout: {
          format: 'chart',
          chartType: 'bar'
        }
      },
      {
        name: 'Call Analytics',
        type: 'analytics',
        description: 'VAPI call performance and analytics',
        dataSources: [{
          collection: 'vapicalls',
          fields: ['status', 'duration', 'cost', 'analysis.sentiment', 'createdAt']
        }],
        layout: {
          format: 'summary',
          summary: [
            { field: 'duration', function: 'avg', title: 'Average Call Duration' },
            { field: 'cost', function: 'sum', title: 'Total Call Cost' },
            { field: 'status', function: 'count', title: 'Total Calls' }
          ]
        }
      }
    ];
  }
  
  // Get reports for a customer
  async getReports(customerId, filters = {}) {
    try {
      const {
        type,
        category,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;
      
      const query = { customerId };
      
      if (type && type !== 'all') query.type = type;
      if (category && category !== 'all') query.category = category;
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      const reports = await Report.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-dataSources -parameters'); // Exclude heavy fields
      
      const total = await Report.countDocuments(query);
      
      return {
        reports,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get reports: ${error.message}`);
    }
  }
  
  // Delete a report
  async deleteReport(customerId, reportId) {
    try {
      const report = await Report.findOneAndDelete({
        _id: reportId,
        customerId: customerId
      });
      
      if (!report) {
        throw new Error('Report not found');
      }
      
      return { message: 'Report deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete report: ${error.message}`);
    }
  }
  
  // Get dashboard data with key metrics
  async getDashboardData(customerId) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      // Get key metrics from different data sources
      const [
        inventoryStats,
        transactionStats,
        callStats,
        recentReports
      ] = await Promise.all([
        this.getInventoryStats(customerId),
        this.getTransactionStats(customerId, thirtyDaysAgo),
        this.getCallStats(customerId, thirtyDaysAgo),
        Report.find({ customerId }).sort({ 'stats.viewCount': -1 }).limit(5)
      ]);
      
      return {
        inventory: inventoryStats,
        transactions: transactionStats,
        calls: callStats,
        recentReports: recentReports,
        generatedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to get dashboard data: ${error.message}`);
    }
  }
  
  // Helper methods for dashboard stats
  async getInventoryStats(customerId) {
    const stats = await InventoryItem.aggregate([
      { $match: { customerId: mongoose.Types.ObjectId(customerId), status: 'active' } },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: '$quantity.current' },
          totalValue: { $sum: { $multiply: ['$quantity.current', '$pricing.cost'] } },
          lowStockItems: {
            $sum: {
              $cond: [{ $lte: ['$quantity.current', '$stockLevels.reorderPoint'] }, 1, 0]
            }
          }
        }
      }
    ]);
    
    return stats[0] || { totalItems: 0, totalQuantity: 0, totalValue: 0, lowStockItems: 0 };
  }
  
  async getTransactionStats(customerId, startDate) {
    const stats = await InventoryTransaction.aggregate([
      { $match: { customerId: mongoose.Types.ObjectId(customerId), createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: '$totalCost' }
        }
      }
    ]);
    
    return stats;
  }
  
  async getCallStats(customerId, startDate) {
    const stats = await VAPICall.aggregate([
      { $match: { customerId: mongoose.Types.ObjectId(customerId), createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          totalCost: { $sum: '$cost' },
          avgDuration: { $avg: '$duration' }
        }
      }
    ]);
    
    return stats[0] || { totalCalls: 0, totalDuration: 0, totalCost: 0, avgDuration: 0 };
  }
}

module.exports = new ReportingService();