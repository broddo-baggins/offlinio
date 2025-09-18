/**
 * Offlinio Web UI
 * 
 * Client-side JavaScript for the Offlinio management interface
 */

// Global state
let downloads = [];
let legalAccepted = false;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    checkLegalStatus();
});

/**
 * Check legal notice acceptance status
 */
async function checkLegalStatus() {
    try {
        const response = await fetch('/api/legal/status');
        const data = await response.json();
        
        if (data.allowed) {
            legalAccepted = true;
            showMainContent();
            loadInitialData();
        } else {
            showLegalNotice();
        }
    } catch (error) {
        console.error('Failed to check legal status:', error);
        showLegalNotice(); // Show legal notice on error to be safe
    }
}

/**
 * Show legal notice
 */
function showLegalNotice() {
    document.getElementById('legalNotice').style.display = 'block';
    document.getElementById('mainContent').style.display = 'none';
}

/**
 * Show main content
 */
function showMainContent() {
    document.getElementById('legalNotice').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
}

/**
 * Accept legal notice
 */
async function acceptLegalNotice() {
    try {
        const response = await fetch('/api/legal/accept', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ accepted: true })
        });

        const data = await response.json();
        
        if (data.success) {
            legalAccepted = true;
            showMainContent();
            loadInitialData();
        } else {
            alert('Failed to accept legal notice. Please try again.');
        }
    } catch (error) {
        console.error('Failed to accept legal notice:', error);
        alert('Failed to accept legal notice. Please try again.');
    }
}

/**
 * Load initial data
 */
async function loadInitialData() {
    await Promise.all([
        loadDownloads(),
        loadStats()
    ]);
}

/**
 * Load downloads list
 */
async function loadDownloads() {
    try {
        showLoading('downloadsList');
        
        const response = await fetch('/api/downloads');
        const data = await response.json();
        
        downloads = data.items || [];
        renderDownloads();
    } catch (error) {
        console.error('Failed to load downloads:', error);
        showError('downloadsList', 'Failed to load downloads');
    }
}

/**
 * Load statistics
 */
async function loadStats() {
    try {
        const [downloadsResponse, storageResponse] = await Promise.all([
            fetch('/api/downloads'),
            fetch('/api/downloads/stats/storage')
        ]);

        const downloadsData = await downloadsResponse.json();
        const storageData = await storageResponse.json();

        // Update statistics
        const movies = downloadsData.items.filter(item => item.type === 'movie' && item.status === 'completed').length;
        const series = downloadsData.items.filter(item => item.type === 'series' && item.status === 'completed').length;
        const activeDownloads = downloadsData.items.filter(item => item.status === 'downloading').length;
        const totalSizeGB = (storageData.totalSizeBytes / (1024 * 1024 * 1024)).toFixed(1);

        document.getElementById('statMovies').textContent = movies;
        document.getElementById('statSeries').textContent = series;
        document.getElementById('statSize').textContent = totalSizeGB + ' GB';
        document.getElementById('statActive').textContent = activeDownloads;
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

/**
 * Render downloads list
 */
function renderDownloads() {
    const container = document.getElementById('downloadsList');
    
    if (downloads.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No downloads yet</h3>
                <p>Find content in Stremio and click the "Download for Offline" button</p>
                <a href="/manifest.json" class="btn" style="margin-top: 20px;">Add Offlinio to Stremio</a>
            </div>
        `;
        return;
    }

    const html = downloads.map(download => {
        const progress = download.progress || 0;
        const statusClass = `status-${download.status}`;
        const title = download.type === 'series' ? 
            `${download.title} S${String(download.season || 1).padStart(2, '0')}E${String(download.episode || 1).padStart(2, '0')}` :
            `${download.title}${download.year ? ` (${download.year})` : ''}`;

        let meta = `${download.type} • ${download.quality || 'Unknown quality'}`;
        if (download.fileSize) {
            const sizeGB = (download.fileSize / (1024 * 1024 * 1024)).toFixed(1);
            meta += ` • ${sizeGB} GB`;
        }

        return `
            <div class="download-item">
                <div class="download-info">
                    <div class="download-title">${escapeHtml(title)}</div>
                    <div class="download-meta">${meta}</div>
                </div>
                <div class="download-progress">
                    <div class="download-progress-bar" style="width: ${progress}%"></div>
                </div>
                <div class="download-status ${statusClass}">${download.status}</div>
                <div style="margin-left: 15px;">
                    ${download.status === 'downloading' ? 
                        `<button class="btn btn-secondary" onclick="pauseDownload('${download.id}')">⏸️</button>` :
                        download.status === 'paused' ?
                        `<button class="btn btn-secondary" onclick="resumeDownload('${download.id}')">▶️</button>` :
                        ''
                    }
                    <button class="btn btn-danger" onclick="deleteDownload('${download.id}')" style="margin-left: 5px;">🗑️</button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

/**
 * Refresh downloads
 */
async function refreshDownloads() {
    await loadInitialData();
}

/**
 * Pause download
 */
async function pauseDownload(contentId) {
    try {
        const response = await fetch(`/api/downloads/${contentId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'paused' })
        });

        if (response.ok) {
            await loadDownloads();
        } else {
            alert('Failed to pause download');
        }
    } catch (error) {
        console.error('Failed to pause download:', error);
        alert('Failed to pause download');
    }
}

/**
 * Resume download
 */
async function resumeDownload(contentId) {
    try {
        const response = await fetch(`/api/downloads/${contentId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'downloading' })
        });

        if (response.ok) {
            await loadDownloads();
        } else {
            alert('Failed to resume download');
        }
    } catch (error) {
        console.error('Failed to resume download:', error);
        alert('Failed to resume download');
    }
}

/**
 * Delete download
 */
async function deleteDownload(contentId) {
    if (!confirm('Are you sure you want to delete this download? This will also delete the downloaded file.')) {
        return;
    }

    try {
        const response = await fetch(`/api/downloads/${contentId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            await loadInitialData();
        } else {
            alert('Failed to delete download');
        }
    } catch (error) {
        console.error('Failed to delete download:', error);
        alert('Failed to delete download');
    }
}

/**
 * Show loading state
 */
function showLoading(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="loading show">
            <div class="spinner"></div>
            Loading...
        </div>
    `;
}

/**
 * Show error state
 */
function showError(containerId, message) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="empty-state">
            <h3>⚠️ Error</h3>
            <p>${escapeHtml(message)}</p>
            <button class="btn" onclick="loadInitialData()" style="margin-top: 20px;">🔄 Retry</button>
        </div>
    `;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

/**
 * Auto-refresh downloads every 30 seconds
 */
setInterval(() => {
    if (legalAccepted) {
        loadDownloads();
    }
}, 30000);

/**
 * Auto-refresh stats every 60 seconds
 */
setInterval(() => {
    if (legalAccepted) {
        loadStats();
    }
}, 60000);

/**
 * Open settings for storage path configuration
 */
function openSettings() {
    alert('Storage path settings:\n\nCurrent storage location will be shown here.\nYou can only configure the download path on supported devices.\n\nFeature coming soon!');
}
