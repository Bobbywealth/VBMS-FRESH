/**
 * VBMS Email Management System
 * Comprehensive email management with real backend integration
 */

class VBMSEmailManager {
  constructor() {
    this.apiBase = '/api';
    this.currentCategory = 'inbox';
    this.currentPage = 1;
    this.pageSize = 50;
    this.isLoading = false;
    this.currentEmailId = null;
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }
  
  async init() {
    console.log('📧 Initializing VBMS Email Manager...');
    
    try {
      // Check authentication
      if (!vbmsAuth.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
      }
      
      // Load initial data
      await this.loadEmailStats();
      await this.loadEmails();
      this.setupEventListeners();
      
      // Track activity
      if (window.activityTracker) {
        activityTracker.trackCustomActivity('email_manager_accessed', 'Master Admin accessed email management system', {
          priority: 'medium',
          module: 'Email Management'
        });
      }
      
      console.log('✅ Email Manager initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Email Manager:', error);
      this.showNotification('Failed to initialize email manager', 'error');
    }
  }
  
  async loadEmailStats() {
    try {
      const token = localStorage.getItem('vbms_token');
      if (!token) throw new Error('No authentication token');
      
      const response = await fetch(`${this.apiBase}/email/stats/overview`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to load email stats');
      
      const data = await response.json();
      const stats = data.stats;
      
      // Update UI with real stats
      this.updateStatsDisplay({
        sent: stats.sent || 0,
        delivered: stats.inbox || 0,
        opened: (stats.sent - stats.unread) || 0,
        clicked: 0, // Will be updated when analytics are implemented
        failed: 0, // Will be updated when failure tracking is implemented
        drafts: stats.drafts || 0
      });
      
    } catch (error) {
      console.error('Error loading email stats:', error);
      // Show fallback stats
      this.updateStatsDisplay({
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        failed: 0,
        drafts: 0
      });
    }
  }
  
  updateStatsDisplay(stats) {
    const elements = {
      'emailsSent': stats.sent,
      'emailsDelivered': stats.delivered,
      'emailsOpened': stats.opened,
      'emailsClicked': stats.clicked,
      'emailsFailed': stats.failed,
      'emailsDrafts': stats.drafts
    };
    
    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value.toLocaleString();
      }
    });
  }
  
  async loadEmails(category = 'inbox', page = 1) {
    if (this.isLoading) return;
    
    try {
      this.isLoading = true;
      this.showLoadingState();
      
      const token = localStorage.getItem('vbms_token');
      if (!token) throw new Error('No authentication token');
      
      let endpoint = `${this.apiBase}/email/sent`;
      if (category === 'inbox') endpoint = `${this.apiBase}/email/inbox`;
      if (category === 'drafts') endpoint = `${this.apiBase}/email/drafts`;
      
      const response = await fetch(`${endpoint}?page=${page}&limit=${this.pageSize}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to load emails');
      
      const data = await response.json();
      this.displayEmails(data.emails);
      this.updatePagination(data.pagination);
      
      this.currentCategory = category;
      this.currentPage = page;
      
    } catch (error) {
      console.error('Error loading emails:', error);
      this.showNotification('Failed to load emails', 'error');
      this.showEmptyState('Failed to load emails');
    } finally {
      this.isLoading = false;
      this.hideLoadingState();
    }
  }
  
  displayEmails(emails) {
    // Target the correct table based on current category
    const tableBodyId = this.currentCategory === 'sent' ? 'sentEmailTableBody' : 'emailTableBody';
    const tableBody = document.getElementById(tableBodyId);
    if (!tableBody) return;
    
    if (!emails || emails.length === 0) {
      this.showEmptyState('No emails found');
      return;
    }
    
    tableBody.innerHTML = '';
    
    emails.forEach(email => {
      const row = this.createEmailRow(email);
      tableBody.appendChild(row);
    });
  }
  
  createEmailRow(email) {
    const row = document.createElement('tr');
    
    const statusClass = {
      'delivered': 'success',
      'opened': 'info',
      'sent': 'primary',
      'failed': 'danger',
      'draft': 'warning'
    }[email.status] || 'secondary';
    
    const sentDate = email.createdAt ? new Date(email.createdAt).toLocaleString() : 'Unknown';
    const subject = email.subject || 'No Subject';
    const analytics = email.analytics ? 
      `${email.analytics.totalOpens || 0}` : '0';
    
    // Show different first column based on category
    const firstColumn = this.currentCategory === 'inbox' 
      ? email.from || 'Unknown Sender'
      : email.to || 'Unknown Recipient';
    
    if (this.currentCategory === 'sent') {
      // Sent emails layout
      row.innerHTML = `
        <td class="email-recipient">${this.truncateText(firstColumn, 30)}</td>
        <td class="email-subject">${this.truncateText(subject, 40)}</td>
        <td class="email-status">
          <span class="badge bg-${statusClass}">${email.status}</span>
        </td>
        <td class="email-date">${sentDate}</td>
        <td class="email-opens">${analytics}</td>
        <td class="email-actions">
          ${this.createActionButtons(email)}
        </td>
      `;
    } else {
      // Inbox emails layout
      row.innerHTML = `
        <td class="email-sender">${this.truncateText(firstColumn, 30)}</td>
        <td class="email-subject">${this.truncateText(subject, 40)}</td>
        <td class="email-type">${email.type || 'Email'}</td>
        <td class="email-status">
          <span class="badge bg-${statusClass}">${email.status}</span>
        </td>
        <td class="email-date">${sentDate}</td>
        <td class="email-opens">${analytics}</td>
        <td class="email-actions">
          ${this.createActionButtons(email)}
        </td>
      `;
    }
    
    return row;
  }
  
  createActionButtons(email) {
    const buttons = [];
    
    // View button (always available)
    buttons.push(`
      <button class="email-action-btn view" onclick="vbmsEmailManager.viewEmail('${email.id}')" title="View">
        <i class="bi bi-eye"></i>
      </button>
    `);
    
    // Draft-specific buttons
    if (email.status === 'draft') {
      buttons.push(`
        <button class="email-action-btn edit" onclick="vbmsEmailManager.editEmail('${email.id}')" title="Edit">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="email-action-btn send" onclick="vbmsEmailManager.sendDraftEmail('${email.id}')" title="Send">
          <i class="bi bi-send"></i>
        </button>
      `);
    }
    
    // Failed email buttons
    if (email.status === 'failed') {
      buttons.push(`
        <button class="email-action-btn retry" onclick="vbmsEmailManager.retryEmail('${email.id}')" title="Retry">
          <i class="bi bi-arrow-clockwise"></i>
        </button>
      `);
    }
    
    // Sent email buttons
    if (email.status !== 'draft' && email.status !== 'failed') {
      buttons.push(`
        <button class="email-action-btn resend" onclick="vbmsEmailManager.resendEmail('${email.id}')" title="Resend">
          <i class="bi bi-arrow-clockwise"></i>
        </button>
      `);
    }
    
    // Delete button (always available)
    buttons.push(`
      <button class="email-action-btn delete" onclick="vbmsEmailManager.deleteEmail('${email.id}')" title="Delete">
        <i class="bi bi-trash"></i>
      </button>
    `);
    
    return `<div class="btn-group" role="group">${buttons.join('')}</div>`;
  }
  
  async viewEmail(emailId) {
    try {
      const token = localStorage.getItem('vbms_token');
      if (!token) throw new Error('No authentication token');
      
      const response = await fetch(`${this.apiBase}/email/${emailId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to load email');
      
      const data = await response.json();
      this.showEmailModal(data.email);
      
    } catch (error) {
      console.error('Error viewing email:', error);
      this.showNotification('Failed to load email', 'error');
    }
  }
  
  async editEmail(emailId) {
    try {
      const token = localStorage.getItem('vbms_token');
      if (!token) throw new Error('No authentication token');
      
      const response = await fetch(`${this.apiBase}/email/${emailId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to load email');
      
      const data = await response.json();
      this.populateComposeForm(data.email);
      
      // Switch to compose tab
      const composeTab = document.getElementById('compose-tab');
      if (composeTab) {
        composeTab.click();
      }
      
    } catch (error) {
      console.error('Error loading email for editing:', error);
      this.showNotification('Failed to load email for editing', 'error');
    }
  }
  
  async sendNewEmail() {
    try {
      const formData = this.getComposeFormData();
      
      // Validate form
      if (!this.validateComposeForm(formData)) {
        return;
      }
      
      const token = localStorage.getItem('vbms_token');
      if (!token) throw new Error('No authentication token');
      
      this.showSendingState();
      
      const response = await fetch(`${this.apiBase}/email/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) throw new Error('Failed to send email');
      
      const data = await response.json();
      
      this.showNotification('Email sent successfully!', 'success');
      this.clearComposeForm();
      await this.loadEmailStats();
      await this.loadEmails();
      
      // Track activity
      if (window.activityTracker) {
        activityTracker.trackCustomActivity('email_sent', 'Email sent successfully', {
          priority: 'medium',
          module: 'Email Management',
          subject: formData.subject
        });
      }
      
    } catch (error) {
      console.error('Error sending email:', error);
      this.showNotification('Failed to send email', 'error');
    } finally {
      this.hideSendingState();
    }
  }
  
  async saveDraft() {
    try {
      const formData = this.getComposeFormData();
      
      const token = localStorage.getItem('vbms_token');
      if (!token) throw new Error('No authentication token');
      
      const response = await fetch(`${this.apiBase}/email/draft`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) throw new Error('Failed to save draft');
      
      const data = await response.json();
      
      this.showNotification('Draft saved successfully!', 'success');
      await this.loadEmailStats();
      
      // Track activity
      if (window.activityTracker) {
        activityTracker.trackCustomActivity('email_draft_saved', 'Email draft saved', {
          priority: 'low',
          module: 'Email Management'
        });
      }
      
    } catch (error) {
      console.error('Error saving draft:', error);
      this.showNotification('Failed to save draft', 'error');
    }
  }
  
  async deleteEmail(emailId) {
    if (!confirm('Are you sure you want to delete this email?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('vbms_token');
      if (!token) throw new Error('No authentication token');
      
      const response = await fetch(`${this.apiBase}/email/${emailId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to delete email');
      
      this.showNotification('Email deleted successfully', 'success');
      await this.loadEmails(this.currentCategory, this.currentPage);
      
    } catch (error) {
      console.error('Error deleting email:', error);
      this.showNotification('Failed to delete email', 'error');
    }
  }
  
  getComposeFormData() {
    const recipientType = document.getElementById('recipientType')?.value || 'single';
    let to = document.getElementById('emailTo')?.value || '';
    
    // Handle different recipient types
    if (recipientType === 'all') {
      to = 'all-customers@vbms.com'; // This will be handled by the backend
    } else if (recipientType === 'admins') {
      to = 'all-admins@vbms.com'; // This will be handled by the backend
    }
    
    return {
      to,
      subject: document.getElementById('emailSubject')?.value || '',
      content: {
        html: document.getElementById('emailContent')?.value || '',
        text: document.getElementById('emailContent')?.value?.replace(/<[^>]*>/g, '') || ''
      },
      priority: document.getElementById('emailPriority')?.value || 'normal',
      type: 'custom',
      scheduledFor: document.getElementById('scheduleDate')?.value || null
    };
  }
  
  validateComposeForm(formData) {
    if (!formData.subject.trim()) {
      this.showNotification('Please enter an email subject', 'error');
      return false;
    }
    
    if (!formData.content.text.trim()) {
      this.showNotification('Please enter email content', 'error');
      return false;
    }
    
    if (!formData.to.trim()) {
      this.showNotification('Please specify recipients', 'error');
      return false;
    }
    
    return true;
  }
  
  populateComposeForm(email) {
    document.getElementById('emailTo').value = email.to || '';
    document.getElementById('emailSubject').value = email.subject || '';
    document.getElementById('emailContent').value = email.content?.html || email.content?.text || '';
    document.getElementById('emailPriority').value = email.priority || 'normal';
    
    this.currentEmailId = email.id;
  }
  
  clearComposeForm() {
    const form = document.getElementById('emailComposeForm');
    if (form) {
      form.reset();
    }
    this.currentEmailId = null;
  }
  
  setupEventListeners() {
    // Category tabs
    const categoryTabs = document.querySelectorAll('[data-email-category]');
    categoryTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const category = tab.dataset.emailCategory;
        this.loadEmails(category, 1);
      });
    });
    
    // Search and filters
    const searchInput = document.getElementById('emailSearch');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.filterEmails();
        }, 300);
      });
    }
    
    const filterSelect = document.getElementById('emailFilter');
    if (filterSelect) {
      filterSelect.addEventListener('change', () => {
        this.filterEmails();
      });
    }
    
    // Recipient type change
    const recipientType = document.getElementById('recipientType');
    if (recipientType) {
      recipientType.addEventListener('change', () => {
        this.updateRecipientOptions();
      });
    }
    
    // Template selection
    const templateSelect = document.getElementById('emailTemplate');
    if (templateSelect) {
      templateSelect.addEventListener('change', () => {
        this.loadTemplate();
      });
    }
  }
  
  updateRecipientOptions() {
    const recipientType = document.getElementById('recipientType').value;
    const recipientInput = document.getElementById('recipientInput');
    const emailTo = document.getElementById('emailTo');
    
    switch (recipientType) {
      case 'single':
        recipientInput.style.display = 'block';
        emailTo.placeholder = 'Enter email address';
        emailTo.type = 'email';
        break;
      case 'group':
        recipientInput.style.display = 'block';
        emailTo.placeholder = 'Select customer group';
        emailTo.type = 'text';
        break;
      case 'all':
        recipientInput.style.display = 'none';
        break;
      case 'admins':
        recipientInput.style.display = 'none';
        break;
      case 'custom':
        recipientInput.style.display = 'block';
        emailTo.placeholder = 'Enter email addresses separated by commas';
        emailTo.type = 'text';
        break;
    }
  }
  
  loadTemplate() {
    const template = document.getElementById('emailTemplate').value;
    const subjectField = document.getElementById('emailSubject');
    const contentField = document.getElementById('emailContent');
    
    const templates = {
      welcome: {
        subject: 'Welcome to VBMS - Your Account is Ready!',
        content: `Dear [Customer Name],

Welcome to VBMS! We're thrilled to have you join our community of successful business owners.

Your account is now active and ready to use. Here's what you can do next:

✅ Complete your business profile
✅ Connect your integrations
✅ Explore your dashboard
✅ Set up monitoring preferences

If you need any help getting started, our support team is here for you.

Best regards,
The VBMS Team`
      },
      newsletter: {
        subject: 'VBMS Monthly Newsletter - [Month Year]',
        content: `Hello VBMS Community!

Here's what's new this month:

🚀 New Features:
- Enhanced analytics dashboard
- Improved mobile experience
- New integration options

📊 Platform Updates:
- Performance improvements
- Security enhancements
- Bug fixes and optimizations

📈 Success Stories:
[Share customer success stories]

Thank you for being part of the VBMS family!

Best regards,
The VBMS Team`
      },
      announcement: {
        subject: 'Important Announcement from VBMS',
        content: `Dear VBMS Users,

We have an important announcement to share with you.

[Announcement content here]

If you have any questions, please don't hesitate to contact our support team.

Thank you for your continued trust in VBMS.

Best regards,
The VBMS Team`
      },
      promotion: {
        subject: '🎉 Special Offer - Limited Time Only!',
        content: `Don't miss out on this special offer!

🎯 [Offer Details]
💰 Save [Amount/Percentage]
⏰ Offer expires: [Date]

Use code: [PROMO_CODE]

This is a limited-time offer exclusively for our valued customers.

Claim your discount now!

Best regards,
The VBMS Team`
      }
    };
    
    if (templates[template]) {
      subjectField.value = templates[template].subject;
      contentField.value = templates[template].content;
    }
  }
  
  filterEmails() {
    const filter = document.getElementById('emailFilter')?.value || 'all';
    const search = document.getElementById('emailSearch')?.value?.toLowerCase() || '';
    const tableBody = document.getElementById('emailTableBody');
    const rows = tableBody?.getElementsByTagName('tr') || [];
    
    for (let row of rows) {
      const cells = row.getElementsByTagName('td');
      if (cells.length === 0) continue;
      
      const recipient = cells[0]?.textContent?.toLowerCase() || '';
      const subject = cells[1]?.textContent?.toLowerCase() || '';
      const status = cells[3]?.textContent?.toLowerCase() || '';
      
      let showRow = true;
      
      // Filter by status
      if (filter !== 'all' && !status.includes(filter)) {
        showRow = false;
      }
      
      // Filter by search term
      if (search && !recipient.includes(search) && !subject.includes(search)) {
        showRow = false;
      }
      
      row.style.display = showRow ? '' : 'none';
    }
  }
  
  showLoadingState() {
    const tableBody = document.getElementById('emailTableBody');
    if (tableBody) {
      tableBody.innerHTML = '<tr><td colspan="6" class="text-center"><i class="bi bi-hourglass-split"></i> Loading emails...</td></tr>';
    }
  }
  
  hideLoadingState() {
    // Loading state is automatically hidden when emails are displayed
  }
  
  showEmptyState(message = 'No emails found') {
    const tableBody = document.getElementById('emailTableBody');
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">${message}</td></tr>`;
    }
  }
  
  showSendingState() {
    const sendBtn = document.querySelector('[onclick*="sendNewEmail"]');
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Sending...';
    }
  }
  
  hideSendingState() {
    const sendBtn = document.querySelector('[onclick*="sendNewEmail"]');
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.innerHTML = '<i class="bi bi-send"></i> Send Email';
    }
  }
  
  updatePagination(pagination) {
    // TODO: Implement pagination UI updates
    console.log('Pagination:', pagination);
  }
  
  showEmailModal(email) {
    // TODO: Implement email viewing modal
    console.log('Viewing email:', email);
    this.showNotification('Email viewer modal not yet implemented', 'info');
  }
  
  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
  
  showNotification(message, type = 'info') {
    // Use the global notification system if available
    if (window.vbmsNotifications) {
      window.vbmsNotifications.notify('Email Manager', message, type);
      return;
    }
    
    // Fallback to simple alert
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
      ${message}
      <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }
  
  // Public API methods for backward compatibility
  async syncEmails() {
    await this.loadEmails(this.currentCategory, this.currentPage);
    await this.loadEmailStats();
    this.showNotification('Email sync completed!', 'success');
  }
  
  createNewEmail() {
    // Switch to compose tab
    const composeTab = document.getElementById('compose-tab');
    if (composeTab) {
      composeTab.click();
    }
    
    // Clear form
    this.clearComposeForm();
    
    if (window.activityTracker) {
      activityTracker.trackCustomActivity('email_compose_started', 'Admin started composing new email', {
        priority: 'medium',
        module: 'Email Management'
      });
    }
  }
  
  async sendDraftEmail(emailId) {
    try {
      const token = localStorage.getItem('vbms_token');
      if (!token) throw new Error('No authentication token');
      
      // First get the draft
      const response = await fetch(`${this.apiBase}/email/${emailId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to load draft');
      
      const draftData = await response.json();
      const draft = draftData.email;
      
      // Send the draft
      const sendResponse = await fetch(`${this.apiBase}/email/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: draft.to,
          subject: draft.subject,
          content: draft.content,
          priority: draft.priority,
          type: draft.type
        })
      });
      
      if (!sendResponse.ok) throw new Error('Failed to send draft');
      
      // Delete the draft
      await fetch(`${this.apiBase}/email/${emailId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      this.showNotification('Draft sent successfully!', 'success');
      await this.loadEmails(this.currentCategory, this.currentPage);
      await this.loadEmailStats();
      
    } catch (error) {
      console.error('Error sending draft:', error);
      this.showNotification('Failed to send draft', 'error');
    }
  }
  
  async resendEmail(emailId) {
    console.log('🔄 Resending email:', emailId);
    this.showNotification('Email resend feature not yet implemented', 'info');
  }
  
  async retryEmail(emailId) {
    console.log('🔄 Retrying failed email:', emailId);
    this.showNotification('Email retry feature not yet implemented', 'info');
  }

  // Outlook Email Sync functionality
  async syncOutlookEmails() {
    try {
      console.log('🔄 Starting Outlook email sync...');
      
      const syncBtn = document.getElementById('syncEmailsBtn');
      if (syncBtn) {
        syncBtn.disabled = true;
        syncBtn.innerHTML = '<i class="bi bi-arrow-clockwise spinning"></i> Syncing...';
      }
      
      const token = localStorage.getItem('vbms_token');
      if (!token) throw new Error('No authentication token');
      
      // Start the sync
      const response = await fetch(`${this.apiBase}/email-sync/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ limit: 100 })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start email sync');
      }
      
      const data = await response.json();
      console.log('✅ Sync started:', data);
      
      this.showNotification('Email sync started! This may take 1-3 minutes.', 'info');
      
      // Poll for completion (check every 10 seconds)
      this.pollSyncStatus();
      
    } catch (error) {
      console.error('❌ Sync error:', error);
      this.showNotification(`Sync failed: ${error.message}`, 'error');
      this.resetSyncButton();
    }
  }
  
  async pollSyncStatus() {
    const maxPolls = 18; // 3 minutes max
    let pollCount = 0;
    
    const pollInterval = setInterval(async () => {
      try {
        pollCount++;
        
        const token = localStorage.getItem('vbms_token');
        const response = await fetch(`${this.apiBase}/email-sync/status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const status = await response.json();
          
          if (!status.status.syncInProgress) {
            // Sync completed
            clearInterval(pollInterval);
            this.showNotification('Email sync completed! Refreshing emails...', 'success');
            
            // Reload emails and stats
            await this.loadEmailStats();
            await this.loadEmails();
            
            this.resetSyncButton();
            return;
          }
        }
        
        // Stop polling after max attempts
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          this.showNotification('Sync is taking longer than expected. Check back in a few minutes.', 'warning');
          this.resetSyncButton();
        }
        
      } catch (error) {
        console.error('❌ Status poll error:', error);
        clearInterval(pollInterval);
        this.resetSyncButton();
      }
    }, 10000); // Poll every 10 seconds
  }
  
  resetSyncButton() {
    const syncBtn = document.getElementById('syncEmailsBtn');
    if (syncBtn) {
      syncBtn.disabled = false;
      syncBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Sync Outlook';
    }
  }
  
  async testEmailConnection() {
    try {
      console.log('🔍 Testing email connection...');
      
      const token = localStorage.getItem('vbms_token');
      if (!token) throw new Error('No authentication token');
      
      const response = await fetch(`${this.apiBase}/email-sync/test-connection`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        this.showNotification('Email connection test successful!', 'success');
        console.log('✅ Connection test passed:', data);
      } else {
        this.showNotification(`Connection test failed: ${data.message}`, 'error');
        console.error('❌ Connection test failed:', data);
      }
      
      return data;
      
    } catch (error) {
      console.error('❌ Connection test error:', error);
      this.showNotification(`Connection test error: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }
}

// Global instance
window.vbmsEmailManager = new VBMSEmailManager();

// Backward compatibility functions
window.initializeEmailManager = () => window.vbmsEmailManager.init();
window.loadEmailStats = () => window.vbmsEmailManager.loadEmailStats();
window.loadEmails = (category, page) => window.vbmsEmailManager.loadEmails(category, page);
window.createNewEmail = () => window.vbmsEmailManager.createNewEmail();
window.sendNewEmail = () => window.vbmsEmailManager.sendNewEmail();
window.saveDraft = () => window.vbmsEmailManager.saveDraft();
window.syncEmails = () => window.vbmsEmailManager.syncEmails();
window.syncOutlookEmails = () => window.vbmsEmailManager.syncOutlookEmails();
window.viewEmail = (id) => window.vbmsEmailManager.viewEmail(id);
window.editEmail = (id) => window.vbmsEmailManager.editEmail(id);
window.deleteEmail = (id) => window.vbmsEmailManager.deleteEmail(id);
window.sendEmail = (id) => window.vbmsEmailManager.sendDraftEmail(id);
window.resendEmail = (id) => window.vbmsEmailManager.resendEmail(id);
window.retryEmail = (id) => window.vbmsEmailManager.retryEmail(id);
window.updateRecipientOptions = () => window.vbmsEmailManager.updateRecipientOptions();
window.loadTemplate = () => window.vbmsEmailManager.loadTemplate();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VBMSEmailManager;
}