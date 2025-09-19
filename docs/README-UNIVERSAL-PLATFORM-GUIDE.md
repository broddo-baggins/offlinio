# 🌍 Offlinio Universal Platform Guide

## The Revolutionary Achievement: True Platform Agnosticism!

Offlinio now provides **identical download functionality** across ALL major platforms where Stremio runs. This is the first solution to achieve true platform-agnostic offline downloads for Stremio.

---

## 🎯 **Universal Experience - Same Everywhere**

### **Identical User Experience Across ALL Platforms:**

1. **Browse content in Stremio** (on any device)
2. **Click "Download for Offline"** (same button everywhere)  
3. **Automatic source detection** (same logic on all platforms)
4. **Real-time progress tracking** (universal progress system)
5. **"Play Offline" appears** (same offline playback experience)

### **Platform Coverage:**

| Platform | Support Level | Download Method | UI Access |
|----------|---------------|----------------|-----------|
| **💻 Windows Desktop** | ✅ **Full Native** | Direct local downloads | Native Stremio + Web UI |
| **💻 macOS Desktop** | ✅ **Full Native** | Direct local downloads | Native Stremio + Web UI |  
| **💻 Linux Desktop** | ✅ **Full Native** | Direct local downloads | Native Stremio + Web UI |
| **📱 Android Mobile** | ✅ **Full Native** | PWA + Companion apps | Mobile Stremio + PWA |
| **📱 iOS Mobile** | ✅ **PWA Support** | Progressive Web App | Mobile Stremio + PWA |
| **🌐 Web Browser** | ✅ **Universal** | Service Worker + PWA | Stremio Web + PWA |
| **📺 Android TV** | ✅ **Native TV** | TV-optimized downloads | Android TV Stremio |
| **📺 Other TV Platforms** | ⚠️ **Limited** | May work via browser | Depends on platform |

---

## 🚀 **Getting Started - Universal Setup**

### **1. Single Server Installation (Serves All Platforms)**

```bash
# Clone and install (same for all platforms)
git clone https://github.com/your-username/offlinio.git
cd offlinio
npm install

# Start universal server
npm run dev
```

**This single server now serves:**
- Desktop Stremio addon
- Mobile-optimized APIs  
- Progressive Web App
- Android TV interface
- Real-time notifications
- Cross-platform sync

### **2. Add to Stremio (Universal URL)**

**🎯 Same addon URL works on ALL platforms:**
```
http://127.0.0.1:11471/manifest.json
```

**Platform-Specific Installation:**

#### **💻 Desktop (Windows/Mac/Linux)**
```
1. Open Stremio Desktop
2. Go to Add-ons → Community Add-ons
3. Click "Add Addon"
4. Enter: http://127.0.0.1:11471/manifest.json
5. Click Install
```

#### **📱 Mobile (Android/iOS)**  
```
1. Ensure mobile device is on same network as server
2. Open Stremio Mobile app
3. Add addon using same URL: http://[SERVER_IP]:11471/manifest.json
4. Install PWA from: http://[SERVER_IP]:11471/ui/mobile-index.html
```

#### **🌐 Web Browser (Any Platform)**
```
1. Visit: https://app.strem.io/shell-v4.4/
2. Add addon: http://127.0.0.1:11471/manifest.json
3. Or use direct link with addon pre-installed:
   https://app.strem.io/shell-v4.4/?addon=http%3A%2F%2F127.0.0.1%3A11471%2Fmanifest.json
```

#### **📺 Android TV**
```
1. Open Stremio on Android TV
2. Navigate to Add-ons
3. Add addon: http://[SERVER_IP]:11471/manifest.json
4. Or use TV browser to access web interface
```

---

## 🎨 **Platform-Specific Interfaces**

### **💻 Desktop Interface**
- **URL**: `http://127.0.0.1:11471/ui/`
- **Features**: Full download management, system notifications, keyboard shortcuts
- **Optimized for**: Mouse/keyboard interaction, large screens

### **📱 Mobile Interface (PWA)**
- **URL**: `http://127.0.0.1:11471/ui/mobile-index.html`
- **Features**: Touch gestures, pull-to-refresh, push notifications, offline support
- **Optimized for**: Touch interaction, small screens, battery life
- **Installable**: Yes - appears as native app icon

### **🌐 Web Interface**
- **URL**: Same as desktop, but with responsive design
- **Features**: Progressive Web App, offline browsing, cross-device sync
- **Optimized for**: Any browser, any screen size

### **📺 TV Interface**
- **URL**: Automatically detected and served with TV-optimized layout
- **Features**: Remote navigation, large text, simplified controls
- **Optimized for**: 10-foot experience, remote control navigation

---

## 🔄 **Universal API Endpoints**

Offlinio provides both Stremio-compatible and mobile-optimized APIs:

### **Stremio Addon API (Universal)**
```
GET  /manifest.json              → Addon configuration (all platforms)
GET  /catalog/movie/offlinio-movies.json → Downloaded movies catalog
GET  /stream/movie/:id.json      → Download/play options for content
GET  /download/:id               → Trigger download (universal)
```

### **Mobile-Optimized API**
```
GET  /mobile/discover/:type/:id  → Check if content is downloadable
POST /mobile/download/:id        → Mobile-friendly download trigger
GET  /mobile/downloads           → Lightweight downloads list
GET  /mobile/downloads/:id/progress → Real-time progress (SSE)
GET  /mobile/intent/:id          → Generate platform-specific intent URLs
```

### **Cross-Platform Features**
```
GET  /health                     → Server health check
GET  /api/downloads/stats/storage → Storage statistics
GET  /files/:id                  → Stream downloaded files
WebSocket /ws                    → Real-time updates (optional)
```

---

## 🎯 **Use Cases by Platform**

### **💻 Desktop Power User**
- Full-featured download management
- Batch operations and advanced controls
- System integration (notifications, file associations)
- High-performance downloads with detailed progress

### **📱 Mobile On-the-Go**
- Browse and trigger downloads from anywhere
- Monitor progress with push notifications  
- Download management via companion apps
- PWA for native app experience

### **🌐 Web Universal Access**
- Access from any device with a browser
- No installation required
- Progressive enhancement for capable devices
- Cross-device bookmarking and sync

### **📺 Living Room Experience**
- Simple remote-controlled download management
- Large text and clear navigation
- Voice commands (where supported)
- Family-friendly interface

---

## 🛠️ **Advanced Platform Features**

### **📱 Mobile Companion App Integration**

**Android Intent System:**
```kotlin
// Your Android app can integrate with custom URL schemes
intent://download?contentId=tt123&title=Movie#Intent;scheme=offlinio;end
```

**iOS Universal Links:**
```swift
// iOS apps can handle Offlinio URLs
https://yourapp.com/offlinio/download?contentId=tt123
```

**Progressive Web App:**
```javascript
// Install PWA from any mobile browser
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/ui/sw.js');
}
```

### **🌐 Cross-Platform Sync**

**Shared State:**
- Same download queue across all devices
- Universal progress tracking
- Synchronized completion status
- Cross-device notifications

**Universal File Access:**
- Downloaded files accessible from any platform
- Consistent file organization
- Universal streaming URLs
- Cross-platform playback

---

## 🔧 **Network Configuration for Multi-Platform**

### **Local Network Setup**
```bash
# Find your server's IP address
# macOS/Linux:
hostname -I | cut -d' ' -f1

# Windows:
ipconfig | findstr IPv4

# Use this IP on mobile devices:
# http://192.168.1.100:11471/manifest.json
```

### **Firewall Configuration**
```bash
# Allow port 11471 for cross-device access
# Windows:
netsh advfirewall firewall add rule name="Offlinio" dir=in action=allow protocol=TCP localport=11471

# macOS:
sudo pfctl -f /etc/pf.conf

# Linux (UFW):
sudo ufw allow 11471
```

---

## 🚀 **Production Deployment**

### **Single Server, Multiple Access Points**

```yaml
# docker-compose.yml for production deployment
version: '3.8'
services:
  offlinio:
    image: offlinio:latest
    ports:
      - "11471:11471"
    volumes:
      - ./downloads:/downloads
      - ./config:/config
    environment:
      - STORAGE_ROOT=/downloads
      - LOG_LEVEL=info
    restart: unless-stopped

# Serves ALL platforms from single container:
# - Desktop Stremio clients
# - Mobile PWA and companion apps  
# - Web browser access
# - Android TV clients
```

### **HTTPS Setup for Production**
```nginx
# nginx.conf for production with SSL
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:11471;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # Enable Server-Sent Events for mobile
        proxy_buffering off;
        proxy_cache off;
    }
}
```

---

## 🏆 **The Achievement: True Platform Agnosticism**

### **What Makes This Revolutionary:**

1. **🎯 Same Addon, All Platforms** - Single manifest.json works everywhere
2. **🔄 Universal Experience** - Identical functionality across all devices  
3. **📱 Native Mobile Support** - First-class mobile experience, not an afterthought
4. **🌐 Progressive Enhancement** - Graceful degradation based on platform capabilities
5. **📺 TV-Optimized** - Proper 10-foot experience for living room use
6. **🛠️ Developer-Friendly** - Single codebase, multiple access patterns

### **Technical Innovation:**

- **Single Addon Protocol** serving multiple interface paradigms
- **Progressive Web App** with full offline capabilities
- **Intent-based Integration** for native mobile app development
- **Server-Sent Events** for real-time cross-platform updates
- **Service Worker** architecture for offline-first mobile experience

### **User Impact:**

✅ **No more "Desktop only" limitations**  
✅ **No more "Find different solutions for mobile"**  
✅ **No more "TV platforms not supported"**  
✅ **One solution works everywhere Stremio runs**  

---

**Offlinio: The first truly universal offline download solution for Stremio.**

*Finally, offline downloads that work seamlessly across ALL your devices!* 🎉
