/**
 * VBMS Settings Functions
 * Implements advanced settings and system management functions
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

// Show toast notifications (reuse from dashboard-functions if available)
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
// DATABASE BACKUP FUNCTIONS
// =============================================================================

async function createBackup() {
    try {
        showToast('Creating database backup...', 'info');
        
        const response = await fetch(`${API_BASE}/api/admin/backup/create`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            showToast('Database backup created successfully', 'success');
            
            // If backup file is available for download
            if (data.downloadUrl) {
                const a = document.createElement('a');
                a.href = data.downloadUrl;
                a.download = `vbms-backup-${new Date().toISOString().split('T')[0]}.sql`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create backup');
        }
    } catch (error) {
        console.error('Error creating backup:', error);
        showToast('Failed to create database backup', 'error');
    }
}

async function scheduleBackup() {
    try {
        // Create modal for backup scheduling
        let modal = document.getElementById('scheduleBackupModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'scheduleBackupModal';
            modal.className = 'modal fade';
            modal.innerHTML = `
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Schedule Automatic Backups</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="scheduleBackupForm">
                                <div class="mb-3">
                                    <label class="form-label">Backup Frequency</label>
                                    <select class="form-control" id="backupFrequency" required>
                                        <option value="">Select frequency...</option>
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Backup Time</label>
                                    <input type="time" class="form-control" id="backupTime" value="02:00" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Retention Period (days)</label>
                                    <input type="number" class="form-control" id="retentionPeriod" value="30" min="1" max="365" required>
                                </div>
                                <div class="mb-3">
                                    <div class="form-check">
                                        <input type="checkbox" class="form-check-input" id="emailNotification">
                                        <label class="form-check-label" for="emailNotification">
                                            Email notification on backup completion
                                        </label>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="saveBackupSchedule()">Schedule Backups</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        // Load current schedule if exists
        try {
            const response = await fetch(`${API_BASE}/api/admin/backup/schedule`, {
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                const schedule = await response.json();
                if (schedule.frequency) {
                    document.getElementById('backupFrequency').value = schedule.frequency;
                    document.getElementById('backupTime').value = schedule.time || '02:00';
                    document.getElementById('retentionPeriod').value = schedule.retention || 30;
                    document.getElementById('emailNotification').checked = schedule.emailNotification || false;
                }
            }
        } catch (error) {
            console.log('No existing backup schedule found');
        }
        
        // Show modal
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
    } catch (error) {
        console.error('Error opening backup schedule:', error);
        showToast('Failed to open backup scheduler', 'error');
    }
}

async function saveBackupSchedule() {
    try {
        const scheduleData = {
            frequency: document.getElementById('backupFrequency').value,
            time: document.getElementById('backupTime').value,
            retention: parseInt(document.getElementById('retentionPeriod').value),
            emailNotification: document.getElementById('emailNotification').checked
        };
        
        const response = await fetch(`${API_BASE}/api/admin/backup/schedule`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(scheduleData)
        });
        
        if (response.ok) {
            showToast('Backup schedule saved successfully', 'success');
            bootstrap.Modal.getInstance(document.getElementById('scheduleBackupModal')).hide();
        } else {
            throw new Error('Failed to save backup schedule');
        }
    } catch (error) {
        console.error('Error saving backup schedule:', error);
        showToast('Failed to save backup schedule', 'error');
    }
}

// =============================================================================
// SYSTEM LOGS FUNCTIONS
// =============================================================================

async function viewLogs() {
    try {
        // Create modal for viewing logs
        let modal = document.getElementById('viewLogsModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'viewLogsModal';
            modal.className = 'modal fade';
            modal.innerHTML = `
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">System Logs</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-3">
                                <div class="col-md-4">
                                    <select class="form-control" id="logLevel">
                                        <option value="">All Levels</option>
                                        <option value="error">Error</option>
                                        <option value="warn">Warning</option>
                                        <option value="info">Info</option>
                                        <option value="debug">Debug</option>
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <input type="date" class="form-control" id="logDate" value="${new Date().toISOString().split('T')[0]}">
                                </div>
                                <div class="col-md-4">
                                    <button class="btn btn-primary" onclick="loadLogs()">Refresh</button>
                                    <button class="btn btn-secondary" onclick="downloadLogs()">Download</button>
                                </div>
                            </div>
                            <div id="logsContainer" style="height: 400px; overflow-y: auto; background: #f8f9fa; padding: 15px; border-radius: 5px;">
                                <div class="text-center">
                                    <div class="spinner-border" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        // Show modal and load logs
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
        // Load logs after modal is shown
        setTimeout(loadLogs, 500);
        
    } catch (error) {
        console.error('Error opening logs viewer:', error);
        showToast('Failed to open logs viewer', 'error');
    }
}

async function loadLogs() {
    try {
        const level = document.getElementById('logLevel').value;
        const date = document.getElementById('logDate').value;
        
        const params = new URLSearchParams();
        if (level) params.append('level', level);
        if (date) params.append('date', date);
        
        const response = await fetch(`${API_BASE}/api/admin/logs?${params.toString()}`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const logs = await response.json();
            displayLogs(logs);
        } else {
            throw new Error('Failed to load logs');
        }
    } catch (error) {
        console.error('Error loading logs:', error);
        document.getElementById('logsContainer').innerHTML = `
            <div class="text-danger">
                <i class="bi bi-exclamation-triangle"></i>
                Failed to load logs: ${error.message}
            </div>
        `;
    }
}

function displayLogs(logs) {
    const container = document.getElementById('logsContainer');
    
    if (!logs || logs.length === 0) {
        container.innerHTML = '<div class="text-muted">No logs found for the selected criteria.</div>';
        return;
    }
    
    container.innerHTML = logs.map(log => {
        const levelClass = {
            error: 'text-danger',
            warn: 'text-warning',
            info: 'text-info',
            debug: 'text-muted'
        }[log.level] || 'text-dark';
        
        return `
            <div class="log-entry mb-2 p-2 border-bottom">
                <div class="d-flex justify-content-between">
                    <span class="${levelClass} fw-bold">[${log.level.toUpperCase()}]</span>
                    <small class="text-muted">${new Date(log.timestamp).toLocaleString()}</small>
                </div>
                <div class="mt-1">${log.message}</div>
                ${log.stack ? `<pre class="mt-2 text-muted small">${log.stack}</pre>` : ''}
            </div>
        `;
    }).join('');
}

async function downloadLogs() {
    try {
        const level = document.getElementById('logLevel').value;
        const date = document.getElementById('logDate').value;
        
        const params = new URLSearchParams();
        if (level) params.append('level', level);
        if (date) params.append('date', date);
        params.append('format', 'file');
        
        const response = await fetch(`${API_BASE}/api/admin/logs?${params.toString()}`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `vbms-logs-${date || 'all'}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            showToast('Logs downloaded successfully', 'success');
        } else {
            throw new Error('Failed to download logs');
        }
    } catch (error) {
        console.error('Error downloading logs:', error);
        showToast('Failed to download logs', 'error');
    }
}

async function clearLogs() {
    try {
        const confirmed = confirm('Are you sure you want to clear all system logs? This action cannot be undone.');
        
        if (!confirmed) {
            return;
        }
        
        const response = await fetch(`${API_BASE}/api/admin/logs`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            showToast('System logs cleared successfully', 'success');
            // Refresh logs view if modal is open
            if (document.getElementById('viewLogsModal').classList.contains('show')) {
                loadLogs();
            }
        } else {
            throw new Error('Failed to clear logs');
        }
    } catch (error) {
        console.error('Error clearing logs:', error);
        showToast('Failed to clear system logs', 'error');
    }
}

// =============================================================================
// SYSTEM DIAGNOSTICS FUNCTIONS
// =============================================================================

async function runDiagnostics() {
    try {
        // Create modal for diagnostics
        let modal = document.getElementById('diagnosticsModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'diagnosticsModal';
            modal.className = 'modal fade';
            modal.innerHTML = `
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">System Diagnostics</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div id="diagnosticsContainer">
                                <div class="text-center">
                                    <div class="spinner-border" role="status">
                                        <span class="visually-hidden">Running diagnostics...</span>
                                    </div>
                                    <div class="mt-2">Running system diagnostics...</div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary" onclick="runDiagnosticsCheck()">Run Again</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        // Show modal
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
        // Run diagnostics
        setTimeout(runDiagnosticsCheck, 500);
        
    } catch (error) {
        console.error('Error running diagnostics:', error);
        showToast('Failed to run system diagnostics', 'error');
    }
}

async function runDiagnosticsCheck() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/diagnostics`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const diagnostics = await response.json();
            displayDiagnostics(diagnostics);
        } else {
            throw new Error('Failed to run diagnostics');
        }
    } catch (error) {
        console.error('Error running diagnostics check:', error);
        document.getElementById('diagnosticsContainer').innerHTML = `
            <div class="text-danger">
                <i class="bi bi-exclamation-triangle"></i>
                Failed to run diagnostics: ${error.message}
            </div>
        `;
    }
}

function displayDiagnostics(diagnostics) {
    const container = document.getElementById('diagnosticsContainer');
    
    container.innerHTML = `
        <div class="diagnostics-results">
            <div class="row">
                <div class="col-md-6">
                    <h6>System Health</h6>
                    <div class="diagnostic-item">
                        <span class="diagnostic-label">Database Connection:</span>
                        <span class="badge bg-${diagnostics.database ? 'success' : 'danger'}">
                            ${diagnostics.database ? 'Connected' : 'Failed'}
                        </span>
                    </div>
                    <div class="diagnostic-item">
                        <span class="diagnostic-label">API Response:</span>
                        <span class="badge bg-${diagnostics.api ? 'success' : 'danger'}">
                            ${diagnostics.api ? 'Healthy' : 'Issues'}
                        </span>
                    </div>
                    <div class="diagnostic-item">
                        <span class="diagnostic-label">Memory Usage:</span>
                        <span class="badge bg-${diagnostics.memory?.percentage < 80 ? 'success' : 'warning'}">
                            ${diagnostics.memory?.percentage || 'N/A'}%
                        </span>
                    </div>
                </div>
                <div class="col-md-6">
                    <h6>Performance Metrics</h6>
                    <div class="diagnostic-item">
                        <span class="diagnostic-label">Response Time:</span>
                        <span class="badge bg-${diagnostics.responseTime < 500 ? 'success' : 'warning'}">
                            ${diagnostics.responseTime || 'N/A'}ms
                        </span>
                    </div>
                    <div class="diagnostic-item">
                        <span class="diagnostic-label">Active Connections:</span>
                        <span class="badge bg-info">
                            ${diagnostics.connections || 'N/A'}
                        </span>
                    </div>
                    <div class="diagnostic-item">
                        <span class="diagnostic-label">Disk Space:</span>
                        <span class="badge bg-${diagnostics.disk?.percentage < 80 ? 'success' : 'warning'}">
                            ${diagnostics.disk?.percentage || 'N/A'}%
                        </span>
                    </div>
                </div>
            </div>
            
            ${diagnostics.issues && diagnostics.issues.length > 0 ? `
                <div class="mt-4">
                    <h6 class="text-warning">Issues Found</h6>
                    <div class="alert alert-warning">
                        <ul class="mb-0">
                            ${diagnostics.issues.map(issue => `<li>${issue}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            ` : `
                <div class="mt-4">
                    <div class="alert alert-success">
                        <i class="bi bi-check-circle"></i>
                        All systems are running normally
                    </div>
                </div>
            `}
            
            <div class="mt-3">
                <small class="text-muted">
                    Last checked: ${new Date().toLocaleString()}
                </small>
            </div>
        </div>
    `;
}

// =============================================================================
// DANGEROUS ACTIONS
// =============================================================================

async function resetAllSettings() {
    try {
        const confirmed = confirm(
            'WARNING: This will reset ALL system settings to default values. ' +
            'This action cannot be undone. Are you absolutely sure?'
        );
        
        if (!confirmed) {
            return;
        }
        
        const doubleConfirm = prompt(
            'Type "RESET ALL SETTINGS" to confirm this dangerous action:'
        );
        
        if (doubleConfirm !== 'RESET ALL SETTINGS') {
            showToast('Settings reset cancelled', 'info');
            return;
        }
        
        showToast('Resetting all settings...', 'info');
        
        const response = await fetch(`${API_BASE}/api/admin/settings/reset`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            showToast('All settings have been reset to defaults', 'success');
            
            // Reload page after 2 seconds
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } else {
            throw new Error('Failed to reset settings');
        }
    } catch (error) {
        console.error('Error resetting settings:', error);
        showToast('Failed to reset settings', 'error');
    }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

// Initialize settings functions when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add CSS for diagnostics if not already present
    if (!document.getElementById('diagnosticsStyles')) {
        const style = document.createElement('style');
        style.id = 'diagnosticsStyles';
        style.textContent = `
            .diagnostic-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid rgba(0,0,0,0.1);
            }
            .diagnostic-item:last-child {
                border-bottom: none;
            }
            .diagnostic-label {
                font-weight: 500;
            }
            .log-entry {
                font-family: 'Courier New', monospace;
                font-size: 0.9em;
            }
        `;
        document.head.appendChild(style);
    }
    
    console.log('Settings functions initialized');
});

// Export functions for global access
window.createBackup = createBackup;
window.scheduleBackup = scheduleBackup;
window.viewLogs = viewLogs;
window.clearLogs = clearLogs;
window.runDiagnostics = runDiagnostics;
window.resetAllSettings = resetAllSettings;
