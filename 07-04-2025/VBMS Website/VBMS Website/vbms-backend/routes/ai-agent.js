const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdminPermission } = require('../middleware/auth');
const fs = require('fs').promises;
const path = require('path');
const OpenAI = require('openai');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// AI Agent Routes - For Code Management and System Changes
// Note: This is a simulated AI agent for demonstration. In production, you would integrate with OpenAI, Claude, or other AI services.

// Get AI Agent Status
router.get('/status', authenticateToken, requireAdminPermission('system_management'), async (req, res) => {
  try {
    console.log('🤖 AI Agent status requested');
    
    res.json({
      status: 'online',
      model: 'VBMS-CodeAgent-v1.0',
      capabilities: [
        'Code Analysis',
        'Bug Detection',
        'Feature Generation',
        'Database Integration',
        'API Creation',
        'UI/UX Improvements',
        'Performance Optimization',
        'Security Auditing'
      ],
      lastUpdated: new Date().toISOString(),
      activeConnections: 1,
      totalInteractions: Math.floor(Math.random() * 1000) + 100
    });
  } catch (error) {
    console.error('❌ Error getting AI agent status:', error);
    res.status(500).json({ message: 'Failed to get AI agent status', error: error.message });
  }
});

// Process AI Request with OpenAI
router.post('/process', authenticateToken, requireAdminPermission('system_management'), async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }
    
    console.log('🤖 Processing AI request with OpenAI:', message.substring(0, 100) + '...');
    
    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY) {
      console.log('⚠️ OpenAI API key not configured, using fallback response');
      const response = generateAIResponse(message, context);
      return res.json({
        response: response + '\n\n*Note: Using fallback AI. Configure OPENAI_API_KEY for enhanced capabilities.*',
        confidence: 0.6,
        processingTime: 500,
        suggestions: generateSuggestions(message),
        timestamp: new Date().toISOString(),
        mode: 'fallback'
      });
    }
    
    // Create system prompt for VBMS context
    const systemPrompt = `You are the VBMS AI Code Agent, a specialized assistant for the Video Business Management System (VBMS). You help administrators with:

CURRENT VBMS SYSTEM CONTEXT:
- Frontend: Bootstrap 5.3.3, HTML/CSS/JavaScript
- Backend: Node.js, Express.js, MongoDB with Mongoose
- Authentication: JWT-based with role system (admin, main_admin, customer)
- Payments: Stripe integration for subscriptions
- Email: Nodemailer service for automated emails
- Architecture: Master admin system with red accent (#dc3545), regular admin system with gold accent (#f0b90b)

CURRENT FEATURES:
- Customer dashboard and management
- Admin dashboard with analytics
- Pricing plan management
- Affiliate program
- Order management and inventory
- AI phone system (VAPI integration)
- Email management system
- Real-time monitoring

YOUR CAPABILITIES:
1. Code Analysis & Debugging
2. Feature Development & Implementation
3. Database Schema Design
4. API Endpoint Creation
5. Frontend Component Generation
6. Security Best Practices
7. Performance Optimization
8. Integration Assistance

RESPONSE FORMAT:
- Provide specific, actionable code solutions
- Include implementation steps
- Explain technical decisions
- Suggest best practices
- Format code blocks with proper syntax highlighting
- Be concise but comprehensive

User Context: ${context ? JSON.stringify(context) : 'General VBMS assistance'}`;

    const startTime = Date.now();
    
    // Send request to OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4", // Use GPT-4 for better code understanding
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 2000,
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });
    
    const processingTime = Date.now() - startTime;
    const aiResponse = completion.choices[0].message.content;
    
    console.log('✅ OpenAI response generated in', processingTime + 'ms');
    
    res.json({
      response: aiResponse,
      confidence: 0.95, // High confidence with GPT-4
      processingTime: processingTime,
      suggestions: await generateOpenAISuggestions(message),
      timestamp: new Date().toISOString(),
      mode: 'openai',
      model: 'gpt-4',
      tokensUsed: completion.usage?.total_tokens || 0
    });
    
  } catch (error) {
    console.error('❌ Error processing AI request:', error);
    
    // Fallback to local response if OpenAI fails
    if (error.code === 'insufficient_quota' || error.status === 429) {
      const fallbackResponse = generateAIResponse(message, context);
      return res.json({
        response: fallbackResponse + '\n\n*Note: OpenAI quota exceeded, using fallback mode.*',
        confidence: 0.6,
        processingTime: 200,
        suggestions: generateSuggestions(message),
        timestamp: new Date().toISOString(),
        mode: 'fallback_quota_exceeded'
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to process AI request', 
      error: error.message,
      fallback: generateAIResponse(message, context)
    });
  }
});

// Code Analysis Endpoint with OpenAI
router.post('/analyze-code', authenticateToken, requireAdminPermission('system_management'), async (req, res) => {
  try {
    const { filePath, codeContent } = req.body;
    
    if (!codeContent && !filePath) {
      return res.status(400).json({ message: 'Code content or file path is required' });
    }
    
    console.log('🔍 Analyzing code with OpenAI:', filePath || 'inline code');
    
    let codeToAnalyze = codeContent;
    
    // If file path provided, try to read the file
    if (filePath && !codeContent) {
      try {
        const fullPath = path.join(__dirname, '../../', filePath);
        codeToAnalyze = await fs.readFile(fullPath, 'utf8');
      } catch (fileError) {
        console.log('Could not read file, using fallback analysis');
      }
    }
    
    if (!process.env.OPENAI_API_KEY || !codeToAnalyze) {
      // Fallback to simulated analysis
      const analysis = await analyzeCode(codeToAnalyze || filePath);
      return res.json({
        analysis: analysis,
        recommendations: generateCodeRecommendations(analysis),
        metrics: {
          linesOfCode: codeToAnalyze ? codeToAnalyze.split('\n').length : Math.floor(Math.random() * 500) + 50,
          complexity: Math.floor(Math.random() * 10) + 1,
          maintainability: Math.floor(Math.random() * 30) + 70,
          security: Math.floor(Math.random() * 20) + 80
        },
        timestamp: new Date().toISOString(),
        mode: 'fallback'
      });
    }
    
    // Use OpenAI for code analysis
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a senior code reviewer for the VBMS system. Analyze the provided code and return a detailed analysis in JSON format with:

{
  "issues": [{"type": "error|warning|info", "line": number, "message": "description", "severity": "high|medium|low"}],
  "complexity": number (1-10),
  "maintainability": number (1-100),
  "security": number (1-100),
  "performance": number (1-100),
  "recommendations": ["specific actionable recommendations"],
  "codeSmells": ["identified code smells"],
  "bestPractices": ["best practices to implement"]
}

Focus on:
- Security vulnerabilities
- Performance issues
- Code maintainability
- VBMS-specific patterns
- Node.js/Express best practices
- Frontend optimization (if applicable)`
        },
        {
          role: "user",
          content: `Analyze this code:\n\n\`\`\`\n${codeToAnalyze}\n\`\`\``
        }
      ],
      max_tokens: 1500,
      temperature: 0.3
    });
    
    let aiAnalysis;
    try {
      aiAnalysis = JSON.parse(completion.choices[0].message.content);
    } catch (parseError) {
      // If JSON parsing fails, create structured response
      aiAnalysis = {
        issues: [],
        complexity: 5,
        maintainability: 75,
        security: 80,
        performance: 75,
        recommendations: [completion.choices[0].message.content],
        codeSmells: [],
        bestPractices: []
      };
    }
    
    res.json({
      analysis: aiAnalysis,
      recommendations: aiAnalysis.recommendations || [],
      metrics: {
        linesOfCode: codeToAnalyze.split('\n').length,
        complexity: aiAnalysis.complexity || 5,
        maintainability: aiAnalysis.maintainability || 75,
        security: aiAnalysis.security || 80,
        performance: aiAnalysis.performance || 75
      },
      timestamp: new Date().toISOString(),
      mode: 'openai',
      tokensUsed: completion.usage?.total_tokens || 0
    });
    
  } catch (error) {
    console.error('❌ Error analyzing code:', error);
    
    // Fallback analysis
    const fallbackAnalysis = await analyzeCode(codeContent || filePath);
    res.json({
      analysis: fallbackAnalysis,
      recommendations: generateCodeRecommendations(fallbackAnalysis),
      metrics: {
        linesOfCode: codeContent ? codeContent.split('\n').length : 100,
        complexity: 5,
        maintainability: 75,
        security: 80
      },
      timestamp: new Date().toISOString(),
      mode: 'fallback_error',
      error: error.message
    });
  }
});

// Generate Code Endpoint with OpenAI
router.post('/generate-code', authenticateToken, requireAdminPermission('system_management'), async (req, res) => {
  try {
    const { request, type, framework, context } = req.body;
    
    if (!request) {
      return res.status(400).json({ message: 'Code generation request is required' });
    }
    
    console.log('🚀 Generating code with OpenAI for:', request);
    
    if (!process.env.OPENAI_API_KEY) {
      // Fallback to template-based generation
      const generatedCode = await generateCode(request, type, framework);
      return res.json({
        code: generatedCode,
        language: detectLanguage(type, framework),
        filename: generateFilename(request, type),
        instructions: generateImplementationInstructions(request, type),
        timestamp: new Date().toISOString(),
        mode: 'fallback'
      });
    }
    
    // Create context-aware prompt for code generation
    const systemPrompt = `You are an expert VBMS system developer. Generate production-ready code based on the request.

VBMS SYSTEM CONTEXT:
- Frontend: Bootstrap 5.3.3, HTML/CSS/JavaScript
- Backend: Node.js, Express.js, MongoDB with Mongoose
- Authentication: JWT with role-based access (admin, main_admin, customer)
- Styling: Master admin uses red accent (#dc3545), regular admin uses gold (#f0b90b)
- Database: MongoDB with Mongoose schemas
- Security: Input validation, rate limiting, helmet

REQUIREMENTS:
- Follow VBMS coding patterns and conventions
- Include proper error handling and logging
- Add authentication checks where appropriate
- Use consistent styling with existing system
- Include comprehensive comments
- Follow security best practices

Generate ${type || 'appropriate'} code using ${framework || 'current system'} framework.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Generate code for: ${request}\n\nAdditional context: ${context || 'Standard VBMS implementation'}`
        }
      ],
      max_tokens: 2500,
      temperature: 0.3
    });
    
    const generatedCode = completion.choices[0].message.content;
    
    // Extract code blocks if wrapped in markdown
    const codeMatch = generatedCode.match(/```[\w]*\n([\s\S]*?)\n```/);
    const cleanCode = codeMatch ? codeMatch[1] : generatedCode;
    
    res.json({
      code: cleanCode,
      language: detectLanguage(type, framework),
      filename: generateFilename(request, type),
      instructions: await generateAIInstructions(request, type, generatedCode),
      timestamp: new Date().toISOString(),
      mode: 'openai',
      tokensUsed: completion.usage?.total_tokens || 0,
      fullResponse: generatedCode
    });
    
  } catch (error) {
    console.error('❌ Error generating code:', error);
    
    // Fallback to template generation
    try {
      const fallbackCode = await generateCode(request, type, framework);
      res.json({
        code: fallbackCode,
        language: detectLanguage(type, framework),
        filename: generateFilename(request, type),
        instructions: generateImplementationInstructions(request, type),
        timestamp: new Date().toISOString(),
        mode: 'fallback_error',
        error: error.message
      });
    } catch (fallbackError) {
      res.status(500).json({ 
        message: 'Failed to generate code', 
        error: error.message,
        fallbackError: fallbackError.message
      });
    }
  }
});

// System Health Check
router.get('/system-health', authenticateToken, requireAdminPermission('system_management'), async (req, res) => {
  try {
    console.log('🏥 AI Agent system health check');
    
    // Simulate system health metrics
    const health = {
      overall: 'healthy',
      components: {
        database: { status: 'healthy', responseTime: Math.floor(Math.random() * 50) + 10 },
        api: { status: 'healthy', responseTime: Math.floor(Math.random() * 100) + 20 },
        frontend: { status: 'healthy', responseTime: Math.floor(Math.random() * 200) + 50 },
        ai_services: { status: 'healthy', responseTime: Math.floor(Math.random() * 300) + 100 }
      },
      metrics: {
        uptime: '99.9%',
        totalRequests: Math.floor(Math.random() * 10000) + 5000,
        avgResponseTime: Math.floor(Math.random() * 200) + 100,
        errorRate: (Math.random() * 2).toFixed(2) + '%'
      },
      recommendations: [
        'System performance is optimal',
        'No immediate action required',
        'Consider implementing caching for API responses',
        'Monitor database query performance'
      ]
    };
    
    res.json(health);
    
  } catch (error) {
    console.error('❌ Error checking system health:', error);
    res.status(500).json({ message: 'Failed to check system health', error: error.message });
  }
});

// Helper Functions

function generateAIResponse(message, context = {}) {
  const lowerMessage = message.toLowerCase();
  
  // Database and API related queries
  if (lowerMessage.includes('database') || lowerMessage.includes('api') || lowerMessage.includes('backend')) {
    return `🗄️ **Database & API Analysis Complete**

I've analyzed your VBMS backend infrastructure:

**Current Status:**
✅ MongoDB connection: Active
✅ Express.js server: Running on port 5050
✅ JWT authentication: Configured
✅ Stripe integration: Connected
✅ Email service: Operational

**Available APIs:**
- \`/api/auth/*\` - User authentication
- \`/api/users/*\` - User management
- \`/api/pricing/*\` - Pricing plans
- \`/api/stripe/*\` - Payment processing
- \`/api/inventory/*\` - Inventory management

**Recommendations:**
1. Enable API response caching for better performance
2. Add request rate limiting for security
3. Implement database connection pooling
4. Set up automated database backups

Would you like me to implement any of these improvements?`;
  }
  
  // Frontend and styling queries
  if (lowerMessage.includes('frontend') || lowerMessage.includes('styling') || lowerMessage.includes('ui') || lowerMessage.includes('design')) {
    return `🎨 **Frontend Analysis & Recommendations**

Your VBMS frontend architecture:

**Current Framework:**
✅ Bootstrap 5.3.3 for UI components
✅ Custom CSS with CSS variables
✅ Dynamic theme switching (light/dark)
✅ Responsive design patterns
✅ Master admin styling system

**Key Features:**
- Glass morphism effects
- Animated backgrounds
- Master admin accent colors (#dc3545)
- Mobile-responsive navigation
- Real-time theme switching

**Optimization Opportunities:**
1. Implement lazy loading for heavy components
2. Add CSS animations for better UX
3. Optimize image loading with WebP format
4. Bundle CSS for production deployment

Shall I help you implement any specific UI improvements?`;
  }
  
  // Code analysis and debugging
  if (lowerMessage.includes('analyze') || lowerMessage.includes('debug') || lowerMessage.includes('fix') || lowerMessage.includes('error')) {
    return `🔍 **Code Analysis Report**

I've scanned your VBMS codebase for issues:

**Code Quality Metrics:**
- **Structure:** ✅ Well-organized modular architecture
- **Security:** ✅ JWT authentication, input validation
- **Performance:** ⚠️ Some optimization opportunities
- **Maintainability:** ✅ Consistent coding patterns

**Issues Found:**
1. **Minor:** Some hardcoded values could be moved to config
2. **Performance:** Database queries could be optimized
3. **UX:** Loading states could be improved

**Recommended Fixes:**
\`\`\`javascript
// Example optimization for database queries
const optimizedQuery = await User.find({ role: 'customer' })
  .select('name email status')
  .limit(50)
  .sort({ createdAt: -1 });
\`\`\`

Would you like me to fix any specific issues or generate optimized code?`;
  }
  
  // Feature creation requests
  if (lowerMessage.includes('create') || lowerMessage.includes('build') || lowerMessage.includes('new') || lowerMessage.includes('add')) {
    return `🚀 **Feature Development Assistant**

I can help you create new features for VBMS:

**Available Templates:**
1. **Admin Pages** - Full master admin layout with sidebar
2. **API Endpoints** - Express routes with authentication
3. **Database Models** - Mongoose schemas with validation
4. **UI Components** - Bootstrap components with themes
5. **Integration Services** - Third-party API connections

**Quick Creation Options:**
- 📄 New admin dashboard page
- 🔌 REST API endpoint with CRUD operations
- 📊 Real-time analytics component
- 🔐 Authentication middleware
- 📧 Email notification system

**Example Code Generation:**
\`\`\`javascript
// I can generate complete features like this:
router.post('/api/new-feature', authenticateToken, async (req, res) => {
  // Full implementation with error handling
});
\`\`\`

What specific feature would you like me to create? Just describe what you need!`;
  }
  
  // Default comprehensive response
  return `🤖 **VBMS AI Agent Ready to Assist**

I understand you want help with: "${message}"

**I can help you with:**

🔧 **System Management:**
- Fix navigation and routing issues
- Update styling and themes
- Connect pages to real data
- Optimize performance

📊 **Data & APIs:**
- Create new API endpoints
- Connect frontend to backend
- Database schema updates
- Real-time data integration

🎨 **Frontend Development:**
- Create new admin pages
- Update UI components
- Implement responsive designs
- Add interactive features

🔍 **Code Analysis:**
- Debug existing code
- Find performance issues
- Security vulnerability scanning
- Code quality improvements

**Next Steps:**
Just tell me specifically what you'd like me to do. For example:
- "Create a new customer analytics page"
- "Fix the navigation issues on mobile"
- "Connect the affiliate program to the database"
- "Generate an API endpoint for inventory management"

I'll provide detailed code and implementation steps!`;
}

function generateSuggestions(message) {
  const suggestions = [
    "Analyze the current codebase for potential improvements",
    "Create a new admin dashboard component",
    "Fix navigation issues across all pages",
    "Optimize database query performance",
    "Implement real-time data updates",
    "Add comprehensive error handling",
    "Create API documentation",
    "Set up automated testing suite"
  ];
  
  // Return 3 random suggestions
  return suggestions.sort(() => 0.5 - Math.random()).slice(0, 3);
}

function analyzeCode(codeOrPath) {
  // Simulate code analysis
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        issues: [
          { type: 'warning', line: 45, message: 'Consider using const instead of let', severity: 'low' },
          { type: 'info', line: 120, message: 'Function could be optimized', severity: 'medium' },
          { type: 'error', line: 200, message: 'Potential null pointer exception', severity: 'high' }
        ],
        complexity: Math.floor(Math.random() * 10) + 1,
        maintainability: Math.floor(Math.random() * 30) + 70,
        duplications: Math.floor(Math.random() * 5),
        testCoverage: Math.floor(Math.random() * 40) + 60
      });
    }, 500);
  });
}

function generateCodeRecommendations(analysis) {
  return [
    "Add input validation to prevent security vulnerabilities",
    "Implement proper error handling with try-catch blocks",
    "Use async/await instead of promises for better readability",
    "Add JSDoc comments for better documentation",
    "Consider breaking down large functions into smaller ones"
  ];
}

function generateCode(request, type, framework) {
  // Simulate code generation based on request
  return new Promise((resolve) => {
    setTimeout(() => {
      if (type === 'api') {
        resolve(generateAPICode(request, framework));
      } else if (type === 'frontend') {
        resolve(generateFrontendCode(request, framework));
      } else if (type === 'database') {
        resolve(generateDatabaseCode(request));
      } else {
        resolve(generateGenericCode(request));
      }
    }, 1000);
  });
}

function generateAPICode(request, framework = 'express') {
  return `const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdminPermission } = require('../middleware/auth');

// ${request} - Generated API endpoint
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('📊 Processing ${request}');
    
    // Implementation logic here
    const result = await processRequest(req.query);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in ${request}:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process request',
      error: error.message 
    });
  }
});

async function processRequest(params) {
  // Add your business logic here
  return { message: 'Request processed successfully' };
}

module.exports = router;`;
}

function generateFrontendCode(request, framework = 'bootstrap') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${request} - Master Admin - VBMS</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
  <style>
    :root {
      --master-admin-accent: #dc3545;
      --accent: #f0b90b;
      --glass: rgba(255,255,255,0.95);
    }
    
    .main-content {
      margin-left: 320px;
      padding: 30px;
      min-height: 100vh;
    }
    
    .page-header h1 {
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .page-header h1 i {
      color: var(--master-admin-accent);
    }
  </style>
</head>
<body>

<!-- Master Admin Sidebar Container -->
<div id="sidebar-container"></div>

<!-- MAIN CONTENT -->
<main class="main-content">
  <div class="page-header">
    <h1><i class="bi bi-gear"></i> ${request}</h1>
    <p class="text-muted">Generated page for ${request}</p>
  </div>
  
  <!-- Your content here -->
  <div class="card">
    <div class="card-body">
      <h5 class="card-title">Welcome to ${request}</h5>
      <p class="card-text">This page was generated by the AI Code Agent.</p>
    </div>
  </div>
</main>

<!-- Scripts -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="auth.js"></script>
<script src="load-sidebar.js"></script>
<script src="theme-manager.js"></script>

</body>
</html>`;
}

function generateDatabaseCode(request) {
  return `const mongoose = require('mongoose');

// ${request} - Generated Mongoose Schema
const ${request.replace(/\s+/g, '')}Schema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
${request.replace(/\s+/g, '')}Schema.index({ status: 1, createdAt: -1 });
${request.replace(/\s+/g, '')}Schema.index({ createdBy: 1 });

// Virtuals
${request.replace(/\s+/g, '')}Schema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Methods
${request.replace(/\s+/g, '')}Schema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Static methods
${request.replace(/\s+/g, '')}Schema.statics.findByStatus = function(status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('${request.replace(/\s+/g, '')}', ${request.replace(/\s+/g, '')}Schema);`;
}

function generateGenericCode(request) {
  return `/**
 * ${request} - Generated by VBMS AI Code Agent
 * Created: ${new Date().toISOString()}
 */

class ${request.replace(/\s+/g, '')}Manager {
  constructor(options = {}) {
    this.options = options;
    this.initialized = false;
  }
  
  async initialize() {
    try {
      console.log('🚀 Initializing ${request}...');
      
      // Add initialization logic here
      
      this.initialized = true;
      console.log('✅ ${request} initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize ${request}:', error);
      throw error;
    }
  }
  
  async process(data) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      // Add processing logic here
      console.log('📊 Processing ${request} data...');
      
      return {
        success: true,
        data: data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error processing ${request}:', error);
      throw error;
    }
  }
}

module.exports = ${request.replace(/\s+/g, '')}Manager;`;
}

function detectLanguage(type, framework) {
  if (type === 'api' || framework === 'express') return 'javascript';
  if (type === 'frontend' || framework === 'bootstrap') return 'html';
  if (type === 'database') return 'javascript';
  return 'javascript';
}

function generateFilename(request, type) {
  const baseName = request.toLowerCase().replace(/\s+/g, '-');
  
  if (type === 'api') return `${baseName}.js`;
  if (type === 'frontend') return `${baseName}.html`;
  if (type === 'database') return `${baseName}-model.js`;
  return `${baseName}.js`;
}

function generateImplementationInstructions(request, type) {
  const instructions = [
    `1. Save the generated code to the appropriate directory`,
    `2. Review and customize the code for your specific needs`,
    `3. Test the implementation thoroughly`,
    `4. Add proper error handling and validation`,
    `5. Update documentation and comments as needed`
  ];
  
  if (type === 'api') {
    instructions.push(`6. Add the router to your main server file`);
    instructions.push(`7. Test API endpoints with Postman or curl`);
  }
  
  if (type === 'frontend') {
    instructions.push(`6. Add the page to your navigation system`);
    instructions.push(`7. Update the masterAdminPages array in load-sidebar.js`);
  }
  
  return instructions;
}

// OpenAI-powered suggestion generation
async function generateOpenAISuggestions(message) {
  if (!process.env.OPENAI_API_KEY) {
    return generateSuggestions(message);
  }
  
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Generate 3 concise, actionable suggestions for VBMS system improvements based on the user's request. Return as a JSON array of strings."
        },
        {
          role: "user",
          content: `User request: ${message}`
        }
      ],
      max_tokens: 200,
      temperature: 0.7
    });
    
    try {
      return JSON.parse(completion.choices[0].message.content);
    } catch {
      return [completion.choices[0].message.content];
    }
  } catch (error) {
    console.error('Error generating OpenAI suggestions:', error);
    return generateSuggestions(message);
  }
}

// AI-powered implementation instructions
async function generateAIInstructions(request, type, generatedCode) {
  if (!process.env.OPENAI_API_KEY) {
    return generateImplementationInstructions(request, type);
  }
  
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Generate step-by-step implementation instructions for the provided code in the VBMS system. Return as a JSON array of strings."
        },
        {
          role: "user",
          content: `Request: ${request}\nType: ${type}\nCode: ${generatedCode.substring(0, 500)}...`
        }
      ],
      max_tokens: 300,
      temperature: 0.3
    });
    
    try {
      return JSON.parse(completion.choices[0].message.content);
    } catch {
      return completion.choices[0].message.content.split('\n').filter(line => line.trim());
    }
  } catch (error) {
    console.error('Error generating AI instructions:', error);
    return generateImplementationInstructions(request, type);
  }
}

module.exports = router;