# Mobile Companion App Integration Guide

This document outlines the integration patterns for creating companion mobile apps that work with Offlinio's download management system.

## Architecture Overview

Offlinio now provides multiple integration pathways for mobile companion apps:

1. **REST API Integration** - Direct API calls to manage downloads
2. **Intent-based Integration** - URL schemes and Android intents
3. **PWA Integration** - Progressive Web App capabilities
4. **Real-time Updates** - Server-Sent Events for live progress

## 1. REST API Integration

### Mobile-Optimized Endpoints

```
GET /mobile/discover/:type/:imdbId - Discover downloadable content
POST /mobile/download/:contentId - Trigger download with mobile response
GET /mobile/downloads - Get downloads with mobile-optimized data
GET /mobile/downloads/:contentId/progress - Real-time progress stream
PATCH /mobile/downloads/:contentId/:action - Control downloads (pause/resume/retry)
```

### Content Discovery

```javascript
// Discover if content can be downloaded
const response = await fetch('/mobile/discover/movie/tt0111161');
const data = await response.json();

/* Response:
{
  "contentId": "tt0111161",
  "type": "movie", 
  "downloadable": true,
  "alreadyDownloaded": false,
  "downloadProgress": 0,
  "magnet": {
    "title": "The Shawshank Redemption 1994 1080p",
    "quality": "1080p",
    "size": "2.1 GB"
  },
  "downloadUrl": "http://127.0.0.1:11471/mobile/download/tt0111161",
  "intentUrl": "offlinio://download?contentId=tt0111161&type=movie&title=..."
}
*/
```

### Download Management

```javascript
// Start a download
const downloadResponse = await fetch('/mobile/download/tt0111161', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    returnFormat: 'json', // or 'intent' or 'redirect'
    deviceId: 'mobile-device-123',
    callbackUrl: 'myapp://download-complete'
  })
});

// Get mobile-optimized downloads list
const downloadsResponse = await fetch('/mobile/downloads?limit=20&fields=compact');
const downloads = await downloadsResponse.json();

/* Response:
{
  "items": [
    {
      "id": "tt0111161",
      "title": "The Shawshank Redemption",
      "status": "downloading",
      "progress": 45,
      "playUrl": null,
      "actions": {
        "canPause": true,
        "canResume": false,
        "canDelete": false
      }
    }
  ],
  "hasMore": true
}
*/
```

## 2. Intent-Based Integration

### Android Integration

#### Register Intent Filters (AndroidManifest.xml)

```xml
<activity android:name=".DownloadActivity">
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="offlinio" />
    </intent-filter>
    
    <!-- Handle magnet links -->
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="magnet" />
    </intent-filter>
</activity>
```

#### Generate Intent URLs

```javascript
// Generate intent URL for Android app
const response = await fetch('/mobile/intent/tt0111161?scheme=offlinio&action=download');
const data = await response.json();

/* Response:
{
  "intents": {
    "android": "intent://download?contentId=tt0111161&title=Movie#Intent;scheme=offlinio;package=com.myapp.companion;end",
    "ios": "https://myapp.com/download?contentId=tt0111161",
    "custom": "offlinio://download?contentId=tt0111161&title=Movie",
    "web": "http://127.0.0.1:11471/ui/"
  }
}
*/

// Trigger intent from web browser
window.location.href = data.intents.android;
```

#### Handle Intent in Android App

```kotlin
class DownloadActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val data = intent.data
        if (data?.scheme == "offlinio") {
            val contentId = data.getQueryParameter("contentId")
            val title = data.getQueryParameter("title")
            val action = data.host // "download"
            
            when (action) {
                "download" -> startDownload(contentId, title)
                "play" -> playContent(contentId)
                "manage" -> openDownloadManager(contentId)
            }
        }
    }
}
```

### iOS Integration

#### Register URL Scheme (Info.plist)

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>com.myapp.offlinio</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>offlinio</string>
        </array>
    </dict>
</array>
```

#### Handle URL in iOS App

```swift
func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
    if url.scheme == "offlinio" {
        let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        let contentId = components?.queryItems?.first(where: { $0.name == "contentId" })?.value
        let title = components?.queryItems?.first(where: { $0.name == "title" })?.value
        
        switch url.host {
        case "download":
            startDownload(contentId: contentId, title: title)
        case "play":
            playContent(contentId: contentId)
        default:
            break
        }
        return true
    }
    return false
}
```

## 3. PWA Integration

### Install PWA Manifest

Update your server to serve the PWA manifest:

```typescript
// Add to server.ts
app.get('/manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'pwa-manifest.json'));
});

// Serve PWA assets
app.use('/ui/icons', express.static(path.join(process.cwd(), 'src', 'ui', 'icons')));
```

### Service Worker Integration

```javascript
// Register service worker for offline capabilities
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/ui/sw.js')
    .then(registration => {
      console.log('SW registered:', registration.scope);
    })
    .catch(error => {
      console.error('SW registration failed:', error);
    });
}
```

### Push Notifications

```javascript
// Request notification permission
const permission = await Notification.requestPermission();
if (permission === 'granted') {
  // Subscribe to push notifications
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: 'your-vapid-public-key'
  });
  
  // Send subscription to server
  await fetch('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription),
    headers: { 'Content-Type': 'application/json' }
  });
}
```

## 4. Real-time Updates

### Server-Sent Events

```javascript
// Monitor download progress in real-time
const eventSource = new EventSource('/mobile/downloads/tt0111161/progress');

eventSource.onmessage = function(event) {
  const data = JSON.parse(event.data);
  updateProgressBar(data.progress);
  
  if (data.status === 'completed') {
    eventSource.close();
    showCompletionNotification(data.contentId);
  }
};

eventSource.onerror = function(event) {
  console.error('SSE error:', event);
  eventSource.close();
  
  // Fallback to polling
  setInterval(checkProgress, 5000);
};
```

### WebSocket Integration (Optional)

```javascript
// Alternative: WebSocket for bidirectional communication
const ws = new WebSocket('ws://127.0.0.1:11471/ws');

ws.onopen = () => {
  // Subscribe to download updates
  ws.send(JSON.stringify({
    type: 'subscribe',
    topic: 'downloads',
    deviceId: 'mobile-device-123'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'download-progress') {
    updateDownloadProgress(data.contentId, data.progress);
  }
};
```

## 5. Companion App Examples

### Android Companion App Structure

```
app/
├── src/main/java/com/offlinio/companion/
│   ├── MainActivity.kt
│   ├── DownloadService.kt
│   ├── OfflinioApiClient.kt
│   ├── DownloadReceiver.kt
│   └── ui/
│       ├── DownloadsFragment.kt
│       └── ProgressActivity.kt
├── src/main/res/
│   ├── layout/
│   └── values/
└── build.gradle
```

### Key Android Components

#### API Client

```kotlin
class OfflinioApiClient {
    private val baseUrl = "http://127.0.0.1:11471"
    
    suspend fun discoverContent(type: String, imdbId: String): ContentDiscovery {
        val response = httpClient.get("$baseUrl/mobile/discover/$type/$imdbId")
        return response.body()
    }
    
    suspend fun startDownload(contentId: String): DownloadResponse {
        return httpClient.post("$baseUrl/mobile/download/$contentId") {
            setBody(DownloadRequest(
                returnFormat = "intent",
                deviceId = getDeviceId(),
                callbackUrl = "offlinio://download-complete"
            ))
        }.body()
    }
    
    suspend fun getDownloads(): DownloadsList {
        return httpClient.get("$baseUrl/mobile/downloads?fields=compact").body()
    }
}
```

#### Background Download Service

```kotlin
class DownloadService : Service() {
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val contentId = intent?.getStringExtra("contentId")
        if (contentId != null) {
            startForegroundService(contentId)
        }
        return START_NOT_STICKY
    }
    
    private fun startForegroundService(contentId: String) {
        val notification = createProgressNotification(contentId, 0)
        startForeground(NOTIFICATION_ID, notification)
        
        // Monitor progress via API polling or SSE
        monitorDownloadProgress(contentId)
    }
    
    private fun monitorDownloadProgress(contentId: String) {
        // Implementation for progress monitoring
    }
}
```

### iOS Companion App Structure

```
OfflinioCompanion/
├── Models/
│   ├── ContentDiscovery.swift
│   └── Download.swift
├── Services/
│   ├── OfflinioAPIClient.swift
│   └── DownloadManager.swift
├── Views/
│   ├── ContentView.swift
│   ├── DownloadsListView.swift
│   └── ProgressView.swift
└── Resources/
    ├── Info.plist
    └── Assets.xcassets
```

#### iOS API Client

```swift
class OfflinioAPIClient: ObservableObject {
    private let baseURL = "http://127.0.0.1:11471"
    
    func discoverContent(type: String, imdbId: String) async throws -> ContentDiscovery {
        let url = URL(string: "\(baseURL)/mobile/discover/\(type)/\(imdbId)")!
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode(ContentDiscovery.self, from: data)
    }
    
    func startDownload(contentId: String) async throws -> DownloadResponse {
        var request = URLRequest(url: URL(string: "\(baseURL)/mobile/download/\(contentId)")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let requestBody = DownloadRequest(
            returnFormat: "json",
            deviceId: UIDevice.current.identifierForVendor?.uuidString ?? "unknown",
            callbackUrl: "offlinio://download-complete"
        )
        request.httpBody = try JSONEncoder().encode(requestBody)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(DownloadResponse.self, from: data)
    }
}
```

## 6. Security Considerations

### API Security

1. **Local Network Only**: Offlinio runs on `127.0.0.1` by default
2. **CORS Configuration**: Properly configured for mobile apps
3. **Rate Limiting**: Implement rate limits for mobile endpoints
4. **Input Validation**: All inputs are validated server-side

### Mobile App Security

1. **Network Security**: Use HTTPS in production
2. **Certificate Pinning**: Pin certificates for API communication
3. **Token Management**: Securely store any authentication tokens
4. **Intent Security**: Validate all incoming intents

## 7. Testing Integration

### API Testing

```bash
# Test content discovery
curl "http://127.0.0.1:11471/mobile/discover/movie/tt0111161"

# Test download trigger
curl -X POST "http://127.0.0.1:11471/mobile/download/tt0111161" \
     -H "Content-Type: application/json" \
     -d '{"returnFormat": "json", "deviceId": "test"}'

# Test downloads list
curl "http://127.0.0.1:11471/mobile/downloads?limit=10"
```

### Intent Testing

```bash
# Test intent generation
curl "http://127.0.0.1:11471/mobile/intent/tt0111161?scheme=offlinio"

# Test from browser
open "offlinio://download?contentId=tt0111161&title=Test Movie"
```

## 8. Deployment Considerations

### Network Configuration

For companion apps to work properly:

1. **Same Network**: Mobile device must be on same network as Offlinio server
2. **Firewall Rules**: Allow port 11471 in firewall
3. **Router Configuration**: May need UPnP or port forwarding for some setups

### Production Setup

1. **HTTPS**: Use reverse proxy with SSL certificate
2. **Domain**: Use proper domain instead of localhost
3. **Authentication**: Add authentication for public deployments

This integration guide provides multiple pathways for creating companion mobile apps that enhance the Offlinio experience across different platforms and use cases.
