// VBMS Configuration Override
// This file ensures all API calls go to the correct backend URL

(function() {
    'use strict';
    
    // Force the correct backend URL
    const CORRECT_BACKEND_URL = 'https://vbms-fresh-offical-website-launch.onrender.com';
    
    console.log('🚀 VBMS Config: Setting backend to', CORRECT_BACKEND_URL);
    
    // Override any existing API_BASE configurations
    window.VBMS_API_BASE = CORRECT_BACKEND_URL;
    window.API_BASE = CORRECT_BACKEND_URL;
    
    // Override common API base configurations
    if (window.vbmsConfig) {
        window.vbmsConfig.apiBase = CORRECT_BACKEND_URL;
    } else {
        window.vbmsConfig = {
            apiBase: CORRECT_BACKEND_URL,
            environment: 'production'
        };
    }
    
    // Override pricing integration API base if it exists
    if (window.VBMSPricingIntegration && window.VBMSPricingIntegration.prototype) {
        const originalGetApiBase = window.VBMSPricingIntegration.prototype.getApiBase;
        window.VBMSPricingIntegration.prototype.getApiBase = function() {
            return CORRECT_BACKEND_URL;
        };
    }
    
    // Intercept fetch requests to redirect Railway URLs
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
        if (typeof url === 'string' && url.includes('vbms-fresh-production.up.railway.app')) {
            const correctedUrl = url.replace('https://vbms-fresh-production.up.railway.app', CORRECT_BACKEND_URL);
            console.log('🔄 Redirecting API call:', url, '→', correctedUrl);
            return originalFetch(correctedUrl, options);
        }
        return originalFetch(url, options);
    };
    
    // Also handle Request objects
    const originalFetchWithRequest = window.fetch;
    window.fetch = function(input, options) {
        if (input instanceof Request) {
            const url = input.url;
            if (url.includes('vbms-fresh-production.up.railway.app')) {
                const correctedUrl = url.replace('https://vbms-fresh-production.up.railway.app', CORRECT_BACKEND_URL);
                console.log('🔄 Redirecting Request API call:', url, '→', correctedUrl);
                const newRequest = new Request(correctedUrl, input);
                return originalFetchWithRequest(newRequest, options);
            }
        }
        return originalFetchWithRequest(input, options);
    };
    
    console.log('✅ VBMS Config: Backend URL override active');
})();
