/**
 * VBMS Unified Admin Architecture - Permissions Manager
 * 
 * This system provides granular permission control for the unified admin dashboard.
 * Eliminates the need for multiple admin page hierarchies by using role-based permissions.
 */

window.vbmsPermissions = {
  // Permission categories and their sub-permissions
  PERMISSIONS: {
    // Customer Management permissions
    CUSTOMERS_VIEW: 'customers_view',
    CUSTOMERS_EDIT: 'customers_edit', 
    CUSTOMERS_DELETE: 'customers_delete',
    CUSTOMERS_EXPORT: 'customers_export',
    CUSTOMERS_CREATE: 'customers_create',
    
    // Reports & Analytics permissions
    REPORTS_VIEW: 'reports_view',
    REPORTS_SYSTEM: 'reports_system',
    REPORTS_CUSTOMER: 'reports_customer',
    REPORTS_EXPORT: 'reports_export',
    REPORTS_ANALYTICS: 'reports_analytics',
    
    // Leads Management permissions
    LEADS_VIEW: 'leads_view',
    LEADS_EDIT: 'leads_edit',
    LEADS_DELETE: 'leads_delete',
    LEADS_EXPORT: 'leads_export',
    LEADS_CREATE: 'leads_create',
    
    // Admin Management permissions (highest level)
    ADMIN_CREATE: 'admin_create',
    ADMIN_MANAGE: 'admin_manage',
    ADMIN_DELETE: 'admin_delete',
    ADMIN_PERMISSIONS: 'admin_permissions',
    
    // User Management permissions
    USERS_VIEW: 'users_view',
    USERS_EDIT: 'users_edit',
    USERS_CREATE: 'users_create',
    USERS_DELETE: 'users_delete',
    USERS_PERMISSIONS: 'users_permissions',
    
    // Billing & Payments permissions
    BILLING_VIEW: 'billing_view',
    BILLING_PROCESS: 'billing_process',
    BILLING_REFUNDS: 'billing_refunds',
    BILLING_EXPORT: 'billing_export',
    
    // Settings & Configuration permissions
    SETTINGS_SYSTEM: 'settings_system',
    SETTINGS_PRICING: 'settings_pricing',
    SETTINGS_FEATURES: 'settings_features',
    SETTINGS_INTEGRATIONS: 'settings_integrations',
    
    // Orders Management permissions
    ORDERS_VIEW: 'orders_view',
    ORDERS_EDIT: 'orders_edit',
    ORDERS_DELETE: 'orders_delete',
    ORDERS_EXPORT: 'orders_export'
  },

  // Default permission sets for different roles
  ROLE_PERMISSIONS: {
    main_admin: [
      // Main admin has ALL permissions
      'customers_view', 'customers_edit', 'customers_delete', 'customers_export', 'customers_create',
      'reports_view', 'reports_system', 'reports_customer', 'reports_export', 'reports_analytics',
      'leads_view', 'leads_edit', 'leads_delete', 'leads_export', 'leads_create',
      'admin_create', 'admin_manage', 'admin_delete', 'admin_permissions',
      'users_view', 'users_edit', 'users_create', 'users_delete', 'users_permissions',
      'billing_view', 'billing_process', 'billing_refunds', 'billing_export',
      'settings_system', 'settings_pricing', 'settings_features', 'settings_integrations',
      'orders_view', 'orders_edit', 'orders_delete', 'orders_export'
    ],
    
    admin: [
      // Regular admin - standard permissions (can be customized per user)
      'customers_view', 'customers_edit', 'customers_export',
      'reports_view', 'reports_customer', 'reports_analytics',
      'leads_view', 'leads_edit', 'leads_export',
      'users_view',
      'orders_view', 'orders_edit', 'orders_export'
    ],
    
    support: [
      // Support role - read-only mostly
      'customers_view', 'customers_export',
      'reports_view', 'reports_customer',
      'leads_view',
      'users_view',
      'orders_view'
    ],
    
    customer: [
      // Customer role - very limited
      'reports_view'
    ],
    
    client: [
      // Client role - same as customer
      'reports_view'
    ]
  },

  // UI Element visibility mapping
  UI_ELEMENTS: {
    // Main navigation sections
    'userManagementSection': ['users_view', 'admin_manage'],
    'mainAdminStats': ['admin_manage'],
    'addUserBtn': ['users_create'],
    'addAdminBtn': ['admin_create'],
    'dashboardTitle': ['customers_view'], // Everyone with basic access sees title
    
    // Action buttons
    'exportCustomersBtn': ['customers_export'],
    'createCustomerBtn': ['customers_create'],
    'deleteCustomerBtn': ['customers_delete'],
    'viewReportsBtn': ['reports_view'],
    'systemSettingsBtn': ['settings_system'],
    'pricingSettingsBtn': ['settings_pricing'],
    'adminManagementBtn': ['admin_manage']
  },

  /**
   * Get user's current permissions from localStorage or role-based defaults
   */
  getUserPermissions() {
    const user = vbmsAuth.getCurrentUser();
    const role = vbmsAuth.getCurrentRole();
    
    if (!user || !role) {
      console.log('⚠️ No user or role found for permissions check');
      return [];
    }

    // Check if user has custom permissions stored
    if (user.customPermissions && Array.isArray(user.customPermissions)) {
      console.log('✅ Using custom permissions for user:', user.customPermissions);
      return user.customPermissions;
    }

    // Fall back to role-based permissions
    const rolePermissions = this.ROLE_PERMISSIONS[role] || [];
    console.log(`✅ Using role-based permissions for ${role}:`, rolePermissions);
    return rolePermissions;
  },

  /**
   * Check if user has a specific permission
   */
  hasPermission(permission) {
    const userPermissions = this.getUserPermissions();
    const hasAccess = userPermissions.includes(permission);
    console.log(`🔍 Permission check: ${permission} = ${hasAccess}`);
    return hasAccess;
  },

  /**
   * Check if user has ANY of the provided permissions
   */
  hasAnyPermission(permissions) {
    const userPermissions = this.getUserPermissions();
    const hasAccess = permissions.some(permission => userPermissions.includes(permission));
    console.log(`🔍 Any permission check: [${permissions.join(', ')}] = ${hasAccess}`);
    return hasAccess;
  },

  /**
   * Check if user has ALL of the provided permissions
   */
  hasAllPermissions(permissions) {
    const userPermissions = this.getUserPermissions();
    const hasAccess = permissions.every(permission => userPermissions.includes(permission));
    console.log(`🔍 All permissions check: [${permissions.join(', ')}] = ${hasAccess}`);
    return hasAccess;
  },

  /**
   * Get list of UI sections user should see
   */
  getVisibleSections() {
    const visibleSections = [];
    const userPermissions = this.getUserPermissions();

    for (const [elementId, requiredPermissions] of Object.entries(this.UI_ELEMENTS)) {
      if (this.hasAnyPermission(requiredPermissions)) {
        visibleSections.push(elementId);
      }
    }

    console.log('👁️ Visible sections for user:', visibleSections);
    return visibleSections;
  },

  /**
   * Apply permission-based visibility to UI elements
   */
  applyUIPermissions() {
    console.log('🎨 Applying UI permissions...');
    const visibleSections = this.getVisibleSections();
    
    // Hide all controlled elements first
    for (const elementId of Object.keys(this.UI_ELEMENTS)) {
      const element = document.getElementById(elementId);
      if (element) {
        element.style.display = 'none';
      }
    }

    // Show elements user has permission for
    for (const elementId of visibleSections) {
      const element = document.getElementById(elementId);
      if (element) {
        // Show with appropriate display style based on element type
        if (element.classList.contains('stats-grid')) {
          element.style.display = 'grid';
        } else if (element.tagName === 'BUTTON') {
          element.style.display = 'inline-block';
        } else {
          element.style.display = 'block';
        }
        console.log(`✅ Showing element: ${elementId}`);
      }
    }

    // Update dashboard title based on role
    this.updateDashboardTitle();
  },

  /**
   * Update dashboard title based on user role
   */
  updateDashboardTitle() {
    const titleElement = document.getElementById('dashboardTitle');
    const role = vbmsAuth.getCurrentRole();
    
    if (titleElement && role) {
      let title = 'Admin Dashboard';
      
      switch (role) {
        case 'main_admin':
          title = 'Main Admin Dashboard';
          break;
        case 'admin':
          title = 'Admin Dashboard';
          break;
        case 'support':
          title = 'Support Dashboard';
          break;
        case 'customer':
        case 'client':
          title = 'Customer Dashboard';
          break;
        default:
          title = 'Dashboard';
      }
      
      titleElement.textContent = title;
      console.log(`📝 Updated dashboard title to: ${title}`);
    }
  },

  /**
   * Save custom permissions for a user
   */
  saveUserPermissions(userId, permissions) {
    try {
      const users = JSON.parse(localStorage.getItem('vbmsUsers') || '[]');
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex >= 0) {
        users[userIndex].customPermissions = permissions;
        localStorage.setItem('vbmsUsers', JSON.stringify(users));
        console.log(`💾 Saved custom permissions for user ${userId}:`, permissions);
        return true;
      } else {
        console.log(`❌ User ${userId} not found for permission save`);
        return false;
      }
    } catch (error) {
      console.error('❌ Error saving user permissions:', error);
      return false;
    }
  },

  /**
   * Get permission categories for UI display
   */
  getPermissionCategories() {
    return {
      'Customer Management': [
        { id: 'customers_view', label: 'View Customers', description: 'View customer list and details' },
        { id: 'customers_edit', label: 'Edit Customers', description: 'Modify customer information' },
        { id: 'customers_create', label: 'Create Customers', description: 'Add new customers' },
        { id: 'customers_delete', label: 'Delete Customers', description: 'Remove customers from system' },
        { id: 'customers_export', label: 'Export Customers', description: 'Export customer data' }
      ],
      'Reports & Analytics': [
        { id: 'reports_view', label: 'View Reports', description: 'Access reporting dashboard' },
        { id: 'reports_system', label: 'System Reports', description: 'View system-level reports' },
        { id: 'reports_customer', label: 'Customer Reports', description: 'View customer-specific reports' },
        { id: 'reports_analytics', label: 'Analytics', description: 'Access advanced analytics' },
        { id: 'reports_export', label: 'Export Reports', description: 'Export report data' }
      ],
      'User Management': [
        { id: 'users_view', label: 'View Users', description: 'View user list and profiles' },
        { id: 'users_edit', label: 'Edit Users', description: 'Modify user information' },
        { id: 'users_create', label: 'Create Users', description: 'Add new users to system' },
        { id: 'users_delete', label: 'Delete Users', description: 'Remove users from system' },
        { id: 'users_permissions', label: 'Manage Permissions', description: 'Modify user permissions' }
      ],
      'Admin Management': [
        { id: 'admin_create', label: 'Create Admins', description: 'Add new admin users' },
        { id: 'admin_manage', label: 'Manage Admins', description: 'Modify admin accounts' },
        { id: 'admin_delete', label: 'Delete Admins', description: 'Remove admin accounts' },
        { id: 'admin_permissions', label: 'Admin Permissions', description: 'Manage admin permissions' }
      ],
      'Orders & Billing': [
        { id: 'orders_view', label: 'View Orders', description: 'View order history and details' },
        { id: 'orders_edit', label: 'Edit Orders', description: 'Modify order information' },
        { id: 'orders_delete', label: 'Delete Orders', description: 'Remove orders from system' },
        { id: 'billing_view', label: 'View Billing', description: 'Access billing information' },
        { id: 'billing_process', label: 'Process Payments', description: 'Handle payment processing' },
        { id: 'billing_refunds', label: 'Process Refunds', description: 'Handle refund requests' }
      ],
      'System Settings': [
        { id: 'settings_system', label: 'System Settings', description: 'Modify system configuration' },
        { id: 'settings_pricing', label: 'Pricing Settings', description: 'Manage pricing and plans' },
        { id: 'settings_features', label: 'Feature Toggles', description: 'Enable/disable features' },
        { id: 'settings_integrations', label: 'Integrations', description: 'Manage third-party integrations' }
      ]
    };
  },

  /**
   * Initialize permissions system
   */
  init() {
    console.log('🚀 Initializing VBMS Permissions Manager...');
    
    // Apply UI permissions after short delay to ensure DOM is ready
    setTimeout(() => {
      this.applyUIPermissions();
    }, 100);

    console.log('✅ VBMS Permissions Manager initialized');
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.vbmsPermissions.init();
  });
} else {
  // DOM already loaded
  window.vbmsPermissions.init();
}