
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');

// Uber Eats API configuration
const UBER_EATS_BASE_URL = 'https://api.uber.com/v1/eats';

// Helper function to get access token
async function getUberEatsToken() {
  try {
    // Check if credentials are available
    const clientId = process.env.UBER_EATS_CLIENT_ID;
    const clientSecret = process.env.UBER_EATS_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('Uber Eats API credentials not configured. Please add UBER_EATS_CLIENT_ID and UBER_EATS_CLIENT_SECRET to your environment variables.');
    }

    console.log('Making token request to Uber Eats API...');
    const response = await axios.post('https://login.uber.com/oauthenticateToken/v2/token', new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
      scope: 'eats.store'
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log('Token received successfully');
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting Uber Eats token:', error.response?.data || error.message);
    throw error;
  }
}

// Get store information
router.get('/store', authenticateToken, async (req, res) => {
  try {
    const token = await getUberEatsToken();
    const storeId = process.env.UBER_EATS_STORE_ID;
    
    const response = await axios.get(`${UBER_EATS_BASE_URL}/stores/${storeId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching store info:', error);
    res.status(500).json({ error: 'Failed to fetch store information' });
  }
});

// Get orders
router.get('/orders', authenticateToken, async (req, res) => {
  try {
    const token = await getUberEatsToken();
    const storeId = process.env.UBER_EATS_STORE_ID;
    
    const response = await axios.get(`${UBER_EATS_BASE_URL}/stores/${storeId}/orders`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Update order status
router.post('/orders/:orderId/status', authenticateToken, async (req, res) => {
  try {
    const token = await getUberEatsToken();
    const { orderId } = req.params;
    const { status } = req.body;
    
    const response = await axios.post(
      `${UBER_EATS_BASE_URL}/orders/${orderId}/status`,
      { status },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Get menu
router.get('/menu', authenticateToken, async (req, res) => {
  try {
    const token = await getUberEatsToken();
    const storeId = process.env.UBER_EATS_STORE_ID;
    
    const response = await axios.get(`${UBER_EATS_BASE_URL}/stores/${storeId}/menus`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching menu:', error);
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

// Update menu item
router.put('/menu/:itemId', authenticateToken, async (req, res) => {
  try {
    const token = await getUberEatsToken();
    const { itemId } = req.params;
    const menuData = req.body;
    
    const response = await axios.put(
      `${UBER_EATS_BASE_URL}/menu-items/${itemId}`,
      menuData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// Connection test endpoint
router.get('/test-connection', authenticateToken, async (req, res) => {
  try {
    // Check if credentials are configured
    const clientId = process.env.UBER_EATS_CLIENT_ID;
    const clientSecret = process.env.UBER_EATS_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return res.status(400).json({ 
        connected: false, 
        error: 'Uber Eats API credentials not configured',
        details: 'Please add UBER_EATS_CLIENT_ID and UBER_EATS_CLIENT_SECRET to your Secrets'
      });
    }

    const token = await getUberEatsToken();
    res.json({ 
      connected: true, 
      message: 'Successfully connected to Uber Eats API',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Connection test failed:', error);
    
    let errorMessage = 'Failed to connect to Uber Eats API';
    let details = error.message;
    
    if (error.response) {
      if (error.response.status === 401) {
        errorMessage = 'Invalid API credentials';
        details = 'Please check your UBER_EATS_CLIENT_ID and UBER_EATS_CLIENT_SECRET';
      } else if (error.response.status === 403) {
        errorMessage = 'Access denied';
        details = 'Your API credentials do not have the required permissions';
      }
    }
    
    res.status(500).json({ 
      connected: false, 
      error: errorMessage,
      details: details
    });
  }
});

module.exports = router;
