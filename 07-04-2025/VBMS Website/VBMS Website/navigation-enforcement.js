// VBMS Navigation Enforcement Script
// This script ensures all navigation always goes to .html files

(function() {
    'use strict';
    
    console.log('🛡️ VBMS Navigation enforcement loading...');
    
    // IMMEDIATE URL CHECK AND REDIRECT
    const currentUrl = window.location.pathname;
    const currentPage = currentUrl.split('/').pop();
    console.log('🔍 Current page:', currentPage);
    
    // Critical pages that MUST have .html extension
    const criticalPages = [
        'admin-main-dashboard',
        'admin-create-admin',
        'master-admin-analytics',
        'admin-pricing',
        'admin-customers', 
        'admin-orders',
        'customer-dashboard',
        'dashboard',
        'billing',
        'inventory',
        'reports',
        'settings',
        'support',
        'help',
        'admin-taskboard'
    ];
    
    // Check if current page needs .html extension
    for (const page of criticalPages) {
        if (currentPage === page && !currentPage.endsWith('.html')) {
            console.log('🔧 IMMEDIATE REDIRECT:', page, '→', page + '.html');
            window.location.replace(currentUrl + '.html');
            return; // Stop execution, redirect is happening
        }
    }
    
    // Function to ensure URL has .html extension
    function ensureHtmlExtension(url) {
        if (!url || url.includes('http') || url.includes('#') || url.includes('?')) {
            return url;
        }
        
        for (const page of criticalPages) {
            if (url === page || url.endsWith('/' + page)) {
                return url + '.html';
            }
        }
        
        return url;
    }
    
    // Override window.location assignments (safely)
    try {
        let originalLocationDescriptor = Object.getOwnPropertyDescriptor(window, 'location');
        if (originalLocationDescriptor && !originalLocationDescriptor.configurable) {
            console.log('⚠️ Location property is not configurable, using alternative approach');
            // Alternative: Override common navigation methods
            const originalAssign = window.location.assign;
            const originalReplace = window.location.replace;
            
            window.location.assign = function(url) {
                const correctedUrl = ensureHtmlExtension(url);
                if (correctedUrl !== url) {
                    console.log(`🔧 Navigation enforced (assign): ${url} → ${correctedUrl}`);
                }
                return originalAssign.call(this, correctedUrl);
            };
            
            window.location.replace = function(url) {
                const correctedUrl = ensureHtmlExtension(url);
                if (correctedUrl !== url) {
                    console.log(`🔧 Navigation enforced (replace): ${url} → ${correctedUrl}`);
                }
                return originalReplace.call(this, correctedUrl);
            };
        }
    } catch (error) {
        console.log('⚠️ Could not override location property:', error.message);
    }
    
    // Override location.href assignments  
    const originalHref = Object.getOwnPropertyDescriptor(Location.prototype, 'href');
    Object.defineProperty(Location.prototype, 'href', {
        set: function(url) {
            const correctedUrl = ensureHtmlExtension(url);
            if (correctedUrl !== url) {
                console.log(`🔧 Navigation enforced: ${url} → ${correctedUrl}`);
            }
            originalHref.set.call(this, correctedUrl);
        },
        get: originalHref.get
    });
    
    // Override location.assign
    const originalAssign = Location.prototype.assign;
    Location.prototype.assign = function(url) {
        const correctedUrl = ensureHtmlExtension(url);
        if (correctedUrl !== url) {
            console.log(`🔧 Navigation enforced: ${url} → ${correctedUrl}`);
        }
        return originalAssign.call(this, correctedUrl);
    };
    
    // Override location.replace
    const originalReplace = Location.prototype.replace;
    Location.prototype.replace = function(url) {
        const correctedUrl = ensureHtmlExtension(url);
        if (correctedUrl !== url) {
            console.log(`🔧 Navigation enforced: ${url} → ${correctedUrl}`);
        }
        return originalReplace.call(this, correctedUrl);
    };
    
    // Intercept all link clicks to ensure proper navigation - CAPTURE PHASE
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a[href]');
        if (link) {
            const href = link.getAttribute('href');
            const correctedHref = ensureHtmlExtension(href);
            
            if (correctedHref !== href) {
                console.log(`🔧 Link navigation enforced: ${href} → ${correctedHref}`);
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                window.location.href = correctedHref;
                return false;
            }
        }
    }, true); // Capture phase
    
    // ALSO intercept in bubble phase as backup
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a[href]');
        if (link) {
            const href = link.getAttribute('href');
            const correctedHref = ensureHtmlExtension(href);
            
            if (correctedHref !== href) {
                console.log(`🔧 Link navigation enforced (bubble): ${href} → ${correctedHref}`);
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                window.location.href = correctedHref;
                return false;
            }
        }
    }, false); // Bubble phase
    
    // Monitor all navigation changes
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            console.log('🔍 Navigation detected:', url);
            // Check if we need to redirect
            const currentPage = url.split('/').pop().split('?')[0].split('#')[0];
            for (const page of criticalPages) {
                if (currentPage === page && !currentPage.endsWith('.html')) {
                    console.log('🔧 POST-NAVIGATION REDIRECT:', page, '→', page + '.html');
                    window.location.replace(url.replace(page, page + '.html'));
                    return;
                }
            }
        }
    }).observe(document, {subtree: true, childList: true});
    
    console.log('🛡️ VBMS Navigation enforcement active - AGGRESSIVE MODE');
})();