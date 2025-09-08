// VBMS Configuration
const VBMS_CONFIG = {
  // Backend URLs
  LOCAL_BACKEND: 'http://localhost:5050',
  PRODUCTION_BACKEND: 'https://vbms-fresh-production.up.railway.app',
  
  // Current environment (change this to switch between local/production)
  ENVIRONMENT: 'local', // 'local' or 'production'
  
  // Get the current backend URL
  getBackendUrl: function() {
    return this.ENVIRONMENT === 'local' ? this.LOCAL_BACKEND : this.PRODUCTION_BACKEND;
  },
  
  // Get API URL
  getApiUrl: function() {
    return this.getBackendUrl() + '/api';
  },
  
  // Check if running locally
  isLocal: function() {
    return this.ENVIRONMENT === 'local';
  },
  
  // Check if running in production
  isProduction: function() {
    return this.ENVIRONMENT === 'production';
  },
  
  // Switch to local development
  useLocal: function() {
    this.ENVIRONMENT = 'local';
    console.log('🔄 Switched to LOCAL backend:', this.LOCAL_BACKEND);
  },
  
  // Switch to production
  useProduction: function() {
    this.ENVIRONMENT = 'production';
    console.log('🚀 Switched to PRODUCTION backend:', this.PRODUCTION_BACKEND);
  }
};

// Auto-detect environment based on hostname
if (typeof window !== 'undefined') {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    VBMS_CONFIG.useLocal();
  } else {
    VBMS_CONFIG.useProduction();
  }
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VBMS_CONFIG;
}

// Make it globally available in browser
if (typeof window !== 'undefined') {
  window.VBMS_CONFIG = VBMS_CONFIG;
}
