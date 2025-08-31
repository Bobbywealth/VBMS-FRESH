const fs = require('fs').promises;
const path = require('path');

class ThemeManagerEnsurer {
  constructor() {
    this.baseDir = path.join(__dirname, '../../');
    this.fixes = [];
    this.errors = [];
    
    // Critical pages that MUST have theme manager
    this.criticalPages = [
      'admin-main-dashboard.html',
      'admin-customers.html',
      'admin-orders.html',
      'customer-dashboard.html',
      'dashboard.html',
      'billing.html',
      'inventory.html',
      'reports.html',
      'settings.html'
    ];
  }

  async ensureThemeManager() {
    console.log('🎨 Ensuring theme manager is included in critical pages...');
    console.log('=' .repeat(60));

    try {
      for (const pageFile of this.criticalPages) {
        await this.checkAndFixPage(pageFile);
      }

      this.generateReport();

    } catch (error) {
      console.error('❌ Error ensuring theme manager:', error);
      this.errors.push(error.message);
    }
  }

  async checkAndFixPage(pageFile) {
    const filePath = path.join(this.baseDir, pageFile);
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Check if theme manager is already included
      if (content.includes('theme-manager.js')) {
        console.log(`✅ ${pageFile} already has theme manager`);
        return;
      }

      console.log(`🔧 Adding theme manager to ${pageFile}...`);

      // Find the best place to insert the theme manager script
      let updatedContent = content;
      let insertionPoint = '';
      
      // Try to find existing script tags
      if (content.includes('</body>')) {
        insertionPoint = 'before_body_close';
        updatedContent = content.replace(
          '</body>',
          '  <script src="theme-manager.js"></script>\n</body>'
        );
      } else if (content.includes('</head>')) {
        insertionPoint = 'before_head_close';
        updatedContent = content.replace(
          '</head>',
          '  <script src="theme-manager.js"></script>\n</head>'
        );
      } else {
        // If no proper structure, add at the end
        insertionPoint = 'end_of_file';
        updatedContent = content + '\n<script src="theme-manager.js"></script>';
      }

      // Save the updated file
      await fs.writeFile(filePath, updatedContent, 'utf8');
      
      this.fixes.push({
        file: pageFile,
        insertionPoint,
        message: 'Added theme-manager.js script'
      });
      
      console.log(`✅ Added theme manager to ${pageFile} (${insertionPoint})`);

    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`⚠️  ${pageFile} not found - skipping`);
      } else {
        this.errors.push(`Error processing ${pageFile}: ${error.message}`);
        console.log(`❌ Error processing ${pageFile}: ${error.message}`);
      }
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 THEME MANAGER INSTALLATION REPORT');
    console.log('='.repeat(60));

    console.log(`\n📊 Summary:`);
    console.log(`   Critical Pages Checked: ${this.criticalPages.length}`);
    console.log(`   Pages Updated: ${this.fixes.length}`);
    console.log(`   Errors: ${this.errors.length}`);

    if (this.fixes.length > 0) {
      console.log('\n✅ Pages Updated:');
      this.fixes.forEach((fix, index) => {
        console.log(`   ${index + 1}. ${fix.file}`);
        console.log(`      Location: ${fix.insertionPoint}`);
        console.log(`      Action: ${fix.message}`);
        console.log('');
      });
    }

    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    if (this.fixes.length === 0 && this.errors.length === 0) {
      console.log('\n🎉 All critical pages already have theme manager!');
    }

    console.log('\n💡 Next Steps:');
    console.log('   1. Test theme toggle functionality on all updated pages');
    console.log('   2. Verify theme persistence across page navigation');
    console.log('   3. Check that all theme manager references use correct path');
    console.log('   4. Clear browser cache to see changes');

    // Additional checks
    this.performAdditionalChecks();

    console.log('\n' + '='.repeat(60));
  }

  async performAdditionalChecks() {
    console.log('\n🔍 Additional Checks:');
    
    // Check if theme-manager.js exists
    const themeManagerPath = path.join(this.baseDir, 'theme-manager.js');
    try {
      await fs.access(themeManagerPath);
      console.log('   ✅ theme-manager.js file exists');
      
      // Check the content of theme manager
      const themeContent = await fs.readFile(themeManagerPath, 'utf8');
      if (themeContent.includes('localStorage')) {
        console.log('   ✅ Theme manager uses localStorage for persistence');
      }
      if (themeContent.includes('toggle')) {
        console.log('   ✅ Theme manager has toggle functionality');
      }
      
    } catch (error) {
      console.log('   ❌ theme-manager.js file not found - theme toggle will not work');
      this.errors.push('theme-manager.js file is missing');
    }

    // Check for CSS theme variables
    try {
      const cssFiles = ['customer-theme.css'];
      for (const cssFile of cssFiles) {
        const cssPath = path.join(this.baseDir, cssFile);
        try {
          await fs.access(cssPath);
          console.log(`   ✅ Theme CSS file exists: ${cssFile}`);
        } catch (error) {
          console.log(`   ⚠️  Theme CSS file not found: ${cssFile}`);
        }
      }
    } catch (error) {
      // Skip CSS check if there are issues
    }
  }
}

// Run the ensurer
if (require.main === module) {
  const ensurer = new ThemeManagerEnsurer();
  ensurer.ensureThemeManager().then(() => {
    console.log('\n🎉 Theme manager installation completed!');
  }).catch(error => {
    console.error('💥 Theme manager installation failed:', error);
    process.exit(1);
  });
}

module.exports = ThemeManagerEnsurer;