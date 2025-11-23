/**
 * VBMS Pricing Functions
 * Implements Stripe integration and pricing management functions
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

// Show toast notifications (reuse from other files if available)
function showToast(message, type = 'info') {
    // Check if showToast already exists globally
    if (window.showToast && typeof window.showToast === 'function') {
        return window.showToast(message, type);
    }
    
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
// PRICING PLAN MANAGEMENT
// =============================================================================

async function editPlan(planId) {
    try {
        // Fetch plan details
        const response = await fetch(`${API_BASE}/api/pricing/plans/${planId}`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch plan details');
        }
        
        const plan = await response.json();
        
        // Create or show edit modal
        let modal = document.getElementById('editPlanModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'editPlanModal';
            modal.className = 'modal fade';
            modal.innerHTML = `
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Edit Pricing Plan</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editPlanForm">
                                <input type="hidden" id="planId" value="">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Plan Name</label>
                                            <input type="text" class="form-control" id="planName" required>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Display Name</label>
                                            <input type="text" class="form-control" id="planDisplayName" required>
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <label class="form-label">Price ($)</label>
                                            <input type="number" class="form-control" id="planPrice" step="0.01" min="0" required>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <label class="form-label">Billing Interval</label>
                                            <select class="form-control" id="planInterval" required>
                                                <option value="month">Monthly</option>
                                                <option value="year">Yearly</option>
                                                <option value="week">Weekly</option>
                                                <option value="day">Daily</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <label class="form-label">Status</label>
                                            <select class="form-control" id="planStatus" required>
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                                <option value="archived">Archived</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Description</label>
                                    <textarea class="form-control" id="planDescription" rows="3"></textarea>
                                </div>
                                <div class="mb-3">
                                    <div class="form-check">
                                        <input type="checkbox" class="form-check-input" id="planFeatured">
                                        <label class="form-check-label" for="planFeatured">
                                            Featured Plan (highlight on pricing page)
                                        </label>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Features (one per line)</label>
                                    <textarea class="form-control" id="planFeatures" rows="5" placeholder="Live monitoring&#10;Order management&#10;Phone support"></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="savePlanChanges()">Save Changes</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        // Populate form with plan data
        document.getElementById('planId').value = plan.id || plan._id;
        document.getElementById('planName').value = plan.name || '';
        document.getElementById('planDisplayName').value = plan.displayName || plan.name || '';
        document.getElementById('planPrice').value = plan.price || '';
        document.getElementById('planInterval').value = plan.interval || 'month';
        document.getElementById('planStatus').value = plan.status || 'active';
        document.getElementById('planDescription').value = plan.description || '';
        document.getElementById('planFeatured').checked = plan.featured || false;
        
        // Handle features
        if (plan.features) {
            if (Array.isArray(plan.features)) {
                document.getElementById('planFeatures').value = plan.features.join('\n');
            } else if (typeof plan.features === 'object') {
                // Convert feature object to array
                const featureList = Object.entries(plan.features)
                    .filter(([key, value]) => value === true)
                    .map(([key]) => key.replace(/([A-Z])/g, ' $1').toLowerCase())
                    .map(feature => feature.charAt(0).toUpperCase() + feature.slice(1));
                document.getElementById('planFeatures').value = featureList.join('\n');
            }
        }
        
        // Show modal
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
    } catch (error) {
        console.error('Error editing plan:', error);
        showToast('Failed to load plan for editing', 'error');
    }
}

async function savePlanChanges() {
    try {
        const planId = document.getElementById('planId').value;
        const features = document.getElementById('planFeatures').value
            .split('\n')
            .filter(f => f.trim())
            .map(f => f.trim());
        
        const planData = {
            name: document.getElementById('planName').value,
            displayName: document.getElementById('planDisplayName').value,
            price: parseFloat(document.getElementById('planPrice').value),
            interval: document.getElementById('planInterval').value,
            status: document.getElementById('planStatus').value,
            description: document.getElementById('planDescription').value,
            featured: document.getElementById('planFeatured').checked,
            features: features
        };
        
        const response = await fetch(`${API_BASE}/api/pricing/plans/${planId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(planData)
        });
        
        if (response.ok) {
            showToast('Plan updated successfully', 'success');
            bootstrap.Modal.getInstance(document.getElementById('editPlanModal')).hide();
            
            // Refresh the pricing plans display
            setTimeout(() => {
                if (typeof loadPricingPlans === 'function') {
                    loadPricingPlans();
                } else {
                    window.location.reload();
                }
            }, 1000);
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update plan');
        }
    } catch (error) {
        console.error('Error saving plan changes:', error);
        showToast('Failed to save plan changes', 'error');
    }
}

async function deletePlan(planId) {
    try {
        const confirmed = confirm('Are you sure you want to delete this pricing plan? This action cannot be undone.');
        
        if (!confirmed) {
            return;
        }
        
        const response = await fetch(`${API_BASE}/api/pricing/plans/${planId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            showToast('Plan deleted successfully', 'success');
            
            // Remove the plan card from the UI
            const planCard = document.querySelector(`[data-plan-id="${planId}"]`);
            if (planCard) {
                planCard.remove();
            }
            
            // Refresh the pricing plans display
            setTimeout(() => {
                if (typeof loadPricingPlans === 'function') {
                    loadPricingPlans();
                } else {
                    window.location.reload();
                }
            }, 1000);
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete plan');
        }
    } catch (error) {
        console.error('Error deleting plan:', error);
        showToast('Failed to delete plan', 'error');
    }
}

// =============================================================================
// STRIPE INTEGRATION
// =============================================================================

async function createPlanInStripe(planId) {
    try {
        showToast('Creating plan in Stripe...', 'info');
        
        const response = await fetch(`${API_BASE}/api/pricing/plans/${planId}/stripe`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            showToast('Plan created in Stripe successfully', 'success');
            
            // Update the UI to show Stripe integration
            const planCard = document.querySelector(`[data-plan-id="${planId}"]`);
            if (planCard) {
                const createStripeBtn = planCard.querySelector('.btn-create-stripe');
                if (createStripeBtn) {
                    createStripeBtn.remove();
                }
                
                // Add Stripe ID indicator
                const cardActions = planCard.querySelector('.card-actions');
                if (cardActions) {
                    const stripeIndicator = document.createElement('div');
                    stripeIndicator.className = 'stripe-indicator';
                    stripeIndicator.innerHTML = `
                        <small class="text-success">
                            <i class="bi bi-check-circle"></i> Synced with Stripe
                        </small>
                    `;
                    cardActions.appendChild(stripeIndicator);
                }
            }
            
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create plan in Stripe');
        }
    } catch (error) {
        console.error('Error creating plan in Stripe:', error);
        showToast('Failed to create plan in Stripe', 'error');
    }
}

async function syncWithStripe() {
    try {
        showToast('Syncing pricing plans with Stripe...', 'info');
        
        const response = await fetch(`${API_BASE}/api/pricing/stripe/sync`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            showToast(`Synced ${data.synced || 0} plans with Stripe`, 'success');
            
            // Refresh the pricing plans display
            setTimeout(() => {
                if (typeof loadPricingPlans === 'function') {
                    loadPricingPlans();
                } else {
                    window.location.reload();
                }
            }, 1500);
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to sync with Stripe');
        }
    } catch (error) {
        console.error('Error syncing with Stripe:', error);
        showToast('Failed to sync with Stripe', 'error');
    }
}

// =============================================================================
// FEATURE TOGGLES
// =============================================================================

function toggleFeature(featureKey) {
    try {
        const toggle = document.querySelector(`[data-feature="${featureKey}"]`);
        if (!toggle) {
            console.error('Feature toggle not found:', featureKey);
            return;
        }
        
        const isEnabled = toggle.classList.contains('enabled');
        
        if (isEnabled) {
            toggle.classList.remove('enabled');
            toggle.classList.add('disabled');
        } else {
            toggle.classList.remove('disabled');
            toggle.classList.add('enabled');
        }
        
        // Save feature state
        saveFeatureState(featureKey, !isEnabled);
        
        showToast(`Feature "${featureKey}" ${!isEnabled ? 'enabled' : 'disabled'}`, 'success');
        
    } catch (error) {
        console.error('Error toggling feature:', error);
        showToast('Failed to toggle feature', 'error');
    }
}

async function saveFeatureState(featureKey, enabled) {
    try {
        const response = await fetch(`${API_BASE}/api/features/${featureKey}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ enabled })
        });
        
        if (!response.ok) {
            throw new Error('Failed to save feature state');
        }
    } catch (error) {
        console.error('Error saving feature state:', error);
        // Don't show error toast for this as it's a background operation
    }
}

// =============================================================================
// PRICING ANALYTICS
// =============================================================================

async function loadPricingAnalytics() {
    try {
        const response = await fetch(`${API_BASE}/api/pricing/analytics`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const analytics = await response.json();
            displayPricingAnalytics(analytics);
        } else {
            throw new Error('Failed to load pricing analytics');
        }
    } catch (error) {
        console.error('Error loading pricing analytics:', error);
        showToast('Failed to load pricing analytics', 'error');
    }
}

function displayPricingAnalytics(analytics) {
    const container = document.getElementById('pricingAnalytics');
    if (!container) return;
    
    container.innerHTML = `
        <div class="row">
            <div class="col-md-3">
                <div class="analytics-card">
                    <div class="analytics-value">${analytics.totalRevenue || '$0'}</div>
                    <div class="analytics-label">Total Revenue</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="analytics-card">
                    <div class="analytics-value">${analytics.activeSubscriptions || 0}</div>
                    <div class="analytics-label">Active Subscriptions</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="analytics-card">
                    <div class="analytics-value">${analytics.conversionRate || '0%'}</div>
                    <div class="analytics-label">Conversion Rate</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="analytics-card">
                    <div class="analytics-value">${analytics.churnRate || '0%'}</div>
                    <div class="analytics-label">Churn Rate</div>
                </div>
            </div>
        </div>
        
        ${analytics.popularPlans ? `
            <div class="mt-4">
                <h6>Most Popular Plans</h6>
                <div class="popular-plans">
                    ${analytics.popularPlans.map(plan => `
                        <div class="popular-plan-item">
                            <span class="plan-name">${plan.name}</span>
                            <span class="plan-subscriptions">${plan.subscriptions} subscribers</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
    `;
}

// =============================================================================
// SUBSCRIPTION MANAGEMENT
// =============================================================================

async function viewSubscriptions() {
    try {
        window.location.href = 'admin-customers.html?view=subscriptions';
    } catch (error) {
        console.error('Error navigating to subscriptions:', error);
        showToast('Failed to load subscriptions', 'error');
    }
}

async function cancelSubscription(subscriptionId) {
    try {
        const confirmed = confirm('Are you sure you want to cancel this subscription?');
        
        if (!confirmed) {
            return;
        }
        
        const response = await fetch(`${API_BASE}/api/subscriptions/${subscriptionId}/cancel`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            showToast('Subscription cancelled successfully', 'success');
            
            // Update UI to reflect cancellation
            const subscriptionRow = document.querySelector(`[data-subscription-id="${subscriptionId}"]`);
            if (subscriptionRow) {
                const statusCell = subscriptionRow.querySelector('.subscription-status');
                if (statusCell) {
                    statusCell.innerHTML = '<span class="badge bg-danger">Cancelled</span>';
                }
            }
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to cancel subscription');
        }
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        showToast('Failed to cancel subscription', 'error');
    }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

// Initialize pricing functions when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add CSS for pricing functions if not already present
    if (!document.getElementById('pricingStyles')) {
        const style = document.createElement('style');
        style.id = 'pricingStyles';
        style.textContent = `
            .analytics-card {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                text-align: center;
                border: 1px solid #e9ecef;
            }
            .analytics-value {
                font-size: 2rem;
                font-weight: bold;
                color: #495057;
            }
            .analytics-label {
                color: #6c757d;
                font-size: 0.9rem;
                margin-top: 5px;
            }
            .popular-plan-item {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #e9ecef;
            }
            .popular-plan-item:last-child {
                border-bottom: none;
            }
            .stripe-indicator {
                margin-top: 10px;
            }
            .toggle-switch {
                width: 50px;
                height: 25px;
                background: #ccc;
                border-radius: 25px;
                position: relative;
                cursor: pointer;
                transition: background 0.3s;
            }
            .toggle-switch.enabled {
                background: #28a745;
            }
            .toggle-switch::after {
                content: '';
                position: absolute;
                width: 21px;
                height: 21px;
                background: white;
                border-radius: 50%;
                top: 2px;
                left: 2px;
                transition: transform 0.3s;
            }
            .toggle-switch.enabled::after {
                transform: translateX(25px);
            }
        `;
        document.head.appendChild(style);
    }
    
    console.log('Pricing functions initialized');
});

// Export functions for global access
window.editPlan = editPlan;
window.deletePlan = deletePlan;
window.createPlanInStripe = createPlanInStripe;
window.syncWithStripe = syncWithStripe;
window.toggleFeature = toggleFeature;
window.loadPricingAnalytics = loadPricingAnalytics;
window.viewSubscriptions = viewSubscriptions;
window.cancelSubscription = cancelSubscription;
