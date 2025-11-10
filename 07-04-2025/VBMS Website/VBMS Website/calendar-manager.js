/**
 * VBMS Calendar Manager with OpenAI Integration
 * Smart scheduling and event management
 */

class VBMSCalendarManager {
  constructor() {
    this.apiBase = '/api';
    this.currentDate = new Date();
    this.currentView = 'month'; // month, week, day
    this.events = [];
    this.selectedEvent = null;
    
    // Check authentication (without redirect to prevent conflicts)
    if (!this.isAuthenticated()) {
      console.log('⚠️ Calendar Manager: No authentication token found');
      // Don't redirect here - let the page handle authentication
      return;
    }
    
    this.init();
  }
  
  isAuthenticated() {
    // Use the correct token key that matches auth.js
    const token = localStorage.getItem('vbmsToken') || sessionStorage.getItem('vbmsToken');
    const isLoggedIn = localStorage.getItem('vbmsLoggedIn') === 'true';
    return !!(token && isLoggedIn);
  }
  
  getAuthHeaders() {
    // Use the correct token key that matches auth.js  
    const token = localStorage.getItem('vbmsToken') || sessionStorage.getItem('vbmsToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }
  
  async init() {
    console.log('📅 Initializing VBMS Calendar Manager...');
    
    try {
      await this.loadEvents();
      this.setupEventListeners();
      this.renderCalendar();
      
      // Track activity
      if (window.activityTracker) {
        activityTracker.trackCustomActivity('calendar_accessed', 'User accessed calendar system', {
          priority: 'medium',
          module: 'Calendar'
        });
      }
      
      console.log('✅ Calendar Manager initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Calendar Manager:', error);
      this.showNotification('Failed to initialize calendar system', 'error');
    }
  }
  
  setupEventListeners() {
    // Navigation buttons
    document.getElementById('prevMonth')?.addEventListener('click', () => this.navigateMonth(-1));
    document.getElementById('nextMonth')?.addEventListener('click', () => this.navigateMonth(1));
    document.getElementById('todayBtn')?.addEventListener('click', () => this.goToToday());
    
    // View switchers
    document.getElementById('monthView')?.addEventListener('click', () => this.changeView('month'));
    document.getElementById('weekView')?.addEventListener('click', () => this.changeView('week'));
    document.getElementById('dayView')?.addEventListener('click', () => this.changeView('day'));
    
    // Quick create event
    document.getElementById('quickCreateBtn')?.addEventListener('click', () => this.showQuickCreateModal());
    
    // AI-powered event creation
    document.getElementById('aiCreateBtn')?.addEventListener('click', () => this.showAICreateModal());
    
    // Smart scheduling
    document.getElementById('smartScheduleBtn')?.addEventListener('click', () => this.showSmartScheduleModal());
    
    // Event filters
    document.getElementById('eventTypeFilter')?.addEventListener('change', () => this.applyFilters());
    document.getElementById('eventCategoryFilter')?.addEventListener('change', () => this.applyFilters());
  }
  
  async loadEvents() {
    try {
      const startDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
      const endDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
      
      const params = new URLSearchParams({
        start: startDate.toISOString(),
        end: endDate.toISOString()
      });
      
      const response = await fetch(`${this.apiBase}/calendar/events?${params}`, {
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to fetch calendar events');
      
      const data = await response.json();
      this.events = data.data;
      
      console.log(`📅 Loaded ${this.events.length} calendar events`);
      
    } catch (error) {
      console.error('Error loading calendar events:', error);
      this.showNotification('Failed to load calendar events', 'error');
    }
  }
  
  async createEvent(eventData, useAI = false) {
    try {
      const payload = useAI ? { ...eventData, aiPrompt: eventData.prompt } : eventData;
      
      const response = await fetch(`${this.apiBase}/calendar/events`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const error = await response.json();
        if (response.status === 409) {
          // Handle calendar conflicts
          return this.handleCalendarConflict(error.conflicts, eventData);
        }
        throw new Error(error.message || 'Failed to create event');
      }
      
      const data = await response.json();
      this.showNotification(
        useAI ? 'AI-powered event created successfully!' : 'Event created successfully!', 
        'success'
      );
      
      await this.loadEvents();
      this.renderCalendar();
      
      // Track activity
      if (window.activityTracker) {
        activityTracker.trackCustomActivity('calendar_event_created', 'Calendar event created', {
          priority: 'medium',
          module: 'Calendar',
          aiGenerated: useAI
        });
      }
      
      return data.data;
      
    } catch (error) {
      console.error('Error creating calendar event:', error);
      this.showNotification(`Failed to create event: ${error.message}`, 'error');
      throw error;
    }
  }
  
  async requestSmartScheduling(prompt, preferences = {}) {
    try {
      console.log('🧠 Requesting AI smart scheduling...');
      
      const response = await fetch(`${this.apiBase}/calendar/smart-schedule`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          prompt,
          preferences,
          duration: preferences.duration || 60
        })
      });
      
      if (!response.ok) throw new Error('Failed to get smart scheduling suggestions');
      
      const data = await response.json();
      this.showSmartScheduleSuggestions(data.data);
      
      console.log('✅ Smart scheduling suggestions received');
      
    } catch (error) {
      console.error('Error requesting smart scheduling:', error);
      this.showNotification('Failed to get scheduling suggestions', 'error');
    }
  }
  
  async analyzeEmailForEvents(emailData) {
    try {
      console.log('📧 Analyzing email for calendar events...');
      
      const response = await fetch(`${this.apiBase}/calendar/suggest-from-email`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(emailData)
      });
      
      if (!response.ok) throw new Error('Failed to analyze email');
      
      const data = await response.json();
      
      if (data.data.shouldCreateEvent && data.data.suggestedEvents.length > 0) {
        this.showEmailEventSuggestions(data.data.suggestedEvents);
      }
      
    } catch (error) {
      console.error('Error analyzing email:', error);
    }
  }
  
  renderCalendar() {
    // Basic calendar rendering - would integrate with a calendar library like FullCalendar
    console.log(`📅 Rendering calendar for ${this.currentDate.toLocaleDateString()}`);
    
    // Update month/year display
    const monthYearElement = document.getElementById('currentMonthYear');
    if (monthYearElement) {
      monthYearElement.textContent = this.currentDate.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });
    }
    
    // Render events list
    this.renderEventsList();
    
    // Update upcoming events
    this.renderUpcomingEvents();
  }
  
  renderEventsList() {
    const eventsList = document.getElementById('eventsList');
    if (!eventsList) return;
    
    if (this.events.length === 0) {
      eventsList.innerHTML = `
        <div class="text-center py-4 text-muted">
          <i class="bi bi-calendar-x fs-1 d-block mb-2"></i>
          <p>No events scheduled for this period</p>
          <button class="btn btn-primary btn-sm" onclick="calendarManager.showQuickCreateModal()">
            <i class="bi bi-plus"></i> Create Event
          </button>
        </div>
      `;
      return;
    }
    
    // Group events by date
    const eventsByDate = this.groupEventsByDate(this.events);
    
    eventsList.innerHTML = Object.entries(eventsByDate).map(([date, dayEvents]) => `
      <div class="day-events mb-4">
        <h6 class="fw-bold text-primary border-bottom pb-2">
          ${new Date(date).toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          })}
        </h6>
        ${dayEvents.map(event => this.renderEventCard(event)).join('')}
      </div>
    `).join('');
  }
  
  renderEventCard(event) {
    const startTime = new Date(event.startDate).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });
    const endTime = new Date(event.endDate).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });
    
    return `
      <div class="event-card mb-2 p-3 border rounded-3 hover-shadow cursor-pointer" 
           onclick="calendarManager.viewEvent('${event._id}')">
        <div class="d-flex justify-content-between align-items-start">
          <div class="flex-grow-1">
            <div class="d-flex align-items-center mb-1">
              <span class="badge bg-${this.getEventTypeColor(event.type)} me-2">${event.type}</span>
              ${event.aiGenerated ? '<span class="badge bg-info me-2"><i class="bi bi-robot"></i> AI</span>' : ''}
              <span class="badge bg-${this.getPriorityColor(event.priority)}">${event.priority}</span>
            </div>
            <h6 class="mb-1 fw-bold">${event.title}</h6>
            <p class="mb-1 text-muted small">${startTime} - ${endTime}</p>
            ${event.location ? `<p class="mb-1 text-muted small"><i class="bi bi-geo-alt"></i> ${event.location}</p>` : ''}
            ${event.attendees && event.attendees.length > 0 ? 
              `<p class="mb-0 text-muted small"><i class="bi bi-people"></i> ${event.attendees.length} attendees</p>` : ''}
          </div>
          <div class="dropdown">
            <button class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
              <i class="bi bi-three-dots"></i>
            </button>
            <ul class="dropdown-menu">
              <li><a class="dropdown-item" href="#" onclick="calendarManager.editEvent('${event._id}')">
                <i class="bi bi-pencil"></i> Edit
              </a></li>
              <li><a class="dropdown-item" href="#" onclick="calendarManager.duplicateEvent('${event._id}')">
                <i class="bi bi-files"></i> Duplicate
              </a></li>
              <li><hr class="dropdown-divider"></li>
              <li><a class="dropdown-item text-danger" href="#" onclick="calendarManager.deleteEvent('${event._id}')">
                <i class="bi bi-trash"></i> Delete
              </a></li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }
  
  async renderUpcomingEvents() {
    try {
      const response = await fetch(`${this.apiBase}/calendar/events/upcoming?days=7`, {
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) return;
      
      const data = await response.json();
      const upcomingElement = document.getElementById('upcomingEvents');
      
      if (!upcomingElement) return;
      
      if (data.data.length === 0) {
        upcomingElement.innerHTML = '<p class="text-muted">No upcoming events</p>';
        return;
      }
      
      upcomingElement.innerHTML = data.data.slice(0, 5).map(event => `
        <div class="upcoming-event d-flex align-items-center mb-2 p-2 border-start border-primary border-3">
          <div class="flex-grow-1">
            <div class="fw-bold small">${event.title}</div>
            <div class="text-muted small">
              ${new Date(event.startDate).toLocaleDateString()} at 
              ${new Date(event.startDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </div>
          </div>
          <span class="badge bg-${this.getEventTypeColor(event.type)}">${event.type}</span>
        </div>
      `).join('');
      
    } catch (error) {
      console.error('Error loading upcoming events:', error);
    }
  }
  
  groupEventsByDate(events) {
    return events.reduce((groups, event) => {
      const date = new Date(event.startDate).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(event);
      return groups;
    }, {});
  }
  
  getEventTypeColor(type) {
    const colors = {
      meeting: 'primary',
      appointment: 'info',
      deadline: 'danger',
      reminder: 'warning',
      task: 'secondary',
      personal: 'success',
      business: 'primary',
      training: 'info',
      demo: 'warning',
      call: 'success'
    };
    return colors[type] || 'secondary';
  }
  
  getPriorityColor(priority) {
    const colors = {
      low: 'secondary',
      medium: 'info',
      high: 'warning',
      urgent: 'danger'
    };
    return colors[priority] || 'secondary';
  }
  
  navigateMonth(direction) {
    this.currentDate.setMonth(this.currentDate.getMonth() + direction);
    this.loadEvents();
    this.renderCalendar();
  }
  
  goToToday() {
    this.currentDate = new Date();
    this.loadEvents();
    this.renderCalendar();
  }
  
  changeView(view) {
    this.currentView = view;
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${view}View`)?.classList.add('active');
    this.renderCalendar();
  }
  
  showQuickCreateModal() {
    const modal = new bootstrap.Modal(document.getElementById('quickCreateEventModal'));
    modal.show();
  }
  
  showAICreateModal() {
    const modal = new bootstrap.Modal(document.getElementById('aiCreateEventModal'));
    modal.show();
  }
  
  showSmartScheduleModal() {
    const modal = new bootstrap.Modal(document.getElementById('smartScheduleModal'));
    modal.show();
  }
  
  handleCalendarConflict(conflicts, eventData) {
    const conflictHtml = conflicts.map(conflict => `
      <div class="alert alert-warning">
        <strong>${conflict.title}</strong><br>
        ${new Date(conflict.startDate).toLocaleString()} - ${new Date(conflict.endDate).toLocaleString()}
      </div>
    `).join('');
    
    const proceed = confirm(`Calendar conflicts detected:\n\n${conflicts.map(c => c.title).join(', ')}\n\nProceed anyway?`);
    
    if (proceed) {
      return this.createEvent({ ...eventData, ignoreConflicts: true });
    }
  }
  
  showSmartScheduleSuggestions(suggestions) {
    console.log('Smart scheduling suggestions:', suggestions);
    // Implementation for showing scheduling suggestions
  }
  
  showEmailEventSuggestions(suggestions) {
    console.log('Email event suggestions:', suggestions);
    // Implementation for showing email-based event suggestions
  }
  
  async viewEvent(eventId) {
    // Implementation for viewing event details
    console.log('Viewing event:', eventId);
  }
  
  async editEvent(eventId) {
    // Implementation for editing event
    console.log('Editing event:', eventId);
  }
  
  async duplicateEvent(eventId) {
    // Implementation for duplicating event
    console.log('Duplicating event:', eventId);
  }
  
  async deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
      const response = await fetch(`${this.apiBase}/calendar/events/${eventId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to delete event');
      
      this.showNotification('Event deleted successfully', 'success');
      await this.loadEvents();
      this.renderCalendar();
      
    } catch (error) {
      console.error('Error deleting event:', error);
      this.showNotification('Failed to delete event', 'error');
    }
  }
  
  applyFilters() {
    // Implementation for applying event filters
    console.log('Applying filters');
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
  window.calendarManager = new VBMSCalendarManager();
});

// Global functions for inline onclick handlers
window.createQuickEvent = () => window.calendarManager?.showQuickCreateModal();
window.createAIEvent = () => window.calendarManager?.showAICreateModal();
window.requestSmartSchedule = () => window.calendarManager?.showSmartScheduleModal();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VBMSCalendarManager;
}