// VBMS Comprehensive Notifications & Activity System
// Tracks all system activity across all user roles and modules

window.vbmsNotifications = {
  // API Configuration
  API_BASE: window.location.hostname === 'localhost' 
    ? 'http://localhost:5050' 
    : 'https://vbms-backend.onrender.com',

  // Activity Categories
  ACTIVITY_TYPES: {
    // Authentication & User Management
    LOGIN: 'login',
    LOGOUT: 'logout',
    REGISTRATION: 'registration',
    PASSWORD_CHANGE: 'password_change',
    PROFILE_UPDATE: 'profile_update',
    ROLE_CHANGE: 'role_change',
    
    // Customer Activities
    CUSTOMER_SIGNUP: 'customer_signup',
    CUSTOMER_LOGIN: 'customer_login',
    CUSTOMER_SUBSCRIPTION: 'customer_subscription',
    CUSTOMER_CANCEL: 'customer_cancel',
    CUSTOMER_UPGRADE: 'customer_upgrade',
    CUSTOMER_SUPPORT: 'customer_support',
    
    // Orders & Inventory
    ORDER_CREATED: 'order_created',
    ORDER_UPDATED: 'order_updated',
    ORDER_CANCELLED: 'order_cancelled',
    ORDER_COMPLETED: 'order_completed',
    INVENTORY_LOW: 'inventory_low',
    INVENTORY_UPDATED: 'inventory_updated',
    
    // Payments & Billing
    PAYMENT_RECEIVED: 'payment_received',
    PAYMENT_FAILED: 'payment_failed',
    REFUND_PROCESSED: 'refund_processed',
    SUBSCRIPTION_RENEWED: 'subscription_renewed',
    INVOICE_GENERATED: 'invoice_generated',
    
    // Staff & Admin Activities
    ADMIN_CREATED: 'admin_created',
    STAFF_ASSIGNED: 'staff_assigned',
    PERMISSION_CHANGED: 'permission_changed',
    SYSTEM_SETTING: 'system_setting',
    BACKUP_CREATED: 'backup_created',
    
    // AI & Automation
    AI_CHAT: 'ai_chat',
    AI_ANALYSIS: 'ai_analysis',
    AUTOMATION_TRIGGERED: 'automation_triggered',
    
    // Training & Support
    TRAINING_COMPLETED: 'training_completed',
    COURSE_ENROLLED: 'course_enrolled',
    CERTIFICATE_ISSUED: 'certificate_issued',
    SUPPORT_TICKET: 'support_ticket',
    
    // Monitoring & Security
    VIDEO_ALERT: 'video_alert',
    SECURITY_EVENT: 'security_event',
    SYSTEM_ERROR: 'system_error',
    MAINTENANCE: 'maintenance',
    
    // Affiliates & Marketing
    AFFILIATE_SIGNUP: 'affiliate_signup',
    COMMISSION_EARNED: 'commission_earned',
    PAYOUT_PROCESSED: 'payout_processed',
    MARKETING_CAMPAIGN: 'marketing_campaign'
  },

  // Priority Levels
  PRIORITY: {
    LOW: 'low',
    MEDIUM: 'medium', 
    HIGH: 'high',
    CRITICAL: 'critical'
  },

  // Initialize the notification system
  init() {
    console.log('🔔 Initializing VBMS Notifications System...');
    this.loadNotifications();
    this.loadRecentActivity();
    this.startRealTimeUpdates();
    this.bindEventListeners();
  },

  // Create a new activity/notification
  createActivity(type, data = {}) {
    const activity = {
      id: this.generateId(),
      type: type,
      title: data.title || this.getDefaultTitle(type),
      description: data.description || '',
      user: data.user || vbmsAuth.getCurrentUser()?.name || 'System',
      userRole: data.userRole || vbmsAuth.getCurrentRole() || 'system',
      priority: data.priority || this.PRIORITY.MEDIUM,
      module: data.module || this.getModuleFromType(type),
      timestamp: new Date().toISOString(),
      read: false,
      data: data.additionalData || {}
    };

    // Store locally for immediate UI update
    this.storeActivityLocally(activity);
    
    // Send to backend for persistence
    this.sendToBackend(activity);
    
    // Update UI
    this.updateNotificationUI();
    this.updateActivityFeed();
    
    return activity;
  },

  // Store activity in localStorage for immediate access
  storeActivityLocally(activity) {
    const activities = JSON.parse(localStorage.getItem('vbmsActivities')) || [];
    activities.unshift(activity); // Add to beginning
    
    // Keep only last 100 activities locally
    if (activities.length > 100) {
      activities.splice(100);
    }
    
    localStorage.setItem('vbmsActivities', JSON.stringify(activities));
  },

  // Send activity to backend API
  async sendToBackend(activity) {
    try {
      const response = await fetch(`${this.API_BASE}/api/activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${vbmsAuth.getToken()}`
        },
        body: JSON.stringify(activity)
      });
      
      if (!response.ok) {
        console.warn('Failed to store activity on backend:', response.statusText);
      }
    } catch (error) {
      console.warn('Error sending activity to backend:', error);
    }
  },

  // Load notifications from backend or localStorage
  async loadNotifications() {
    try {
      const response = await fetch(`${this.API_BASE}/api/notifications`, {
        headers: {
          'Authorization': `Bearer ${vbmsAuth.getToken()}`
        }
      });
      
      if (response.ok) {
        const notifications = await response.json();
        this.displayNotifications(notifications);
      } else {
        // Fallback to localStorage
        this.loadNotificationsFromLocal();
      }
    } catch (error) {
      console.warn('Error loading notifications:', error);
      this.loadNotificationsFromLocal();
    }
  },

  // Load from localStorage as fallback
  loadNotificationsFromLocal() {
    const activities = JSON.parse(localStorage.getItem('vbmsActivities')) || [];
    const notifications = activities.filter(a => a.priority === this.PRIORITY.HIGH || a.priority === this.PRIORITY.CRITICAL);
    this.displayNotifications(notifications.slice(0, 10));
  },

  // Load recent activity
  async loadRecentActivity() {
    try {
      const response = await fetch(`${this.API_BASE}/api/activities/recent`, {
        headers: {
          'Authorization': `Bearer ${vbmsAuth.getToken()}`
        }
      });
      
      if (response.ok) {
        const activities = await response.json();
        this.displayRecentActivity(activities);
      } else {
        this.loadActivityFromLocal();
      }
    } catch (error) {
      console.warn('Error loading recent activity:', error);
      this.loadActivityFromLocal();
    }
  },

  // Load activity from localStorage
  loadActivityFromLocal() {
    const activities = JSON.parse(localStorage.getItem('vbmsActivities')) || [];
    this.displayRecentActivity(activities.slice(0, 10));
  },

  // Display notifications in the dropdown
  displayNotifications(notifications) {
    const notificationsList = document.getElementById('notificationsList');
    const notifBadge = document.getElementById('notifBadge');
    
    if (!notificationsList) return;

    if (notifications.length === 0) {
      notificationsList.innerHTML = '<li style="text-align: center; color: #888;">No new notifications</li>';
      notifBadge.style.display = 'none';
      return;
    }

    // Update badge count
    const unreadCount = notifications.filter(n => !n.read).length;
    if (unreadCount > 0) {
      notifBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
      notifBadge.style.display = 'inline-block';
    } else {
      notifBadge.style.display = 'none';
    }

    // Render notifications
    notificationsList.innerHTML = notifications.map(notif => {
      const timeAgo = this.getTimeAgo(new Date(notif.timestamp));
      const icon = this.getActivityIcon(notif.type);
      const priorityClass = notif.priority === 'critical' ? 'text-danger' : 
                           notif.priority === 'high' ? 'text-warning' : '';
      
      return `
        <li class="${!notif.read ? 'fw-bold' : ''}" onclick="vbmsNotifications.markAsRead('${notif.id}')">
          <i class="bi bi-${icon} ${priorityClass}"></i> 
          <span>${notif.title}</span>
          <span class="notif-time">${timeAgo}</span>
        </li>
      `;
    }).join('');
  },

  // Display recent activity feed
  displayRecentActivity(activities) {
    const activityFeed = document.querySelector('.activity-feed ul');
    if (!activityFeed) return;

    if (activities.length === 0) {
      activityFeed.innerHTML = '<li style="text-align: center; color: #888;">No recent activity</li>';
      return;
    }

    activityFeed.innerHTML = activities.slice(0, 8).map(activity => {
      const timeAgo = this.getTimeAgo(new Date(activity.timestamp));
      const icon = this.getActivityIcon(activity.type);
      const roleDisplay = this.getRoleDisplay(activity.userRole);
      
      return `
        <li>
          <i class="bi bi-${icon}"></i> 
          <span>${activity.title}</span>
          <span class="notif-time">${timeAgo}</span>
        </li>
      `;
    }).join('');
  },

  // Update notification UI
  updateNotificationUI() {
    this.loadNotifications();
  },

  // Update activity feed
  updateActivityFeed() {
    this.loadRecentActivity();
  },

  // Start real-time updates
  startRealTimeUpdates() {
    // Poll for new activities every 30 seconds
    setInterval(() => {
      this.loadNotifications();
      this.loadRecentActivity();
    }, 30000);

    // Check for WebSocket support for real-time updates
    if (typeof WebSocket !== 'undefined') {
      this.initWebSocket();
    }
  },

  // Initialize WebSocket for real-time updates
  initWebSocket() {
    try {
      const wsUrl = this.API_BASE.replace('http', 'ws') + '/ws/activities';
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onmessage = (event) => {
        const activity = JSON.parse(event.data);
        this.storeActivityLocally(activity);
        this.updateNotificationUI();
        this.updateActivityFeed();
      };
      
      this.ws.onclose = () => {
        // Reconnect after 5 seconds
        setTimeout(() => this.initWebSocket(), 5000);
      };
    } catch (error) {
      console.warn('WebSocket not available, using polling only');
    }
  },

  // Bind event listeners
  bindEventListeners() {
    // Track login/logout events
    this.trackAuthEvents();
    
    // Track navigation events
    this.trackPageViews();
    
    // Track form submissions
    this.trackFormSubmissions();
  },

  // Track authentication events
  trackAuthEvents() {
    // Override login function
    const originalLogin = vbmsAuth.login;
    vbmsAuth.login = (...args) => {
      return originalLogin.apply(vbmsAuth, args).then(result => {
        this.createActivity(this.ACTIVITY_TYPES.LOGIN, {
          title: `${result.user.name} logged in`,
          userRole: result.user.role,
          module: 'Authentication'
        });
        return result;
      });
    };

    // Override logout function
    const originalLogout = vbmsAuth.logout;
    vbmsAuth.logout = () => {
      const user = vbmsAuth.getCurrentUser();
      if (user) {
        this.createActivity(this.ACTIVITY_TYPES.LOGOUT, {
          title: `${user.name} logged out`,
          userRole: vbmsAuth.getCurrentRole(),
          module: 'Authentication'
        });
      }
      return originalLogout.apply(vbmsAuth);
    };
  },

  // Track page views
  trackPageViews() {
    const currentPage = window.location.pathname.split('/').pop();
    const pageName = currentPage.replace('.html', '').replace('-', ' ');
    
    this.createActivity('page_view', {
      title: `Viewed ${pageName} page`,
      priority: this.PRIORITY.LOW,
      module: this.getModuleFromPage(currentPage)
    });
  },

  // Track form submissions
  trackFormSubmissions() {
    document.addEventListener('submit', (e) => {
      const form = e.target;
      const formId = form.id || form.className;
      
      this.createActivity('form_submission', {
        title: `Form submitted: ${formId}`,
        priority: this.PRIORITY.LOW,
        additionalData: { formId }
      });
    });
  },

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      await fetch(`${this.API_BASE}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${vbmsAuth.getToken()}`
        }
      });
      
      // Update local storage
      const activities = JSON.parse(localStorage.getItem('vbmsActivities')) || [];
      const activity = activities.find(a => a.id === notificationId);
      if (activity) {
        activity.read = true;
        localStorage.setItem('vbmsActivities', JSON.stringify(activities));
      }
      
      this.updateNotificationUI();
    } catch (error) {
      console.warn('Error marking notification as read:', error);
    }
  },

  // Utility Functions
  generateId() {
    return 'activity_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },

  getDefaultTitle(type) {
    const titles = {
      [this.ACTIVITY_TYPES.LOGIN]: 'User logged in',
      [this.ACTIVITY_TYPES.LOGOUT]: 'User logged out',
      [this.ACTIVITY_TYPES.REGISTRATION]: 'New user registered',
      [this.ACTIVITY_TYPES.ORDER_CREATED]: 'New order created',
      [this.ACTIVITY_TYPES.PAYMENT_RECEIVED]: 'Payment received',
      [this.ACTIVITY_TYPES.CUSTOMER_SIGNUP]: 'New customer signed up',
      [this.ACTIVITY_TYPES.INVENTORY_LOW]: 'Low inventory alert',
      [this.ACTIVITY_TYPES.SYSTEM_ERROR]: 'System error occurred',
      [this.ACTIVITY_TYPES.AI_CHAT]: 'AI chat session',
      [this.ACTIVITY_TYPES.TRAINING_COMPLETED]: 'Training completed',
      [this.ACTIVITY_TYPES.AFFILIATE_SIGNUP]: 'New affiliate joined'
    };
    return titles[type] || 'System activity';
  },

  getModuleFromType(type) {
    if (type.includes('order') || type.includes('inventory')) return 'Orders & Inventory';
    if (type.includes('payment') || type.includes('billing')) return 'Billing & Payments';
    if (type.includes('customer')) return 'Customer Management';
    if (type.includes('admin') || type.includes('staff')) return 'User Management';
    if (type.includes('ai')) return 'AI Tools';
    if (type.includes('training') || type.includes('course')) return 'Training';
    if (type.includes('affiliate') || type.includes('commission')) return 'Affiliates';
    if (type.includes('video') || type.includes('monitoring')) return 'Video Monitoring';
    return 'System';
  },

  getModuleFromPage(page) {
    if (page.includes('order')) return 'Orders & Inventory';
    if (page.includes('customer') || page.includes('client')) return 'Customer Management';
    if (page.includes('admin')) return 'Administration';
    if (page.includes('training')) return 'Training';
    if (page.includes('affiliate')) return 'Affiliates';
    if (page.includes('ai')) return 'AI Tools';
    if (page.includes('monitoring')) return 'Video Monitoring';
    return 'Dashboard';
  },

  getActivityIcon(type) {
    const icons = {
      login: 'door-open',
      logout: 'door-closed',
      registration: 'person-plus',
      order_created: 'box',
      payment_received: 'credit-card',
      customer_signup: 'person-check',
      inventory_low: 'exclamation-triangle',
      system_error: 'bug',
      ai_chat: 'chat-dots',
      training_completed: 'mortarboard',
      affiliate_signup: 'share',
      page_view: 'eye',
      form_submission: 'check-square',
      profile_update: 'pencil',
      role_change: 'shield-check',
      backup_created: 'shield-check',
      video_alert: 'camera-video',
      support_ticket: 'life-preserver'
    };
    return icons[type] || 'info-circle';
  },

  getRoleDisplay(role) {
    const displays = {
      'main_admin': 'Super Admin',
      'admin': 'Admin',
      'staff': 'Staff',
      'customer': 'Customer',
      'client': 'Client',
      'system': 'System'
    };
    return displays[role] || role;
  },

  getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    if (diffDays < 7) return `${diffDays} day ago`;
    return date.toLocaleDateString();
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => vbmsNotifications.init());
} else {
  vbmsNotifications.init();
}

// Make available globally
window.trackActivity = (type, data) => vbmsNotifications.createActivity(type, data);