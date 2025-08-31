/**
 * Admin Affiliate Management System
 * Connects the affiliate admin interface to the backend API
 */

class AdminAffiliateManager {
  constructor() {
    this.apiBase = '/api';
    this.currentPage = 1;
    this.pageSize = 50;
    this.currentFilter = {};
    this.selectedAffiliates = [];
    
    // Check authentication
    if (!this.isAuthenticated()) {
      window.location.href = 'login.html';
      return;
    }
    
    this.init();
  }
  
  isAuthenticated() {
    const token = localStorage.getItem('vbms_token') || sessionStorage.getItem('vbms_token');
    return !!token;
  }
  
  getAuthHeaders() {
    const token = localStorage.getItem('vbms_token') || sessionStorage.getItem('vbms_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }
  
  async init() {
    console.log('🔗 Initializing Admin Affiliate Manager...');
    
    try {
      await this.loadAffiliateStats();
      await this.loadAffiliates();
      this.setupEventListeners();
      
      console.log('✅ Admin Affiliate Manager initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Admin Affiliate Manager:', error);
      this.showNotification('Failed to initialize affiliate management system', 'error');
    }
  }
  
  setupEventListeners() {
    // Filter events
    document.getElementById('statusFilter')?.addEventListener('change', (e) => {
      this.currentFilter.status = e.target.value;
      this.loadAffiliates();
    });
    
    document.getElementById('tierFilter')?.addEventListener('change', (e) => {
      this.currentFilter.tier = e.target.value;
      this.loadAffiliates();
    });
    
    document.getElementById('searchAffiliate')?.addEventListener('input', (e) => {
      this.currentFilter.search = e.target.value;
      // Debounce search
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => this.loadAffiliates(), 500);
    });
    
    // Bulk actions
    document.getElementById('bulkActionSelect')?.addEventListener('change', (e) => {
      if (e.target.value && this.selectedAffiliates.length > 0) {
        this.performBulkAction(e.target.value);
        e.target.value = '';
      }
    });
    
    // Select all checkbox
    document.getElementById('selectAllAffiliates')?.addEventListener('change', (e) => {
      const checkboxes = document.querySelectorAll('.affiliate-checkbox');
      checkboxes.forEach(cb => {
        cb.checked = e.target.checked;
        this.toggleAffiliateSelection(cb.dataset.affiliateId, cb.checked);
      });
    });
  }
  
  async loadAffiliateStats() {
    try {
      const response = await fetch(`${this.apiBase}/affiliates?limit=1`, {
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to fetch affiliate stats');
      
      const data = await response.json();
      const stats = data.data.stats;
      
      // Update stats display
      document.getElementById('totalAffiliates').textContent = stats.totalAffiliates || 0;
      document.getElementById('activeAffiliates').textContent = stats.activeAffiliates || 0;
      document.getElementById('totalCommissions').textContent = `$${(stats.totalCommissionEarned || 0).toLocaleString()}`;
      document.getElementById('pendingPayouts').textContent = `$${(stats.pendingCommissions || 0).toLocaleString()}`;
      
    } catch (error) {
      console.error('Error loading affiliate stats:', error);
    }
  }
  
  async loadAffiliates() {
    try {
      const params = new URLSearchParams({
        page: this.currentPage,
        limit: this.pageSize,
        ...this.currentFilter
      });
      
      const response = await fetch(`${this.apiBase}/affiliates?${params}`, {
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to fetch affiliates');
      
      const data = await response.json();
      this.renderAffiliateTable(data.data.affiliates);
      this.renderPagination(data.data.pagination);
      
    } catch (error) {
      console.error('Error loading affiliates:', error);
      this.showNotification('Failed to load affiliates', 'error');
    }
  }
  
  renderAffiliateTable(affiliates) {
    const tableBody = document.getElementById('affiliatesTableBody');
    if (!tableBody) return;
    
    if (affiliates.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-4">
            <div class="text-muted">
              <i class="bi bi-people fs-1 d-block mb-2"></i>
              No affiliates found
            </div>
          </td>
        </tr>
      `;
      return;
    }
    
    tableBody.innerHTML = affiliates.map(affiliate => `
      <tr>
        <td>
          <input type="checkbox" class="affiliate-checkbox" 
                 data-affiliate-id="${affiliate._id}"
                 onchange="affiliateManager.toggleAffiliateSelection('${affiliate._id}', this.checked)">
        </td>
        <td>
          <div class="d-flex align-items-center">
            <div class="avatar-sm bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2">
              ${affiliate.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div class="fw-bold">${affiliate.name}</div>
              <small class="text-muted">${affiliate.email}</small>
            </div>
          </div>
        </td>
        <td>
          <span class="badge bg-secondary">${affiliate.referralCode}</span>
        </td>
        <td>
          <span class="badge bg-${this.getStatusColor(affiliate.status)}">${affiliate.status}</span>
        </td>
        <td>
          <span class="badge bg-${this.getTierColor(affiliate.tier)}">${affiliate.tier}</span>
        </td>
        <td>${(affiliate.commissionRate * 100).toFixed(1)}%</td>
        <td>
          <div class="text-end">
            <div class="fw-bold">$${(affiliate.stats.totalCommissionEarned || 0).toLocaleString()}</div>
            <small class="text-muted">${affiliate.stats.totalReferrals || 0} referrals</small>
          </div>
        </td>
        <td>
          <div class="dropdown">
            <button class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
              Actions
            </button>
            <ul class="dropdown-menu">
              <li><a class="dropdown-item" href="#" onclick="affiliateManager.viewAffiliate('${affiliate._id}')">
                <i class="bi bi-eye"></i> View Details
              </a></li>
              <li><a class="dropdown-item" href="#" onclick="affiliateManager.editAffiliate('${affiliate._id}')">
                <i class="bi bi-pencil"></i> Edit
              </a></li>
              <li><a class="dropdown-item" href="#" onclick="affiliateManager.generateLink('${affiliate._id}')">
                <i class="bi bi-link"></i> Generate Link
              </a></li>
              <li><hr class="dropdown-divider"></li>
              <li><a class="dropdown-item text-${affiliate.status === 'active' ? 'warning' : 'success'}" href="#" 
                     onclick="affiliateManager.toggleStatus('${affiliate._id}', '${affiliate.status}')">
                <i class="bi bi-${affiliate.status === 'active' ? 'pause' : 'play'}"></i> 
                ${affiliate.status === 'active' ? 'Deactivate' : 'Activate'}
              </a></li>
              <li><a class="dropdown-item text-danger" href="#" onclick="affiliateManager.deleteAffiliate('${affiliate._id}')">
                <i class="bi bi-trash"></i> Delete
              </a></li>
            </ul>
          </div>
        </td>
      </tr>
    `).join('');
  }
  
  getStatusColor(status) {
    const colors = {
      active: 'success',
      inactive: 'secondary',
      suspended: 'warning',
      pending: 'info'
    };
    return colors[status] || 'secondary';
  }
  
  getTierColor(tier) {
    const colors = {
      bronze: 'warning',
      silver: 'info',
      gold: 'success',
      platinum: 'primary'
    };
    return colors[tier] || 'secondary';
  }
  
  renderPagination(pagination) {
    // Implement pagination UI if needed
    console.log('Pagination:', pagination);
  }
  
  toggleAffiliateSelection(affiliateId, selected) {
    if (selected) {
      if (!this.selectedAffiliates.includes(affiliateId)) {
        this.selectedAffiliates.push(affiliateId);
      }
    } else {
      this.selectedAffiliates = this.selectedAffiliates.filter(id => id !== affiliateId);
    }
    
    // Update bulk action dropdown visibility
    const bulkActions = document.getElementById('bulkActions');
    if (bulkActions) {
      bulkActions.style.display = this.selectedAffiliates.length > 0 ? 'block' : 'none';
    }
  }
  
  async createAffiliate() {
    // Show create affiliate modal
    const modal = new bootstrap.Modal(document.getElementById('createAffiliateModal'));
    modal.show();
  }
  
  async viewAffiliate(affiliateId) {
    try {
      const response = await fetch(`${this.apiBase}/affiliates/${affiliateId}`, {
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to fetch affiliate details');
      
      const data = await response.json();
      // Show affiliate details modal
      this.showAffiliateDetails(data.data);
      
    } catch (error) {
      console.error('Error viewing affiliate:', error);
      this.showNotification('Failed to load affiliate details', 'error');
    }
  }
  
  async editAffiliate(affiliateId) {
    try {
      const response = await fetch(`${this.apiBase}/affiliates/${affiliateId}`, {
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to fetch affiliate details');
      
      const data = await response.json();
      // Show edit affiliate modal
      this.showEditAffiliateModal(data.data);
      
    } catch (error) {
      console.error('Error editing affiliate:', error);
      this.showNotification('Failed to load affiliate for editing', 'error');
    }
  }
  
  async toggleStatus(affiliateId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
      const response = await fetch(`${this.apiBase}/affiliates/${affiliateId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) throw new Error('Failed to update affiliate status');
      
      this.showNotification(`Affiliate ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`, 'success');
      await this.loadAffiliates();
      await this.loadAffiliateStats();
      
    } catch (error) {
      console.error('Error toggling affiliate status:', error);
      this.showNotification('Failed to update affiliate status', 'error');
    }
  }
  
  async deleteAffiliate(affiliateId) {
    if (!confirm('Are you sure you want to delete this affiliate? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`${this.apiBase}/affiliates/${affiliateId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to delete affiliate');
      
      this.showNotification('Affiliate deleted successfully', 'success');
      await this.loadAffiliates();
      await this.loadAffiliateStats();
      
    } catch (error) {
      console.error('Error deleting affiliate:', error);
      this.showNotification('Failed to delete affiliate', 'error');
    }
  }
  
  async generateLink(affiliateId) {
    const linkName = prompt('Enter a name for this affiliate link:');
    if (!linkName) return;
    
    const targetUrl = prompt('Enter the target URL:', window.location.origin);
    if (!targetUrl) return;
    
    try {
      const response = await fetch(`${this.apiBase}/affiliates/${affiliateId}/generate-link`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          linkName,
          targetUrl,
          description: `Generated link for ${linkName}`
        })
      });
      
      if (!response.ok) throw new Error('Failed to generate affiliate link');
      
      const data = await response.json();
      
      // Show the generated link
      prompt('Affiliate link generated! Copy this URL:', data.data.affiliateUrl);
      this.showNotification('Affiliate link generated successfully', 'success');
      
    } catch (error) {
      console.error('Error generating affiliate link:', error);
      this.showNotification('Failed to generate affiliate link', 'error');
    }
  }
  
  async performBulkAction(action) {
    if (this.selectedAffiliates.length === 0) {
      this.showNotification('Please select affiliates first', 'warning');
      return;
    }
    
    let actionData = {};
    let confirmMessage = `Are you sure you want to ${action} ${this.selectedAffiliates.length} affiliates?`;
    
    if (action === 'update_tier') {
      const tier = prompt('Enter new tier (bronze, silver, gold, platinum):');
      if (!tier) return;
      actionData.tier = tier;
      confirmMessage = `Set tier to ${tier} for ${this.selectedAffiliates.length} affiliates?`;
    } else if (action === 'update_commission') {
      const rate = prompt('Enter new commission rate (0.0 to 1.0):');
      if (!rate) return;
      actionData.commissionRate = parseFloat(rate);
      confirmMessage = `Set commission rate to ${(rate * 100)}% for ${this.selectedAffiliates.length} affiliates?`;
    }
    
    if (!confirm(confirmMessage)) return;
    
    try {
      const response = await fetch(`${this.apiBase}/affiliates/bulk-action`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          action,
          affiliateIds: this.selectedAffiliates,
          data: actionData
        })
      });
      
      if (!response.ok) throw new Error('Failed to perform bulk action');
      
      const data = await response.json();
      this.showNotification(`Bulk action completed: ${data.data.modifiedCount} affiliates updated`, 'success');
      
      // Clear selection
      this.selectedAffiliates = [];
      document.getElementById('selectAllAffiliates').checked = false;
      
      await this.loadAffiliates();
      await this.loadAffiliateStats();
      
    } catch (error) {
      console.error('Error performing bulk action:', error);
      this.showNotification('Failed to perform bulk action', 'error');
    }
  }
  
  showAffiliateDetails(affiliate) {
    // Implementation for showing affiliate details modal
    console.log('Showing affiliate details:', affiliate);
  }
  
  showEditAffiliateModal(affiliate) {
    // Implementation for showing edit affiliate modal
    console.log('Showing edit modal for:', affiliate);
  }
  
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.affiliateManager = new AdminAffiliateManager();
});

// Global functions for inline onclick handlers
window.createAffiliate = () => window.affiliateManager?.createAffiliate();
window.viewAffiliate = (id) => window.affiliateManager?.viewAffiliate(id);
window.editAffiliate = (id) => window.affiliateManager?.editAffiliate(id);
window.toggleStatus = (id, status) => window.affiliateManager?.toggleStatus(id, status);
window.deleteAffiliate = (id) => window.affiliateManager?.deleteAffiliate(id);
window.generateLink = (id) => window.affiliateManager?.generateLink(id);