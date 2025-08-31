const fs = require('fs').promises;
const path = require('path');

class SidebarNavigationFixer {
  constructor() {
    this.baseDir = path.join(__dirname, '../../');
    this.fixes = [];
    this.errors = [];
  }

  async fixSidebarNavigation() {
    console.log('🔧 Fixing sidebar navigation to ensure .html extensions...');
    console.log('=' .repeat(60));

    try {
      // Check all HTML files for navigation issues
      const htmlFiles = await this.findHTMLFiles();
      
      for (const filePath of htmlFiles) {
        await this.checkAndFixNavigationInFile(filePath);
      }

      // Add client-side navigation enforcement script
      await this.createNavigationEnforcementScript();

      this.generateReport();

    } catch (error) {
      console.error('❌ Error fixing sidebar navigation:', error);
      this.errors.push(error.message);
    }
  }

  async findHTMLFiles() {
    const htmlFiles = [];
    try {
      const entries = await fs.readdir(this.baseDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.html')) {
          htmlFiles.push(path.join(this.baseDir, entry.name));
        }
      }
    } catch (error) {
      this.errors.push(`Error reading directory: ${error.message}`);
    }
    return htmlFiles;
  }

  async checkAndFixNavigationInFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      let updatedContent = content;
      let changesMade = false;
      const fileName = path.basename(filePath);

      // Fix JavaScript redirects that might be missing .html extension
      const jsRedirectPatterns = [
        // window.location = 'dashboard' -> window.location = 'dashboard.html'
        {
          pattern: /window\.location\s*=\s*['"]([^'"]*(?:admin-main-dashboard|admin-customers|admin-orders|customer-dashboard|dashboard|billing|inventory|reports|settings))['"](?![.]html)/g,
          replacement: (match, url) => match.replace(url, url + '.html')
        },
        
        // window.location.href = 'dashboard' -> window.location.href = 'dashboard.html'
        {
          pattern: /window\.location\.href\s*=\s*['"]([^'"]*(?:admin-main-dashboard|admin-customers|admin-orders|customer-dashboard|dashboard|billing|inventory|reports|settings))['"](?![.]html)/g,
          replacement: (match, url) => match.replace(url, url + '.html')
        },

        // location.replace('dashboard') -> location.replace('dashboard.html')
        {
          pattern: /location\.replace\(['"]([^'"]*(?:admin-main-dashboard|admin-customers|admin-orders|customer-dashboard|dashboard|billing|inventory|reports|settings))['"](?![.]html)\)/g,
          replacement: (match, url) => match.replace(url, url + '.html')
        },

        // location.assign('dashboard') -> location.assign('dashboard.html')
        {
          pattern: /location\.assign\(['"]([^'"]*(?:admin-main-dashboard|admin-customers|admin-orders|customer-dashboard|dashboard|billing|inventory|reports|settings))['"](?![.]html)\)/g,
          replacement: (match, url) => match.replace(url, url + '.html')
        }
      ];

      // Apply each JavaScript pattern
      for (const { pattern, replacement } of jsRedirectPatterns) {
        const originalContent = updatedContent;
        updatedContent = updatedContent.replace(pattern, replacement);
        if (updatedContent !== originalContent) {
          changesMade = true;
        }
      }

      // Fix any onclick handlers that might redirect without .html
      const onclickPattern = /onclick\s*=\s*['"].*?location.*?=.*?['"]([^'"]+)['"]['"]/g;
      updatedContent = updatedContent.replace(onclickPattern, (match) => {
        if (match.includes('dashboard') && !match.includes('.html')) {
          return match.replace(/(['"])([^'"]*dashboard)(['"])/g, '$1$2.html$3');
        }
        return match;
      });

      // Save the file if changes were made
      if (changesMade) {
        await fs.writeFile(filePath, updatedContent, 'utf8');
        this.fixes.push({
          file: fileName,
          message: 'Fixed JavaScript navigation redirects'
        });
        console.log(`✅ Fixed navigation in: ${fileName}`);
      } else {
        console.log(`✅ No navigation issues found in: ${fileName}`);
      }

    } catch (error) {
      const fileName = path.basename(filePath);
      this.errors.push(`Error processing ${fileName}: ${error.message}`);
      console.log(`❌ Error processing ${fileName}: ${error.message}`);
    }
  }

  async createNavigationEnforcementScript() {
    console.log('\n🛡️ Creating navigation enforcement script...');
    
    const enforcementScript = `
// VBMS Navigation Enforcement Script
// This script ensures all navigation always goes to .html files

(function() {
    'use strict';
    
    // List of pages that should always have .html extension
    const criticalPages = [
        'admin-main-dashboard',
        'admin-customers', 
        'admin-orders',
        'customer-dashboard',
        'dashboard',
        'billing',
        'inventory',
        'reports',
        'settings',
        'support',
        'help'
    ];
    
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
    
    // Override window.location assignments
    let originalLocationSetter = Object.getOwnPropertyDescriptor(window, 'location').set;
    Object.defineProperty(window, 'location', {
        set: function(url) {
            const correctedUrl = ensureHtmlExtension(url);
            if (correctedUrl !== url) {
                console.log(\`🔧 Navigation enforced: \${url} → \${correctedUrl}\`);
            }
            originalLocationSetter.call(this, correctedUrl);
        },
        get: function() {
            return window.location;
        }
    });
    
    // Override location.href assignments  
    const originalHref = Object.getOwnPropertyDescriptor(Location.prototype, 'href');
    Object.defineProperty(Location.prototype, 'href', {
        set: function(url) {
            const correctedUrl = ensureHtmlExtension(url);
            if (correctedUrl !== url) {
                console.log(\`🔧 Navigation enforced: \${url} → \${correctedUrl}\`);
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
            console.log(\`🔧 Navigation enforced: \${url} → \${correctedUrl}\`);
        }
        return originalAssign.call(this, correctedUrl);
    };
    
    // Override location.replace
    const originalReplace = Location.prototype.replace;
    Location.prototype.replace = function(url) {
        const correctedUrl = ensureHtmlExtension(url);
        if (correctedUrl !== url) {
            console.log(\`🔧 Navigation enforced: \${url} → \${correctedUrl}\`);
        }
        return originalReplace.call(this, correctedUrl);
    };
    
    // Intercept all link clicks to ensure proper navigation
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a[href]');
        if (link) {
            const href = link.getAttribute('href');
            const correctedHref = ensureHtmlExtension(href);
            
            if (correctedHref !== href) {
                console.log(\`🔧 Link navigation enforced: \${href} → \${correctedHref}\`);
                e.preventDefault();
                window.location.href = correctedHref;
            }
        }
    }, true);
    
    console.log('🛡️ VBMS Navigation enforcement active');
})();
`;

    const scriptPath = path.join(this.baseDir, 'navigation-enforcement.js');
    await fs.writeFile(scriptPath, enforcementScript.trim(), 'utf8');
    
    this.fixes.push({
      file: 'navigation-enforcement.js',
      message: 'Created navigation enforcement script'
    });
    
    console.log('✅ Created navigation-enforcement.js');
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 SIDEBAR NAVIGATION FIX REPORT');
    console.log('='.repeat(60));

    console.log(`\n📊 Summary:`);
    console.log(`   Files Updated: ${this.fixes.length}`);
    console.log(`   Errors: ${this.errors.length}`);

    if (this.fixes.length > 0) {
      console.log('\n✅ Files Updated:');
      this.fixes.forEach((fix, index) => {
        console.log(`   ${index + 1}. ${fix.file} - ${fix.message}`);
      });
    }

    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    console.log('\n💡 Implementation Steps:');
    console.log('   1. Include navigation-enforcement.js in all critical pages');
    console.log('   2. Clear browser cache completely');
    console.log('   3. Test navigation from login through sidebar clicks');
    console.log('   4. Verify theme toggle works consistently');

    console.log('\n🔧 To include the enforcement script, add this to your HTML pages:');
    console.log('   <script src="navigation-enforcement.js"></script>');

    console.log('\n📝 Files that should include the script:');
    console.log('   - admin-main-dashboard.html');
    console.log('   - customer-dashboard.html');
    console.log('   - All pages with sidebar navigation');

    console.log('\n' + '='.repeat(60));
  }
}

// Run the fixer
if (require.main === module) {
  const fixer = new SidebarNavigationFixer();
  fixer.fixSidebarNavigation().then(() => {
    console.log('\n🎉 Sidebar navigation fixing completed!');
  }).catch(error => {
    console.error('💥 Sidebar navigation fixing failed:', error);
    process.exit(1);
  });
}

module.exports = SidebarNavigationFixer;