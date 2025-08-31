const InventoryItem = require('../models/InventoryItem');
const InventoryTransaction = require('../models/InventoryTransaction');
const emailService = require('./emailService');

class InventoryService {
  
  // Create new inventory item
  async createItem(customerId, itemData) {
    try {
      // Check if SKU already exists for this customer
      const existingItem = await InventoryItem.findOne({
        customerId: customerId,
        sku: itemData.sku
      });
      
      if (existingItem) {
        throw new Error('Item with this SKU already exists');
      }
      
      const item = new InventoryItem({
        ...itemData,
        customerId: customerId
      });
      
      await item.save();
      
      // Create initial stock transaction if quantity > 0
      if (item.quantity.current > 0) {
        await this.createTransaction({
          customerId: customerId,
          itemId: item._id,
          type: 'stock_in',
          quantity: item.quantity.current,
          beforeQuantity: 0,
          afterQuantity: item.quantity.current,
          reason: 'Initial stock entry',
          unitCost: item.pricing.cost
        });
      }
      
      return item;
    } catch (error) {
      throw new Error(`Failed to create inventory item: ${error.message}`);
    }
  }
  
  // Update inventory item
  async updateItem(customerId, itemId, updateData) {
    try {
      const item = await InventoryItem.findOne({
        _id: itemId,
        customerId: customerId
      });
      
      if (!item) {
        throw new Error('Item not found');
      }
      
      // Handle quantity changes separately
      if (updateData.quantity && updateData.quantity.current !== undefined) {
        const oldQuantity = item.quantity.current;
        const newQuantity = updateData.quantity.current;
        const adjustment = newQuantity - oldQuantity;
        
        if (adjustment !== 0) {
          await item.adjustQuantity(adjustment, 'Manual adjustment via update');
        }
        
        // Remove quantity from update data to avoid double update
        delete updateData.quantity;
      }
      
      // Update other fields
      Object.assign(item, updateData);
      await item.save();
      
      return item;
    } catch (error) {
      throw new Error(`Failed to update inventory item: ${error.message}`);
    }
  }
  
  // Delete inventory item
  async deleteItem(customerId, itemId) {
    try {
      const item = await InventoryItem.findOne({
        _id: itemId,
        customerId: customerId
      });
      
      if (!item) {
        throw new Error('Item not found');
      }
      
      // Check if item has transactions
      const transactionCount = await InventoryTransaction.countDocuments({
        itemId: itemId
      });
      
      if (transactionCount > 0) {
        // Mark as inactive instead of deleting
        item.status = 'inactive';
        await item.save();
        return { message: 'Item marked as inactive due to existing transactions' };
      } else {
        await InventoryItem.findByIdAndDelete(itemId);
        return { message: 'Item deleted successfully' };
      }
    } catch (error) {
      throw new Error(`Failed to delete inventory item: ${error.message}`);
    }
  }
  
  // Get inventory items with filtering and pagination
  async getItems(customerId, filters = {}, options = {}) {
    try {
      const {
        category,
        status = 'active',
        stockStatus,
        search,
        page = 1,
        limit = 20,
        sortBy = 'name',
        sortOrder = 'asc'
      } = { ...filters, ...options };
      
      const query = { customerId };
      
      // Apply filters
      if (category && category !== 'all') {
        query.category = category;
      }
      
      if (status && status !== 'all') {
        query.status = status;
      }
      
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }
      
      // Stock status filtering
      if (stockStatus) {
        switch (stockStatus) {
          case 'low_stock':
            query.$expr = {
              $lte: ['$quantity.current', '$stockLevels.reorderPoint']
            };
            break;
          case 'out_of_stock':
            query['quantity.current'] = 0;
            break;
          case 'overstock':
            query.$expr = {
              $gte: ['$quantity.current', '$stockLevels.maximum']
            };
            break;
        }
      }
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      const items = await InventoryItem.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('customerId', 'name email');
      
      const total = await InventoryItem.countDocuments(query);
      
      return {
        items,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get inventory items: ${error.message}`);
    }
  }
  
  // Get single item by ID
  async getItem(customerId, itemId) {
    try {
      const item = await InventoryItem.findOne({
        _id: itemId,
        customerId: customerId
      }).populate('customerId', 'name email');
      
      if (!item) {
        throw new Error('Item not found');
      }
      
      return item;
    } catch (error) {
      throw new Error(`Failed to get inventory item: ${error.message}`);
    }
  }
  
  // Create inventory transaction
  async createTransaction(transactionData) {
    try {
      const transaction = new InventoryTransaction(transactionData);
      await transaction.save();
      
      return transaction;
    } catch (error) {
      throw new Error(`Failed to create transaction: ${error.message}`);
    }
  }
  
  // Adjust item quantity with transaction logging
  async adjustQuantity(customerId, itemId, adjustment, reason, performedBy = null) {
    try {
      const item = await InventoryItem.findOne({
        _id: itemId,
        customerId: customerId
      });
      
      if (!item) {
        throw new Error('Item not found');
      }
      
      const oldQuantity = item.quantity.current;
      await item.adjustQuantity(adjustment, reason);
      
      // Create transaction record
      const transaction = await this.createTransaction({
        customerId: customerId,
        itemId: itemId,
        type: adjustment > 0 ? 'stock_in' : 'stock_out',
        quantity: Math.abs(adjustment),
        beforeQuantity: oldQuantity,
        afterQuantity: item.quantity.current,
        reason: reason,
        performedBy: performedBy,
        unitCost: item.pricing.cost
      });
      
      // Check for alerts
      await this.checkStockAlerts(item);
      
      return { item, transaction };
    } catch (error) {
      throw new Error(`Failed to adjust quantity: ${error.message}`);
    }
  }
  
  // Transfer stock between locations
  async transferStock(customerId, itemId, fromLocation, toLocation, quantity, reason) {
    try {
      const item = await InventoryItem.findOne({
        _id: itemId,
        customerId: customerId
      });
      
      if (!item) {
        throw new Error('Item not found');
      }
      
      // Find source location
      const sourceLocation = item.locations.find(loc => 
        loc.warehouse === fromLocation.warehouse &&
        loc.zone === fromLocation.zone
      );
      
      if (!sourceLocation || sourceLocation.quantity < quantity) {
        throw new Error('Insufficient quantity at source location');
      }
      
      // Update source location
      sourceLocation.quantity -= quantity;
      
      // Find or create destination location
      let destLocation = item.locations.find(loc =>
        loc.warehouse === toLocation.warehouse &&
        loc.zone === toLocation.zone
      );
      
      if (!destLocation) {
        destLocation = {
          warehouse: toLocation.warehouse,
          zone: toLocation.zone,
          aisle: toLocation.aisle,
          shelf: toLocation.shelf,
          bin: toLocation.bin,
          quantity: 0
        };
        item.locations.push(destLocation);
      }
      
      destLocation.quantity += quantity;
      
      await item.save();
      
      // Create transfer transaction
      const transaction = await this.createTransaction({
        customerId: customerId,
        itemId: itemId,
        type: 'transfer',
        quantity: quantity,
        beforeQuantity: item.quantity.current,
        afterQuantity: item.quantity.current,
        reason: reason,
        location: {
          from: fromLocation,
          to: toLocation
        }
      });
      
      return { item, transaction };
    } catch (error) {
      throw new Error(`Failed to transfer stock: ${error.message}`);
    }
  }
  
  // Get inventory analytics
  async getAnalytics(customerId, startDate, endDate) {
    try {
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();
      
      // Basic inventory stats
      const totalItems = await InventoryItem.countDocuments({ customerId });
      const activeItems = await InventoryItem.countDocuments({ customerId, status: 'active' });
      const lowStockItems = await InventoryItem.countDocuments({
        customerId,
        $expr: { $lte: ['$quantity.current', '$stockLevels.reorderPoint'] }
      });
      const outOfStockItems = await InventoryItem.countDocuments({
        customerId,
        'quantity.current': 0
      });
      
      // Inventory value calculation
      const inventoryValue = await InventoryItem.aggregate([
        { $match: { customerId: customerId, status: 'active' } },
        {
          $group: {
            _id: null,
            totalValue: {
              $sum: { $multiply: ['$quantity.current', '$pricing.cost'] }
            },
            totalRetailValue: {
              $sum: { $multiply: ['$quantity.current', '$pricing.sellingPrice'] }
            },
            totalQuantity: { $sum: '$quantity.current' }
          }
        }
      ]);
      
      // Transaction analytics
      const transactions = await InventoryTransaction.getTransactionsByPeriod(customerId, start, end);
      const transactionsByType = await InventoryTransaction.aggregate([
        {
          $match: {
            customerId: customerId,
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalQuantity: { $sum: '$quantity' },
            totalValue: { $sum: '$totalCost' }
          }
        }
      ]);
      
      // Top moving items
      const topMovingItems = await InventoryTransaction.getTopMovingItems(customerId, start, end, 10);
      
      // Category breakdown
      const categoryBreakdown = await InventoryItem.aggregate([
        { $match: { customerId: customerId, status: 'active' } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalQuantity: { $sum: '$quantity.current' },
            totalValue: { $sum: { $multiply: ['$quantity.current', '$pricing.cost'] } }
          }
        },
        { $sort: { totalValue: -1 } }
      ]);
      
      return {
        summary: {
          totalItems,
          activeItems,
          lowStockItems,
          outOfStockItems,
          inventoryValue: inventoryValue[0] || { totalValue: 0, totalRetailValue: 0, totalQuantity: 0 },
          stockTurnoverRate: this.calculateTurnoverRate(transactions)
        },
        transactions: {
          total: transactions.length,
          byType: transactionsByType
        },
        topMovingItems,
        categoryBreakdown,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      };
    } catch (error) {
      throw new Error(`Failed to get analytics: ${error.message}`);
    }
  }
  
  // Check for stock alerts and send notifications
  async checkStockAlerts(item) {
    try {
      const alerts = [];
      
      // Low stock alert
      if (item.alerts.lowStock && item.quantity.current <= item.stockLevels.reorderPoint && item.quantity.current > 0) {
        alerts.push({
          type: 'low_stock',
          message: `${item.name} (${item.sku}) is running low. Current: ${item.quantity.current}, Reorder Point: ${item.stockLevels.reorderPoint}`
        });
      }
      
      // Out of stock alert
      if (item.alerts.outOfStock && item.quantity.current === 0) {
        alerts.push({
          type: 'out_of_stock',
          message: `${item.name} (${item.sku}) is out of stock`
        });
      }
      
      // Overstock alert
      if (item.alerts.overstock && item.quantity.current >= item.stockLevels.maximum) {
        alerts.push({
          type: 'overstock',
          message: `${item.name} (${item.sku}) is overstocked. Current: ${item.quantity.current}, Maximum: ${item.stockLevels.maximum}`
        });
      }
      
      // Expiring soon alert
      if (item.alerts.expiringSoon && item.isPerishable && item.expirationDate) {
        const daysUntilExpiration = Math.ceil((new Date(item.expirationDate) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiration <= 7 && daysUntilExpiration > 0) {
          alerts.push({
            type: 'expiring_soon',
            message: `${item.name} (${item.sku}) expires in ${daysUntilExpiration} days`
          });
        }
      }
      
      // Send email notifications if there are alerts
      if (alerts.length > 0) {
        await this.sendStockAlerts(item.customerId, alerts);
      }
      
      return alerts;
    } catch (error) {
      console.error('Error checking stock alerts:', error);
      return [];
    }
  }
  
  // Send stock alert emails
  async sendStockAlerts(customerId, alerts) {
    try {
      const User = require('../models/User');
      const user = await User.findById(customerId);
      
      if (!user || !user.profile?.preferences?.notifications) {
        return;
      }
      
      const subject = `VBMS Inventory Alert - ${alerts.length} item(s) need attention`;
      const alertsList = alerts.map(alert => `• ${alert.message}`).join('\n');
      
      const htmlContent = `
        <h2>Inventory Alerts</h2>
        <p>The following items in your inventory need attention:</p>
        <ul>
          ${alerts.map(alert => `<li>${alert.message}</li>`).join('')}
        </ul>
        <p><a href="${process.env.FRONTEND_URL}/customer-inventory.html" style="background: #f0b90b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Inventory</a></p>
      `;
      
      await emailService.sendEmail(user.email, subject, htmlContent);
    } catch (error) {
      console.error('Error sending stock alerts:', error);
    }
  }
  
  // Calculate inventory turnover rate
  calculateTurnoverRate(transactions) {
    const stockOutTransactions = transactions.filter(t => t.type === 'stock_out');
    if (stockOutTransactions.length === 0) return 0;
    
    const totalSold = stockOutTransactions.reduce((sum, t) => sum + t.quantity, 0);
    const days = 30; // Calculate for 30-day period
    
    return (totalSold / days).toFixed(2);
  }
  
  // Bulk import items from CSV data
  async bulkImport(customerId, csvData, performedBy) {
    try {
      const results = {
        success: [],
        errors: [],
        total: csvData.length
      };
      
      for (let i = 0; i < csvData.length; i++) {
        try {
          const itemData = this.mapCsvToItem(csvData[i]);
          const item = await this.createItem(customerId, itemData);
          results.success.push({ row: i + 1, item: item.name, sku: item.sku });
        } catch (error) {
          results.errors.push({ row: i + 1, error: error.message });
        }
      }
      
      return results;
    } catch (error) {
      throw new Error(`Bulk import failed: ${error.message}`);
    }
  }
  
  // Map CSV row to inventory item structure
  mapCsvToItem(csvRow) {
    return {
      name: csvRow.name || csvRow.Name,
      sku: csvRow.sku || csvRow.SKU,
      description: csvRow.description || csvRow.Description || '',
      category: csvRow.category || csvRow.Category || 'other',
      quantity: {
        current: parseInt(csvRow.quantity || csvRow.Quantity || 0)
      },
      stockLevels: {
        minimum: parseInt(csvRow.minimum || csvRow.Minimum || 0),
        reorderPoint: parseInt(csvRow.reorderPoint || csvRow['Reorder Point'] || 10)
      },
      pricing: {
        cost: parseFloat(csvRow.cost || csvRow.Cost || 0),
        sellingPrice: parseFloat(csvRow.sellingPrice || csvRow['Selling Price'] || 0)
      }
    };
  }

  // Utility methods for testing and general use
  calculateReorderAmount(currentStock, reorderPoint, maxStock) {
    if (currentStock <= reorderPoint) {
      return maxStock - currentStock;
    }
    return 0;
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  validateSKUFormat(sku) {
    // Simple SKU validation - alphanumeric and hyphens only
    const skuRegex = /^[A-Za-z0-9-]+$/;
    return skuRegex.test(sku) && !sku.includes(' ');
  }
}

module.exports = new InventoryService();