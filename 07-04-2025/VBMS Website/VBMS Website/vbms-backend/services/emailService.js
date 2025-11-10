const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  async initTransporter() {
    try {
      // Configure nodemailer transporter
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      // Verify connection
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        await this.transporter.verify();
        console.log('✅ Email service initialized successfully');
      } else {
        console.log('⚠️  Email service not configured - missing SMTP credentials');
      }
    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
    }
  }

  async sendEmail(to, subject, htmlContent, textContent = null) {
    try {
      if (!this.transporter) {
        console.log('Email service not available - skipping email');
        return false;
      }

      const mailOptions = {
        from: `"VBMS" <${process.env.SMTP_USER}>`,
        to: to,
        subject: subject,
        html: htmlContent,
        text: textContent || this.stripHtml(htmlContent)
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent to ${to}: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error.message);
      return false;
    }
  }

  // Welcome email for new customers
  async sendWelcomeEmail(user, subscription = null) {
    const subject = 'Welcome to VBMS - Your Business Management Journey Starts Now!';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f0b90b, #d4a109); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #fff; padding: 30px; border: 1px solid #ddd; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #f0b90b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .features { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .feature-item { margin: 10px 0; }
            .feature-icon { color: #22c55e; margin-right: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to VBMS!</h1>
              <p>Your Video Business Management System is ready</p>
            </div>
            
            <div class="content">
              <h2>Hi ${user.name}!</h2>
              
              <p>Thank you for joining VBMS! We're excited to help you streamline your business operations with our comprehensive management platform.</p>
              
              ${subscription ? `
                <div class="features">
                  <h3>Your ${subscription.packageName} Plan Includes:</h3>
                  ${this.getFeaturesList(subscription.features)}
                  <p><strong>Monthly Price:</strong> $${subscription.price.monthly}</p>
                  ${subscription.billing.nextBillingDate ? `<p><strong>Next Billing:</strong> ${new Date(subscription.billing.nextBillingDate).toLocaleDateString()}</p>` : ''}
                </div>
              ` : ''}
              
              <h3>What's Next?</h3>
              <ul>
                <li>✅ Complete your business profile setup</li>
                <li>🔗 Connect your integrations (Uber Eats, POS systems)</li>
                <li>📊 Explore your dashboard and analytics</li>
                <li>📞 Set up your AI phone system (if included)</li>
                <li>🎯 Configure your monitoring preferences</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/customer-dashboard.html" class="button">
                  Access Your Dashboard
                </a>
              </div>
              
              <h3>Need Help?</h3>
              <p>Our support team is here to help you get started:</p>
              <ul>
                <li>📧 Email: support@vbms.com</li>
                <li>💬 Live chat in your dashboard</li>
                <li>📚 Knowledge base and tutorials</li>
                <li>${subscription?.features?.phoneSupport ? '📞 Priority phone support included in your plan' : '📞 Phone support available'}</li>
              </ul>
            </div>
            
            <div class="footer">
              <p>Welcome aboard! 🚀</p>
              <p><small>© 2025 VBMS. All rights reserved.</small></p>
            </div>
          </div>
        </body>
      </html>
    `;

    return await this.sendEmail(user.email, subject, htmlContent);
  }

  // Payment confirmation email
  async sendPaymentConfirmationEmail(user, payment, subscription) {
    const subject = `Payment Confirmed - $${(payment.amount / 100).toFixed(2)} for ${subscription.packageName}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #22c55e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1>✅ Payment Confirmed</h1>
            </div>
            
            <div style="background: #fff; padding: 30px; border: 1px solid #ddd;">
              <h2>Hi ${user.name},</h2>
              
              <p>Your payment has been successfully processed! Here are the details:</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3>Payment Details</h3>
                <p><strong>Amount:</strong> $${(payment.amount / 100).toFixed(2)}</p>
                <p><strong>Plan:</strong> ${subscription.packageName}</p>
                <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>Transaction ID:</strong> ${payment.stripePaymentId}</p>
                <p><strong>Next Billing:</strong> ${new Date(subscription.billing.nextBillingDate).toLocaleDateString()}</p>
              </div>
              
              <p>Your subscription is now active and you have full access to all features in your plan.</p>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/customer-dashboard.html" 
                   style="display: inline-block; background: #f0b90b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
                  Access Your Dashboard
                </a>
              </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
              <p><small>Questions? Contact support@vbms.com</small></p>
            </div>
          </div>
        </body>
      </html>
    `;

    return await this.sendEmail(user.email, subject, htmlContent);
  }

  // Payment failed email
  async sendPaymentFailedEmail(user, subscription, attemptCount) {
    const subject = `Payment Failed - Action Required for Your VBMS Subscription`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1>⚠️ Payment Failed</h1>
            </div>
            
            <div style="background: #fff; padding: 30px; border: 1px solid #ddd;">
              <h2>Hi ${user.name},</h2>
              
              <p>We were unable to process your payment for your VBMS ${subscription.packageName} subscription.</p>
              
              <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0;">
                <h3>Payment Details</h3>
                <p><strong>Plan:</strong> ${subscription.packageName}</p>
                <p><strong>Amount:</strong> $${subscription.price.monthly}</p>
                <p><strong>Attempt:</strong> ${attemptCount} of 3</p>
                <p><strong>Next Retry:</strong> ${attemptCount < 3 ? 'In 3 days' : 'No more retries - subscription will be suspended'}</p>
              </div>
              
              ${attemptCount >= 3 ? `
                <div style="background: #fef2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p><strong>⚠️ Final Notice:</strong> Your subscription will be suspended if payment is not updated immediately.</p>
                </div>
              ` : ''}
              
              <h3>How to Fix This:</h3>
              <ol>
                <li>Update your payment method in your account</li>
                <li>Ensure your card has sufficient funds</li>
                <li>Check that your billing information is correct</li>
                <li>Contact your bank if the issue persists</li>
              </ol>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/billing.html" 
                   style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
                  Update Payment Method
                </a>
              </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
              <p><small>Need help? Contact support@vbms.com immediately</small></p>
            </div>
          </div>
        </body>
      </html>
    `;

    return await this.sendEmail(user.email, subject, htmlContent);
  }

  // Subscription cancelled email
  async sendSubscriptionCancelledEmail(user, subscription) {
    const subject = 'Your VBMS Subscription Has Been Cancelled';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #6b7280; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1>Subscription Cancelled</h1>
            </div>
            
            <div style="background: #fff; padding: 30px; border: 1px solid #ddd;">
              <h2>Hi ${user.name},</h2>
              
              <p>Your VBMS ${subscription.packageName} subscription has been cancelled as requested.</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3>Cancellation Details</h3>
                <p><strong>Plan:</strong> ${subscription.packageName}</p>
                <p><strong>Cancelled Date:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>Access Until:</strong> ${new Date(subscription.billing.currentPeriodEnd).toLocaleDateString()}</p>
              </div>
              
              <p>You'll continue to have access to your VBMS dashboard until ${new Date(subscription.billing.currentPeriodEnd).toLocaleDateString()}.</p>
              
              <h3>What Happens Next:</h3>
              <ul>
                <li>✅ Access continues until your billing period ends</li>
                <li>📊 Your data will be preserved for 30 days</li>
                <li>💾 Export your data before access expires</li>
                <li>🔄 Reactivate anytime with full data restoration</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/customer-dashboard.html" 
                   style="display: inline-block; background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
                  Access Dashboard
                </a>
              </div>
              
              <p>We're sorry to see you go! If you have feedback or need assistance, please reach out to our support team.</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
              <p><small>Want to come back? Email support@vbms.com</small></p>
            </div>
          </div>
        </body>
      </html>
    `;

    return await this.sendEmail(user.email, subject, htmlContent);
  }

  // Admin notification for new signups
  async sendAdminNewSignupNotification(user, subscription) {
    const subject = `🎉 New VBMS Customer: ${user.name} - ${subscription.packageName}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #f0b90b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1>🎉 New Customer Signup!</h1>
            </div>
            
            <div style="background: #fff; padding: 30px; border: 1px solid #ddd;">
              <h2>New Customer Details</h2>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Name:</strong> ${user.name}</p>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Plan:</strong> ${subscription.packageName}</p>
                <p><strong>Monthly Revenue:</strong> $${subscription.price.monthly}</p>
                <p><strong>Signup Date:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>Business:</strong> ${user.business?.businessName || 'Not provided'}</p>
              </div>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/admin-customers.html" 
                   style="display: inline-block; background: #f0b90b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
                  View Customer in Admin Panel
                </a>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send to admin email
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
    if (adminEmail) {
      return await this.sendEmail(adminEmail, subject, htmlContent);
    }
  }

  // Utility methods
  getFeaturesList(features) {
    const featureNames = {
      liveMonitoring: 'Live video monitoring',
      orderManagement: 'Order management system',
      phoneSupport: 'Phone support',
      aiPhone: 'AI phone system',
      inventoryTracker: 'Inventory tracking',
      prioritySupport: 'Priority customer support',
      customDashboard: 'Custom dashboard',
      advancedAnalytics: 'Advanced analytics'
    };

    return Object.entries(features)
      .filter(([key, value]) => value === true)
      .map(([key]) => `<div class="feature-item"><span class="feature-icon">✅</span>${featureNames[key] || key}</div>`)
      .join('');
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}

module.exports = new EmailService();