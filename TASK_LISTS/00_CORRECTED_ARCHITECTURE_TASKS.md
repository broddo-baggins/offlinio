# Corrected Architecture Tasks (Based on Actual Requirements)

## Core Architecture (Two-Part System)

### 1. Download Manager Service (Local Companion App)
**REQUIRES Real-Debrid subscription - no fallback options**

#### Real-Debrid Integration (REQUIRED)
- [ ] **Real-Debrid API Client**
  - [ ] Implement Real-Debrid authentication (API key)
  - [ ] Add magnet link processing via RD API
  - [ ] Get torrent information from RD
  - [ ] Retrieve direct download links from RD
  - [ ] Handle RD API rate limiting and errors

- [ ] **Download Processing**
  - [ ] Process magnet links through Real-Debrid
  - [ ] Download files from RD direct HTTP links
  - [ ] Handle download progress and status
  - [ ] Implement download queue management
  - [ ] Add download error handling and retry logic

#### Local File Management
- [ ] **File Organization**
  - [ ] Movies: `Movies/<Title> (<year>).<ext>`
  - [ ] Series: `Series/<Show Name>/Season <N>/<ShowName> S<Season>E<Episode> - <Episode Name>.<ext>`
  - [ ] Implement proper file naming conventions
  - [ ] Add file validation and integrity checks

- [ ] **Local HTTP Server**
  - [ ] Serve downloaded files via localhost (127.0.0.1:PORT)
  - [ ] Implement file streaming for Stremio playback
  - [ ] Add security (localhost only access)
  - [ ] Handle file serving errors

#### Download Tracking & Management
- [ ] **Download Database**
  - [ ] Track downloaded content (Stremio ID, title, file path, etc.)
  - [ ] Maintain download manifest/registry
  - [ ] Implement download status tracking
  - [ ] Add download history and statistics

- [ ] **User Interface (Optional)**
  - [ ] Minimal UI for download progress
  - [ ] Download queue visualization
  - [ ] Settings configuration (download directory, etc.)
  - [ ] File deletion interface

### 2. Stremio Add-on Integration

#### Add-on Manifest & Catalogs
- [ ] **Offline Library Catalogs**
  - [ ] "Downloaded Movies" catalog
  - [ ] "Downloaded Series" catalog
  - [ ] Dynamic catalog generation from downloads
  - [ ] Catalog caching and optimization

- [ ] **Metadata Provision**
  - [ ] Provide metadata for downloaded content
  - [ ] Cache posters and backgrounds locally
  - [ ] Serve metadata offline (no internet required)
  - [ ] Handle series/episode metadata

#### Stream Resolution
- [ ] **Offline Stream Endpoints**
  - [ ] Return local HTTP URLs for downloaded content
  - [ ] Format: `http://127.0.0.1:PORT/files/<filename>`
  - [ ] Stream quality labeling (e.g., "Offline (1080p)")
  - [ ] Stream availability checking

- [ ] **Download Trigger Integration**
  - [ ] Implement download trigger methods:
    - [ ] Approach A: Dummy stream entry with custom URL scheme
    - [ ] Approach B: External download button (via PimpMyStremio)
    - [ ] Approach C: "Play then stop" detection method
  - [ ] Custom URL scheme handling (`stremio-downloader://`)
  - [ ] Download initiation from Stremio UI

#### Content Management
- [ ] **Download Management**
  - [ ] Delete downloads via Stremio UI
  - [ ] Update catalogs after deletion
  - [ ] Real-time catalog updates
  - [ ] Download status display

- [ ] **Offline Behavior**
  - [ ] Ensure add-on works completely offline
  - [ ] Cache all necessary metadata locally
  - [ ] Serve images from local server
  - [ ] Maintain functionality without internet

## Platform-Specific Implementation

### Windows (Primary Target)
- [ ] **Desktop Application**
  - [ ] Package as Windows executable
  - [ ] Installer with auto-start option
  - [ ] System tray integration
  - [ ] Custom URL scheme registration

- [ ] **File System Integration**
  - [ ] Default download directory: `%UserProfile%\Videos\Stremio Downloads\`
  - [ ] File permissions handling
  - [ ] Path validation and error handling

### macOS (Primary Target)
- [ ] **macOS Application**
  - [ ] Package as .app bundle
  - [ ] DMG installer distribution
  - [ ] Gatekeeper notarization (if needed)
  - [ ] Custom URL scheme registration

- [ ] **File System Integration**
  - [ ] Default download directory: `~/Movies/Stremio Downloads/`
  - [ ] macOS-specific path handling
  - [ ] File permissions and sandboxing

### iOS (Limited Support)
- [ ] **iOS Workaround Implementation**
  - [ ] Real-Debrid web interface integration
  - [ ] iOS Shortcut for RD API calls
  - [ ] Safari-based download guidance
  - [ ] External player integration (VLC, etc.)

- [ ] **iOS Limitations Handling**
  - [ ] No background service capability
  - [ ] Limited file system access
  - [ ] App Store policy compliance
  - [ ] User education about limitations

## Technical Implementation Details

### Real-Debrid Integration (REQUIRED)
- [ ] **API Endpoints Used**
  - [ ] `POST /torrents/addMagnet` - Add magnet to RD
  - [ ] `GET /torrents/info/{id}` - Get torrent status
  - [ ] `POST /torrents/selectFiles/{id}` - Select files to download
  - [ ] `POST /unrestrict/link` - Get direct download link
  - [ ] `GET /user` - Get user account info

- [ ] **Authentication & Security**
  - [ ] Secure API key storage
  - [ ] Encrypted credential storage
  - [ ] API key validation and refresh
  - [ ] Error handling for invalid credentials

### Local HTTP Server
- [ ] **Server Configuration**
  - [ ] Port: 127.0.0.1:11471 (or similar)
  - [ ] CORS configuration for Stremio
  - [ ] File streaming with range requests
  - [ ] Security headers and access control

- [ ] **File Serving**
  - [ ] Map file requests to local storage
  - [ ] Handle different video formats (MKV, MP4, etc.)
  - [ ] Support for large file streaming
  - [ ] Error handling for missing files

### Database Schema
- [ ] **Downloads Table**
  - [ ] content_id (Stremio ID)
  - [ ] title, year, type (movie/series)
  - [ ] file_path, file_size
  - [ ] download_date, status
  - [ ] real_debrid_id, quality

- [ ] **Series Episodes Table**
  - [ ] series_id, season, episode
  - [ ] episode_title, file_path
  - [ ] download_status, quality

## User Experience Features

### Download Workflow
- [ ] **One-Click Downloads**
  - [ ] Minimal user interaction required
  - [ ] Download trigger from Stremio streams
  - [ ] Progress indication and feedback
  - [ ] Automatic catalog updates

- [ ] **Download Management**
  - [ ] Queue management and prioritization
  - [ ] Pause/resume functionality
  - [ ] Download cancellation
  - [ ] Storage space management

### Offline Library
- [ ] **Content Organization**
  - [ ] Movies and series separation
  - [ ] Season/episode hierarchy
  - [ ] Search and filtering capabilities
  - [ ] Sorting options (date, name, size)

- [ ] **Playback Integration**
  - [ ] Seamless playback in Stremio
  - [ ] Quality selection and display
  - [ ] Playback progress tracking
  - [ ] Offline metadata display

## Testing & Quality Assurance

### Real-Debrid Integration Testing
- [ ] **API Integration Tests**
  - [ ] Test all RD API endpoints
  - [ ] Mock RD responses for testing
  - [ ] Test error handling and edge cases
  - [ ] Validate download link generation

- [ ] **Download Workflow Tests**
  - [ ] End-to-end download testing
  - [ ] File organization validation
  - [ ] Progress tracking verification
  - [ ] Error recovery testing

### Stremio Integration Testing
- [ ] **Add-on Functionality**
  - [ ] Catalog generation testing
  - [ ] Stream resolution testing
  - [ ] Metadata serving testing
  - [ ] Offline behavior testing

- [ ] **Cross-Platform Testing**
  - [ ] Windows functionality testing
  - [ ] macOS functionality testing
  - [ ] iOS workaround testing
  - [ ] Cross-platform compatibility

## Deployment & Distribution

### Application Packaging
- [ ] **Windows Distribution**
  - [ ] Windows installer creation
  - [ ] Auto-start configuration
  - [ ] System integration
  - [ ] Update mechanism

- [ ] **macOS Distribution**
  - [ ] .app bundle creation
  - [ ] DMG installer
  - [ ] Code signing and notarization
  - [ ] Update mechanism

### Add-on Distribution
- [ ] **Stremio Add-on Registry**
  - [ ] Add-on manifest submission
  - [ ] Community catalog listing
  - [ ] Installation instructions
  - [ ] User documentation

- [ ] **Documentation & Support**
  - [ ] User installation guide
  - [ ] Real-Debrid setup instructions
  - [ ] Platform-specific guides
  - [ ] Troubleshooting documentation

## Success Criteria

### Functional Requirements
- [ ] **One-click downloads** from Stremio streams
- [ ] **Offline library** accessible in Stremio
- [ ] **Cross-platform support** (Windows, macOS, limited iOS)
- [ ] **Real-Debrid integration** (required dependency)
- [ ] **Local file serving** for offline playback

### Technical Requirements
- [ ] **Real-Debrid API integration** working reliably
- [ ] **Local HTTP server** serving files to Stremio
- [ ] **File organization** following specified naming conventions
- [ ] **Offline functionality** without internet connection
- [ ] **Error handling** for all failure scenarios

### User Experience Requirements
- [ ] **Minimal user interaction** for downloads
- [ ] **Native Stremio integration** (no external UI required)
- [ ] **Clear offline indicators** in Stremio interface
- [ ] **Easy content management** (delete, organize)
- [ ] **Reliable offline playback** experience

This corrected architecture now properly reflects the actual requirements from the Stremio Offlike Guide, with Real-Debrid as a required dependency and the two-part system architecture as specified.
