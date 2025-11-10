// VBMS API Simulation - For development/demo purposes
// This simulates backend API responses for notifications and activities

window.vbmsApiSimulation = {
  // Simulate API delays
  delay: 500,

  // Mock data storage
  activities: [],
  notifications: [],

  // Initialize with some sample data
  init() {
    console.log('🔧 VBMS API Simulation initialized (for demo purposes)');
    this.generateSampleData();
  },

  generateSampleData() {
    const sampleActivities = [
      {
        id: 'activity_1',
        type: 'customer_signup',
        title: 'Jane Doe signed up for Basic plan',
        user: 'Jane Doe',
        userRole: 'customer',
        priority: 'medium',
        module: 'Customer Management',
        timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        read: false
      },
      {
        id: 'activity_2',
        type: 'payment_received',
        title: 'Payment received: $99.00 from Tech Startup Inc',
        user: 'Tech Startup Inc',
        userRole: 'customer',
        priority: 'high',
        module: 'Billing & Payments',
        timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        read: false
      },
      {
        id: 'activity_3',
        type: 'order_created',
        title: 'Order #ORD-2024-100 created',
        user: 'Maria Garcia',
        userRole: 'customer',
        priority: 'medium',
        module: 'Orders & Inventory',
        timestamp: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
        read: true
      },
      {
        id: 'activity_4',
        type: 'inventory_low',
        title: 'Low inventory: Smart Cameras (3 left)',
        user: 'System',
        userRole: 'system',
        priority: 'high',
        module: 'Orders & Inventory',
        timestamp: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
        read: false
      },
      {
        id: 'activity_5',
        type: 'training_completed',
        title: 'David Kim completed "Advanced Video Analytics"',
        user: 'David Kim',
        userRole: 'customer',
        priority: 'medium',
        module: 'Training',
        timestamp: new Date(Date.now() - 18000000).toISOString(), // 5 hours ago
        read: true
      }
    ];

    this.activities = sampleActivities;
    this.notifications = sampleActivities.filter(a => a.priority === 'high' || a.priority === 'critical');
  },

  // Simulate POST /api/activities
  async createActivity(activity) {
    await this.simulateDelay();
    
    // Add to activities array
    this.activities.unshift({
      ...activity,
      timestamp: new Date().toISOString()
    });

    // Keep only last 50 activities
    if (this.activities.length > 50) {
      this.activities = this.activities.slice(0, 50);
    }

    // Add to notifications if high priority
    if (activity.priority === 'high' || activity.priority === 'critical') {
      this.notifications.unshift(activity);
      if (this.notifications.length > 20) {
        this.notifications = this.notifications.slice(0, 20);
      }
    }

    return { success: true, id: activity.id };
  },

  // Simulate GET /api/notifications
  async getNotifications() {
    await this.simulateDelay();
    return this.notifications.slice(0, 10);
  },

  // Simulate GET /api/activities/recent
  async getRecentActivities() {
    await this.simulateDelay();
    return this.activities.slice(0, 10);
  },

  // Simulate PUT /api/notifications/:id/read
  async markNotificationAsRead(notificationId) {
    await this.simulateDelay();
    
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }

    const activity = this.activities.find(a => a.id === notificationId);
    if (activity) {
      activity.read = true;
    }

    return { success: true };
  },

  // Utility function to simulate network delay
  async simulateDelay() {
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }
  }
};

// Override fetch for API endpoints if no real backend is available
const originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
  // Check if this is a VBMS API call and no real backend is responding
  if (url.includes('/api/activities') || url.includes('/api/notifications')) {
    return handleSimulatedAPI(url, options);
  }
  
  // For all other calls, use original fetch
  return originalFetch.apply(this, arguments);
};

async function handleSimulatedAPI(url, options) {
  console.log(`🔧 API Simulation handling: ${options.method || 'GET'} ${url}`);
  
  try {
    // Try the real API first
    const realResponse = await originalFetch(url, options);
    if (realResponse.ok) {
      return realResponse;
    }
  } catch (error) {
    // Real API not available, use simulation
  }

  // Handle simulated endpoints
  if (url.includes('/api/activities') && options.method === 'POST') {
    const activity = JSON.parse(options.body);
    const result = await vbmsApiSimulation.createActivity(activity);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (url.includes('/api/notifications') && !options.method) {
    const notifications = await vbmsApiSimulation.getNotifications();
    return new Response(JSON.stringify(notifications), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (url.includes('/api/activities/recent') && !options.method) {
    const activities = await vbmsApiSimulation.getRecentActivities();
    return new Response(JSON.stringify(activities), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (url.includes('/api/notifications/') && url.includes('/read') && options.method === 'PUT') {
    const notificationId = url.split('/').slice(-2)[0];
    const result = await vbmsApiSimulation.markNotificationAsRead(notificationId);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Return 404 for unhandled API calls
  return new Response(JSON.stringify({ error: 'API endpoint not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Initialize API simulation
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => vbmsApiSimulation.init());
} else {
  vbmsApiSimulation.init();
}