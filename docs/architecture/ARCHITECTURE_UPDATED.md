# Offlinio Architecture Design - Auto-Detection Version

## System Overview

Offlinio is designed as a **single Stremio addon** that enables automatic offline content downloading and playback. The system auto-detects available debrid services and public domain content without requiring any user configuration.

## Core Philosophy

- **Zero Configuration**: No user setup required - just install and use
- **Auto-Detection**: Automatically finds available debrid services
- **One-Click Downloads**: Simple download button in Stremio
- **Legal-First**: Built-in legal compliance and content filtering
- **Privacy-Focused**: No external data transmission, local storage only

## Core Components

### 1. Single Stremio Addon (All-in-One)
```
┌─────────────────────────────────────┐
│        Stremio Addon (Complete)     │
├─────────────────────────────────────┤
│  • Manifest Generation             │
│  • Catalog Endpoints               │
│  • Stream Resolution               │
│  • Download Trigger Handler        │
│  • Auto-Debrid Detection           │
│  • Download Management             │
│  • Local File Storage              │
│  • Progress Tracking               │
│  • Local HTTP Server               │
│  • Legal Compliance Engine         │
└─────────────────────────────────────┘
```

**Responsibilities:**
- Serve Stremio-compatible manifest.json
- Provide catalog of offline content
- Show download buttons on all content
- Auto-detect available debrid services (Real-Debrid, AllDebrid, etc.)
- Handle public domain content automatically
- Download files from auto-resolved sources
- Organize files in local storage with proper naming
- Serve downloaded files via local HTTP server
- Track download progress and manage queue
- Enforce legal compliance at all levels

### 2. Auto-Debrid Detection System
```
┌─────────────────────────────────────┐
│       Auto-Detection Engine        │
├─────────────────────────────────────┤
│  • Service Discovery              │
│  • Browser Extension Detection    │
│  • API Endpoint Probing           │
│  • Public Domain Identification   │
│  • Automatic Resolution           │
└─────────────────────────────────────┘
```

**Supported Services:**
- ✅ Real-Debrid (auto-detected)
- ✅ AllDebrid (auto-detected)
- ✅ Premiumize (auto-detected)
- ✅ DebridLink (auto-detected)
- ✅ Public Domain Sources (Archive.org, CC)

**Detection Methods:**
- Browser extension presence checking
- Local API endpoint availability
- System process detection
- Content URL pattern matching
- Public domain database queries

### 3. Storage System
```
┌─────────────────────────────────────┐
│         Storage System              │
├─────────────────────────────────────┤
│  • File Storage Manager            │
│  • SQLite Database                 │
│  • Content Organization            │
│  • Integrity Verification          │
│  • Path Management                 │
└─────────────────────────────────────┘
```

**File Organization:**
```
DATA_DIR/
├── Movies/
│   ├── Movie Title (2023).mp4
│   └── Another Movie (2022).mkv
└── Series/
    └── Series Name/
        └── Season 1/
            ├── Series Name S01E01.mp4
            └── Series Name S01E02.mp4
```

### 4. Legal Compliance System
```
┌─────────────────────────────────────┐
│      Legal Compliance Engine       │
├─────────────────────────────────────┤
│  • First-Run Legal Notice          │
│  • Content Rights Verification     │
│  • DRM Detection & Blocking        │
│  • Usage Logging (Privacy-Safe)    │
│  • Terms Enforcement               │
└─────────────────────────────────────┘
```

**Compliance Features:**
- Mandatory legal notice on first run
- Cannot be bypassed or dismissed
- DRM content automatically blocked
- Public domain content prioritized
- Privacy-by-design logging
- Israeli law compliant

## Data Flow

### Download Process
```
1. User finds content in Stremio
      ↓
2. Clicks "📥 Download for Offline" button
      ↓
3. Auto-detector identifies available services
      ↓
4. Content resolved through detected service/public domain
      ↓
5. Download queued and processed
      ↓
6. File saved to organized local storage
      ↓
7. Content appears in Offlinio catalog
      ↓
8. User can play offline from Stremio
```

### Auto-Detection Flow
```
1. Service detection runs in background
      ↓
2. Checks for browser extensions
      ↓
3. Probes local API endpoints
      ↓
4. Identifies public domain sources
      ↓
5. Caches detection results
      ↓
6. Uses best available service for downloads
```

## API Endpoints

### Stremio Addon Interface
- `GET /manifest.json` - Addon manifest
- `GET /catalog/:type/:id.json` - Downloaded content catalogs
- `GET /meta/:type/:id.json` - Content metadata
- `GET /stream/:type/:id.json` - Stream URLs + download triggers
- `GET /download/:id` - Auto-download trigger endpoint

### Management API
- `GET /api/downloads` - List downloads
- `POST /api/downloads` - Create download
- `GET /api/downloads/services/status` - Auto-detected services
- `GET /api/downloads/stats/storage` - Storage statistics

### Legal Compliance API
- `GET /api/legal/notice` - Get legal notice
- `POST /api/legal/accept` - Accept legal notice
- `GET /api/legal/status` - Check acceptance status

### Web Interface
- `GET /ui/` - Management interface
- Static file serving for downloaded content

## Technology Stack

### Backend
- **Node.js + TypeScript** - Runtime and language
- **Express.js** - Web framework
- **Prisma + SQLite** - Database ORM and storage
- **Winston** - Privacy-conscious logging
- **Stremio Addon SDK** - Stremio integration

### Frontend
- **Vanilla JavaScript** - Web UI (no frameworks)
- **CSS3** - Modern styling
- **HTML5** - Semantic markup

### Storage
- **SQLite** - Metadata and settings
- **File System** - Actual media files
- **Local only** - No external storage

## Security & Privacy

### Privacy Measures
- **No external data transmission** (except for downloads)
- **Local storage only** for all user data
- **Minimal logging** with automatic redaction
- **No telemetry** or analytics
- **User control** over all data

### Security Features
- **Path traversal protection** in file serving
- **Content-Type validation** for downloads
- **DRM detection and blocking**
- **Legal compliance enforcement**
- **Sanitized file naming**

## Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| **Windows** | ✅ Full Support | All features available |
| **macOS** | ✅ Full Support | All features available |
| **Linux** | ✅ Full Support | All features available |
| **iOS** | ⚠️ Limited | Stremio iOS localhost limitations |
| **Android** | ✅ Supported | Via network access |

## Configuration

### Required Settings
- **None** - Works out of the box

### Optional Settings
- `DATA_DIR` - Custom download path
- `PORT` - Custom server port (default: 11471)
- `AUTO_DETECT_SERVICES` - Enable/disable auto-detection

### User-Configurable
- **Storage path only** - Where downloads are saved
- **No service configuration** - Everything auto-detected

## Legal Framework

### Compliance Strategy
- **Source-agnostic architecture** - No content indexing
- **User-supplied URLs only** - No automatic discovery
- **DRM blocking** - Technical guardrails
- **Public domain prioritization** - Legal content first
- **Clear usage guidelines** - Explicit acceptable uses

### Israeli Law Compliance
- **No contributory infringement** - Pure download tool
- **No circumvention** - DRM respected
- **Clear user responsibility** - Legal notice enforced
- **Neutral branding** - No piracy promotion

## Development Principles

### Code Quality
- **TypeScript everywhere** - Type safety
- **Test-driven development** - Comprehensive testing
- **ESLint + Prettier** - Code formatting
- **Privacy-by-design** - No data leaks

### Architecture Principles
- **Single responsibility** - Clear component boundaries
- **Auto-detection first** - Minimal user configuration
- **Legal compliance** - Built into every feature
- **User experience** - Simple and intuitive

This architecture ensures Offlinio works seamlessly without any user configuration while maintaining legal compliance and providing a smooth experience for offline content management.
