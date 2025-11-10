/**
 * VBMS Pricing Integration Module
 * Connects frontend pricing displays to admin-managed pricing data
 * This ensures all pricing shown to customers reflects the current admin settings
 */

class VBMSPricingIntegration {
    constructor() {
        this.cachedPlans = null;
        this.cacheTimestamp = null;
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
        this.apiBase = this.getApiBase();
    }

    getApiBase() {
        return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:5050'
            : 'https://vbms-fresh-offical-website-launch.onrender.com';
    }

    /**
     * Fetch current pricing plans from admin system
     */
    async fetchPricingPlans() {
        try {
            // Check cache first
            if (this.cachedPlans && this.cacheTimestamp && 
                (Date.now() - this.cacheTimestamp) < this.cacheExpiry) {
                console.log('💰 Using cached pricing plans');
                return this.cachedPlans;
            }

            console.log('💰 Fetching pricing plans from admin system...');
            
            const response = await fetch(`${this.apiBase}/api/pricing/public/plans`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const plans = await response.json();
            
            // Cache the results
            this.cachedPlans = plans;
            this.cacheTimestamp = Date.now();
            
            console.log(`✅ Loaded ${plans.length} pricing plans from admin system`);
            return plans;
            
        } catch (error) {
            console.error('❌ Error fetching pricing plans:', error);
            // Return fallback data if API fails
            return this.getFallbackPlans();
        }
    }

    /**
     * Fallback pricing data in case API is unavailable
     */
    getFallbackPlans() {
        console.log('⚠️ Using fallback pricing data');
        return [
            {
                id: 'start',
                name: 'start',
                displayName: 'Start Package',
                price: 39.99,
                interval: 'month',
                description: 'Perfect for small businesses getting started',
                features: {
                    liveMonitoring: true,
                    orderManagement: true,
                    phoneSupport: true
                }
            },
            {
                id: 'core',
                name: 'core',
                displayName: 'VBMS Core',
                price: 699.00,
                interval: 'month',
                description: 'Complete business management solution',
                featured: true,
                features: {
                    liveMonitoring: true,
                    orderManagement: true,
                    phoneSupport: true,
                    customDashboard: true,
                    inventoryTracker: true
                }
            },
            {
                id: 'premium_plus',
                name: 'premium_plus',
                displayName: 'Premium Plus',
                price: 1199.00,
                interval: 'month',
                description: 'Complete enterprise solution',
                features: {
                    liveMonitoring: true,
                    orderManagement: true,
                    phoneSupport: true,
                    customDashboard: true,
                    aiPhone: true,
                    inventoryTracker: true,
                    prioritySupport: true,
                    advancedAnalytics: true
                }
            }
        ];
    }

    /**
     * Render pricing cards for pay.html page
     */
    async renderPaymentPagePricing() {
        try {
            const plans = await this.fetchPricingPlans();
            const container = document.querySelector('.packages-container');
            
            if (!container) {
                console.warn('Pricing container not found on payment page');
                return;
            }

            console.log('🎨 Rendering pricing cards for payment page...');
            
            container.innerHTML = plans.map(plan => `
                <div class="package-card" data-base="${plan.price}" data-name="${plan.displayName}" data-stripe-price-id="${plan.stripePriceId || ''}" data-plan-id="${plan.id}">
                    <h3>${plan.displayName} ${plan.featured ? '<span class="badge-popular">Most Popular</span>' : ''}</h3>
                    <div class="price"><strong>$${plan.price}/${plan.interval}</strong></div>
                    ${plan.description ? `<p style="color: #ffe066; font-size: 0.9rem;">${plan.description}</p>` : ''}
                    <ul>
                        ${this.renderFeatureList(plan.features)}
                    </ul>
                    <button class="select-btn">Select ${plan.displayName}</button>
                </div>
            `).join('');

            // Re-attach event listeners for the new cards
            this.attachPaymentCardListeners();
            
            console.log('✅ Payment page pricing updated successfully');
            
        } catch (error) {
            console.error('❌ Error rendering payment page pricing:', error);
        }
    }

    /**
     * Render feature list for a plan
     */
    renderFeatureList(features) {
        if (!features) return '<li>Standard features included</li>';
        
        const featureLabels = {
            liveMonitoring: 'Live Video Monitoring',
            orderManagement: 'Order Management System',
            phoneSupport: '24/7 Phone Support',
            aiPhone: 'AI Phone Assistant',
            inventoryTracker: 'Inventory Tracking',
            customDashboard: 'Custom Dashboard',
            advancedAnalytics: 'Advanced Analytics',
            prioritySupport: 'Priority Support',
            multiLocation: 'Multi-Location Support',
            apiAccess: 'API Access',
            whiteLabel: 'White Label Solution',
            dataExport: 'Data Export',
            integrations: 'Third-party Integrations',
            training: 'Staff Training',
            backup: 'Data Backup & Recovery'
        };

        const enabledFeatures = Object.entries(features)
            .filter(([key, enabled]) => enabled)
            .map(([key, enabled]) => featureLabels[key] || key)
            .slice(0, 5); // Limit to 5 features for display

        return enabledFeatures.length > 0 
            ? enabledFeatures.map(feature => `<li>${feature}</li>`).join('')
            : '<li>Standard features included</li>';
    }

    /**
     * Render pricing cards for index.html homepage
     */
    async renderHomepagePricing() {
        try {
            const plans = await this.fetchPricingPlans();
            const container = document.querySelector('.pricing-cards-container, #pricing-cards, .pricing-grid');
            
            if (!container) {
                console.warn('Pricing container not found on homepage');
                return;
            }

            console.log('🎨 Rendering pricing cards for homepage...');
            
            // Take only the first 3 plans for homepage display
            const displayPlans = plans.slice(0, 3);
            
            container.innerHTML = displayPlans.map(plan => `
                <div class="pricing-card ${plan.featured ? 'featured' : ''}" data-plan-id="${plan.id}">
                    <div class="pricing-header">
                        <h3>${plan.displayName}</h3>
                        <div class="price">$${plan.price}<span>/${plan.interval}</span></div>
                        ${plan.description ? `<p class="description">${plan.description}</p>` : ''}
                    </div>
                    <div class="pricing-features">
                        <ul>
                            ${this.renderFeatureList(plan.features)}
                        </ul>
                    </div>
                    <div class="pricing-footer">
                        <a href="pay.html" class="btn btn-primary">Get Started</a>
                    </div>
                </div>
            `).join('');
            
            console.log('✅ Homepage pricing updated successfully');
            
        } catch (error) {
            console.error('❌ Error rendering homepage pricing:', error);
        }
    }

    /**
     * Update wizard pricing selections
     */
    async updateWizardPricing() {
        try {
            const plans = await this.fetchPricingPlans();
            const selectElement = document.querySelector('#packageSelect, select[name="package"]');
            
            if (!selectElement) {
                console.warn('Package select element not found in wizard');
                return;
            }

            console.log('🎨 Updating wizard pricing options...');
            
            // Clear existing options except the first placeholder
            const placeholder = selectElement.querySelector('option[value=""]');
            selectElement.innerHTML = '';
            if (placeholder) {
                selectElement.appendChild(placeholder);
            }

            // Add options from admin pricing
            plans.forEach(plan => {
                const option = document.createElement('option');
                option.value = plan.id;
                option.textContent = `${plan.displayName} - $${plan.price}/${plan.interval}`;
                option.dataset.price = plan.price;
                option.dataset.stripePriceId = plan.stripePriceId || '';
                selectElement.appendChild(option);
            });
            
            console.log('✅ Wizard pricing updated successfully');
            
        } catch (error) {
            console.error('❌ Error updating wizard pricing:', error);
        }
    }

    /**
     * Attach event listeners for payment page cards
     */
    attachPaymentCardListeners() {
        const cards = document.querySelectorAll('.package-card');
        cards.forEach(card => {
            const selectBtn = card.querySelector('.select-btn');
            if (selectBtn) {
                selectBtn.addEventListener('click', () => {
                    // Remove selected class from all cards
                    cards.forEach(c => c.classList.remove('selected'));
                    // Add selected class to clicked card
                    card.classList.add('selected');
                    
                    // Update payment form
                    const packageName = card.dataset.name;
                    const basePrice = parseFloat(card.dataset.base);
                    const planId = card.dataset.planId;
                    const stripePriceId = card.dataset.stripePriceId;
                    
                    // Update form fields
                    const packageField = document.getElementById('package');
                    const amountField = document.getElementById('amount');
                    
                    if (packageField) packageField.value = packageName;
                    if (amountField) amountField.value = basePrice;
                    
                    // Store plan data for checkout
                    if (window.selectedPlan) {
                        window.selectedPlan = {
                            id: planId,
                            name: packageName,
                            price: basePrice,
                            stripePriceId: stripePriceId
                        };
                    }
                    
                    // Show payment form
                    const payCard = document.getElementById('pay-card');
                    if (payCard) {
                        payCard.classList.add('active');
                        payCard.scrollIntoView({ behavior: 'smooth' });
                    }
                });
            }
        });
    }

    /**
     * Initialize pricing integration on page load
     */
    async initialize() {
        const currentPage = window.location.pathname.split('/').pop();
        
        console.log(`💰 Initializing VBMS Pricing Integration for: ${currentPage}`);
        
        switch (currentPage) {
            case 'pay.html':
                await this.renderPaymentPagePricing();
                break;
            case 'index.html':
            case '':
                await this.renderHomepagePricing();
                break;
            case 'wizard-step2.html':
            case 'wizard-step3.html':
                await this.updateWizardPricing();
                break;
            default:
                console.log('No pricing integration needed for this page');
        }
    }

    /**
     * Refresh pricing data (useful for admin testing)
     */
    async refresh() {
        this.cachedPlans = null;
        this.cacheTimestamp = null;
        await this.initialize();
    }
}

// Create global instance
window.vbmsPricing = new VBMSPricingIntegration();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.vbmsPricing.initialize();
    });
} else {
    // DOM is already ready
    window.vbmsPricing.initialize();
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VBMSPricingIntegration;
}