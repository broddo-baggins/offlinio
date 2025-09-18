# Offlinio Architecture Design

## System Overview

Offlinio is designed as a **single Stremio addon** that enables offline content downloading and playback. Everything runs within the addon itself - no separate companion app needed.

## Core Components

### 1. Single Stremio Addon (All-in-One)
```
┌─────────────────────────────────────┐
│        Stremio Addon (Complete)     │
├─────────────────────────────────────┤
│  • Manifest Generation             │
│  • Catalog Endpoints               │
│  • Stream Resolution               │
│  • Metadata Handling               │
│  • Real-Debrid Integration         │
│  • Download Management             │
│  • Local File Storage              │
│  • Progress Tracking               │
│  • Local HTTP Server               │
└─────────────────────────────────────┘
```

**Responsibilities:**
- Serve Stremio-compatible manifest.json
- Provide catalog of offline content
- Resolve stream URLs for offline files
- Handle metadata requests
- **REQUIRES Real-Debrid subscription** - no fallback options
- Process magnet links through Real-Debrid API
- Download files from Real-Debrid direct links
- Organize files in local storage with proper naming
- Serve downloaded files via local HTTP server
- Track download progress and manage queue

### 2. Storage System
```
┌─────────────────────────────────────┐
│         Storage System              │
├─────────────────────────────────────┤
│  • File Storage Manager            │
│  • Database Layer                  │
│  • Content Organization            │
│  • Integrity Verification          │
└─────────────────────────────────────┘
```

**Responsibilities:**
- Store downloaded media files
- Maintain metadata database
- Organize content by type/genre
- Verify file integrity and checksums

### 3. Metadata Service
```
┌─────────────────────────────────────┐
│        Metadata Service             │
├─────────────────────────────────────┤
│  • External API Integration        │
│  • Caching Strategy                │
│  • Offline Metadata                │
│  • Data Synchronization            │
└─────────────────────────────────────┘
```

**Responsibilities:**
- Fetch metadata from TMDB/IMDB
- Cache metadata locally
- Provide offline metadata access
- Sync metadata updates

### 4. Web Interface
```
┌─────────────────────────────────────┐
│          Web Interface              │
├─────────────────────────────────────┤
│  • Download Management UI          │
│  • Library Browser                 │
│  • Settings Configuration          │
│  • Real-time Updates               │
└─────────────────────────────────────┘
```

**Responsibilities:**
- Provide web-based management interface
- Display download queue and progress
- Browse offline content library
- Configure addon settings

## Data Flow Architecture

```
┌─────────────┐    ┌─────────────────────────────────────┐
│   Stremio   │────│        Single Stremio Addon         │
│   Client    │    │                                     │
└─────────────┘    │  ┌─────────────┐  ┌─────────────┐  │
                   │  │  Addon API  │  │ Download    │  │
                   │  │  Endpoints  │  │ Management  │  │
                   │  └─────────────┘  └─────────────┘  │
                   │  ┌─────────────┐  ┌─────────────┐  │
                   │  │  Metadata   │  │ Local HTTP  │  │
                   │  │  Service    │  │   Server    │  │
                   │  └─────────────┘  └─────────────┘  │
                   └─────────────────────────────────────┘
                                     │
                   ┌─────────────┐    │    ┌─────────────┐
                   │ Real-Debrid │────┼────│ File System │
                   │     API     │    │    │ (Required)  │
                   └─────────────┘    │    └─────────────┘
                                     │
                   ┌─────────────┐    │
                   │   Storage   │────┘
                   │   System    │
                   └─────────────┘
```

**Key Points:**
- **Single Stremio Addon** - everything runs within the addon
- **Real-Debrid is REQUIRED** - no content without RD subscription
- **All functionality integrated** - no separate companion app
- **Local HTTP Server** serves downloaded files to Stremio
- **No content filtering** - Real-Debrid handles content access

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: SQLite (local storage)
- **ORM**: Prisma or TypeORM
- **Download**: Real-Debrid API (REQUIRED), axios, node-fetch
- **File Serving**: Local HTTP server (127.0.0.1)
- **Testing**: Jest, Supertest

### Frontend
- **Framework**: React 18 with TypeScript
- **State Management**: Zustand or Redux Toolkit
- **UI Library**: Material-UI or Chakra UI
- **Build Tool**: Vite
- **Testing**: React Testing Library, Jest

### Infrastructure
- **Containerization**: Docker
- **Process Management**: PM2
- **Monitoring**: Winston (logging)
- **CI/CD**: GitHub Actions

## Database Schema

### Content Table
```sql
CREATE TABLE content (
  id UUID PRIMARY KEY,
  imdb_id VARCHAR(20) UNIQUE,
  title VARCHAR(255) NOT NULL,
  type ENUM('movie', 'series') NOT NULL,
  year INTEGER,
  genre VARCHAR(255),
  description TEXT,
  poster_url VARCHAR(500),
  file_path VARCHAR(500),
  file_size BIGINT,
  quality VARCHAR(20),
  status ENUM('downloading', 'completed', 'failed', 'paused'),
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Downloads Table
```sql
CREATE TABLE downloads (
  id UUID PRIMARY KEY,
  content_id UUID REFERENCES content(id),
  source_url TEXT NOT NULL,
  download_type ENUM('torrent', 'http') NOT NULL,
  progress INTEGER DEFAULT 0,
  speed BIGINT DEFAULT 0,
  eta INTEGER,
  status ENUM('queued', 'downloading', 'paused', 'completed', 'failed'),
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Metadata Cache Table
```sql
CREATE TABLE metadata_cache (
  id UUID PRIMARY KEY,
  external_id VARCHAR(50) NOT NULL,
  source ENUM('tmdb', 'imdb', 'tvdb') NOT NULL,
  data JSONB NOT NULL,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(external_id, source)
);
```

## API Design

### Stremio Addon Endpoints

#### Manifest
```
GET /manifest.json
Response: Stremio manifest object
```

#### Catalog
```
GET /catalog/{type}/{id}.json
GET /catalog/{type}/{id}/skip={skip}.json
Response: { metas: [Meta] }
```

#### Stream
```
GET /stream/{type}/{id}.json
Response: { streams: [Stream] }
```

### Management API Endpoints

#### Downloads
```
POST /api/downloads
GET /api/downloads
GET /api/downloads/{id}
PUT /api/downloads/{id}/pause
PUT /api/downloads/{id}/resume
DELETE /api/downloads/{id}
```

#### Content Library
```
GET /api/content
GET /api/content/{id}
DELETE /api/content/{id}
```

#### Settings
```
GET /api/settings
PUT /api/settings
```

## Security Considerations

### 1. Input Validation
- Sanitize all user inputs
- Validate torrent/magnet links
- Prevent path traversal attacks
- Rate limiting on API endpoints

### 2. File System Security
- Sandboxed download directory
- File type validation
- Size limits on downloads
- Virus scanning integration

### 3. Network Security
- HTTPS enforcement
- CORS configuration
- Authentication for admin features
- Secure headers implementation

### 4. Privacy Protection
- No user tracking by default
- Optional telemetry with consent
- Local data storage only
- Configurable data retention

## Performance Optimization

### 1. Download Performance
- Concurrent download limits
- Bandwidth throttling options
- Resume capability
- Peer selection optimization

### 2. Database Performance
- Proper indexing strategy
- Connection pooling
- Query optimization
- Caching layer (Redis optional)

### 3. UI Performance
- Virtual scrolling for large lists
- Progressive loading
- Optimistic updates
- WebSocket for real-time updates

### 4. Storage Performance
- File deduplication
- Compression for metadata
- Efficient file organization
- Background cleanup tasks

## Monitoring and Logging

### 1. Application Metrics
- Download speeds and success rates
- API response times
- Error rates and types
- Storage usage statistics

### 2. System Metrics
- CPU and memory usage
- Disk I/O and space
- Network bandwidth usage
- Database performance

### 3. Logging Strategy
- Structured logging with Winston
- Log levels: error, warn, info, debug
- Log rotation and retention
- Error tracking integration

## Deployment Architecture

### Development
```
┌─────────────────────────────────────┐
│        Development Setup            │
├─────────────────────────────────────┤
│  • Local Node.js server            │
│  • SQLite database                 │
│  • File-based storage              │
│  • Hot reloading                   │
└─────────────────────────────────────┘
```

### Production
```
┌─────────────────────────────────────┐
│        Production Setup             │
├─────────────────────────────────────┤
│  • Docker containers               │
│  • PostgreSQL database             │
│  • Persistent volume storage       │
│  • Load balancer (if needed)       │
│  • Monitoring stack                │
└─────────────────────────────────────┘
```

## Scalability Considerations

### 1. Horizontal Scaling
- Stateless addon server design
- Shared database for multiple instances
- Load balancing for high availability
- Distributed storage options

### 2. Vertical Scaling
- Efficient memory usage
- CPU optimization for downloads
- Storage I/O optimization
- Database query optimization

### 3. Content Distribution
- P2P sharing between instances
- Content deduplication
- Regional content caching
- Bandwidth optimization

This architecture provides a solid foundation for building Offlinio with scalability, maintainability, and reliability in mind, while following TDD principles throughout the development process.
