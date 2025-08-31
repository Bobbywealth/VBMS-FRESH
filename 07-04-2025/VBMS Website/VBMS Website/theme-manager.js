// Universal Theme Manager for VBMS
// Ensures consistent theme persistence across all pages

class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('vbms-theme') || 'light';
        this.isToggling = false;
        this.init();
    }

    init() {
        // Apply saved theme immediately
        this.applyTheme(this.currentTheme);
        
        // Clear any existing global theme functions to prevent conflicts
        this.clearConflictingThemeFunctions();
        
        // Listen for theme changes from other tabs/windows
        window.addEventListener('storage', (e) => {
            if (e.key === 'vbms-theme' && e.newValue !== this.currentTheme) {
                this.currentTheme = e.newValue || 'light';
                this.applyTheme(this.currentTheme);
                this.updateThemeToggleButton();
            }
        });

        // Initialize theme toggle button after sidebar loads
        setTimeout(() => {
            this.initializeThemeToggle();
        }, 100);
    }
    
    clearConflictingThemeFunctions() {
        // Remove any conflicting global theme functions
        const elementsWithThemeHandlers = document.querySelectorAll('[onclick*="toggleTheme"], [onclick*="applyTheme"]');
        elementsWithThemeHandlers.forEach(element => {
            element.removeAttribute('onclick');
        });
        
        // Prevent accidental theme changes from double-clicks on any element
        document.addEventListener('dblclick', (e) => {
            // If double-click is on a sidebar link or navigation element, prevent any theme changes
            if (e.target.closest('.sidebar-link') || e.target.closest('.nav-link')) {
                e.stopPropagation();
            }
        }, true);
    }

    applyTheme(theme) {
        const html = document.documentElement;
        
        // Remove all theme classes
        html.removeAttribute('data-theme');
        
        // Apply new theme (always set data-theme attribute)
        html.setAttribute('data-theme', theme);
        
        this.currentTheme = theme;
        localStorage.setItem('vbms-theme', theme);
        
        // Update theme toggle button
        this.updateThemeToggleButton();
        
        // Dispatch custom event for other components that need to react to theme changes
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: theme } }));
    }

    toggleTheme() {
        // Add additional protection against rapid theme changes
        if (this.isToggling) {
            console.log('Theme toggle already in progress, skipping...');
            return;
        }
        
        this.isToggling = true;
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
        
        // Reset flag after theme change completes
        setTimeout(() => {
            this.isToggling = false;
        }, 500);
    }

    initializeThemeToggle() {
        // Try to find theme toggle button (it might be in the sidebar or main content)
        const toggleButton = document.querySelector('.theme-toggle') || 
                           document.querySelector('[onclick*="toggleTheme"]') ||
                           document.getElementById('themeToggle') ||
                           document.getElementById('darkModeBtn');
        
        if (toggleButton) {
            // Remove any existing onclick handlers and event listeners
            toggleButton.removeAttribute('onclick');
            
            // Clone the button to remove all event listeners
            const newToggleButton = toggleButton.cloneNode(true);
            toggleButton.parentNode.replaceChild(newToggleButton, toggleButton);
            
            // Add single event listener with debouncing
            let toggleInProgress = false;
            newToggleButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Prevent rapid clicking
                if (toggleInProgress) {
                    return;
                }
                
                toggleInProgress = true;
                this.toggleTheme();
                
                // Reset flag after a short delay
                setTimeout(() => {
                    toggleInProgress = false;
                }, 300);
            });
            
            // Prevent double-click from triggering theme changes
            newToggleButton.addEventListener('dblclick', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        }

        // Also create a global function for backwards compatibility with debouncing
        let globalToggleInProgress = false;
        window.toggleTheme = () => {
            if (globalToggleInProgress) {
                console.log('Global theme toggle prevented - debouncing');
                return;
            }
            globalToggleInProgress = true;
            this.toggleTheme();
            setTimeout(() => {
                globalToggleInProgress = false;
            }, 300);
        };
        
        this.updateThemeToggleButton();
    }

    updateThemeToggleButton() {
        const toggleButton = document.querySelector('.theme-toggle') || 
                           document.querySelector('[onclick*="toggleTheme"]') ||
                           document.getElementById('themeToggle') ||
                           document.getElementById('darkModeBtn');
        
        const themeIcon = document.getElementById('themeIcon') || 
                         toggleButton?.querySelector('i');
        
        if (themeIcon) {
            // Remove all theme-related classes
            themeIcon.className = themeIcon.className.replace(/bi-[a-z-]+/g, '');
            
            // Add appropriate icon based on current theme
            if (this.currentTheme === 'dark') {
                themeIcon.classList.add('bi', 'bi-sun-fill');
            } else {
                themeIcon.classList.add('bi', 'bi-moon-fill');
            }
        }

        // Update button title/tooltip
        if (toggleButton) {
            const nextTheme = this.getNextThemeName();
            toggleButton.title = `Switch to ${nextTheme} mode`;
        }
    }

    getNextThemeName() {
        return this.currentTheme === 'dark' ? 'Light' : 'Dark';
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    setTheme(theme) {
        if (['light', 'dark'].includes(theme)) {
            this.applyTheme(theme);
        }
    }
}

// IMMEDIATE cleanup to prevent conflicts
(function() {
    'use strict';
    
    // Immediately override any existing toggleTheme functions
    let preventToggle = false;
    window.toggleTheme = function() {
        if (preventToggle) {
            console.log('Theme toggle prevented - conflicts avoided');
            return;
        }
        if (window.vbmsThemeManager) {
            window.vbmsThemeManager.toggleTheme();
        }
    };
    
    // Prevent theme toggles during double-clicks
    document.addEventListener('dblclick', function(e) {
        preventToggle = true;
        setTimeout(() => { preventToggle = false; }, 500);
    }, true);
    
    // Clean up inline onclick handlers immediately
    function cleanupThemeHandlers() {
        const elements = document.querySelectorAll('[onclick*="toggleTheme"]');
        elements.forEach(el => {
            el.removeAttribute('onclick');
            // Add proper event listener instead
            el.addEventListener('click', function(e) {
                e.preventDefault();
                if (!preventToggle && window.vbmsThemeManager) {
                    window.vbmsThemeManager.toggleTheme();
                }
            });
        });
    }
    
    // Run cleanup multiple times to catch dynamically loaded content
    cleanupThemeHandlers();
    document.addEventListener('DOMContentLoaded', cleanupThemeHandlers);
    setTimeout(cleanupThemeHandlers, 100);
    setTimeout(cleanupThemeHandlers, 500);
    setTimeout(cleanupThemeHandlers, 1000);
    
    // Watch for dynamically added content and clean it up immediately
    const cleanupObserver = new MutationObserver(function(mutations) {
        let needsCleanup = false;
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        if (node.getAttribute && node.getAttribute('onclick') && node.getAttribute('onclick').includes('toggleTheme')) {
                            needsCleanup = true;
                        }
                        // Check children too
                        const themeElements = node.querySelectorAll && node.querySelectorAll('[onclick*="toggleTheme"]');
                        if (themeElements && themeElements.length > 0) {
                            needsCleanup = true;
                        }
                    }
                });
            }
        });
        if (needsCleanup) {
            setTimeout(cleanupThemeHandlers, 10);
        }
    });
    
    // Start observing when DOM is ready
    if (document.body) {
        cleanupObserver.observe(document.body, { childList: true, subtree: true });
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            cleanupObserver.observe(document.body, { childList: true, subtree: true });
        });
    }
})();

// Initialize theme manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.vbmsThemeManager = new ThemeManager();
});

// Also initialize if DOMContentLoaded has already fired
if (document.readyState === 'loading') {
    // Still loading, wait for DOMContentLoaded
} else {
    // DOM is already ready
    window.vbmsThemeManager = new ThemeManager();
}

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}