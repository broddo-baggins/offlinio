/**
 * Offlinio Mobile JavaScript
 * 
 * Progressive Web App functionality including:
 * - Service Worker registration
 * - Mobile-optimized UI interactions
 * - Real-time download progress
 * - Offline capability
 * - Push notifications
 */

class OfflinioMobile {
  constructor() {
    this.downloads = [];
    this.stats = {};
    this.isOnline = navigator.onLine;
    this.eventSource = null;
    this.updateInterval = null;
    
    this.init();
  }

  async init() {
    await this.registerServiceWorker();
    this.setupEventListeners();
    this.setupPullToRefresh();
    this.loadInitialData();
    this.startProgressUpdates();
    this.setupOfflineHandling();
  }

  // Service Worker registration for PWA functionality
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/ui/sw.js');
        console.log('SW registered successfully:', registration.scope);
        
        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.showUpdateAvailable(newWorker);
              }
            });
          }
        });

        // Request notification permission
        await this.requestNotificationPermission();
        
      } catch (error) {
        console.error('SW registration failed:', error);
      }
    }
  }

  // Request notification permission for download updates
  async requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        this.showToast('Notifications enabled for download updates', 'success');
      }
    }
  }

  // Setup mobile-optimized event listeners
  setupEventListeners() {
    // Pull-to-refresh
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });

    // Online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.showToast('Connection restored', 'success');
      this.loadInitialData();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.showToast('You are offline', 'error');
    });

    // Visibility change for background updates
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.refreshData();
      }
    });
  }

  // Pull-to-refresh functionality
  setupPullToRefresh() {
    this.touchStartY = 0;
    this.touchCurrentY = 0;
    this.refreshTriggered = false;
  }

  handleTouchStart(e) {
    if (window.scrollY === 0) {
      this.touchStartY = e.touches[0].clientY;
    }
  }

  handleTouchMove(e) {
    if (window.scrollY === 0 && this.touchStartY > 0) {
      this.touchCurrentY = e.touches[0].clientY;
      const pullDistance = this.touchCurrentY - this.touchStartY;
      
      if (pullDistance > 100 && !this.refreshTriggered) {
        this.refreshTriggered = true;
        this.showRefreshIndicator();
        e.preventDefault(); // Prevent bounce
      }
    }
  }

  handleTouchEnd(e) {
    if (this.refreshTriggered) {
      this.triggerRefresh();
      this.refreshTriggered = false;
    }
    this.hideRefreshIndicator();
    this.touchStartY = 0;
  }

  showRefreshIndicator() {
    const indicator = document.querySelector('.mobile-refresh-indicator');
    if (indicator) {
      indicator.classList.add('show');
      indicator.textContent = '↓ Release to refresh';
    }
  }

  hideRefreshIndicator() {
    const indicator = document.querySelector('.mobile-refresh-indicator');
    if (indicator) {
      indicator.classList.remove('show');
    }
  }

  async triggerRefresh() {
    this.showToast('Refreshing...', 'info');
    await this.loadInitialData();
  }

  // Load initial data
  async loadInitialData() {
    try {
      this.showLoading(true);
      
      const [downloadsResponse, statsResponse] = await Promise.all([
        this.fetchWithFallback('/mobile/downloads?limit=50&fields=compact'),
        this.fetchWithFallback('/api/downloads/stats/storage')
      ]);

      if (downloadsResponse.ok) {
        const data = await downloadsResponse.json();
        this.downloads = data.items || [];
        this.updateDownloadsList();
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        this.stats = statsData;
        this.updateStats();
      }

    } catch (error) {
      console.error('Failed to load initial data:', error);
      this.showToast('Failed to load data', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  // Network request with offline fallback
  async fetchWithFallback(url, options = {}) {
    if (!this.isOnline) {
      // Try to get from cache via service worker
      return fetch(url, { ...options, cache: 'force-cache' });
    }
    
    try {
      return await fetch(url, options);
    } catch (error) {
      // Fallback to cache if network fails
      return fetch(url, { ...options, cache: 'force-cache' });
    }
  }

  // Start real-time progress updates
  startProgressUpdates() {
    // Use Server-Sent Events for real-time updates
    const activeDownloads = this.downloads.filter(d => 
      ['downloading', 'queued', 'processing'].includes(d.status)
    );

    if (activeDownloads.length > 0 && this.isOnline) {
      this.startEventSource();
    } else {
      // Fallback to polling
      this.startPolling();
    }
  }

  startEventSource() {
    if (this.eventSource) {
      this.eventSource.close();
    }

    // For simplicity, we'll poll for updates since SSE requires individual streams per download
    this.startPolling();
  }

  startPolling() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(async () => {
      if (document.visibilityState === 'visible') {
        await this.updateProgress();
      }
    }, 3000); // Update every 3 seconds
  }

  async updateProgress() {
    try {
      const response = await this.fetchWithFallback('/mobile/downloads?limit=50&fields=compact');
      if (response.ok) {
        const data = await response.json();
        this.downloads = data.items || [];
        this.updateDownloadsList();
      }
    } catch (error) {
      console.error('Progress update failed:', error);
    }
  }

  // Update downloads list UI
  updateDownloadsList() {
    const container = document.getElementById('mobileDownloadsList');
    if (!container) return;

    if (this.downloads.length === 0) {
      container.innerHTML = `
        <div class="mobile-empty">
          <div class="mobile-empty-icon">📥</div>
          <h3>No Downloads Yet</h3>
          <p>Add the Offlinio addon to Stremio to start downloading content for offline viewing.</p>
          <a href="/manifest.json" class="mobile-btn" style="margin-top: 16px;">
            📺 Add to Stremio
          </a>
        </div>
      `;
      return;
    }

    container.innerHTML = this.downloads.map(download => this.renderDownloadItem(download)).join('');
    this.attachDownloadEventListeners();
  }

  // Render individual download item
  renderDownloadItem(download) {
    const progress = download.progress || 0;
    const status = download.status || 'queued';
    const subtitle = download.subtitle || '';
    const fileSize = this.formatFileSize(download.fileSize);
    
    const speedText = download.download?.speed ? 
      `${this.formatSpeed(download.download.speed)}` : '';
    const etaText = download.download?.eta ? 
      `ETA: ${this.formatETA(download.download.eta)}` : '';

    return `
      <div class="mobile-download-item" data-content-id="${download.id}">
        <div class="mobile-download-content">
          <div class="mobile-download-header">
            <div class="mobile-download-info">
              <div class="mobile-download-title">${this.escapeHtml(download.title)}</div>
              ${subtitle ? `<div class="mobile-download-subtitle">${this.escapeHtml(subtitle)}</div>` : ''}
              <div class="mobile-download-meta">
                ${fileSize ? `${fileSize}` : ''}
                ${fileSize && speedText ? ' • ' : ''}
                ${speedText}
                ${etaText ? ` • ${etaText}` : ''}
              </div>
            </div>
            <div class="mobile-status mobile-status-${status}">
              ${status}
            </div>
          </div>
          
          ${progress > 0 ? `
            <div class="mobile-progress">
              <div class="mobile-progress-bar" style="width: ${progress}%"></div>
            </div>
            <div class="mobile-progress-text">
              <span>${progress}%</span>
              <span>${this.formatDate(download.updatedAt)}</span>
            </div>
          ` : ''}
          
          <div class="mobile-download-actions">
            ${this.renderDownloadActions(download)}
          </div>
        </div>
      </div>
    `;
  }

  // Render download action buttons
  renderDownloadActions(download) {
    const actions = [];
    
    if (download.status === 'completed' && download.playUrl) {
      actions.push(`
        <button class="mobile-btn mobile-btn-small" onclick="offlinio.playFile('${download.id}')">
          ▶ Play
        </button>
      `);
    }
    
    if (download.actions?.canPause) {
      actions.push(`
        <button class="mobile-btn mobile-btn-small mobile-btn-secondary" onclick="offlinio.pauseDownload('${download.id}')">
          ⏸ Pause
        </button>
      `);
    }
    
    if (download.actions?.canResume) {
      actions.push(`
        <button class="mobile-btn mobile-btn-small" onclick="offlinio.resumeDownload('${download.id}')">
          ▶ Resume
        </button>
      `);
    }
    
    if (download.actions?.canRetry) {
      actions.push(`
        <button class="mobile-btn mobile-btn-small" onclick="offlinio.retryDownload('${download.id}')">
          🔄 Retry
        </button>
      `);
    }
    
    if (download.actions?.canDelete) {
      actions.push(`
        <button class="mobile-btn mobile-btn-small mobile-btn-danger" onclick="offlinio.deleteDownload('${download.id}', '${this.escapeHtml(download.title)}')">
          🗑 Delete
        </button>
      `);
    }
    
    return actions.join('');
  }

  // Update statistics display
  updateStats() {
    const elements = {
      movies: document.getElementById('statMovies'),
      series: document.getElementById('statSeries'),  
      size: document.getElementById('statSize'),
      active: document.getElementById('statActive')
    };

    if (elements.movies) elements.movies.textContent = this.stats.movies || 0;
    if (elements.series) elements.series.textContent = this.stats.series || 0;
    if (elements.size) elements.size.textContent = `${this.stats.totalSizeGB || 0} GB`;
    if (elements.active) elements.active.textContent = this.stats.active || 0;
  }

  // Download management actions
  async pauseDownload(contentId) {
    await this.updateDownloadStatus(contentId, 'pause');
  }

  async resumeDownload(contentId) {
    await this.updateDownloadStatus(contentId, 'resume');
  }

  async retryDownload(contentId) {
    await this.updateDownloadStatus(contentId, 'retry');
  }

  async updateDownloadStatus(contentId, action) {
    try {
      const response = await fetch(`/mobile/downloads/${contentId}/${action}`, {
        method: 'PATCH'
      });

      if (response.ok) {
        this.showToast(`Download ${action}d`, 'success');
        await this.updateProgress();
      } else {
        throw new Error(`Failed to ${action} download`);
      }
    } catch (error) {
      console.error(`Download ${action} failed:`, error);
      this.showToast(`Failed to ${action} download`, 'error');
    }
  }

  async deleteDownload(contentId, title) {
    if (!confirm(`Delete "${title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/downloads/${contentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        this.showToast('Download deleted', 'success');
        this.downloads = this.downloads.filter(d => d.id !== contentId);
        this.updateDownloadsList();
      } else {
        throw new Error('Failed to delete download');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      this.showToast('Failed to delete download', 'error');
    }
  }

  // Play file in default video player
  playFile(contentId) {
    const download = this.downloads.find(d => d.id === contentId);
    if (download && download.playUrl) {
      // Try to open in external video player
      if (navigator.userAgent.match(/Android/i)) {
        // Android intent for video player
        window.location.href = `intent:${download.playUrl}#Intent;type=video/*;action=android.intent.action.VIEW;end`;
      } else {
        // Fallback to direct link
        window.open(download.playUrl, '_blank');
      }
    }
  }

  // Attach event listeners to download items
  attachDownloadEventListeners() {
    // Already handled via onclick attributes for simplicity
    // In production, consider using event delegation
  }

  // Offline handling
  setupOfflineHandling() {
    // Cache critical resources when online
    if (this.isOnline && 'serviceWorker' in navigator && 'caches' in window) {
      this.cacheEssentialResources();
    }
  }

  async cacheEssentialResources() {
    try {
      const cache = await caches.open('offlinio-v1.0.0');
      await cache.addAll([
        '/ui/',
        '/ui/mobile.css',
        '/ui/mobile.js'
      ]);
    } catch (error) {
      console.error('Failed to cache resources:', error);
    }
  }

  // Show update available notification
  showUpdateAvailable(newWorker) {
    const updateToast = document.createElement('div');
    updateToast.className = 'mobile-toast mobile-toast-success show';
    updateToast.innerHTML = `
      App update available! 
      <button onclick="offlinio.activateUpdate('${newWorker.scriptURL}')" style="margin-left: 8px;">Update</button>
    `;
    document.body.appendChild(updateToast);
    
    setTimeout(() => {
      updateToast.remove();
    }, 10000);
  }

  activateUpdate() {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }

  // Utility functions
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `mobile-toast mobile-toast-${type} show`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  showLoading(show) {
    const loader = document.querySelector('.mobile-loading');
    if (loader) {
      loader.style.display = show ? 'flex' : 'none';
    }
  }

  formatFileSize(bytes) {
    if (!bytes) return '';
    const gb = bytes / (1024 * 1024 * 1024);
    const mb = bytes / (1024 * 1024);
    
    if (gb >= 1) {
      return `${gb.toFixed(1)} GB`;
    } else if (mb >= 1) {
      return `${mb.toFixed(0)} MB`;
    } else {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
  }

  formatSpeed(bytesPerSecond) {
    if (!bytesPerSecond) return '';
    const mbps = bytesPerSecond / (1024 * 1024);
    return `${mbps.toFixed(1)} MB/s`;
  }

  formatETA(seconds) {
    if (!seconds) return '';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  }

  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async refreshData() {
    await this.loadInitialData();
  }
}

// Initialize mobile app when DOM is ready
let offlinio;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    offlinio = new OfflinioMobile();
  });
} else {
  offlinio = new OfflinioMobile();
}

// Export for global access
window.offlinio = offlinio;
