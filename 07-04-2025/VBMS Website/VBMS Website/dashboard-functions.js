/**
 * VBMS Dashboard Functions
 * Implements all missing JavaScript functions for buttons and actions
 */

// API Configuration
const API_BASE = window.location.hostname === 'localhost' 
    ? 'https://vbms-fresh-offical-website-launch.onrender.com' 
    : 'https://vbms-fresh-offical-website-launch.onrender.com';

// Utility function to get auth headers
function getAuthHeaders() {
    const token = localStorage.getItem('vbmsToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// Show toast notifications
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
}

// =============================================================================
// DASHBOARD BUSINESS FUNCTIONS
// =============================================================================

async function editBusinessProfile() {
    try {
        // Check if modal already exists
        let modal = document.getElementById('businessProfileModal');
        if (!modal) {
            // Create modal
            modal = document.createElement('div');
            modal.id = 'businessProfileModal';
            modal.className = 'modal fade';
            modal.innerHTML = `
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Edit Business Profile</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="businessProfileForm">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Business Name</label>
                                            <input type="text" class="form-control" id="businessName" required>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Industry</label>
                                            <select class="form-control" id="industry">
                                                <option value="restaurant">Restaurant</option>
                                                <option value="retail">Retail</option>
                                                <option value="services">Services</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Phone</label>
                                            <input type="tel" class="form-control" id="businessPhone">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Email</label>
                                            <input type="email" class="form-control" id="businessEmail">
                                        </div>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Address</label>
                                    <textarea class="form-control" id="businessAddress" rows="2"></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="saveBusinessProfile()">Save Changes</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        // Load current business data
        const response = await fetch(`${API_BASE}/api/business/profile`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            document.getElementById('businessName').value = data.name || '';
            document.getElementById('industry').value = data.industry || '';
            document.getElementById('businessPhone').value = data.phone || '';
            document.getElementById('businessEmail').value = data.email || '';
            document.getElementById('businessAddress').value = data.address || '';
        }
        
        // Show modal
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
    } catch (error) {
        console.error('Error loading business profile:', error);
        showToast('Failed to load business profile', 'error');
    }
}

async function saveBusinessProfile() {
    try {
        const formData = {
            name: document.getElementById('businessName').value,
            industry: document.getElementById('industry').value,
            phone: document.getElementById('businessPhone').value,
            email: document.getElementById('businessEmail').value,
            address: document.getElementById('businessAddress').value
        };
        
        const response = await fetch(`${API_BASE}/api/business/profile`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showToast('Business profile updated successfully', 'success');
            bootstrap.Modal.getInstance(document.getElementById('businessProfileModal')).hide();
        } else {
            throw new Error('Failed to save profile');
        }
    } catch (error) {
        console.error('Error saving business profile:', error);
        showToast('Failed to save business profile', 'error');
    }
}

async function viewBusinessInsights() {
    try {
        window.location.href = 'reports.html?view=insights';
    } catch (error) {
        console.error('Error navigating to insights:', error);
        showToast('Failed to load business insights', 'error');
    }
}

// =============================================================================
// ORDER MANAGEMENT FUNCTIONS
// =============================================================================

async function viewOrder(orderId) {
    try {
        const response = await fetch(`${API_BASE}/api/orders/${orderId}`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const order = await response.json();
            showOrderModal(order);
        } else {
            throw new Error('Order not found');
        }
    } catch (error) {
        console.error('Error viewing order:', error);
        showToast(`Failed to load order ${orderId}`, 'error');
    }
}

async function processOrder(orderId) {
    try {
        const response = await fetch(`${API_BASE}/api/orders/${orderId}/process`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            showToast(`Order ${orderId} processed successfully`, 'success');
            // Refresh the page or update the order status
            setTimeout(() => window.location.reload(), 1500);
        } else {
            throw new Error('Failed to process order');
        }
    } catch (error) {
        console.error('Error processing order:', error);
        showToast(`Failed to process order ${orderId}`, 'error');
    }
}

function showOrderModal(order) {
    let modal = document.getElementById('orderViewModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'orderViewModal';
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Order Details</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" id="orderModalBody">
                        <!-- Order details will be populated here -->
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" onclick="processOrder('${order.id}')">Process Order</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Populate order details
    document.getElementById('orderModalBody').innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6>Order Information</h6>
                <p><strong>Order ID:</strong> ${order.id}</p>
                <p><strong>Status:</strong> <span class="badge bg-${order.status === 'pending' ? 'warning' : 'success'}">${order.status}</span></p>
                <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
                <p><strong>Total:</strong> $${order.total || '0.00'}</p>
            </div>
            <div class="col-md-6">
                <h6>Customer Information</h6>
                <p><strong>Name:</strong> ${order.customer_name || 'N/A'}</p>
                <p><strong>Email:</strong> ${order.customer_email || 'N/A'}</p>
                <p><strong>Phone:</strong> ${order.customer_phone || 'N/A'}</p>
            </div>
        </div>
        <hr>
        <h6>Order Items</h6>
        <div class="table-responsive">
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${(order.items || []).map(item => `
                        <tr>
                            <td>${item.name}</td>
                            <td>${item.quantity}</td>
                            <td>$${item.price}</td>
                            <td>$${(item.quantity * item.price).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
}

// =============================================================================
// INVENTORY FUNCTIONS
// =============================================================================

async function viewInventory() {
    try {
        window.location.href = 'inventory.html';
    } catch (error) {
        console.error('Error navigating to inventory:', error);
        showToast('Failed to load inventory', 'error');
    }
}

// =============================================================================
// REPORT FUNCTIONS
// =============================================================================

async function generateReport(type) {
    try {
        showToast(`Generating ${type} report...`, 'info');
        
        const response = await fetch(`${API_BASE}/api/reports/generate`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ type, format: 'pdf' })
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}-report-${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            showToast(`${type} report generated successfully`, 'success');
        } else {
            throw new Error('Failed to generate report');
        }
    } catch (error) {
        console.error('Error generating report:', error);
        showToast(`Failed to generate ${type} report`, 'error');
    }
}

async function viewInvoice(invoiceId) {
    try {
        window.open(`${API_BASE}/api/invoices/${invoiceId}/view`, '_blank');
    } catch (error) {
        console.error('Error viewing invoice:', error);
        showToast(`Failed to load invoice ${invoiceId}`, 'error');
    }
}

async function downloadReceipt(invoiceId) {
    try {
        const response = await fetch(`${API_BASE}/api/invoices/${invoiceId}/receipt`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `receipt-${invoiceId}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            showToast('Receipt downloaded successfully', 'success');
        } else {
            throw new Error('Failed to download receipt');
        }
    } catch (error) {
        console.error('Error downloading receipt:', error);
        showToast(`Failed to download receipt for ${invoiceId}`, 'error');
    }
}

// =============================================================================
// SECURITY FUNCTIONS
// =============================================================================

async function viewSecurityReport() {
    try {
        window.location.href = 'reports.html?view=security';
    } catch (error) {
        console.error('Error navigating to security report:', error);
        showToast('Failed to load security report', 'error');
    }
}

async function scheduleScan() {
    try {
        const response = await fetch(`${API_BASE}/api/security/schedule-scan`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            showToast('Security scan scheduled successfully', 'success');
        } else {
            throw new Error('Failed to schedule scan');
        }
    } catch (error) {
        console.error('Error scheduling scan:', error);
        showToast('Failed to schedule security scan', 'error');
    }
}

// =============================================================================
// TRACKING FUNCTIONS
// =============================================================================

async function trackOrder(trackingId) {
    try {
        const response = await fetch(`${API_BASE}/api/tracking/${trackingId}`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const tracking = await response.json();
            showTrackingModal(tracking);
        } else {
            throw new Error('Tracking information not found');
        }
    } catch (error) {
        console.error('Error tracking order:', error);
        showToast(`Failed to track order ${trackingId}`, 'error');
    }
}

function showTrackingModal(tracking) {
    let modal = document.getElementById('trackingModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'trackingModal';
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Order Tracking</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" id="trackingModalBody">
                        <!-- Tracking details will be populated here -->
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('trackingModalBody').innerHTML = `
        <div class="tracking-info">
            <h6>Tracking ID: ${tracking.id}</h6>
            <p><strong>Status:</strong> ${tracking.status}</p>
            <p><strong>Last Updated:</strong> ${new Date(tracking.updated_at).toLocaleString()}</p>
            <div class="tracking-timeline">
                ${(tracking.events || []).map(event => `
                    <div class="tracking-event">
                        <div class="event-time">${new Date(event.timestamp).toLocaleString()}</div>
                        <div class="event-description">${event.description}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
}

async function notifyCustomer(orderId) {
    try {
        const response = await fetch(`${API_BASE}/api/orders/${orderId}/notify`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            showToast('Customer notification sent successfully', 'success');
        } else {
            throw new Error('Failed to send notification');
        }
    } catch (error) {
        console.error('Error notifying customer:', error);
        showToast(`Failed to notify customer for order ${orderId}`, 'error');
    }
}

// =============================================================================
// ACTIVITY FUNCTIONS
// =============================================================================

async function refreshActivity() {
    try {
        showToast('Refreshing activity feed...', 'info');
        // Reload the current page to refresh activity
        setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
        console.error('Error refreshing activity:', error);
        showToast('Failed to refresh activity', 'error');
    }
}

function toggleActivityFilter() {
    const filterPanel = document.getElementById('activityFilterPanel');
    if (filterPanel) {
        filterPanel.style.display = filterPanel.style.display === 'none' ? 'block' : 'none';
    } else {
        showToast('Activity filter not available', 'info');
    }
}

function customizeActivity() {
    showToast('Activity customization coming soon', 'info');
}

async function viewAllActivity() {
    try {
        window.location.href = 'monitoring.html';
    } catch (error) {
        console.error('Error navigating to activity:', error);
        showToast('Failed to load activity page', 'error');
    }
}

// =============================================================================
// QUICK ACTION FUNCTIONS
// =============================================================================

async function showAddTaskModal() {
    try {
        // Check if modal already exists
        let modal = document.getElementById('addTaskModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'addTaskModal';
            modal.className = 'modal fade';
            modal.innerHTML = `
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Add New Task</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="addTaskForm">
                                <div class="mb-3">
                                    <label class="form-label">Task Title</label>
                                    <input type="text" class="form-control" id="taskTitle" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Description</label>
                                    <textarea class="form-control" id="taskDescription" rows="3"></textarea>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Priority</label>
                                            <select class="form-control" id="taskPriority">
                                                <option value="low">Low</option>
                                                <option value="medium" selected>Medium</option>
                                                <option value="high">High</option>
                                                <option value="urgent">Urgent</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Due Date</label>
                                            <input type="date" class="form-control" id="taskDueDate">
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="saveNewTask()">Create Task</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        // Show modal
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
    } catch (error) {
        console.error('Error showing add task modal:', error);
        showToast('Failed to open task creation form', 'error');
    }
}

async function saveNewTask() {
    try {
        const taskData = {
            title: document.getElementById('taskTitle').value,
            description: document.getElementById('taskDescription').value,
            priority: document.getElementById('taskPriority').value,
            due_date: document.getElementById('taskDueDate').value,
            status: 'pending'
        };
        
        const response = await fetch(`${API_BASE}/api/tasks`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(taskData)
        });
        
        if (response.ok) {
            showToast('Task created successfully', 'success');
            bootstrap.Modal.getInstance(document.getElementById('addTaskModal')).hide();
            // Clear form
            document.getElementById('addTaskForm').reset();
        } else {
            throw new Error('Failed to create task');
        }
    } catch (error) {
        console.error('Error creating task:', error);
        showToast('Failed to create task', 'error');
    }
}

async function repeatAction(actionType) {
    try {
        switch (actionType) {
            case 'new-order':
                window.location.href = 'orders.html?action=create';
                break;
            case 'inventory-update':
                window.location.href = 'inventory.html?action=update';
                break;
            case 'generate-report':
                await generateReport('daily');
                break;
            default:
                showToast(`Repeating ${actionType}...`, 'info');
        }
    } catch (error) {
        console.error('Error repeating action:', error);
        showToast(`Failed to repeat ${actionType}`, 'error');
    }
}

function customizeQuickActions() {
    showToast('Quick action customization coming soon', 'info');
}

// =============================================================================
// THEME AND UI FUNCTIONS
// =============================================================================

function toggleTheme() {
    try {
        const currentTheme = document.body.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('vbmsTheme', newTheme);
        
        showToast(`Switched to ${newTheme} theme`, 'success');
    } catch (error) {
        console.error('Error toggling theme:', error);
        showToast('Failed to change theme', 'error');
    }
}

function toggleNotifications() {
    try {
        const notificationPanel = document.querySelector('.notification-panel');
        if (notificationPanel) {
            notificationPanel.classList.toggle('show');
        } else {
            showToast('Notifications panel not found', 'error');
        }
    } catch (error) {
        console.error('Error toggling notifications:', error);
        showToast('Failed to toggle notifications', 'error');
    }
}

function markAllRead() {
    try {
        const notifications = document.querySelectorAll('.notification-item.unread');
        notifications.forEach(notification => {
            notification.classList.remove('unread');
        });
        
        // Update notification count
        const badge = document.querySelector('.notification-count');
        if (badge) {
            badge.textContent = '0';
            badge.style.display = 'none';
        }
        
        showToast('All notifications marked as read', 'success');
    } catch (error) {
        console.error('Error marking notifications as read:', error);
        showToast('Failed to mark notifications as read', 'error');
    }
}

// =============================================================================
// MOBILE MENU FUNCTIONS
// =============================================================================

function toggleMobileMenu() {
    try {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.mobile-overlay');
        
        if (sidebar && overlay) {
            sidebar.classList.toggle('mobile-open');
            overlay.classList.toggle('show');
        }
    } catch (error) {
        console.error('Error toggling mobile menu:', error);
    }
}

function closeMobileMenu() {
    try {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.mobile-overlay');
        
        if (sidebar && overlay) {
            sidebar.classList.remove('mobile-open');
            overlay.classList.remove('show');
        }
    } catch (error) {
        console.error('Error closing mobile menu:', error);
    }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

// Initialize dashboard functions when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add CSS for toast notifications if not already present
    if (!document.getElementById('toastStyles')) {
        const style = document.createElement('style');
        style.id = 'toastStyles';
        style.textContent = `
            .toast {
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                z-index: 10000;
                transform: translateX(100%);
                transition: transform 0.3s ease;
                max-width: 300px;
            }
            .toast.show {
                transform: translateX(0);
            }
            .toast.toast-success {
                background: rgba(40, 167, 69, 0.9);
            }
            .toast.toast-error {
                background: rgba(220, 53, 69, 0.9);
            }
            .toast.toast-info {
                background: rgba(23, 162, 184, 0.9);
            }
            .toast-content {
                display: flex;
                align-items: center;
                gap: 8px;
            }
        `;
        document.head.appendChild(style);
    }
    
    console.log('Dashboard functions initialized');
});

// Export functions for global access
window.editBusinessProfile = editBusinessProfile;
window.viewBusinessInsights = viewBusinessInsights;
window.viewOrder = viewOrder;
window.processOrder = processOrder;
window.viewInventory = viewInventory;
window.generateReport = generateReport;
window.viewInvoice = viewInvoice;
window.downloadReceipt = downloadReceipt;
window.viewSecurityReport = viewSecurityReport;
window.scheduleScan = scheduleScan;
window.trackOrder = trackOrder;
window.notifyCustomer = notifyCustomer;
window.refreshActivity = refreshActivity;
window.toggleActivityFilter = toggleActivityFilter;
window.customizeActivity = customizeActivity;
window.viewAllActivity = viewAllActivity;
window.showAddTaskModal = showAddTaskModal;
window.repeatAction = repeatAction;
window.customizeQuickActions = customizeQuickActions;
window.toggleTheme = toggleTheme;
window.toggleNotifications = toggleNotifications;
window.markAllRead = markAllRead;
window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu = closeMobileMenu;
