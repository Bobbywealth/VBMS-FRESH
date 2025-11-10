
// Universal Sidebar Loader for VBMS
console.log('[Sidebar Loader] Script loaded successfully');
document.addEventListener('DOMContentLoaded', function() {
    console.log('[Sidebar Loader] DOMContentLoaded event fired');
    const sidebarContainer = document.getElementById('sidebar-container');
    console.log('[Sidebar Loader] Sidebar container found:', !!sidebarContainer);
    
    if (sidebarContainer) {
        console.log('[Sidebar Loader] Starting sidebar loading process');
        // Determine which sidebar to load based on the page
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const adminPages = [
            // Main admin dashboards
            'dashboard.html', 'reports.html',
            // Admin-specific pages
            'admin-customers.html', 'admin-customer-analytics.html', 'admin-affiliates.html', 
            'admin-training.html', 'admin-orders.html', 'admin-ai-phone.html',
            // Main admin only pages
            'admin-create-admin.html', 'admin-system-settings.html', 'admin-pricing.html',
            // Admin tools and management
            'leads.html', 'messaging.html', 'team.html',
            // System administration
            'monitoring.html', 'inventory.html', 'calendar.html', 'billing.html', 
            'settings.html', 'training.html',
            // AI and automation
            'Aiassistant.html',
            // Additional admin pages
            'orders.html', 'clients.html', 'staffdashboard.html', 'app.html'
        ];
        const masterAdminPages = ['admin-main-dashboard.html', 'admin-create-admin.html', 'master-admin-analytics.html', 'admin-pricing.html', 'admin-affiliates.html', 'leads.html', 'admin-ai-phone.html', 'admin-ai-agent.html', 'admin-email-manager.html', 'admin-calendar.html', 'admin-taskboard.html'];
        const customerPages = ['customer-dashboard.html', 'customer-orders.html', 'customer-uber-eats.html', 'customer-inventory.html', 'customer-monitoring.html', 'customer-tasks.html', 'customer-calendar.html', 'customer-ai-chat.html', 'customer-ai-phone.html', 'customer-ai.html', 'customer-training.html', 'customer-settings.html', 'customer-billing.html'];
        
        let sidebarFile = 'sidebar.html'; // default
        
        // Determine sidebar based on user role and page
        const userRole = vbmsAuth?.getCurrentRole() || '';
        
        // Debug logging for sidebar selection
        console.log(`[Sidebar Loader] Current page: ${currentPage}`);
        console.log(`[Sidebar Loader] User role: ${userRole}`);
        console.log(`[Sidebar Loader] Is admin page: ${adminPages.includes(currentPage)}`);
        console.log(`[Sidebar Loader] Is master admin page: ${masterAdminPages.includes(currentPage)}`);
        console.log(`[Sidebar Loader] Is customer page: ${customerPages.includes(currentPage)}`);
        
        if (masterAdminPages.includes(currentPage)) {
            sidebarFile = 'master-admin-sidebar.html';
            console.log(`[Sidebar Loader] Selected: master-admin-sidebar.html`);
        } else if (adminPages.includes(currentPage)) {
            sidebarFile = 'admin-sidebar.html';
            console.log(`[Sidebar Loader] Selected: admin-sidebar.html`);
        } else if (customerPages.includes(currentPage)) {
            sidebarFile = 'customer-sidebar.html';
            console.log(`[Sidebar Loader] Selected: customer-sidebar.html`);
        } else if (currentPage === 'help.html' || currentPage === 'support.html') {
            // Shared pages - determine sidebar by user role
            if (userRole === 'admin' || userRole === 'main_admin') {
                sidebarFile = 'admin-sidebar.html';
                console.log(`[Sidebar Loader] Selected: admin-sidebar.html (role-based)`);
            } else if (userRole === 'customer' || userRole === 'client') {
                sidebarFile = 'customer-sidebar.html';
                console.log(`[Sidebar Loader] Selected: customer-sidebar.html (role-based)`);
            }
        }
        
        console.log(`[Sidebar Loader] Final sidebar file: ${sidebarFile}`);
        
        fetch(sidebarFile)
            .then(response => response.text())
            .then(html => {
                console.log(`[Sidebar Loader] Successfully loaded: ${sidebarFile}`);
                console.log(`[Sidebar Loader] HTML contains "My Inventory": ${html.includes('My Inventory')}`);
                console.log(`[Sidebar Loader] HTML contains "customer-inventory": ${html.includes('customer-inventory')}`);
                sidebarContainer.innerHTML = html;
                
                // IMMEDIATELY clean up any inline onclick handlers in the sidebar
                const themeButtons = sidebarContainer.querySelectorAll('[onclick*="toggleTheme"]');
                themeButtons.forEach(btn => {
                    btn.removeAttribute('onclick');
                    btn.addEventListener('click', function(e) {
                        e.preventDefault();
                        if (window.vbmsThemeManager) {
                            window.vbmsThemeManager.toggleTheme();
                        }
                    });
                });
                
                // Initialize theme manager after sidebar loads
                if (window.vbmsThemeManager) {
                    window.vbmsThemeManager.initializeThemeToggle();
                } else {
                    // If theme manager isn't loaded yet, wait for it
                    setTimeout(() => {
                        if (window.vbmsThemeManager) {
                            window.vbmsThemeManager.initializeThemeToggle();
                        }
                    }, 100);
                }
                
                // Note: Legacy theme initialization removed to prevent conflicts
            })
            .catch(error => {
                console.error('Error loading sidebar:', error);
            });
    }
});

// Logout function - use the auth system's logout
function logout() {
    if (window.vbmsAuth) {
        vbmsAuth.logout();
    } else {
        // Fallback
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = 'login.html';
    }
}
