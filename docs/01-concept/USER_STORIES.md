# 🎬 Offlinio User Stories - Northstar Document

**Target User Profile:**
- ✅ Has Stremio installed with **Comet + Torrentio + Trakt** addons working
- ✅ Has valid **Real-Debrid subscription** and API token
- ✅ Uses **desktop Stremio** primarily (Windows/macOS/Linux)
- ✅ Wants to **download content for offline viewing**
- ✅ Understands they need **legal rights** to content they download

---

## 🚀 **Epic 1: First-Time Setup & Onboarding**

### **Story 1.1: Real-Debrid Connection**
**As a new user**, I want to connect my Real-Debrid account so that I can download content through my existing subscription.

**Acceptance Criteria:**
- [ ] I can paste my Real-Debrid API token in the setup wizard
- [ ] System validates my token and shows my account status (username, expiration, premium status)
- [ ] If token is invalid/expired, I get clear error message with link to get new token
- [ ] Token is stored securely and encrypted at rest
- [ ] I can re-authenticate if my token expires later

**Implementation Priority:** 🔴 **Critical** (blocks all downloads)

---

### **Story 1.2: Storage Location Setup**
**As a new user**, I want to choose where my downloads are stored so that I have control over my file organization.

**Acceptance Criteria:**
- [ ] System suggests appropriate default location based on OS:
  - Windows: `%UserProfile%\Videos\Offlinio`
  - macOS: `~/Movies/Offlinio`
  - Linux: `~/Videos/Offlinio`
- [ ] I can browse and select a custom storage location
- [ ] System tests write permissions and warns if insufficient
- [ ] System shows available free space and warns if < 10GB
- [ ] Storage location is persistent across restarts

**Implementation Priority:** 🔴 **Critical** (blocks file storage)

---

### **Story 1.3: Legal Notice Acceptance**
**As a new user**, I must accept the legal terms so that I understand my responsibilities regarding content downloads.

**Acceptance Criteria:**
- [ ] Legal notice is shown on first run and cannot be bypassed
- [ ] Terms clearly state user responsibility for content rights
- [ ] Terms explain no DRM circumvention or unauthorized content
- [ ] I must explicitly accept before using any download features
- [ ] Acceptance is recorded with timestamp and cannot be undone

**Implementation Priority:** 🔴 **Critical** (legal compliance)

---

## 🎯 **Epic 2: Download Initiation & Triggers**

### **Story 2.1: Single Content Download**
**As a user browsing content in Stremio**, I want to see a "📥 Download for Offline" option so that I can easily download any movie or episode.

**Acceptance Criteria:**
- [ ] "📥 Download for Offline" appears in stream list for all content
- [ ] Clicking it starts download with best available quality (2160p > 1080p > 720p)
- [ ] I get immediate feedback: "Download started for [Title]"
- [ ] Download appears in queue with progress bar
- [ ] If no sources available, I get clear "No sources found" message
- [ ] Works for both movies and individual episodes

**Implementation Priority:** 🔴 **Critical** (core user story)

---

### **Story 2.2: Quality Selection**
**As a user**, I want to choose quality/size when multiple options exist so that I can balance quality vs storage space.

**Acceptance Criteria:**
- [ ] If multiple qualities available, I see a quality selection dialog
- [ ] Options show: Quality (1080p), Size (2.5 GB), Seeders (45)
- [ ] I can set default quality preference in settings
- [ ] "Auto" mode picks best quality under size limit (e.g., < 5GB for movies)
- [ ] Selection is remembered for similar content

**Implementation Priority:** 🟡 **High** (improves user control)

---

### **Story 2.3: Season/Batch Download**
**As a user viewing a TV series**, I want to download entire seasons or multiple episodes so that I can binge-watch offline.

**Acceptance Criteria:**
- [ ] From series page, I see "Download Season" button
- [ ] I can select which episodes to download (checkboxes)
- [ ] "Download All Unwatched" option using my Trakt progress
- [ ] Batch downloads are queued and processed sequentially
- [ ] I see overall progress: "Downloading Season 1: 3/10 episodes complete"
- [ ] I can cancel/pause the entire batch

**Implementation Priority:** 🟡 **High** (major UX improvement)

---

### **Story 2.4: Smart File Selection**
**As a user**, I want the system to automatically pick the right files from multi-file torrents so that I get the main content without extras.

**Acceptance Criteria:**
- [ ] System identifies largest video file(s) as main content
- [ ] Skips sample files, extras, behind-the-scenes content
- [ ] For TV packs, maps files to correct episodes using naming patterns
- [ ] Warns if file mapping is uncertain and lets me choose
- [ ] Preference to include/exclude subtitle files

**Implementation Priority:** 🟡 **High** (avoids wrong downloads)

---

## 📊 **Epic 3: Download Management & Queue**

### **Story 3.1: Queue Visibility**
**As a user**, I want to see all my downloads and their progress so that I can monitor what's happening.

**Acceptance Criteria:**
- [ ] Web UI shows current downloads with real-time progress
- [ ] For each download I see: Title, Progress %, Speed, ETA, Status
- [ ] Status options: Queued, Downloading, Paused, Completed, Failed
- [ ] Downloads persist across app restarts
- [ ] Failed downloads show error reason and retry option

**Implementation Priority:** 🔴 **Critical** (download monitoring)

---

### **Story 3.2: Queue Control**
**As a user**, I want to pause, resume, cancel, and reorder downloads so that I can manage my bandwidth and priorities.

**Acceptance Criteria:**
- [ ] Pause/Resume buttons work immediately
- [ ] Cancel removes from queue and cleans up partial files
- [ ] Drag-and-drop to reorder queue
- [ ] "Pause All" and "Resume All" options
- [ ] Set maximum concurrent downloads (default: 3)
- [ ] Set global speed limit (optional)

**Implementation Priority:** 🟡 **High** (user control)

---

### **Story 3.3: Download Recovery**
**As a user**, I want downloads to resume after crashes or network issues so that I don't lose progress on large files.

**Acceptance Criteria:**
- [ ] HTTP downloads support resume from byte offset
- [ ] App restart resumes incomplete downloads automatically
- [ ] Network drop auto-retries with exponential backoff
- [ ] Partial files are validated and resumed only if intact
- [ ] Max retry attempts before marking as failed (default: 3)

**Implementation Priority:** 🟡 **High** (reliability)

---

### **Story 3.4: Storage Management**
**As a user**, I want to know how much space I'm using and get warnings when storage is low.

**Acceptance Criteria:**
- [ ] Dashboard shows: Used space, Free space, Total downloaded
- [ ] Warning at 90% capacity: "Storage almost full"
- [ ] Error at 95% capacity: "Cannot start new downloads"
- [ ] Quick action: "Delete oldest downloads to free space"
- [ ] Option to set storage limit (e.g., max 100GB for downloads)

**Implementation Priority:** 🟡 **High** (prevents storage issues)

---

## 📺 **Epic 4: Offline Library & Catalogs**

### **Story 4.1: Downloaded Content Catalogs**
**As a user in Stremio**, I want to see "Downloaded Movies" and "Downloaded Series" catalogs so that I can browse my offline content.

**Acceptance Criteria:**
- [ ] "Downloaded Movies" catalog shows all downloaded movies with posters
- [ ] "Downloaded Series" catalog shows series with episode counts
- [ ] Catalogs work completely offline (no internet required)
- [ ] Search within downloaded content works
- [ ] Sort options: Recently Downloaded, Title A-Z, Year, Size

**Implementation Priority:** 🔴 **Critical** (core offline experience)

---

### **Story 4.2: Series Episode Management**
**As a user viewing a downloaded series**, I want to see only episodes I have downloaded so that I know what's available offline.

**Acceptance Criteria:**
- [ ] Series detail page shows only downloaded episodes
- [ ] Episodes show download date and file size
- [ ] Missing episodes clearly indicated: "Episode 3 - Not Downloaded"
- [ ] Quick download action for missing episodes
- [ ] Season progress indicator: "Season 1: 7/10 episodes"

**Implementation Priority:** 🟡 **High** (series navigation)

---

### **Story 4.3: Poster & Metadata Caching**
**As a user**, I want rich metadata and posters to work offline so that my library looks professional without internet.

**Acceptance Criteria:**
- [ ] All movie/series posters cached locally on download
- [ ] Metadata includes: Title, Year, Genre, Plot, Cast
- [ ] Metadata fetched from TMDB/IMDB during download
- [ ] Fallback to torrent title if metadata unavailable
- [ ] Library renders fully offline with cached images

**Implementation Priority:** 🟡 **High** (offline experience)

---

### **Story 4.4: Watch Progress Integration**
**As a user**, I want my offline viewing to sync with Trakt so that my watch progress is consistent.

**Acceptance Criteria:**
- [ ] Playing downloaded content marks as "Watching" in Trakt
- [ ] Finishing downloaded content marks as "Watched" in Trakt
- [ ] Resume position synced if supported by player
- [ ] Option to disable Trakt sync for privacy
- [ ] Manual "Mark as Watched" option in library

**Implementation Priority:** 🟢 **Medium** (nice-to-have integration)

---

## 🎮 **Epic 5: Local Playback & Streaming**

### **Story 5.1: High-Quality Local Streaming**
**As a user**, I want downloaded content to play smoothly with seeking so that offline viewing feels like streaming.

**Acceptance Criteria:**
- [ ] Local HTTP server supports range requests for seeking
- [ ] Seeking works within 250ms for any position
- [ ] Multiple video formats supported: MKV, MP4, AVI, WEBM
- [ ] Proper MIME type headers for Stremio compatibility
- [ ] No transcoding required (direct file serving)

**Implementation Priority:** 🔴 **Critical** (playback quality)

---

### **Story 5.2: Subtitle Support**
**As a user**, I want subtitles to work with downloaded content so that I can watch foreign content offline.

**Acceptance Criteria:**
- [ ] Embedded subtitles in MKV/MP4 work automatically
- [ ] External .srt files are served alongside video
- [ ] Subtitle files auto-downloaded if available from torrent
- [ ] Multiple subtitle languages supported
- [ ] Stremio's subtitle controls work with local content

**Implementation Priority:** 🟢 **Medium** (accessibility)

---

### **Story 5.3: Audio Track Selection**
**As a user**, I want to choose audio tracks for downloaded content so that I can watch in my preferred language.

**Acceptance Criteria:**
- [ ] Multiple audio tracks preserved in downloads
- [ ] Stremio's audio selection works with local files
- [ ] Default audio track selection based on system language
- [ ] Audio codec support: AAC, AC3, DTS, FLAC
- [ ] No audio transcoding required

**Implementation Priority:** 🟢 **Medium** (multilingual support)

---

## 🗂️ **Epic 6: Library Management & Organization**

### **Story 6.1: Content Browsing & Sorting**
**As a user**, I want to browse and sort my downloaded content so that I can find what I want to watch.

**Acceptance Criteria:**
- [ ] Web UI shows all downloads in grid/list view
- [ ] Sort options: Title, Date Downloaded, File Size, Quality, Status
- [ ] Filter options: Movies/Series, Quality, Download Date
- [ ] Search by title across all downloaded content
- [ ] Bulk selection for management actions

**Implementation Priority:** 🟡 **High** (library organization)

---

### **Story 6.2: Content Deletion**
**As a user**, I want to delete downloaded content to free up space when I'm done watching.

**Acceptance Criteria:**
- [ ] Delete button on each item with confirmation dialog
- [ ] Bulk delete selected items
- [ ] "Delete watched content" based on Trakt status
- [ ] File and database entry removed completely
- [ ] Content disappears from Stremio catalogs immediately
- [ ] Freed space shown in storage statistics

**Implementation Priority:** 🟡 **High** (storage management)

---

### **Story 6.3: Auto-Cleanup Policies**
**As a user**, I want automatic cleanup to manage storage without manual intervention.

**Acceptance Criteria:**
- [ ] Auto-delete watched content after X days (configurable)
- [ ] Auto-delete oldest content when storage limit reached
- [ ] Keep favorites/pinned content regardless of age
- [ ] Storage cap enforcement: delete oldest to stay under limit
- [ ] Weekly cleanup summary: "Deleted 5 old items, freed 12GB"

**Implementation Priority:** 🟢 **Medium** (automation)

---

### **Story 6.4: Content Organization**
**As a user**, I want to organize my content into collections so that I can group related items.

**Acceptance Criteria:**
- [ ] Create custom collections: "Marvel Movies", "Binge Later"
- [ ] Add/remove content from collections
- [ ] Collections appear as separate catalogs in Stremio
- [ ] Auto-collections based on genre or franchise
- [ ] Share collection lists between devices

**Implementation Priority:** 🟢 **Low** (advanced organization)

---

## ⚠️ **Epic 7: Error Handling & Edge Cases**

### **Story 7.1: Real-Debrid Issues**
**As a user**, I want clear feedback when Real-Debrid has problems so that I know what action to take.

**Acceptance Criteria:**
- [ ] "RD token expired" → link to get new token
- [ ] "Torrent not cached on RD" → try different source or wait
- [ ] "RD account suspended" → contact support information
- [ ] "RD rate limit exceeded" → automatic retry with backoff
- [ ] "RD server error" → retry later suggestion

**Implementation Priority:** 🟡 **High** (user support)

---

### **Story 7.2: Download Failures**
**As a user**, I want helpful error messages when downloads fail so that I can understand what went wrong.

**Acceptance Criteria:**
- [ ] Network errors: "Connection lost, retrying..."
- [ ] File errors: "Insufficient storage space"
- [ ] Source errors: "Source no longer available"
- [ ] Permission errors: "Cannot write to download folder"
- [ ] Each error includes suggested action

**Implementation Priority:** 🟡 **High** (debugging support)

---

### **Story 7.3: Multi-File Torrent Handling**
**As a user**, I want smart handling of torrents with multiple files so that I get the content I want.

**Acceptance Criteria:**
- [ ] TV packs: automatically map episodes to correct names
- [ ] Movie collections: offer individual movie selection
- [ ] Sample files: automatically excluded
- [ ] Subtitle files: optionally included
- [ ] If mapping uncertain, show file selection dialog

**Implementation Priority:** 🟡 **High** (content accuracy)

---

### **Story 7.4: File System Edge Cases**
**As a user**, I want the system to handle file system limitations gracefully.

**Acceptance Criteria:**
- [ ] Windows path length limits handled (use \\?\ prefix)
- [ ] Invalid filename characters sanitized
- [ ] Duplicate filename conflicts resolved with (2), (3) suffix
- [ ] Permission issues reported with fix suggestions
- [ ] Cross-drive downloads handled properly

**Implementation Priority:** 🟢 **Medium** (robustness)

---

## 📱 **Epic 8: Mobile & Platform Support**

### **Story 8.1: iOS Fallback Flow**
**As an iOS user**, I want a documented way to access my downloads since localhost streaming doesn't work reliably in Stremio iOS.

**Acceptance Criteria:**
- [ ] Help documentation explains iOS limitations
- [ ] Suggests using Real-Debrid "My Downloads" section
- [ ] Instructions for external players (VLC, Infuse)
- [ ] QR code sharing for download links
- [ ] Web UI optimized for mobile browsers

**Implementation Priority:** 🟢 **Medium** (platform coverage)

---

### **Story 8.2: Android Local Network**
**As an Android user**, I want to access downloads from my phone when connected to the same network as my Offlinio server.

**Acceptance Criteria:**
- [ ] Server accepts connections from LAN IP addresses
- [ ] Mobile-friendly web interface
- [ ] QR code for easy mobile access
- [ ] Download progress visible on mobile
- [ ] Option to stream to phone over LAN

**Implementation Priority:** 🟢 **Medium** (mobile convenience)

---

### **Story 8.3: Remote Access**
**As a user away from home**, I want secure access to my downloads so that I can watch my content anywhere.

**Acceptance Criteria:**
- [ ] Optional VPN/tunnel setup for remote access
- [ ] HTTPS with self-signed certificate option
- [ ] Authentication for remote access
- [ ] Bandwidth limiting for remote streaming
- [ ] Security warnings and best practices

**Implementation Priority:** 🟢 **Low** (advanced feature)

---

## 🔒 **Epic 9: Security & Privacy**

### **Story 9.1: Token Security**
**As a user**, I want my Real-Debrid credentials stored securely so that my account is protected.

**Acceptance Criteria:**
- [ ] API tokens encrypted at rest using system keychain
- [ ] No tokens logged in plain text
- [ ] Secure token transmission (HTTPS only)
- [ ] Option to clear stored credentials
- [ ] Session timeout for web UI

**Implementation Priority:** 🟡 **High** (security)

---

### **Story 9.2: Privacy Protection**
**As a user**, I want my usage data to stay local so that my viewing habits are private.

**Acceptance Criteria:**
- [ ] No telemetry or analytics sent externally
- [ ] All data stored locally only
- [ ] Option to disable access logs
- [ ] Clear privacy policy in legal notice
- [ ] No third-party tracking scripts

**Implementation Priority:** 🟡 **High** (privacy)

---

### **Story 9.3: Legal Compliance Features**
**As a user**, I want tools to help me stay compliant with copyright law.

**Acceptance Criteria:**
- [ ] Clear warning about user responsibility for content rights
- [ ] No indexing or linking to unauthorized content
- [ ] DRM detection and blocking
- [ ] Option to report suspected copyright issues
- [ ] Links to legitimate streaming services

**Implementation Priority:** 🔴 **Critical** (legal protection)

---

## 🎯 **Acceptance Criteria Summary**

### **MVP (Minimum Viable Product) Requirements:**
- ✅ Real-Debrid authentication and token management
- ✅ Single content download trigger in Stremio
- ✅ Download queue with progress monitoring
- ✅ Downloaded content catalogs in Stremio
- ✅ Local HTTP streaming with seek support
- ✅ Basic content deletion and storage management
- ✅ Legal notice acceptance system

### **Version 1.0 Target:**
- ✅ All MVP features
- ✅ Quality selection and batch downloads
- ✅ Robust error handling and recovery
- ✅ Poster/metadata caching for offline
- ✅ Web UI for complete download management
- ✅ Multi-platform support (Windows/macOS/Linux)

### **Future Enhancements:**
- ✅ Advanced organization and collections
- ✅ Mobile platform optimizations
- ✅ Auto-cleanup and storage policies
- ✅ Trakt integration and watch progress sync
- ✅ Advanced subtitle and audio track handling

---

This document serves as our **northstar** for Offlinio development, ensuring we build exactly what users need for a seamless offline viewing experience with their existing Stremio + Comet + Torrentio + Real-Debrid setup.
