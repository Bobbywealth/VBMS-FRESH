// VBMS Activity Tracker - Business-specific event tracking
// This script provides easy-to-use functions for tracking common business events

window.activityTracker = {
  // Customer Activities
  trackCustomerLogin(customerName, customerEmail) {
    if (window.vbmsNotifications) {
      vbmsNotifications.createActivity(vbmsNotifications.ACTIVITY_TYPES.CUSTOMER_LOGIN, {
        title: `${customerName} logged in`,
        priority: vbmsNotifications.PRIORITY.LOW,
        user: customerName,
        userRole: 'customer',
        module: 'Authentication',
        additionalData: { email: customerEmail }
      });
    }
  },

  trackCustomerSignup(customerName, customerEmail, plan = 'Free') {
    if (window.vbmsNotifications) {
      vbmsNotifications.createActivity(vbmsNotifications.ACTIVITY_TYPES.CUSTOMER_SIGNUP, {
        title: `${customerName} signed up for ${plan} plan`,
        priority: vbmsNotifications.PRIORITY.HIGH,
        user: customerName,
        userRole: 'customer',
        module: 'Customer Management',
        additionalData: { email: customerEmail, plan }
      });
    }
  },

  trackSubscriptionChange(customerName, oldPlan, newPlan, amount) {
    if (window.vbmsNotifications) {
      const isUpgrade = ['Free', 'Basic', 'Premium', 'Enterprise'].indexOf(newPlan) > 
                       ['Free', 'Basic', 'Premium', 'Enterprise'].indexOf(oldPlan);
      
      vbmsNotifications.createActivity(
        isUpgrade ? vbmsNotifications.ACTIVITY_TYPES.CUSTOMER_UPGRADE : 'subscription_downgrade',
        {
          title: `${customerName} ${isUpgrade ? 'upgraded' : 'changed'} from ${oldPlan} to ${newPlan}`,
          priority: vbmsNotifications.PRIORITY.HIGH,
          user: customerName,
          userRole: 'customer',
          module: 'Billing & Payments',
          additionalData: { oldPlan, newPlan, amount }
        }
      );
    }
  },

  // Order Activities
  trackOrderCreated(orderNumber, customerName, amount, items = []) {
    if (window.vbmsNotifications) {
      vbmsNotifications.createActivity(vbmsNotifications.ACTIVITY_TYPES.ORDER_CREATED, {
        title: `Order #${orderNumber} created for $${amount}`,
        priority: vbmsNotifications.PRIORITY.MEDIUM,
        user: customerName,
        userRole: 'customer',
        module: 'Orders & Inventory',
        additionalData: { orderNumber, amount, items }
      });
    }
  },

  trackOrderStatusChange(orderNumber, customerName, oldStatus, newStatus) {
    if (window.vbmsNotifications) {
      const priority = newStatus === 'completed' ? vbmsNotifications.PRIORITY.MEDIUM :
                      newStatus === 'cancelled' ? vbmsNotifications.PRIORITY.HIGH :
                      vbmsNotifications.PRIORITY.LOW;

      vbmsNotifications.createActivity(vbmsNotifications.ACTIVITY_TYPES.ORDER_UPDATED, {
        title: `Order #${orderNumber} ${newStatus}`,
        priority: priority,
        user: customerName,
        userRole: 'customer',
        module: 'Orders & Inventory',
        additionalData: { orderNumber, oldStatus, newStatus }
      });
    }
  },

  // Payment Activities
  trackPaymentReceived(amount, customerName, method = 'card', orderNumber = null) {
    if (window.vbmsNotifications) {
      vbmsNotifications.createActivity(vbmsNotifications.ACTIVITY_TYPES.PAYMENT_RECEIVED, {
        title: `Payment received: $${amount} from ${customerName}`,
        priority: vbmsNotifications.PRIORITY.HIGH,
        user: customerName,
        userRole: 'customer',
        module: 'Billing & Payments',
        additionalData: { amount, method, orderNumber }
      });
    }
  },

  trackPaymentFailed(amount, customerName, reason = 'Unknown') {
    if (window.vbmsNotifications) {
      vbmsNotifications.createActivity(vbmsNotifications.ACTIVITY_TYPES.PAYMENT_FAILED, {
        title: `Payment failed: $${amount} from ${customerName}`,
        priority: vbmsNotifications.PRIORITY.CRITICAL,
        user: customerName,
        userRole: 'customer',
        module: 'Billing & Payments',
        additionalData: { amount, reason }
      });
    }
  },

  // Inventory Activities
  trackInventoryLow(productName, currentStock, threshold = 10) {
    if (window.vbmsNotifications) {
      vbmsNotifications.createActivity(vbmsNotifications.ACTIVITY_TYPES.INVENTORY_LOW, {
        title: `Low inventory: ${productName} (${currentStock} left)`,
        priority: vbmsNotifications.PRIORITY.HIGH,
        user: 'System',
        userRole: 'system',
        module: 'Orders & Inventory',
        additionalData: { productName, currentStock, threshold }
      });
    }
  },

  trackInventoryUpdated(productName, oldStock, newStock, updateType = 'manual') {
    if (window.vbmsNotifications) {
      vbmsNotifications.createActivity(vbmsNotifications.ACTIVITY_TYPES.INVENTORY_UPDATED, {
        title: `Inventory updated: ${productName} (${oldStock} → ${newStock})`,
        priority: vbmsNotifications.PRIORITY.LOW,
        user: vbmsAuth.getCurrentUser()?.name || 'System',
        userRole: vbmsAuth.getCurrentRole() || 'system',
        module: 'Orders & Inventory',
        additionalData: { productName, oldStock, newStock, updateType }
      });
    }
  },

  // Staff & Admin Activities
  trackStaffAssigned(staffName, task, customerName = null) {
    if (window.vbmsNotifications) {
      vbmsNotifications.createActivity(vbmsNotifications.ACTIVITY_TYPES.STAFF_ASSIGNED, {
        title: `${staffName} assigned to ${task}${customerName ? ` for ${customerName}` : ''}`,
        priority: vbmsNotifications.PRIORITY.MEDIUM,
        user: staffName,
        userRole: 'staff',
        module: 'User Management',
        additionalData: { task, customerName }
      });
    }
  },

  trackAdminCreated(newAdminName, createdBy, permissions = {}) {
    if (window.vbmsNotifications) {
      vbmsNotifications.createActivity(vbmsNotifications.ACTIVITY_TYPES.ADMIN_CREATED, {
        title: `New admin created: ${newAdminName}`,
        priority: vbmsNotifications.PRIORITY.HIGH,
        user: createdBy,
        userRole: 'main_admin',
        module: 'User Management',
        additionalData: { newAdminName, permissions }
      });
    }
  },

  // AI & Support Activities
  trackAIChat(customerName, topic, duration = null) {
    if (window.vbmsNotifications) {
      vbmsNotifications.createActivity(vbmsNotifications.ACTIVITY_TYPES.AI_CHAT, {
        title: `${customerName} used AI chat for ${topic}`,
        priority: vbmsNotifications.PRIORITY.LOW,
        user: customerName,
        userRole: 'customer',
        module: 'AI Tools',
        additionalData: { topic, duration }
      });
    }
  },

  trackSupportTicket(ticketNumber, customerName, subject, priority = 'medium') {
    if (window.vbmsNotifications) {
      vbmsNotifications.createActivity(vbmsNotifications.ACTIVITY_TYPES.SUPPORT_TICKET, {
        title: `Support ticket #${ticketNumber}: ${subject}`,
        priority: priority === 'high' ? vbmsNotifications.PRIORITY.HIGH : 
                 priority === 'low' ? vbmsNotifications.PRIORITY.LOW :
                 vbmsNotifications.PRIORITY.MEDIUM,
        user: customerName,
        userRole: 'customer',
        module: 'Customer Support',
        additionalData: { ticketNumber, subject }
      });
    }
  },

  // Training Activities
  trackTrainingCompleted(studentName, courseName, score = null, duration = null) {
    if (window.vbmsNotifications) {
      vbmsNotifications.createActivity(vbmsNotifications.ACTIVITY_TYPES.TRAINING_COMPLETED, {
        title: `${studentName} completed "${courseName}"${score ? ` with ${score}% score` : ''}`,
        priority: vbmsNotifications.PRIORITY.MEDIUM,
        user: studentName,
        userRole: 'customer',
        module: 'Training',
        additionalData: { courseName, score, duration }
      });
    }
  },

  trackCourseEnrollment(studentName, courseName) {
    if (window.vbmsNotifications) {
      vbmsNotifications.createActivity(vbmsNotifications.ACTIVITY_TYPES.COURSE_ENROLLED, {
        title: `${studentName} enrolled in "${courseName}"`,
        priority: vbmsNotifications.PRIORITY.LOW,
        user: studentName,
        userRole: 'customer',
        module: 'Training',
        additionalData: { courseName }
      });
    }
  },

  // Affiliate Activities
  trackAffiliateSignup(affiliateName, affiliateEmail, referralCode) {
    if (window.vbmsNotifications) {
      vbmsNotifications.createActivity(vbmsNotifications.ACTIVITY_TYPES.AFFILIATE_SIGNUP, {
        title: `New affiliate joined: ${affiliateName}`,
        priority: vbmsNotifications.PRIORITY.MEDIUM,
        user: affiliateName,
        userRole: 'affiliate',
        module: 'Affiliates',
        additionalData: { email: affiliateEmail, referralCode }
      });
    }
  },

  trackCommissionEarned(affiliateName, amount, customerName, orderNumber = null) {
    if (window.vbmsNotifications) {
      vbmsNotifications.createActivity(vbmsNotifications.ACTIVITY_TYPES.COMMISSION_EARNED, {
        title: `${affiliateName} earned $${amount} commission from ${customerName}`,
        priority: vbmsNotifications.PRIORITY.MEDIUM,
        user: affiliateName,
        userRole: 'affiliate',
        module: 'Affiliates',
        additionalData: { amount, customerName, orderNumber }
      });
    }
  },

  // System Activities
  trackSystemError(errorType, errorMessage, severity = 'medium') {
    if (window.vbmsNotifications) {
      vbmsNotifications.createActivity(vbmsNotifications.ACTIVITY_TYPES.SYSTEM_ERROR, {
        title: `System error: ${errorType}`,
        priority: severity === 'critical' ? vbmsNotifications.PRIORITY.CRITICAL :
                 severity === 'high' ? vbmsNotifications.PRIORITY.HIGH :
                 vbmsNotifications.PRIORITY.MEDIUM,
        user: 'System',
        userRole: 'system',
        module: 'System',
        additionalData: { errorType, errorMessage, severity }
      });
    }
  },

  trackBackupCreated(backupType = 'full', size = null) {
    if (window.vbmsNotifications) {
      vbmsNotifications.createActivity(vbmsNotifications.ACTIVITY_TYPES.BACKUP_CREATED, {
        title: `${backupType} backup created${size ? ` (${size})` : ''}`,
        priority: vbmsNotifications.PRIORITY.LOW,
        user: vbmsAuth.getCurrentUser()?.name || 'System',
        userRole: vbmsAuth.getCurrentRole() || 'system',
        module: 'System',
        additionalData: { backupType, size }
      });
    }
  },

  // Video Monitoring Activities
  trackVideoAlert(alertType, location, severity = 'medium') {
    if (window.vbmsNotifications) {
      vbmsNotifications.createActivity(vbmsNotifications.ACTIVITY_TYPES.VIDEO_ALERT, {
        title: `Video alert: ${alertType} at ${location}`,
        priority: severity === 'critical' ? vbmsNotifications.PRIORITY.CRITICAL :
                 severity === 'high' ? vbmsNotifications.PRIORITY.HIGH :
                 vbmsNotifications.PRIORITY.MEDIUM,
        user: 'System',
        userRole: 'system',
        module: 'Video Monitoring',
        additionalData: { alertType, location, severity }
      });
    }
  },

  // Utility Functions
  trackPageView(pageName) {
    if (window.vbmsNotifications) {
      const user = vbmsAuth.getCurrentUser();
      if (user) {
        vbmsNotifications.createActivity('page_view', {
          title: `Viewed ${pageName}`,
          priority: vbmsNotifications.PRIORITY.LOW,
          user: user.name,
          userRole: vbmsAuth.getCurrentRole(),
          module: 'Navigation',
          additionalData: { pageName, url: window.location.href }
        });
      }
    }
  },

  trackFormSubmission(formName, formData = {}) {
    if (window.vbmsNotifications) {
      const user = vbmsAuth.getCurrentUser();
      if (user) {
        vbmsNotifications.createActivity('form_submission', {
          title: `Submitted ${formName} form`,
          priority: vbmsNotifications.PRIORITY.LOW,
          user: user.name,
          userRole: vbmsAuth.getCurrentRole(),
          module: 'Forms',
          additionalData: { formName, formData }
        });
      }
    }
  },

  // Custom activity tracking
  trackCustomActivity(type, title, options = {}) {
    if (window.vbmsNotifications) {
      const user = vbmsAuth.getCurrentUser();
      vbmsNotifications.createActivity(type, {
        title: title,
        priority: options.priority || vbmsNotifications.PRIORITY.MEDIUM,
        user: options.user || (user ? user.name : 'Unknown'),
        userRole: options.userRole || vbmsAuth.getCurrentRole() || 'unknown',
        module: options.module || 'Custom',
        additionalData: options.data || {}
      });
    }
  }
};

// Auto-track page views for all pages
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const pageName = document.title || window.location.pathname.split('/').pop().replace('.html', '');
    activityTracker.trackPageView(pageName);
  });
} else {
  const pageName = document.title || window.location.pathname.split('/').pop().replace('.html', '');
  activityTracker.trackPageView(pageName);
}

// Auto-track form submissions
document.addEventListener('submit', (e) => {
  const form = e.target;
  const formName = form.id || form.className || 'Unknown Form';
  
  // Get form data
  const formData = {};
  const inputs = form.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    if (input.name && !input.type.includes('password')) {
      formData[input.name] = input.value;
    }
  });
  
  activityTracker.trackFormSubmission(formName, formData);
});

// Make available globally
window.trackActivity = activityTracker.trackCustomActivity;
window.track = activityTracker;