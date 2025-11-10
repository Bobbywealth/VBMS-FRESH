const fs = require('fs').promises;
const path = require('path');

class DuplicateRouteChecker {
  constructor() {
    this.baseDir = path.join(__dirname, '../../');
    this.routes = new Map();
    this.duplicates = [];
    this.issues = [];
  }

  async checkDuplicateRoutes() {
    console.log('🔍 Checking for duplicate route access patterns...');
    console.log('=' .repeat(50));

    try {
      // Check HTML files and their potential routes
      await this.scanHTMLFiles();
      
      // Check for server routing configurations
      await this.checkServerRouting();
      
      // Identify potential issues
      this.identifyIssues();
      
      // Generate report
      this.generateReport();

    } catch (error) {
      console.error('❌ Error checking routes:', error);
    }
  }

  async scanHTMLFiles() {
    console.log('📄 Scanning HTML files...');
    
    try {
      const entries = await fs.readdir(this.baseDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.html')) {
          const filePath = path.join(this.baseDir, entry.name);
          const baseName = entry.name.replace('.html', '');
          
          // Store both possible routes
          this.routes.set(entry.name, {
            type: 'file',
            path: filePath,
            withExtension: entry.name,
            withoutExtension: baseName
          });
          
          console.log(`   Found: ${entry.name} (accessible as /${entry.name} or /${baseName})`);
        }
      }
    } catch (error) {
      this.issues.push(`Error scanning HTML files: ${error.message}`);
    }
  }

  async checkServerRouting() {
    console.log('\n🌐 Checking server routing configurations...');
    
    const serverFiles = [
      path.join(this.baseDir, 'vbms-backend/server.js'),
      path.join(this.baseDir, 'vbms-backend/app.js'),
      path.join(this.baseDir, 'vbms-backend/routes'),
    ];

    for (const serverPath of serverFiles) {
      try {
        await this.checkServerFile(serverPath);
      } catch (error) {
        // File might not exist, which is fine
      }
    }
  }

  async checkServerFile(filePath) {
    try {
      const stats = await fs.stat(filePath);
      
      if (stats.isFile()) {
        const content = await fs.readFile(filePath, 'utf8');
        
        // Look for static file serving configurations
        if (content.includes('express.static')) {
          console.log(`   📁 Static file serving found in: ${path.basename(filePath)}`);
          
          // Check for URL rewriting or extension handling
          if (content.includes('.html') || content.includes('extension')) {
            console.log(`   ⚙️  HTML extension handling detected`);
          }
        }
        
        // Look for custom routing that might serve files without extensions
        const routeMatches = content.match(/app\.(get|use|all)\s*\([^)]*['"]/g);
        if (routeMatches) {
          console.log(`   🛣️  Custom routes found: ${routeMatches.length}`);
        }
        
      } else if (stats.isDirectory()) {
        // Check routes directory
        const routeFiles = await fs.readdir(filePath);
        console.log(`   📂 Route files found: ${routeFiles.length}`);
      }
    } catch (error) {
      // File doesn't exist or can't be read
    }
  }

  identifyIssues() {
    console.log('\n🔍 Identifying potential issues...');
    
    // Check for pages that might be accessible both ways
    const criticalPages = [
      'admin-main-dashboard',
      'admin-customers', 
      'customer-dashboard',
      'dashboard',
      'billing',
      'inventory',
      'reports',
      'settings'
    ];

    criticalPages.forEach(pageName => {
      const htmlFile = `${pageName}.html`;
      if (this.routes.has(htmlFile)) {
        this.duplicates.push({
          page: pageName,
          htmlVersion: `/${htmlFile}`,
          noExtVersion: `/${pageName}`,
          recommendation: 'Ensure all links point to .html version'
        });
      }
    });

    // Check for theme and styling consistency
    this.checkThemeConsistency();
  }

  async checkThemeConsistency() {
    console.log('   🎨 Checking theme consistency...');
    
    // Check if theme-manager.js exists and is being used
    const themeManagerPath = path.join(this.baseDir, 'theme-manager.js');
    try {
      await fs.access(themeManagerPath);
      console.log('   ✅ Theme manager found');
      
      // Check which pages include the theme manager
      const htmlFiles = await this.findHTMLFiles();
      let pagesWithTheme = 0;
      let pagesWithoutTheme = 0;
      
      for (const htmlFile of htmlFiles) {
        try {
          const content = await fs.readFile(htmlFile, 'utf8');
          if (content.includes('theme-manager.js')) {
            pagesWithTheme++;
          } else {
            pagesWithoutTheme++;
            const fileName = path.basename(htmlFile);
            if (['admin-main-dashboard.html', 'dashboard.html', 'customer-dashboard.html'].includes(fileName)) {
              this.issues.push(`Important page missing theme manager: ${fileName}`);
            }
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
      
      console.log(`   📊 Pages with theme: ${pagesWithTheme}, without theme: ${pagesWithoutTheme}`);
      
    } catch (error) {
      this.issues.push('Theme manager not found - theme toggle may not work consistently');
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
      // Return empty array if can't read directory
    }
    return htmlFiles;
  }

  generateReport() {
    console.log('\n' + '='.repeat(50));
    console.log('📋 DUPLICATE ROUTE ANALYSIS REPORT');
    console.log('='.repeat(50));

    console.log(`\n📊 Summary:`);
    console.log(`   HTML Files Found: ${this.routes.size}`);
    console.log(`   Potential Duplicates: ${this.duplicates.length}`);
    console.log(`   Issues Identified: ${this.issues.length}`);

    if (this.duplicates.length > 0) {
      console.log('\n⚠️  Pages Accessible Multiple Ways:');
      this.duplicates.forEach((dup, index) => {
        console.log(`   ${index + 1}. ${dup.page}`);
        console.log(`      With .html: ${dup.htmlVersion}`);
        console.log(`      Without .html: ${dup.noExtVersion}`);
        console.log(`      📝 ${dup.recommendation}`);
        console.log('');
      });
    }

    if (this.issues.length > 0) {
      console.log('\n❌ Issues Found:');
      this.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }

    console.log('\n💡 Recommendations:');
    console.log('   1. Use the .html extension in all links and navigation');
    console.log('   2. Configure your web server to redirect non-.html requests to .html versions');
    console.log('   3. Ensure theme-manager.js is included in all pages that need theme toggle');
    console.log('   4. Test navigation thoroughly after making changes');
    console.log('   5. Consider implementing canonical URLs to avoid SEO issues');

    if (this.duplicates.length > 0) {
      console.log('\n🔧 Quick Fix Commands:');
      console.log('   Run: npm run fix-links  (to fix HTML links)');
      console.log('   Run: node scripts/fix-html-links.js  (direct execution)');
    }

    console.log('\n' + '='.repeat(50));
  }
}

// Run the checker
if (require.main === module) {
  const checker = new DuplicateRouteChecker();
  checker.checkDuplicateRoutes().then(() => {
    console.log('\n🎉 Duplicate route checking completed!');
  }).catch(error => {
    console.error('💥 Route checking failed:', error);
    process.exit(1);
  });
}

module.exports = DuplicateRouteChecker;