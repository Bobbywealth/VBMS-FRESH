/**
 * VBMS Admin Management System
 * Comprehensive admin user management with CRUD operations
 */

class VBMSAdminManager {
  constructor() {
    this.apiBase = '/api';
    this.currentPage = 1;
    this.pageSize = 10;
    this.currentFilter = { role: '', status: '', search: '' };
    this.admins = [];
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }
  
  async init() {
    console.log('👥 Initializing VBMS Admin Manager...');
    
    try {
      // Check authentication and permissions
      if (!vbmsAuth.isAuthenticated() || !vbmsAuth.isMainAdmin()) {
        console.error('Access denied: Master Admin access required');
        return;
      }
      
      // Load initial data
      await this.loadAdmins();
      this.setupEventListeners();
      this.setupModals();
      
      console.log('✅ Admin Manager initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Admin Manager:', error);
      this.showNotification('Failed to initialize admin manager', 'error');
    }
  }
  
  async loadAdmins() {
    try {
      const token = localStorage.getItem('vbms_token');
      if (!token) throw new Error('No authentication token');
      
      // Build query parameters
      const params = new URLSearchParams({
        page: this.currentPage,
        limit: this.pageSize,
        ...this.currentFilter
      });
      
      const response = await fetch(`${this.apiBase}/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to load admins');
      
      const data = await response.json();
      this.admins = data.users || [];
      this.displayAdmins(this.admins);
      this.updatePagination(data.pagination);
      
    } catch (error) {
      console.error('Error loading admins:', error);
      this.showNotification('Failed to load admin users', 'error');
      this.showEmptyState('Failed to load admin users');
    }
  }
  
  displayAdmins(admins) {
    const tableBody = document.getElementById('adminsTableBody');
    if (!tableBody) return;
    
    if (!admins || admins.length === 0) {
      this.showEmptyState('No admin users found');
      return;
    }
    
    tableBody.innerHTML = '';
    
    admins.forEach(admin => {
      const row = this.createAdminRow(admin);
      tableBody.appendChild(row);
    });
  }
  
  createAdminRow(admin) {
    const row = document.createElement('tr');
    
    const roleClass = {
      'main_admin': 'badge-main-admin',
      'admin': 'badge-admin',
      'support': 'badge-support'
    }[admin.role] || 'badge-secondary';
    
    const statusClass = admin.status === 'active' ? 'badge-active' : 'badge-inactive';
    const lastLogin = admin.lastLogin ? 
      this.formatRelativeTime(new Date(admin.lastLogin)) : 
      'Never';
    
    const initials = this.getInitials(admin.name);
    const permissions = this.getPermissionsDisplay(admin.role);
    const isCurrentUser = admin._id === vbmsAuth.getCurrentUserId();
    
    row.innerHTML = `
      <td>
        <div class="d-flex align-items-center">
          <div class="admin-avatar">${initials}</div>
          <strong>${admin.name}</strong>
        </div>
      </td>
      <td>${admin.email}</td>
      <td><span class="badge ${roleClass}">${this.formatRole(admin.role)}</span></td>
      <td><span class="badge ${permissions.class}">${permissions.text}</span></td>
      <td><span class="badge ${statusClass}">${admin.status}</span></td>
      <td>${lastLogin}</td>
      <td>
        ${this.createActionButtons(admin, isCurrentUser)}
      </td>
    `;
    
    return row;
  }
  
  createActionButtons(admin, isCurrentUser) {
    const buttons = [];
    
    // View button (always available)
    buttons.push(`
      <button class="action-btn" onclick="vbmsAdminManager.viewAdmin('${admin._id}')" title="View Details">
        <i class="bi bi-eye"></i> View
      </button>
    `);
    
    if (isCurrentUser) {
      // Current user can only view themselves
      buttons.push('<span class="text-muted small">Self</span>');
    } else {
      // Edit button
      buttons.push(`
        <button class="action-btn" onclick="vbmsAdminManager.editAdmin('${admin._id}')" title="Edit Admin">
          <i class="bi bi-pencil"></i> Edit
        </button>
      `);
      
      // Status toggle button
      if (admin.status === 'active') {
        buttons.push(`
          <button class="action-btn btn-warning" onclick="vbmsAdminManager.toggleAdminStatus('${admin._id}', 'inactive')" title="Disable Admin">
            <i class="bi bi-pause-circle"></i> Disable
          </button>
        `);
      } else {
        buttons.push(`
          <button class="action-btn btn-success" onclick="vbmsAdminManager.toggleAdminStatus('${admin._id}', 'active')" title="Enable Admin">
            <i class="bi bi-play-circle"></i> Enable
          </button>
        `);
      }
      
      // Delete button (only for non-main admins)
      if (admin.role !== 'main_admin') {
        buttons.push(`
          <button class="action-btn btn-danger" onclick="vbmsAdminManager.deleteAdmin('${admin._id}')" title="Delete Admin">
            <i class="bi bi-trash"></i> Delete
          </button>
        `);
      }
    }
    
    return buttons.join('');
  }
  
  async addNewAdmin() {
    this.showAdminModal();
  }
  
  async viewAdmin(adminId) {
    try {
      const admin = this.admins.find(a => a._id === adminId);
      if (admin) {
        this.showAdminModal(admin, 'view');
      }
    } catch (error) {
      console.error('Error viewing admin:', error);
      this.showNotification('Failed to load admin details', 'error');
    }
  }
  
  async editAdmin(adminId) {
    try {
      const admin = this.admins.find(a => a._id === adminId);
      if (admin) {
        this.showAdminModal(admin, 'edit');
      }
    } catch (error) {
      console.error('Error editing admin:', error);
      this.showNotification('Failed to load admin for editing', 'error');
    }
  }
  
  async saveAdmin(adminData, isEdit = false) {
    try {
      const token = localStorage.getItem('vbms_token');
      if (!token) throw new Error('No authentication token');
      
      const method = isEdit ? 'PUT' : 'POST';
      const url = isEdit ? 
        `${this.apiBase}/admin/users/${adminData.id}` : 
        `${this.apiBase}/auth/register`;
      
      // Prepare the data
      const payload = {
        name: adminData.name,
        email: adminData.email,
        role: adminData.role || 'admin'
      };
      
      if (!isEdit) {
        payload.password = adminData.password;
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save admin');
      }
      
      const result = await response.json();
      
      this.showNotification(
        isEdit ? 'Admin updated successfully!' : 'Admin created successfully!', 
        'success'
      );
      
      this.hideAdminModal();
      await this.loadAdmins();
      
      // Track activity
      if (window.activityTracker) {
        activityTracker.trackCustomActivity(
          isEdit ? 'admin_updated' : 'admin_created',
          `Admin ${isEdit ? 'updated' : 'created'}: ${payload.name}`,
          {
            priority: 'high',
            module: 'Admin Management',
            adminEmail: payload.email
          }
        );
      }
      
    } catch (error) {
      console.error('Error saving admin:', error);
      this.showNotification(error.message, 'error');
    }
  }
  
  async toggleAdminStatus(adminId, newStatus) {
    const action = newStatus === 'active' ? 'enable' : 'disable';
    
    if (!confirm(`Are you sure you want to ${action} this admin?`)) {
      return;
    }
    
    try {
      const token = localStorage.getItem('vbms_token');
      if (!token) throw new Error('No authentication token');
      
      const response = await fetch(`${this.apiBase}/admin/users/${adminId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${action} admin`);
      }
      
      this.showNotification(`Admin ${action}d successfully!`, 'success');
      await this.loadAdmins();
      
      // Track activity
      if (window.activityTracker) {
        const admin = this.admins.find(a => a._id === adminId);
        activityTracker.trackCustomActivity(
          `admin_${action}d`,
          `Admin ${action}d: ${admin?.name || adminId}`,
          {
            priority: 'high',
            module: 'Admin Management'
          }
        );
      }
      
    } catch (error) {
      console.error(`Error ${action}ing admin:`, error);
      this.showNotification(error.message, 'error');
    }
  }
  
  async deleteAdmin(adminId) {
    if (!confirm('Are you sure you want to delete this admin? This action cannot be undone.')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('vbms_token');
      if (!token) throw new Error('No authentication token');
      
      const response = await fetch(`${this.apiBase}/admin/users/${adminId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete admin');
      }
      
      this.showNotification('Admin deleted successfully!', 'success');
      await this.loadAdmins();
      
      // Track activity
      if (window.activityTracker) {
        const admin = this.admins.find(a => a._id === adminId);
        activityTracker.trackCustomActivity(
          'admin_deleted',
          `Admin deleted: ${admin?.name || adminId}`,
          {
            priority: 'critical',
            module: 'Admin Management'
          }
        );
      }
      
    } catch (error) {
      console.error('Error deleting admin:', error);
      this.showNotification(error.message, 'error');
    }
  }
  
  setupEventListeners() {
    // Role filter
    const roleFilter = document.getElementById('roleFilter');
    if (roleFilter) {
      roleFilter.addEventListener('change', () => {
        this.currentFilter.role = roleFilter.value;
        this.currentPage = 1;
        this.loadAdmins();
      });
    }
    
    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        this.currentFilter.status = statusFilter.value;
        this.currentPage = 1;
        this.loadAdmins();
      });
    }
    
    // Search
    const searchInput = document.getElementById('searchAdmins');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.currentFilter.search = searchInput.value;
          this.currentPage = 1;
          this.loadAdmins();
        }, 300);
      });
    }
  }
  
  setupModals() {
    // Create admin modal HTML if it doesn't exist
    if (!document.getElementById('adminModal')) {
      this.createAdminModalHTML();
    }
  }
  
  createAdminModalHTML() {
    const modalHTML = `
      <div class="modal fade" id="adminModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="adminModalTitle">Add New Admin</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="adminForm">
                <input type="hidden" id="adminId">
                
                <div class="row">
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label for="adminName" class="form-label">Full Name *</label>
                      <input type="text" class="form-control" id="adminName" required>
                    </div>
                  </div>
                  
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label for="adminEmail" class="form-label">Email Address *</label>
                      <input type="email" class="form-control" id="adminEmail" required>
                    </div>
                  </div>
                </div>
                
                <div class="row">
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label for="adminRole" class="form-label">Role *</label>
                      <select class="form-select" id="adminRole" required>
                        <option value="">Select Role</option>
                        <option value="admin">Admin</option>
                        <option value="support">Support</option>
                      </select>
                    </div>
                  </div>
                  
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label for="adminStatus" class="form-label">Status</label>
                      <select class="form-select" id="adminStatus">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div id="passwordSection">
                  <div class="row">
                    <div class="col-md-6">
                      <div class="mb-3">
                        <label for="adminPassword" class="form-label">Password *</label>
                        <input type="password" class="form-control" id="adminPassword" minlength="6">
                      </div>
                    </div>
                    
                    <div class="col-md-6">
                      <div class="mb-3">
                        <label for="adminPasswordConfirm" class="form-label">Confirm Password *</label>
                        <input type="password" class="form-control" id="adminPasswordConfirm" minlength="6">
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="mb-3">
                  <label class="form-label">Permissions</label>
                  <div id="permissionsInfo" class="text-muted small">
                    Permissions are automatically assigned based on the selected role.
                  </div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" id="saveAdminBtn" onclick="vbmsAdminManager.handleSaveAdmin()">
                <i class="bi bi-check-circle"></i> Save Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }
  
  showAdminModal(admin = null, mode = 'add') {
    const modal = new bootstrap.Modal(document.getElementById('adminModal'));
    const title = document.getElementById('adminModalTitle');
    const form = document.getElementById('adminForm');
    const passwordSection = document.getElementById('passwordSection');
    const saveBtn = document.getElementById('saveAdminBtn');
    
    // Reset form
    form.reset();
    
    // Set mode
    this.currentMode = mode;
    this.currentAdminId = admin?._id || null;
    
    // Update UI based on mode
    if (mode === 'view') {
      title.textContent = 'View Admin Details';
      saveBtn.style.display = 'none';
      this.setFormReadonly(true);
    } else if (mode === 'edit') {
      title.textContent = 'Edit Admin';
      saveBtn.style.display = 'block';
      saveBtn.innerHTML = '<i class="bi bi-check-circle"></i> Update Admin';
      passwordSection.style.display = 'none';
      this.setFormReadonly(false);
    } else {
      title.textContent = 'Add New Admin';
      saveBtn.style.display = 'block';
      saveBtn.innerHTML = '<i class="bi bi-check-circle"></i> Create Admin';
      passwordSection.style.display = 'block';
      this.setFormReadonly(false);
    }
    
    // Populate form if editing/viewing
    if (admin) {
      document.getElementById('adminId').value = admin._id;
      document.getElementById('adminName').value = admin.name;
      document.getElementById('adminEmail').value = admin.email;
      document.getElementById('adminRole').value = admin.role;
      document.getElementById('adminStatus').value = admin.status;
    }
    
    modal.show();
  }
  
  hideAdminModal() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('adminModal'));
    if (modal) {
      modal.hide();
    }
  }
  
  setFormReadonly(readonly) {
    const form = document.getElementById('adminForm');
    const inputs = form.querySelectorAll('input, select');
    
    inputs.forEach(input => {
      input.disabled = readonly;
    });
  }
  
  handleSaveAdmin() {
    const form = document.getElementById('adminForm');
    const formData = new FormData(form);
    
    // Validate form
    const name = document.getElementById('adminName').value.trim();
    const email = document.getElementById('adminEmail').value.trim();
    const role = document.getElementById('adminRole').value;
    const password = document.getElementById('adminPassword').value;
    const passwordConfirm = document.getElementById('adminPasswordConfirm').value;
    
    if (!name || !email || !role) {
      this.showNotification('Please fill in all required fields', 'error');
      return;
    }
    
    if (this.currentMode === 'add') {
      if (!password || password.length < 6) {
        this.showNotification('Password must be at least 6 characters long', 'error');
        return;
      }
      
      if (password !== passwordConfirm) {
        this.showNotification('Passwords do not match', 'error');
        return;
      }
    }
    
    // Prepare admin data
    const adminData = {
      id: this.currentAdminId,
      name,
      email,
      role,
      status: document.getElementById('adminStatus').value
    };
    
    if (this.currentMode === 'add') {
      adminData.password = password;
    }
    
    // Save admin
    this.saveAdmin(adminData, this.currentMode === 'edit');
  }
  
  getInitials(name) {
    return name.split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  }
  
  formatRole(role) {
    const roleMap = {
      'main_admin': 'Main Admin',
      'admin': 'Admin',
      'support': 'Support'
    };
    return roleMap[role] || role;
  }
  
  getPermissionsDisplay(role) {
    const permissions = {
      'main_admin': { text: 'Full Access', class: 'badge-full' },
      'admin': { text: 'Full Access', class: 'badge-full' },
      'support': { text: 'Read Only', class: 'badge-readonly' }
    };
    return permissions[role] || { text: 'Limited', class: 'badge-limited' };
  }
  
  formatRelativeTime(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  }
  
  updatePagination(pagination) {
    // TODO: Implement pagination UI updates
    console.log('Pagination:', pagination);
  }
  
  showEmptyState(message = 'No admin users found') {
    const tableBody = document.getElementById('adminsTableBody');
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">${message}</td></tr>`;
    }
  }
  
  showNotification(message, type = 'info') {
    // Use the global notification system if available
    if (window.vbmsNotifications) {
      window.vbmsNotifications.notify('Admin Manager', message, type);
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
}

// Global instance
window.vbmsAdminManager = new VBMSAdminManager();

// Backward compatibility functions
window.addNewAdmin = () => window.vbmsAdminManager.addNewAdmin();
window.loadAdmins = () => window.vbmsAdminManager.loadAdmins();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VBMSAdminManager;
}