# Offlinio - Personal Media Downloader for Stremio

**A legally compliant, privacy-first offline media solution that integrates seamlessly with Stremio.**

---

## The Vision

**Imagine watching your favorite shows anywhere, anytime - even without internet.** Offlinio transforms Stremio into a powerful offline media center while maintaining strict legal compliance and user privacy.

### The Problem We Solved

Modern streaming relies on constant internet connectivity. What happens when you're traveling, have limited bandwidth, or simply want to guarantee access to content you have rights to view? Traditional solutions either violate terms of service, compromise privacy, or require complex setup procedures.

### Our Solution

Offlinio bridges this gap by creating a **legal, automated, and seamless** offline experience that works within existing legal frameworks while leveraging services you already use.

---

## How It All Started

### The User Story That Started Everything

> *"I have Stremio with Comet and Torrentio working perfectly. I have a Real-Debrid subscription. I want to click one button in Stremio and have content download for offline viewing - legally and automatically."*

This simple request led to a complex technical challenge: How do you add download functionality to Stremio without modifying the application itself?

### The Discovery Journey

Our research revealed that **Stremio's addon system** provides everything needed for seamless integration:

1. **Stream Endpoints** - Where users select video quality
2. **Catalog System** - For organizing downloaded content  
3. **Meta Endpoints** - For series and episode management
4. **Addon Protocol** - For legitimate third-party extensions

The breakthrough: **Download options appear as stream choices**, making the experience feel native to Stremio.

---

## Technical Innovation

### SDK Discovery and Analysis

We performed comprehensive analysis of the [Stremio Addon SDK](https://github.com/Stremio/stremio-addon-sdk) to understand:

- **Protocol Requirements** - HTTP endpoints, response formats, CORS policies
- **UI Integration Points** - How addons appear in Stremio's interface
- **Behavioral Hints** - How to control stream presentation and functionality
- **Cross-Platform Compatibility** - Desktop, web, and mobile considerations

**Key Insight**: Stremio treats all content sources identically - whether they're streaming URLs or download triggers.

### Implementation Strategy

Based on SDK analysis, we chose a **single addon architecture** that:

1. **Appears as legitimate streams** in Stremio's interface
2. **Integrates with existing workflows** users already understand
3. **Requires zero UI development** by leveraging Stremio's native interface
4. **Works across all platforms** where Stremio is available

---

## Architecture Decision Process

### Why Single Addon vs. Companion App

**Evaluated Approaches:**
- ❌ **Browser Extension** - Platform-specific, requires separate installation
- ❌ **Desktop Application** - Breaks Stremio workflow, requires window switching
- ❌ **Stremio Modification** - Violates terms of service, breaks updates
- ✅ **Addon Integration** - Native experience, cross-platform, legitimate

### Technical Implementation Choices

**Stream Presentation Strategy:**
```typescript
// Instead of external buttons, we provide stream options:
{
  "streams": [
    {
      "name": "Download for Offline",           // Appears as stream choice
      "title": "Download this content to your device",
      "url": "http://127.0.0.1:11471/download/tt1234567"
    },
    {
      "name": "Downloading... (45%)",           // Live progress updates
      "title": "Download in progress - click to manage"
    },
    {
      "name": "Play Offline (1080p)",           // Local playback option
      "title": "Play from your device (downloaded)"
    }
  ]
}
```

**Auto-Detection Philosophy:**
- **Zero Configuration** - Automatically detects available debrid services
- **Privacy First** - No external data transmission or account management
- **Service Agnostic** - Works with Real-Debrid, AllDebrid, Premiumize, etc.
- **Fallback Support** - Handles public domain content without debrid services

---

## Security & Privacy Architecture

### Privacy-by-Design Principles

**Data Minimization:**
- No user tracking or analytics
- Local storage only - no cloud synchronization
- Encrypted sensitive data (API tokens, preferences)
- Sanitized logging - no personal information exposed

**Security Measures:**
- Input validation on all endpoints
- CORS policy enforcement for Stremio compatibility
- Path traversal protection for file serving
- Token encryption using system keychain
- Legal compliance middleware with mandatory acceptance

### Legal Compliance Framework

**Built-in Safeguards:**
- **Mandatory Legal Notice** - Cannot be bypassed, blocks all functionality until accepted
- **DRM Detection** - Automatically refuses encrypted content
- **User Responsibility Model** - Clear legal boundaries and user obligations
- **No Content Indexing** - Never catalogs, promotes, or suggests content
- **Source Agnostic** - Only processes user-supplied content identifiers

**Acceptable Use Policy:**
- ✅ Personal backups of content you own
- ✅ Public domain and Creative Commons materials
- ✅ Content from authorized debrid services
- ✅ Enterprise internal media
- ❌ No DRM circumvention or unauthorized content

---

## Implementation Journey

### Phase 1: Research & Discovery
- **Stremio SDK Analysis** - Understanding addon capabilities and limitations
- **Legal Framework Research** - Establishing compliance boundaries
- **Service Integration Study** - Real-Debrid API capabilities and limitations
- **Cross-Platform Testing** - Ensuring universal compatibility

### Phase 2: Core Architecture
- **Express Server Setup** - Single-process addon server
- **Database Design** - Content tracking and download management
- **Addon Protocol Implementation** - Manifest, catalog, meta, and stream endpoints
- **Auto-Detection Service** - Multi-platform debrid service discovery

### Phase 3: Legal & Security Integration
- **Legal Notice System** - Mandatory first-run compliance acceptance
- **Privacy Controls** - Data minimization and local-only processing
- **Security Middleware** - Input validation and path protection
- **Error Handling** - Graceful failure modes with user guidance

### Phase 4: User Experience Polish
- **Progress Tracking** - Real-time download status in Stremio interface
- **File Organization** - Automatic Movies/Series folder structure
- **Quality Selection** - Intelligent best-quality automatic selection
- **Recovery Systems** - Robust error handling and retry mechanisms

---

## How It Works

### User Experience Flow

1. **One-Time Setup** (< 2 minutes)
   - Accept legal notice
   - Choose storage location
   - Optionally configure debrid service
   - Install addon to Stremio

2. **Daily Usage** (Zero friction)
   - Browse content normally in Stremio
   - Click "Download for Offline" in stream selection
   - Automatic detection and download begins
   - Content appears in "Downloaded Movies/Series" catalogs

3. **Offline Viewing**
   - Access downloaded content from Stremio catalogs
   - Full seeking, pause, resume functionality
   - Same interface as online streaming

### Technical Implementation

**Download Workflow:**
```
User clicks "Download for Offline"
     ↓
Auto-detect available debrid services
     ↓
Get magnet links from same source as Stremio streams
     ↓
Process through available debrid service
     ↓
Download directly to local storage
     ↓
Update Stremio catalogs with new content
```

**Progressive Enhancement:**
- **Not Downloaded** → Shows "Download for Offline" option
- **Downloading** → Shows "Downloading... (45%)" with live progress
- **Downloaded** → Shows "Play Offline" for local playback
- **Multiple States** → Can show several options simultaneously

---

## Project Structure

```
Offlinio/
├── src/                           # Source code
│   ├── addon.ts                   # Stremio addon endpoints
│   ├── server.ts                  # Express server setup
│   ├── services/                  # Business logic
│   │   ├── catalog.ts             # Content catalog management
│   │   ├── real-debrid-client.ts  # Debrid service integration
│   │   ├── auto-debrid.ts         # Service auto-detection
│   │   ├── legal-notice.ts        # Legal compliance system
│   │   └── ...                    # Additional services
│   └── ui/                        # Web management interface
├── docs/                          # Documentation
│   ├── 01-concept/                # User stories and project vision
│   ├── 02-discovery/              # SDK analysis and research
│   ├── 03-implementation/         # Technical implementation guides
│   ├── 04-security/               # Security and privacy documentation
│   ├── 05-legal/                  # Legal compliance framework
│   └── 06-deployment/             # Deployment and setup guides
├── project-management/            # Planning and task tracking
├── tests/                         # Comprehensive testing suite
└── prisma/                        # Database schema and migrations
```

---

## Quick Start

### Prerequisites
- Node.js 18+ and npm 9+
- Stremio (Desktop or Web)
- Optional: Debrid service account (Real-Debrid, AllDebrid, etc.)

### Installation

```bash
# Clone and install
git clone https://github.com/your-username/offlinio.git
cd offlinio
npm install

# Set up environment
cp env.example .env
# Edit .env with your preferences (optional)

# Initialize database
npm run db:generate
npm run db:migrate

# Start the application
npm run dev
```

### Add to Stremio

1. Start Offlinio server
2. Open Stremio
3. Go to Add-ons → Add Addon
4. Enter: `http://127.0.0.1:11471/manifest.json`
5. Install the addon

### First Use

1. Complete legal notice acceptance
2. Choose download storage location
3. Configure debrid service (optional)
4. Start downloading content!

---

## Platform Support

| Platform | Status | Notes |
|----------|---------|-------|
| **Windows** | Full Support | All features available |
| **macOS** | Full Support | All features available |
| **Linux** | Full Support | All features available |
| **Android** | Supported | Via network access to local server |
| **iOS** | Limited | Stremio iOS cannot reach localhost |

---

## Advanced Features

### Auto-Detection System
- **Multi-Service Support** - Real-Debrid, AllDebrid, Premiumize, DebridLink
- **Zero Configuration** - Automatically finds and uses available services
- **Graceful Fallback** - Handles public domain content without debrid services
- **Service Health Monitoring** - Automatic failover between services

### Content Management
- **Intelligent Organization** - Movies and Series automatically categorized
- **Quality Optimization** - Automatic best-quality selection
- **Metadata Integration** - Rich content information and posters
- **Search and Filtering** - Find downloaded content quickly

### Privacy Protection
- **Local Processing Only** - No data leaves your device
- **Encrypted Storage** - Sensitive information protected
- **Minimal Logging** - Only essential information recorded
- **No Telemetry** - Complete privacy by design

---

## Legal Framework

### Compliance Architecture

**Technical Safeguards:**
- Mandatory legal notice acceptance before any functionality
- Automatic DRM detection and blocking
- No content indexing, cataloging, or promotion
- User-supplied content identifiers only
- No circumvention tools or techniques

**User Responsibilities:**
- Must have legal rights to all downloaded content
- Compliance with local laws and regulations
- Respect for content creators and copyright holders
- No distribution or sharing of downloaded content

**Supported Use Cases:**
- Personal backups of owned physical media
- Public domain and Creative Commons content
- Content from authorized subscription services
- Educational and fair use scenarios

---

## Security Considerations

### Data Protection
- **Encryption at Rest** - API tokens and sensitive data encrypted
- **Secure Communication** - HTTPS for all external API calls
- **Input Validation** - All user inputs sanitized and validated
- **Path Protection** - No directory traversal vulnerabilities

### Network Security
- **CORS Configuration** - Proper cross-origin policies for Stremio
- **Rate Limiting** - Protection against abuse and overload
- **Error Handling** - No sensitive information leaked in error messages
- **Secure Defaults** - Conservative security settings throughout

---

## Contributing

We welcome contributions that maintain our high standards for legal compliance, security, and user privacy. Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting any changes.

### Code of Conduct
- **Legal Compliance First** - All contributions must respect legal boundaries
- **Privacy by Design** - No features that compromise user privacy
- **Security Minded** - Security considerations for all changes
- **Quality Standards** - Comprehensive testing and documentation required

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

### Important Legal Notice

This software is provided for **personal, lawful use only**. Users are responsible for:

1. Having legal rights to all downloaded content
2. Complying with applicable laws in their jurisdiction
3. Respecting content creators and copyright holders
4. Not using this tool for piracy or unauthorized distribution

The developers do not promote, encourage, or facilitate copyright infringement or any other illegal activity.

---

## Support & Community

- **Documentation**: Comprehensive guides in the `/docs` directory
- **Issues**: Report bugs and request features via GitHub Issues
- **Discussions**: Ask questions and share experiences via GitHub Discussions
- **Security**: Report security vulnerabilities privately to the maintainers

---

## Acknowledgments

Built with respect for:
- **Stremio** - For creating an extensible platform that enables legitimate addons
- **Real-Debrid & Other Services** - For providing legal content acceleration services
- **Open Source Community** - For the tools and libraries that make this possible
- **Legal Content Creators** - Whose work we aim to support through legitimate access

---

**Offlinio** - Making offline media accessible while respecting creators' rights.