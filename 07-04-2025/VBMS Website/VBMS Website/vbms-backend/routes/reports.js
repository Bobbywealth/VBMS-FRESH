const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const reportingService = require('../services/reportingService');
const Report = require('../models/Report');
const { authenticateToken } = require('../middleware/auth');
const ValidationMiddleware = require('../middleware/validation');

// Get all reports for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await reportingService.getReports(req.user.id, req.query);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reports',
      details: error.message
    });
  }
});

// Get single report details
router.get('/:id', authenticateToken, ValidationMiddleware.validateMongoId('id'), async (req, res) => {
  try {
    const report = await Report.findOne({
      _id: req.params.id,
      customerId: req.user.id
    });
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }
    
    // Increment view count
    await report.incrementViewCount();
    
    res.json({
      success: true,
      report: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get report',
      details: error.message
    });
  }
});

// Create new report
router.post('/',
  authenticateToken,
  [
    ValidationMiddleware.sanitizeHTML(),
    ValidationMiddleware.handleValidationErrors()
  ],
  async (req, res) => {
    try {
      // Check if user has reporting feature access
      if (req.user.role !== 'admin' && !req.user.subscription?.features?.advancedAnalytics) {
        return res.status(403).json({
          error: 'Advanced analytics feature not available in your subscription'
        });
      }

      const report = await reportingService.createReport(req.user.id, req.body);
      
      res.status(201).json({
        success: true,
        report: report,
        message: 'Report created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to create report',
        details: error.message
      });
    }
  }
);

// Update report
router.put('/:id',
  authenticateToken,
  ValidationMiddleware.validateMongoId('id'),
  [
    ValidationMiddleware.sanitizeHTML(),
    ValidationMiddleware.handleValidationErrors()
  ],
  async (req, res) => {
    try {
      const report = await Report.findOne({
        _id: req.params.id,
        customerId: req.user.id
      });
      
      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }
      
      // Update report fields
      Object.assign(report, req.body);
      await report.save();
      
      res.json({
        success: true,
        report: report,
        message: 'Report updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to update report',
        details: error.message
      });
    }
  }
);

// Delete report
router.delete('/:id', authenticateToken, ValidationMiddleware.validateMongoId('id'), async (req, res) => {
  try {
    const result = await reportingService.deleteReport(req.user.id, req.params.id);
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Failed to delete report',
      details: error.message
    });
  }
});

// Execute report and get data
router.post('/:id/execute', authenticateToken, ValidationMiddleware.validateMongoId('id'), async (req, res) => {
  try {
    const result = await reportingService.executeReport(req.user.id, req.params.id);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to execute report',
      details: error.message
    });
  }
});

// Get report templates
router.get('/templates/list', authenticateToken, async (req, res) => {
  try {
    const templates = reportingService.getReportTemplates();
    
    res.json({
      success: true,
      templates: templates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get report templates',
      details: error.message
    });
  }
});

// Create report from template
router.post('/templates/:templateName',
  authenticateToken,
  [
    ValidationMiddleware.sanitizeHTML(),
    ValidationMiddleware.handleValidationErrors()
  ],
  async (req, res) => {
    try {
      const templates = reportingService.getReportTemplates();
      const template = templates.find(t => t.name.toLowerCase().replace(/\s+/g, '_') === req.params.templateName);
      
      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found'
        });
      }
      
      // Merge template with user customizations
      const reportData = {
        ...template,
        ...req.body,
        isTemplate: false
      };
      
      const report = await reportingService.createReport(req.user.id, reportData);
      
      res.status(201).json({
        success: true,
        report: report,
        message: 'Report created from template successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to create report from template',
        details: error.message
      });
    }
  }
);

// Get dashboard data
router.get('/dashboard/summary', authenticateToken, async (req, res) => {
  try {
    const dashboardData = await reportingService.getDashboardData(req.user.id);
    
    res.json({
      success: true,
      dashboard: dashboardData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard data',
      details: error.message
    });
  }
});

// Get quick analytics
router.get('/analytics/quick', authenticateToken, async (req, res) => {
  try {
    const { period = 'last_30_days', type } = req.query;
    
    // Build a quick report for analytics
    const quickReport = {
      name: 'Quick Analytics',
      type: type || 'analytics',
      parameters: {
        dateRange: { period: period }
      },
      dataSources: [{
        collection: type === 'inventory' ? 'inventoryitems' : 
                   type === 'calls' ? 'vapicalls' : 'inventorytransactions'
      }],
      layout: { format: 'summary' }
    };
    
    // Create temporary report (don't save)
    const tempReport = new Report({ ...quickReport, customerId: req.user.id });
    
    // Execute the report
    const data = await reportingService.buildAndExecuteQuery(req.user.id, tempReport);
    const formattedData = await reportingService.formatReportData(data, tempReport);
    
    res.json({
      success: true,
      data: formattedData,
      metadata: {
        period: period,
        type: type,
        recordCount: data.length,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get quick analytics',
      details: error.message
    });
  }
});

// Get popular reports
router.get('/popular/list', authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const popularReports = await Report.getPopularReports(req.user.id, parseInt(limit));
    
    res.json({
      success: true,
      reports: popularReports
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get popular reports',
      details: error.message
    });
  }
});

// Search reports
router.get('/search/:query', authenticateToken, async (req, res) => {
  try {
    const { query } = req.params;
    const { limit = 20 } = req.query;
    
    const searchResults = await Report.find({
      customerId: req.user.id,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ]
    })
    .limit(parseInt(limit))
    .select('name description type category tags createdAt stats')
    .sort({ 'stats.viewCount': -1 });
    
    res.json({
      success: true,
      results: searchResults,
      query: query,
      count: searchResults.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to search reports',
      details: error.message
    });
  }
});

// Duplicate report
router.post('/:id/duplicate', authenticateToken, ValidationMiddleware.validateMongoId('id'), async (req, res) => {
  try {
    const originalReport = await Report.findOne({
      _id: req.params.id,
      customerId: req.user.id
    });
    
    if (!originalReport) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }
    
    // Create duplicate
    const duplicateData = originalReport.toObject();
    delete duplicateData._id;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;
    delete duplicateData.stats;
    delete duplicateData.execution;
    
    duplicateData.name = `${duplicateData.name} (Copy)`;
    duplicateData.version = 1;
    
    const duplicateReport = await reportingService.createReport(req.user.id, duplicateData);
    
    res.status(201).json({
      success: true,
      report: duplicateReport,
      message: 'Report duplicated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Failed to duplicate report',
      details: error.message
    });
  }
});

// Export report data
router.get('/:id/export/:format', authenticateToken, ValidationMiddleware.validateMongoId('id'), async (req, res) => {
  try {
    const { format } = req.params;
    
    if (!['csv', 'json', 'excel'].includes(format)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid export format. Supported: csv, json, excel'
      });
    }
    
    const result = await reportingService.executeReport(req.user.id, req.params.id);
    
    // Set appropriate headers for download
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${result.report.name}_${timestamp}.${format}`;
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    switch (format) {
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.json(result.data);
        break;
        
      case 'csv':
        res.setHeader('Content-Type', 'text/csv');
        const csv = convertToCSV(result.data);
        res.send(csv);
        break;
        
      case 'excel':
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        // Would need xlsx library for actual Excel export
        res.json({ message: 'Excel export not yet implemented' });
        break;
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to export report',
      details: error.message
    });
  }
});

// Get report statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const stats = await Report.aggregate([
      { $match: { customerId: mongoose.Types.ObjectId(req.user.id) } },
      {
        $group: {
          _id: null,
          totalReports: { $sum: 1 },
          totalViews: { $sum: '$stats.viewCount' },
          totalDownloads: { $sum: '$stats.downloadCount' },
          reportsByType: {
            $push: {
              type: '$type',
              views: '$stats.viewCount'
            }
          }
        }
      }
    ]);
    
    const typeBreakdown = await Report.aggregate([
      { $match: { customerId: mongoose.Types.ObjectId(req.user.id) } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalViews: { $sum: '$stats.viewCount' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      success: true,
      stats: stats[0] || { totalReports: 0, totalViews: 0, totalDownloads: 0 },
      typeBreakdown: typeBreakdown
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get report statistics',
      details: error.message
    });
  }
});

// Helper function to convert data to CSV
function convertToCSV(data) {
  if (!data || !data.rows || data.rows.length === 0) {
    return '';
  }
  
  const headers = data.columns.map(col => col.title || col.field).join(',');
  const rows = data.rows.map(row => {
    return data.columns.map(col => {
      const value = row[col.field] || '';
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',');
  }).join('\n');
  
  return `${headers}\n${rows}`;
}

module.exports = router;