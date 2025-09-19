# Offlinio Mobile Extensions

This document outlines the mobile-native extensions added to Offlinio to support companion apps and PWA functionality.

## Overview

Offlinio now includes comprehensive mobile support through:

1. **Mobile-Optimized APIs** - RESTful endpoints designed for mobile clients
2. **Progressive Web App (PWA)** - Installable web app with offline capabilities  
3. **Companion App Integration** - URL schemes and intents for native mobile apps
4. **Real-time Updates** - Live progress monitoring and push notifications

## Quick Start

### 1. Enable Mobile Extensions

The mobile APIs are automatically available when you start Offlinio:

```bash
npm run dev
# Or
npm start
```

Access the mobile-optimized interface at: `http://127.0.0.1:11471/ui/mobile-index.html`

### 2. Install as PWA

1. Open the mobile interface in Chrome/Safari
2. Look for the "Install" prompt or "Add to Home Screen"  
3. Follow the prompts to install Offlinio as a native app

### 3. Test Mobile APIs

```bash
# Discover downloadable content
curl "http://127.0.0.1:11471/mobile/discover/movie/tt0111161"

# Get mobile-optimized downloads list
curl "http://127.0.0.1:11471/mobile/downloads?limit=10&fields=compact"

# Generate intent URLs for companion apps
curl "http://127.0.0.1:11471/mobile/intent/tt0111161"
```

## Mobile API Endpoints

### Content Discovery
- `GET /mobile/discover/:type/:imdbId` - Check if content is downloadable
- `GET /mobile/discover/:type/:imdbId?season=1&episode=1` - For series episodes

### Download Management  
- `POST /mobile/download/:contentId` - Trigger download with mobile response
- `GET /mobile/downloads` - Get downloads list (mobile-optimized)
- `GET /mobile/downloads/:contentId/progress` - Real-time progress stream (SSE)
- `PATCH /mobile/downloads/:contentId/:action` - Control downloads (pause/resume/retry)

### Companion App Integration
- `GET /mobile/intent/:contentId` - Generate platform-specific intent URLs
- Custom URL scheme: `offlinio://download?contentId=...&title=...`

## PWA Features

### Offline Capabilities
- Service worker caches UI assets and API responses
- Background sync for download status updates
- Offline page when network unavailable

### Native-like Experience  
- Installable as standalone app
- Full-screen display mode
- Custom splash screen and app icons
- Touch-optimized UI with haptic feedback

### Push Notifications
- Download completion alerts
- Progress milestone notifications  
- Background download status updates

## Companion App Development

### Android Integration

Create a companion Android app that communicates with Offlinio:

```kotlin
// API Client
class OfflinioApiClient {
    private val baseUrl = "http://127.0.0.1:11471"
    
    suspend fun discoverContent(type: String, imdbId: String): ContentDiscovery {
        return httpClient.get("$baseUrl/mobile/discover/$type/$imdbId").body()
    }
    
    suspend fun startDownload(contentId: String): DownloadResponse {
        return httpClient.post("$baseUrl/mobile/download/$contentId") {
            setBody(DownloadRequest(returnFormat = "intent"))
        }.body()
    }
}

// Intent Handling
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        val data = intent.data
        if (data?.scheme == "offlinio") {
            val contentId = data.getQueryParameter("contentId")
            handleDownloadRequest(contentId)
        }
    }
}
```

### iOS Integration

```swift
// URL Scheme Handling
func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
    if url.scheme == "offlinio" {
        let components = URLComponents(url: url, resolvingAgainstBaseBaseURL: false)
        let contentId = components?.queryItems?.first(where: { $0.name == "contentId" })?.value
        
        if url.host == "download" {
            startDownload(contentId: contentId)
            return true
        }
    }
    return false
}

// API Client
class OfflinioAPIClient: ObservableObject {
    func discoverContent(type: String, imdbId: String) async throws -> ContentDiscovery {
        let url = URL(string: "http://127.0.0.1:11471/mobile/discover/\(type)/\(imdbId)")!
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode(ContentDiscovery.self, from: data)
    }
}
```

## Mobile UI Components

### Responsive Design
- Mobile-first CSS with touch-friendly interactions
- Optimized spacing and typography for small screens
- Dark theme optimized for battery life
- Safe area handling for notched devices

### Touch Interactions
- Pull-to-refresh functionality
- Swipe gestures for navigation
- Long-press context menus
- Haptic feedback on supported devices

### Progress Visualization
- Real-time download progress bars
- Speed and ETA indicators
- Visual status indicators (downloading, completed, failed)
- Batch action controls

## Security & Privacy

### Network Security
- Local network only by default (127.0.0.1)
- CORS properly configured for mobile origins
- Input validation on all mobile endpoints
- Rate limiting to prevent abuse

### Data Privacy
- No tracking or analytics by default
- Local-only data storage
- Optional push notifications (user permission required)
- Transparent legal compliance system

## Development & Testing

### Local Development

```bash
# Start Offlinio with mobile extensions
npm run start:dev

# Test mobile interface
open http://127.0.0.1:11471/ui/mobile-index.html

# Test PWA install
# Open in Chrome DevTools > Application > Manifest
```

### Mobile Testing

```bash
# Test on device via network
# Find your local IP
ipconfig getifaddr en0  # macOS
hostname -I | cut -d' ' -f1  # Linux

# Access from mobile device
# http://[YOUR_IP]:11471/ui/mobile-index.html
```

### API Testing

```bash
# Content discovery
curl "http://127.0.0.1:11471/mobile/discover/movie/tt0111161" | jq

# Download trigger with mobile response
curl -X POST "http://127.0.0.1:11471/mobile/download/tt0111161" \
     -H "Content-Type: application/json" \
     -d '{"returnFormat": "json", "deviceId": "test-device"}' | jq

# Real-time progress (Server-Sent Events)
curl -N "http://127.0.0.1:11471/mobile/downloads/tt0111161/progress"

# Intent generation
curl "http://127.0.0.1:11471/mobile/intent/tt0111161?scheme=offlinio" | jq
```

## Production Deployment

### Network Configuration

For production use with companion apps:

1. **Use proper domain**: Replace localhost with your server's domain/IP
2. **HTTPS setup**: Use reverse proxy with SSL certificate
3. **Firewall rules**: Allow access to port 11471 or your configured port
4. **Mobile network**: Ensure mobile devices can reach the server

### PWA Deployment

1. **HTTPS required**: PWAs require HTTPS in production
2. **Service worker scope**: Configure proper service worker scope
3. **Manifest validation**: Test manifest with PWA auditing tools
4. **Icon generation**: Create all required icon sizes (72px to 512px)

### Companion App Distribution

1. **Android**: Publish to Google Play Store or distribute APK
2. **iOS**: Distribute via App Store or TestFlight
3. **Deep links**: Configure proper deep link handling
4. **API compatibility**: Maintain backward compatibility for API changes

## Troubleshooting

### Common Issues

1. **PWA not installing**: Ensure HTTPS and valid manifest
2. **API not accessible**: Check firewall and network settings  
3. **Companion app not launching**: Verify URL scheme registration
4. **Progress not updating**: Check Server-Sent Events compatibility

### Debug Tools

```bash
# Check mobile API health
curl http://127.0.0.1:11471/health

# Validate PWA manifest
curl http://127.0.0.1:11471/manifest.json | jq

# Test service worker
# Open DevTools > Application > Service Workers
```

## Future Enhancements

Planned mobile improvements:

1. **WebRTC integration** - Direct peer-to-peer communication
2. **Background downloading** - True background downloads via service worker
3. **Batch operations** - Select and manage multiple downloads
4. **Smart notifications** - ML-powered download recommendations  
5. **Cross-platform sync** - Sync download queue across devices

---

For detailed integration examples and API documentation, see:
- [Mobile Companion App Integration Guide](./docs/mobile-companion-app-integration.md)
- [PWA Development Guide](./docs/pwa-development.md)  
- [Mobile API Reference](./docs/mobile-api-reference.md)
