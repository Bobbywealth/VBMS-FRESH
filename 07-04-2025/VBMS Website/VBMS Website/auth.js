// Check if vbmsAuth already exists to prevent redeclaration
window.vbmsAuth = window.vbmsAuth || {
  login(email, password) {
const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:5050' 
  : 'https://vbms-fresh-offical-website-launch.onrender.com';
    return fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    .then(response => response.json())
    .then(data => {
      if (data.token) {
        localStorage.setItem('vbmsToken', data.token);
        localStorage.setItem('vbmsUser', JSON.stringify(data.user));
        localStorage.setItem('vbmsRole', data.user.role.toLowerCase());
        localStorage.setItem('vbmsLoggedIn', 'true');

        sessionStorage.setItem('vbmsToken', data.token);
        sessionStorage.setItem('vbmsUser', JSON.stringify(data.user));
        sessionStorage.setItem('vbmsRole', data.user.role.toLowerCase());
        sessionStorage.setItem('vbmsLoggedIn', 'true');

        return data;
      }
      throw new Error(data.message || 'Login failed');
    });
  },

  logout() {
    localStorage.removeItem('vbmsToken');
    localStorage.removeItem('vbmsUser');
    localStorage.removeItem('vbmsRole');
    localStorage.removeItem('vbmsLoggedIn');
    localStorage.removeItem('vbmsLoginTime');

    sessionStorage.removeItem('vbmsToken');
    sessionStorage.removeItem('vbmsUser');
    sessionStorage.removeItem('vbmsRole');
    sessionStorage.removeItem('vbmsLoggedIn');
    sessionStorage.removeItem('vbmsLoginTime');

    // Clear any other auth-related items
    localStorage.removeItem('vbms-settings-updated');
    
    // Redirect to appropriate login based on current page
    const currentPage = window.location.pathname;
    if (currentPage.includes('client-') || currentPage.includes('customer-')) {
      window.location.href = 'customer-login.html';
    } else {
      window.location.href = 'login.html';
    }
  },

  isLoggedIn() {
    return localStorage.getItem('vbmsLoggedIn') === 'true' || 
           sessionStorage.getItem('vbmsLoggedIn') === 'true';
  },

  isAuthenticated() {
    return this.isLoggedIn();
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('vbmsUser') || 
                   sessionStorage.getItem('vbmsUser');
    return userStr ? JSON.parse(userStr) : null;
  },

  getCurrentRole() {
    const role = localStorage.getItem('vbmsRole') || 
                 sessionStorage.getItem('vbmsRole') || '';
    
    // Handle edge cases and ensure consistency
    if (!role || role === 'null' || role === 'undefined' || role.trim() === '') {
      return '';
    }
    
    return role.toLowerCase().trim(); // Always return lowercase and trimmed for consistency
  },

  getToken() {
    return localStorage.getItem('vbmsToken') || 
           sessionStorage.getItem('vbmsToken');
  },

  checkAccess(allowedRoles = []) {
    if (!this.isLoggedIn()) {
      console.log('Access denied - redirecting to login');
      const currentPage = window.location.pathname;
      if (currentPage.includes('client-') || currentPage.includes('customer-')) {
        window.location.href = 'customer-login.html';
      } else {
        window.location.href = 'login.html';
      }
      return false;
    }

    const userRole = this.getCurrentRole().toLowerCase();
    const normalizedRoles = allowedRoles.map(role => role.toLowerCase());

    if (allowedRoles.length > 0 && !normalizedRoles.includes(userRole)) {
      console.log(`Access denied for role: ${userRole}`);
      // Redirect to appropriate login based on role
      if (userRole === 'client' || userRole === 'customer') {
        window.location.href = 'customer-login.html';
      } else {
        window.location.href = 'login.html';
      }
      return false;
    }

    return true;
  },

  getRoleRedirectUrl() {
    const role = this.getCurrentRole();
    switch(role) {
      case 'main_admin': return 'admin-main-dashboard.html'; // Separate Master Admin dashboard
      case 'admin': return 'dashboard.html'; // Regular admin dashboard
      case 'support': return 'dashboard.html'; // Support uses regular admin dashboard
      case 'staff': 
      case 'editor': return 'staffdashboard.html';
      case 'client': 
      case 'customer': return 'customer-dashboard.html';
      default: return 'login.html';
    }
  },

  // New methods for admin hierarchy
  isMainAdmin() {
    return this.getCurrentRole() === 'main_admin';
  },

  isAdmin() {
    const role = this.getCurrentRole();
    // Ensure we have a valid role before checking
    if (!role || role === '') {
      return false;
    }
    return role === 'admin' || role === 'main_admin';
  },

  isSubAdmin() {
    return this.getCurrentRole() === 'admin';
  },

  getAdminPermissions() {
    const user = this.getCurrentUser();
    if (!user) return null;
    
    if (this.isMainAdmin()) {
      // Main admin has all permissions
      return {
        canCreateAdmins: true,
        canManageCustomers: true,
        canViewAllData: true,
        canSetPricing: true,
        canToggleFeatures: true,
        canManageStaff: true,
        canAccessBilling: true,
        canViewAnalytics: true,
        canSystemSettings: true
      };
    } else if (this.isSubAdmin()) {
      // Sub-admin permissions set by main admin (stored in user data)
      return user.adminPermissions || {
        canCreateAdmins: false,
        canManageCustomers: true,
        canViewAllData: false,
        canSetPricing: false,
        canToggleFeatures: false,
        canManageStaff: false,
        canAccessBilling: false,
        canViewAnalytics: true,
        canSystemSettings: false
      };
    }
    return null;
  },


  requireRole(requiredRole, redirectUrl = 'login.html') {
    if (!this.isLoggedIn()) {
      console.log('Access denied - not logged in');
      window.location.href = redirectUrl;
      return false;
    }

    const userRole = this.getCurrentRole().toLowerCase();
    if (userRole !== requiredRole.toLowerCase()) {
      console.log(`Access denied - role mismatch: ${userRole} vs ${requiredRole}`);
      window.location.href = redirectUrl;
      return false;
    }

    return true;
  },

  requireAnyRole(allowedRoles, redirectUrl = 'login.html') {
    if (!this.isLoggedIn()) {
      console.log('Access denied - not logged in');
      window.location.href = redirectUrl;
      return false;
    }

    const userRole = this.getCurrentRole().toLowerCase();
    const normalizedRoles = allowedRoles.map(role => role.toLowerCase());
    
    if (!normalizedRoles.includes(userRole)) {
      console.log(`Access denied - role not allowed: ${userRole}`);
      window.location.href = redirectUrl;
      return false;
    }

    return true;
  }
};

function logout() {
  vbmsAuth.logout();
}

function toggleTheme() {
  // Only use the global theme manager if available, otherwise do nothing to prevent conflicts
  if (window.vbmsThemeManager) {
    window.vbmsThemeManager.toggleTheme();
  }
}

function loadTheme() {
  // Defer to theme manager if available
  if (window.vbmsThemeManager) {
    return; // Theme manager handles this
  }
  const theme = localStorage.getItem('vbms-theme') || 'light';
  applyTheme(theme);
}

function applyTheme(theme) {
  // Only apply theme if theme manager is not available to prevent conflicts
  if (window.vbmsThemeManager) {
    return; // Theme manager handles this
  }
  
  document.documentElement.setAttribute('data-theme', theme);
  document.body.className = theme === 'light' ? 'light-mode' : '';
  
  const themeBtn = document.getElementById('darkModeBtn');
  if (themeBtn) {
    const icon = themeBtn.querySelector('i') || themeBtn;
    if (icon) {
      icon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
    }
  }
  
  const themeIcon = document.getElementById('themeIcon');
  if (themeIcon) {
    themeIcon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
  }
}