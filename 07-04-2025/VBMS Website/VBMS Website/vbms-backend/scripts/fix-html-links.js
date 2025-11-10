const fs = require('fs').promises;
const path = require('path');

class HTMLLinkFixer {
  constructor() {
    this.baseDir = path.join(__dirname, '../../');
    this.fixes = [];
    this.errors = [];
  }

  async fixAllLinks() {
    console.log('🔧 Fixing HTML links to ensure .html extensions...');
    console.log('=' .repeat(50));

    try {
      // Get all HTML files
      const htmlFiles = await this.findHTMLFiles(this.baseDir);
      console.log(`📄 Found ${htmlFiles.length} HTML files to check`);

      // Process each HTML file
      for (const filePath of htmlFiles) {
        await this.fixLinksInFile(filePath);
      }

      // Generate report
      this.generateReport();

    } catch (error) {
      console.error('❌ Error fixing links:', error);
      this.errors.push(error.message);
    }
  }

  async findHTMLFiles(dir) {
    const htmlFiles = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          // Skip node_modules and other system directories
          if (!['node_modules', '.git', 'logs', 'uploads', 'backups'].includes(entry.name)) {
            const subFiles = await this.findHTMLFiles(fullPath);
            htmlFiles.push(...subFiles);
          }
        } else if (entry.name.endsWith('.html')) {
          htmlFiles.push(fullPath);
        }
      }
    } catch (error) {
      console.log(`⚠️  Could not read directory ${dir}: ${error.message}`);
    }
    
    return htmlFiles;
  }

  async fixLinksInFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      let updatedContent = content;
      let changesMade = false;

      // Define patterns to fix
      const linkPatterns = [
        // href attributes without .html extension
        {
          pattern: /href=["']([^"']*(?:admin-main-dashboard|admin-customers|admin-orders|admin-affiliates|admin-training|customer-dashboard|customer-inventory|customer-monitoring|customer-ai-chat|customer-settings|customer-tasks|customer-calendar|customer-orders|customer-training|customer-uber-eats|dashboard|billing|inventory|reports|settings|support|help))["']/g,
          replacement: (match, url) => {
            if (!url.includes('.html') && !url.includes('http') && !url.includes('#') && !url.includes('?')) {
              return match.replace(url, url + '.html');
            }
            return match;
          }
        },
        
        // JavaScript window.location assignments
        {
          pattern: /window\.location\s*=\s*["']([^"']*(?:admin-main-dashboard|admin-customers|admin-orders|admin-affiliates|admin-training|customer-dashboard|customer-inventory|customer-monitoring|customer-ai-chat|customer-settings|customer-tasks|customer-calendar|customer-orders|customer-training|customer-uber-eats|dashboard|billing|inventory|reports|settings|support|help))["']/g,
          replacement: (match, url) => {
            if (!url.includes('.html') && !url.includes('http') && !url.includes('#') && !url.includes('?')) {
              return match.replace(url, url + '.html');
            }
            return match;
          }
        },

        // JavaScript window.location.href assignments
        {
          pattern: /window\.location\.href\s*=\s*["']([^"']*(?:admin-main-dashboard|admin-customers|admin-orders|admin-affiliates|admin-training|customer-dashboard|customer-inventory|customer-monitoring|customer-ai-chat|customer-settings|customer-tasks|customer-calendar|customer-orders|customer-training|customer-uber-eats|dashboard|billing|inventory|reports|settings|support|help))["']/g,
          replacement: (match, url) => {
            if (!url.includes('.html') && !url.includes('http') && !url.includes('#') && !url.includes('?')) {
              return match.replace(url, url + '.html');
            }
            return match;
          }
        }
      ];

      // Apply each pattern
      for (const { pattern, replacement } of linkPatterns) {
        const originalContent = updatedContent;
        updatedContent = updatedContent.replace(pattern, replacement);
        
        if (updatedContent !== originalContent) {
          changesMade = true;
        }
      }

      // Save the file if changes were made
      if (changesMade) {
        await fs.writeFile(filePath, updatedContent, 'utf8');
        const relativePath = path.relative(this.baseDir, filePath);
        this.fixes.push({
          file: relativePath,
          message: 'Updated links to include .html extensions'
        });
        console.log(`✅ Fixed links in: ${relativePath}`);
      }

    } catch (error) {
      const relativePath = path.relative(this.baseDir, filePath);
      this.errors.push(`Error processing ${relativePath}: ${error.message}`);
      console.log(`❌ Error processing ${relativePath}: ${error.message}`);
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(50));
    console.log('📋 HTML LINK FIX REPORT');
    console.log('='.repeat(50));

    console.log(`\n📊 Summary:`);
    console.log(`   Files Fixed: ${this.fixes.length}`);
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

    if (this.fixes.length === 0 && this.errors.length === 0) {
      console.log('\n🎉 All links are already correctly formatted!');
    }

    console.log('\n💡 Additional Recommendations:');
    console.log('   1. Ensure your web server serves .html files correctly');
    console.log('   2. Consider setting up URL rewriting rules if needed');
    console.log('   3. Test all navigation after these changes');
    console.log('   4. Clear browser cache to see updated pages');

    console.log('\n' + '='.repeat(50));
  }
}

// Run the fixer
if (require.main === module) {
  const fixer = new HTMLLinkFixer();
  fixer.fixAllLinks().then(() => {
    console.log('\n🎉 HTML link fixing completed!');
  }).catch(error => {
    console.error('💥 HTML link fixing failed:', error);
    process.exit(1);
  });
}

module.exports = HTMLLinkFixer;