const express = require('express');
const router = express.Router();
const inventoryService = require('../services/inventoryService');
const InventoryItem = require('../models/InventoryItem');
const InventoryTransaction = require('../models/InventoryTransaction');
const { authenticateToken } = require('../middleware/auth');
const ValidationMiddleware = require('../middleware/validation');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

// Configure multer for CSV uploads
const upload = multer({ dest: 'uploads/temp/' });

// Get all inventory items with filtering and pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await inventoryService.getItems(req.user.id, req.query);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inventory items',
      details: error.message
    });
  }
});

// Get single inventory item
router.get('/:id', authenticateToken, ValidationMiddleware.validateMongoId('id'), async (req, res) => {
  try {
    const item = await inventoryService.getItem(req.user.id, req.params.id);
    res.json({
      success: true,
      item: item
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: 'Item not found',
      details: error.message
    });
  }
});

// Create new inventory item
router.post('/',
  authenticateToken,
  [
    ValidationMiddleware.sanitizeHTML(),
    ValidationMiddleware.handleValidationErrors()
  ],
  async (req, res) => {
    try {
      // Check if user has inventory tracking feature
      if (req.user.role !== 'admin' && !req.user.subscription?.features?.inventoryTracker) {
        return res.status(403).json({
          error: 'Inventory tracking feature not available in your subscription'
        });
      }

      const item = await inventoryService.createItem(req.user.id, req.body);
      
      res.status(201).json({
        success: true,
        item: item,
        message: 'Inventory item created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to create inventory item',
        details: error.message
      });
    }
  }
);

// Update inventory item
router.put('/:id',
  authenticateToken,
  ValidationMiddleware.validateMongoId('id'),
  [
    ValidationMiddleware.sanitizeHTML(),
    ValidationMiddleware.handleValidationErrors()
  ],
  async (req, res) => {
    try {
      const item = await inventoryService.updateItem(req.user.id, req.params.id, req.body);
      
      res.json({
        success: true,
        item: item,
        message: 'Inventory item updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to update inventory item',
        details: error.message
      });
    }
  }
);

// Delete inventory item
router.delete('/:id', authenticateToken, ValidationMiddleware.validateMongoId('id'), async (req, res) => {
  try {
    const result = await inventoryService.deleteItem(req.user.id, req.params.id);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Failed to delete inventory item',
      details: error.message
    });
  }
});

// Adjust item quantity
router.post('/:id/adjust',
  authenticateToken,
  ValidationMiddleware.validateMongoId('id'),
  [
    ValidationMiddleware.sanitizeHTML(),
    ValidationMiddleware.handleValidationErrors()
  ],
  async (req, res) => {
    try {
      const { adjustment, reason } = req.body;
      
      if (!adjustment || !reason) {
        return res.status(400).json({
          error: 'Adjustment amount and reason are required'
        });
      }
      
      if (typeof adjustment !== 'number') {
        return res.status(400).json({
          error: 'Adjustment must be a number'
        });
      }
      
      const result = await inventoryService.adjustQuantity(
        req.user.id,
        req.params.id,
        adjustment,
        reason,
        req.user.id
      );
      
      res.json({
        success: true,
        item: result.item,
        transaction: result.transaction,
        message: 'Quantity adjusted successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to adjust quantity',
        details: error.message
      });
    }
  }
);

// Transfer stock between locations
router.post('/:id/transfer',
  authenticateToken,
  ValidationMiddleware.validateMongoId('id'),
  [
    ValidationMiddleware.sanitizeHTML(),
    ValidationMiddleware.handleValidationErrors()
  ],
  async (req, res) => {
    try {
      const { fromLocation, toLocation, quantity, reason } = req.body;
      
      if (!fromLocation || !toLocation || !quantity || !reason) {
        return res.status(400).json({
          error: 'From location, to location, quantity, and reason are required'
        });
      }
      
      const result = await inventoryService.transferStock(
        req.user.id,
        req.params.id,
        fromLocation,
        toLocation,
        quantity,
        reason
      );
      
      res.json({
        success: true,
        item: result.item,
        transaction: result.transaction,
        message: 'Stock transferred successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to transfer stock',
        details: error.message
      });
    }
  }
);

// Get inventory analytics
router.get('/analytics/summary', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const analytics = await inventoryService.getAnalytics(req.user.id, startDate, endDate);
    
    res.json({
      success: true,
      analytics: analytics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get inventory analytics',
      details: error.message
    });
  }
});

// Get low stock items
router.get('/alerts/low-stock', authenticateToken, async (req, res) => {
  try {
    const lowStockItems = await InventoryItem.find({
      customerId: req.user.id,
      status: 'active',
      $expr: { $lte: ['$quantity.current', '$stockLevels.reorderPoint'] }
    }).sort({ 'quantity.current': 1 });
    
    res.json({
      success: true,
      items: lowStockItems,
      count: lowStockItems.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get low stock items',
      details: error.message
    });
  }
});

// Get out of stock items
router.get('/alerts/out-of-stock', authenticateToken, async (req, res) => {
  try {
    const outOfStockItems = await InventoryItem.find({
      customerId: req.user.id,
      'quantity.current': 0,
      status: 'active'
    }).sort({ updatedAt: -1 });
    
    res.json({
      success: true,
      items: outOfStockItems,
      count: outOfStockItems.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get out of stock items',
      details: error.message
    });
  }
});

// Get inventory transactions
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const {
      itemId,
      type,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;
    
    const query = { customerId: req.user.id };
    
    if (itemId) query.itemId = itemId;
    if (type) query.type = type;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const transactions = await InventoryTransaction.find(query)
      .populate('itemId', 'name sku category')
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await InventoryTransaction.countDocuments(query);
    
    res.json({
      success: true,
      transactions: transactions,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get transactions',
      details: error.message
    });
  }
});

// Get item transaction history
router.get('/:id/transactions', authenticateToken, ValidationMiddleware.validateMongoId('id'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Verify item ownership
    const item = await InventoryItem.findOne({
      _id: req.params.id,
      customerId: req.user.id
    });
    
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    
    const transactions = await InventoryTransaction.find({
      itemId: req.params.id
    })
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await InventoryTransaction.countDocuments({
      itemId: req.params.id
    });
    
    res.json({
      success: true,
      item: {
        name: item.name,
        sku: item.sku
      },
      transactions: transactions,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get item transaction history',
      details: error.message
    });
  }
});

// Bulk import from CSV
router.post('/import',
  authenticateToken,
  upload.single('csvFile'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'CSV file is required'
        });
      }
      
      // Check if user has inventory tracking feature
      if (req.user.role !== 'admin' && !req.user.subscription?.features?.inventoryTracker) {
        return res.status(403).json({
          error: 'Inventory tracking feature not available in your subscription'
        });
      }
      
      const csvData = [];
      
      // Parse CSV file
      await new Promise((resolve, reject) => {
        fs.createReadStream(req.file.path)
          .pipe(csv())
          .on('data', (row) => {
            csvData.push(row);
          })
          .on('end', resolve)
          .on('error', reject);
      });
      
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      
      if (csvData.length === 0) {
        return res.status(400).json({
          error: 'CSV file is empty or invalid'
        });
      }
      
      // Process bulk import
      const results = await inventoryService.bulkImport(req.user.id, csvData, req.user.id);
      
      res.json({
        success: true,
        results: results,
        message: `Import completed: ${results.success.length} items imported, ${results.errors.length} errors`
      });
    } catch (error) {
      // Clean up file if it exists
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to import CSV',
        details: error.message
      });
    }
  }
);

// Get inventory categories
router.get('/categories/list', authenticateToken, async (req, res) => {
  try {
    const categories = await InventoryItem.distinct('category', {
      customerId: req.user.id,
      status: 'active'
    });
    
    res.json({
      success: true,
      categories: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get categories',
      details: error.message
    });
  }
});

// Search items by barcode
router.get('/search/barcode/:barcode', authenticateToken, async (req, res) => {
  try {
    const { barcode } = req.params;
    
    const item = await InventoryItem.findOne({
      customerId: req.user.id,
      barcode: barcode,
      status: 'active'
    });
    
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found with this barcode'
      });
    }
    
    res.json({
      success: true,
      item: item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to search by barcode',
      details: error.message
    });
  }
});

module.exports = router;