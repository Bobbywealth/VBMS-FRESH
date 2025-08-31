/**
 * VBMS Notification System
 * Comprehensive notification system with sound alerts, real-time updates, and cross-page integration
 */

class VBMSNotificationSystem {
  constructor() {
    this.notifications = [];
    this.unreadCount = 0;
    this.isInitialized = false;
    this.soundEnabled = true;
    this.soundVolume = 0.5;
    this.apiBase = '/api';
    this.pollingInterval = null;
    this.pollingFrequency = 30000; // 30 seconds
    this.maxDisplayedNotifications = 5;
    this.soundFiles = {};
    this.notificationContainer = null;
    this.lastNotificationCheck = new Date();
    
    // Bind methods
    this.init = this.init.bind(this);
    this.playSound = this.playSound.bind(this);
    this.showToast = this.showToast.bind(this);
    this.updateBadge = this.updateBadge.bind(this);
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', this.init);
    } else {
      this.init();
    }
  }
  
  async init() {
    if (this.isInitialized) return;
    
    console.log('🔔 Initializing VBMS Notification System...');
    
    try {
      // Create notification container
      this.createNotificationContainer();
      
      // Load sound files
      await this.loadSoundFiles();
      
      // Load user preferences
      this.loadUserPreferences();
      
      // Create notification badge
      this.createNotificationBadge();
      
      // Initial load of notifications
      await this.loadNotifications();
      
      // Start polling for new notifications
      this.startPolling();
      
      // Setup WebSocket if available
      this.setupWebSocket();
      
      this.isInitialized = true;
      console.log('✅ VBMS Notification System initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize notification system:', error);
    }
  }
  
  createNotificationContainer() {
    // Create main notification container
    this.notificationContainer = document.createElement('div');
    this.notificationContainer.id = 'vbms-notification-container';
    this.notificationContainer.className = 'vbms-notification-container';
    this.notificationContainer.innerHTML = `
      <style>
        .vbms-notification-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 10000;
          max-width: 400px;
          pointer-events: none;
        }
        
        .vbms-notification-toast {
          background: var(--card-bg, #ffffff);
          border: 1px solid var(--border, #e9ecef);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          transform: translateX(100%);
          transition: all 0.3s ease;
          pointer-events: auto;
          position: relative;
          overflow: hidden;
        }
        
        .vbms-notification-toast.show {
          transform: translateX(0);
        }
        
        .vbms-notification-toast.removing {
          transform: translateX(100%);
          opacity: 0;
        }
        
        .vbms-notification-toast::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: var(--accent, #f0b90b);
        }
        
        .vbms-notification-toast.priority-urgent::before,
        .vbms-notification-toast.priority-critical::before {
          background: var(--danger, #ef4444);
          animation: urgentPulse 1s ease-in-out infinite;
        }
        
        .vbms-notification-toast.type-error::before {
          background: var(--danger, #ef4444);
        }
        
        .vbms-notification-toast.type-success::before {
          background: var(--success, #22c55e);
        }
        
        .vbms-notification-toast.type-warning::before {
          background: var(--warning, #f59e0b);
        }
        
        .vbms-notification-toast.type-info::before {
          background: var(--info, #3b82f6);
        }
        
        @keyframes urgentPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .notification-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }
        
        .notification-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          color: white;
          background: var(--accent, #f0b90b);
        }
        
        .notification-icon.type-error {
          background: var(--danger, #ef4444);
        }
        
        .notification-icon.type-success {
          background: var(--success, #22c55e);
        }
        
        .notification-icon.type-warning {
          background: var(--warning, #f59e0b);
        }
        
        .notification-icon.type-info {
          background: var(--info, #3b82f6);
        }
        
        .notification-title {
          font-weight: 600;
          color: var(--text, #212529);
          font-size: 14px;
          flex: 1;
        }
        
        .notification-time {
          font-size: 12px;
          color: var(--text-muted, #6c757d);
        }
        
        .notification-message {
          color: var(--text, #212529);
          font-size: 13px;
          line-height: 1.4;
          margin-left: 36px;
        }
        
        .notification-actions {
          margin-top: 12px;
          margin-left: 36px;
          display: flex;
          gap: 8px;
        }
        
        .notification-btn {
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .notification-btn.primary {
          background: var(--accent, #f0b90b);
          color: #000;
        }
        
        .notification-btn.secondary {
          background: var(--glass, rgba(255,255,255,0.1));
          color: var(--text, #212529);
          border: 1px solid var(--border, #e9ecef);
        }
        
        .notification-btn.danger {
          background: var(--danger, #ef4444);
          color: white;
        }
        
        .notification-close {
          position: absolute;
          top: 8px;
          right: 8px;
          background: none;
          border: none;
          color: var(--text-muted, #6c757d);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          font-size: 16px;
          line-height: 1;
        }
        
        .notification-close:hover {
          background: var(--glass, rgba(0,0,0,0.1));
        }
        
        .notification-badge {
          position: fixed;
          top: 20px;
          right: 20px;
          background: var(--danger, #ef4444);
          color: white;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          z-index: 10001;
          cursor: pointer;
          transition: all 0.3s ease;
          transform: scale(0);
        }
        
        .notification-badge.show {
          transform: scale(1);
        }
        
        .notification-badge:hover {
          transform: scale(1.1);
        }
        
        /* Dark theme support */
        [data-theme="dark"] .vbms-notification-toast {
          background: var(--card-bg, rgba(20, 20, 20, 0.95));
          border-color: var(--border, rgba(64, 64, 64, 0.4));
          color: var(--text, #ffffff);
        }
        
        [data-theme="dark"] .notification-title {
          color: var(--text, #ffffff);
        }
        
        [data-theme="dark"] .notification-message {
          color: var(--text, #ffffff);
        }
        
        /* Mobile responsive */
        @media (max-width: 768px) {
          .vbms-notification-container {
            left: 20px;
            right: 20px;
            max-width: none;
          }
          
          .vbms-notification-toast {
            margin-bottom: 8px;
          }
        }
      </style>
    `;
    
    document.body.appendChild(this.notificationContainer);
  }
  
  async loadSoundFiles() {
    const soundFiles = {
      default: '/sounds/notification.mp3',
      email: '/sounds/email.mp3',
      order: '/sounds/order.mp3',
      payment: '/sounds/payment.mp3',
      alert: '/sounds/alert.mp3',
      success: '/sounds/success.mp3',
      error: '/sounds/error.mp3',
      warning: '/sounds/warning.mp3',
      urgent: '/sounds/urgent.mp3',
      gentle: '/sounds/gentle.mp3'
    };
    
    // Create fallback sounds using Web Audio API
    this.createFallbackSounds();
    
    // Try to load actual sound files
    for (const [type, url] of Object.entries(soundFiles)) {
      try {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.volume = this.soundVolume;
        
        // Set fallback to generated sound
        audio.addEventListener('error', () => {
          this.soundFiles[type] = this.generateSound(type);
        });
        
        audio.src = url;
        this.soundFiles[type] = audio;
      } catch (error) {
        console.log(`Using fallback sound for ${type}`);
        this.soundFiles[type] = this.generateSound(type);
      }
    }
  }
  
  createFallbackSounds() {
    // Create AudioContext for generated sounds
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
      console.log('Web Audio API not supported, sounds will be disabled');
    }
  }
  
  generateSound(type) {
    if (!this.audioContext) return null;
    
    const soundSettings = {
      default: { frequency: 800, duration: 0.2, type: 'sine' },
      email: { frequency: 600, duration: 0.3, type: 'sine' },
      order: { frequency: 1000, duration: 0.25, type: 'square' },
      payment: { frequency: 1200, duration: 0.4, type: 'sine' },
      alert: { frequency: 1500, duration: 0.5, type: 'sawtooth' },
      success: { frequency: 700, duration: 0.3, type: 'sine' },
      error: { frequency: 300, duration: 0.6, type: 'sawtooth' },
      warning: { frequency: 900, duration: 0.4, type: 'triangle' },
      urgent: { frequency: 1800, duration: 0.8, type: 'square' },
      gentle: { frequency: 500, duration: 0.2, type: 'sine' }
    };
    
    const settings = soundSettings[type] || soundSettings.default;
    
    return () => {
      try {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = settings.type;
        oscillator.frequency.setValueAtTime(settings.frequency, this.audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(this.soundVolume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + settings.duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + settings.duration);
      } catch (error) {
        console.error('Error playing generated sound:', error);
      }
    };
  }
  
  loadUserPreferences() {
    const preferences = JSON.parse(localStorage.getItem('vbms_notification_preferences') || '{}');
    
    this.soundEnabled = preferences.soundEnabled !== false;
    this.soundVolume = preferences.soundVolume || 0.5;
    this.pollingFrequency = preferences.pollingFrequency || 30000;
    
    // Apply volume to all loaded sounds
    Object.values(this.soundFiles).forEach(sound => {
      if (sound && sound.volume !== undefined) {
        sound.volume = this.soundVolume;
      }
    });
  }
  
  saveUserPreferences() {
    const preferences = {
      soundEnabled: this.soundEnabled,
      soundVolume: this.soundVolume,
      pollingFrequency: this.pollingFrequency
    };
    
    localStorage.setItem('vbms_notification_preferences', JSON.stringify(preferences));
  }
  
  createNotificationBadge() {
    const badge = document.createElement('div');
    badge.id = 'vbms-notification-badge';
    badge.className = 'notification-badge';
    badge.onclick = () => this.showNotificationCenter();
    
    document.body.appendChild(badge);
  }
  
  async loadNotifications() {
    try {
      const token = localStorage.getItem('vbms_token');
      if (!token) return;
      
      const response = await fetch(`${this.apiBase}/notifications/unread`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.unreadCount = data.count || 0;
        this.updateBadge();
        
        // Show new notifications that weren't shown before
        const newNotifications = data.notifications.filter(n => 
          new Date(n.createdAt) > this.lastNotificationCheck
        );
        
        newNotifications.forEach(notification => {
          this.showToast(notification);
          if (notification.shouldPlaySound) {
            this.playSound(notification.sound?.type || notification.type);
          }
        });
        
        this.lastNotificationCheck = new Date();
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }
  
  playSound(type = 'default') {
    if (!this.soundEnabled) return;
    
    const sound = this.soundFiles[type] || this.soundFiles.default;
    if (!sound) return;
    
    try {
      if (typeof sound === 'function') {
        // Generated sound
        sound();
      } else {
        // Audio file
        sound.currentTime = 0;
        sound.play().catch(error => {
          console.log('Could not play notification sound:', error.message);
        });
      }
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }
  
  showToast(notification) {
    const toast = document.createElement('div');
    toast.className = `vbms-notification-toast priority-${notification.priority} type-${notification.type}`;
    toast.dataset.notificationId = notification.id;
    
    const iconMap = {
      email: 'bi-envelope',
      order: 'bi-box',
      payment: 'bi-credit-card',
      system: 'bi-gear',
      user: 'bi-person',
      security: 'bi-shield',
      inventory: 'bi-stack',
      task: 'bi-check-circle',
      calendar: 'bi-calendar',
      ai_phone: 'bi-telephone',
      support: 'bi-headset',
      welcome: 'bi-hand-thumbs-up',
      alert: 'bi-exclamation-triangle',
      warning: 'bi-exclamation-triangle',
      info: 'bi-info-circle',
      success: 'bi-check-circle',
      error: 'bi-x-circle'
    };
    
    const icon = iconMap[notification.type] || 'bi-bell';
    const timeAgo = this.formatTimeAgo(new Date(notification.createdAt));
    
    toast.innerHTML = `
      <button class="notification-close" onclick="vbmsNotifications.dismissToast('${notification.id}')">&times;</button>
      <div class="notification-header">
        <div class="notification-icon type-${notification.type}">
          <i class="${icon}"></i>
        </div>
        <div class="notification-title">${notification.title}</div>
        <div class="notification-time">${timeAgo}</div>
      </div>
      <div class="notification-message">${notification.message}</div>
      ${notification.content?.buttons ? this.renderNotificationButtons(notification.content.buttons, notification.id) : ''}
    `;
    
    // Add click handler for navigation
    if (notification.action?.url) {
      toast.style.cursor = 'pointer';
      toast.addEventListener('click', (e) => {
        if (!e.target.closest('.notification-close') && !e.target.closest('.notification-btn')) {
          this.handleNotificationAction(notification.action);
          this.markAsRead(notification.id);
        }
      });
    }
    
    this.notificationContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Auto-remove after duration (unless persistent)
    if (!notification.display?.persistent) {
      const duration = notification.display?.duration || 5000;
      setTimeout(() => this.dismissToast(notification.id), duration);
    }
    
    // Limit number of displayed toasts
    this.limitDisplayedToasts();
  }
  
  renderNotificationButtons(buttons, notificationId) {
    if (!buttons || !Array.isArray(buttons)) return '';
    
    const buttonHtml = buttons.map(button => 
      `<button class="notification-btn ${button.style || 'primary'}" 
               onclick="vbmsNotifications.handleButtonAction('${button.action}', '${notificationId}')">
         ${button.text}
       </button>`
    ).join('');
    
    return `<div class="notification-actions">${buttonHtml}</div>`;
  }
  
  limitDisplayedToasts() {
    const toasts = this.notificationContainer.querySelectorAll('.vbms-notification-toast');
    if (toasts.length > this.maxDisplayedNotifications) {
      const oldestToast = toasts[0];
      this.dismissToast(oldestToast.dataset.notificationId);
    }
  }
  
  dismissToast(notificationId) {
    const toast = this.notificationContainer.querySelector(`[data-notification-id="${notificationId}"]`);
    if (toast) {
      toast.classList.add('removing');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }
  }
  
  updateBadge() {
    const badge = document.getElementById('vbms-notification-badge');
    if (!badge) return;
    
    if (this.unreadCount > 0) {
      badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
      badge.classList.add('show');
    } else {
      badge.classList.remove('show');
    }
  }
  
  formatTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    return `${Math.floor(diffInSeconds / 86400)}d`;
  }
  
  startPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    this.pollingInterval = setInterval(() => {
      this.loadNotifications();
    }, this.pollingFrequency);
  }
  
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
  
  setupWebSocket() {
    // TODO: Implement WebSocket connection for real-time notifications
    // This would replace or supplement the polling mechanism
  }
  
  async markAsRead(notificationId) {
    try {
      const token = localStorage.getItem('vbms_token');
      if (!token) return;
      
      await fetch(`${this.apiBase}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isRead: true })
      });
      
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      this.updateBadge();
      
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }
  
  async markAllAsRead() {
    try {
      const token = localStorage.getItem('vbms_token');
      if (!token) return;
      
      await fetch(`${this.apiBase}/notifications/read-all`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      this.unreadCount = 0;
      this.updateBadge();
      
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }
  
  handleNotificationAction(action) {
    if (!action) return;
    
    switch (action.type) {
      case 'navigate':
        if (action.url) {
          window.location.href = action.url;
        }
        break;
      case 'external':
        if (action.url) {
          window.open(action.url, '_blank');
        }
        break;
      case 'modal':
        // TODO: Implement modal display
        break;
      case 'api_call':
        // TODO: Implement API call
        break;
    }
  }
  
  handleButtonAction(action, notificationId) {
    this.handleNotificationAction({ type: 'navigate', url: action });
    this.markAsRead(notificationId);
    this.dismissToast(notificationId);
  }
  
  showNotificationCenter() {
    // TODO: Implement notification center modal/sidebar
    console.log('Opening notification center...');
  }
  
  // Public API methods
  
  async createNotification(data) {
    try {
      const token = localStorage.getItem('vbms_token');
      if (!token) return;
      
      const response = await fetch(`${this.apiBase}/notifications`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.notification;
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }
  
  setSoundEnabled(enabled) {
    this.soundEnabled = enabled;
    this.saveUserPreferences();
  }
  
  setSoundVolume(volume) {
    this.soundVolume = Math.max(0, Math.min(1, volume));
    Object.values(this.soundFiles).forEach(sound => {
      if (sound && sound.volume !== undefined) {
        sound.volume = this.soundVolume;
      }
    });
    this.saveUserPreferences();
  }
  
  testSound(type = 'default') {
    this.playSound(type);
  }
  
  // Utility method to create quick notifications
  notify(title, message, type = 'info', options = {}) {
    const notification = {
      title,
      message,
      type,
      priority: options.priority || 'normal',
      display: {
        toast: true,
        duration: options.duration || 5000,
        persistent: options.persistent || false
      },
      sound: {
        enabled: options.sound !== false,
        type: options.soundType || type
      }
    };
    
    this.showToast({
      ...notification,
      id: `local_${Date.now()}`,
      createdAt: new Date().toISOString(),
      shouldPlaySound: notification.sound.enabled
    });
    
    if (notification.sound.enabled) {
      this.playSound(notification.sound.type);
    }
  }
}

// Global instance
window.vbmsNotifications = new VBMSNotificationSystem();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VBMSNotificationSystem;
}