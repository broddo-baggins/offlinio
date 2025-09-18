# Legal-Safe Offlinio Architecture

## Legal Compliance Framework

Based on Israeli law and international best practices, Offlinio is designed as a **legally defensible downloader** that follows strict guidelines to avoid secondary liability.

## Core Legal Principles

### 1. Source-Agnostic Design
- ✅ **No catalogs, indexing, or link resolution**
- ✅ **Accept only user-supplied URLs or content IDs**
- ✅ **User must already have rights to access content**
- ❌ **No content discovery or promotion**

### 2. No DRM Bypass
- ✅ **Detect and refuse DRM-protected streams**
- ✅ **Block Widevine (.mpd) and FairPlay (HLS) streams**
- ✅ **Refuse known license endpoints**
- ❌ **No keys, CDMs, decryptors, or license hacks**

### 3. Lawful Use Only
- ✅ **Personal backups of user-owned content**
- ✅ **Public domain and Creative Commons content**
- ✅ **Enterprise internal media**
- ✅ **User-generated content**
- ❌ **No "free movies" language or examples**

## System Architecture

### Single Stremio Addon (Legally Compliant)
```
┌─────────────────────────────────────┐
│     Offlinio - Legal Downloader     │
├─────────────────────────────────────┤
│  • User URL Input Interface        │
│  • DRM Detection & Blocking        │
│  • Local File Download Manager     │
│  • Offline Content Browser         │
│  • Legal Compliance Checker        │
│  • Privacy-by-Design Features      │
└─────────────────────────────────────┘
```

### Core Components

#### 1. User Input Interface
- **User-supplied URLs only** - no content discovery
- **Content ID validation** - user must prove access rights
- **Legal disclaimer** - clear "you must have rights" notice
- **Terms acceptance** - explicit lawful use agreement

#### 2. DRM Detection & Blocking
- **Widevine detection** - refuse .mpd with Widevine
- **FairPlay detection** - refuse HLS with FairPlay tags
- **License endpoint blocking** - refuse known DRM services
- **Stream validation** - ensure non-DRM content only

#### 3. Local Download Manager
- **Direct-to-disk saving** - no proxying or caching
- **User's local storage only** - no cloud or remote storage
- **Progress tracking** - download status and progress
- **Error handling** - clear failure reasons

#### 4. Offline Content Browser
- **Local files only** - browse downloaded content
- **No external links** - no connection to external sources
- **Metadata display** - show local file information
- **Playback interface** - serve files to Stremio

## Data Flow (Legal Compliance)

```
┌─────────────┐    ┌─────────────────────────────────────┐
│    User     │────│           Offlinio Addon           │
│  (Provides  │    │                                     │
│   URLs)     │    │  ┌─────────────┐  ┌─────────────┐  │
└─────────────┘    │  │ URL Input   │  │ DRM Checker │  │
                   │  │ Validator   │  │ & Blocker   │  │
                   │  └─────────────┘  └─────────────┘  │
                   │  ┌─────────────┐  ┌─────────────┐  │
                   │  │ Download    │  │ Local File  │  │
                   │  │ Manager     │  │ Browser     │  │
                   │  └─────────────┘  └─────────────┘  │
                   └─────────────────────────────────────┘
                                     │
                   ┌─────────────┐    │
                   │User's Local │────┘
                   │File System  │
                   └─────────────┘
```

## Technical Implementation

### 1. User URL Input System
```javascript
class UserURLInput {
  async validateUserURL(url, userRightsConfirmation) {
    // Require explicit user confirmation of rights
    if (!userRightsConfirmation) {
      throw new Error('User must confirm they have rights to this content');
    }
    
    // Basic URL validation only
    if (!this.isValidURL(url)) {
      throw new Error('Invalid URL format');
    }
    
    // Check for DRM indicators
    if (await this.hasDRMIndicators(url)) {
      throw new Error('DRM-protected content is not supported');
    }
    
    return { valid: true, url, disclaimer: 'User confirmed rights to content' };
  }
}
```

### 2. DRM Detection & Blocking
```javascript
class DRMDetector {
  async checkForDRM(streamURL) {
    // Block Widevine (.mpd files)
    if (streamURL.includes('.mpd') || this.hasWidevineIndicators(streamURL)) {
      throw new Error('Widevine DRM detected - download blocked');
    }
    
    // Block FairPlay (HLS with DRM)
    if (this.hasFairPlayIndicators(streamURL)) {
      throw new Error('FairPlay DRM detected - download blocked');
    }
    
    // Block known license endpoints
    if (this.isKnownLicenseEndpoint(streamURL)) {
      throw new Error('DRM license endpoint detected - download blocked');
    }
    
    return { drmFree: true };
  }
  
  hasWidevineIndicators(url) {
    const widevinePatterns = [
      'pssh',
      'widevine',
      'default_KID',
      'cenc:default_KID'
    ];
    return widevinePatterns.some(pattern => 
      url.toLowerCase().includes(pattern.toLowerCase())
    );
  }
  
  hasFairPlayIndicators(url) {
    const fairplayPatterns = [
      'skd://',
      'fairplay',
      'fps-',
      'urn:uuid:94ce86fb-07ff-4f43-adb8-93d2fa968ca2'
    ];
    return fairplayPatterns.some(pattern => 
      url.toLowerCase().includes(pattern.toLowerCase())
    );
  }
}
```

### 3. Legal Compliance Checker
```javascript
class LegalComplianceChecker {
  async validateDownloadRequest(url, userDeclaration) {
    // Require user declaration of rights
    const requiredDeclarations = [
      'I own this content',
      'This is public domain content',
      'This is Creative Commons licensed',
      'I have rights to download this content'
    ];
    
    if (!requiredDeclarations.includes(userDeclaration)) {
      throw new Error('User must declare legal rights to content');
    }
    
    // Check for obvious infringing patterns
    if (this.hasInfringingPatterns(url)) {
      throw new Error('Content appears to be from unauthorized source');
    }
    
    return { 
      compliant: true, 
      declaration: userDeclaration,
      timestamp: new Date()
    };
  }
  
  hasInfringingPatterns(url) {
    // Block obvious piracy patterns without deep content inspection
    const suspiciousPatterns = [
      'torrent',
      'magnet:',
      'pirate',
      'free-movies',
      'watch-online'
    ];
    
    return suspiciousPatterns.some(pattern => 
      url.toLowerCase().includes(pattern.toLowerCase())
    );
  }
}
```

### 4. Privacy-by-Design
```javascript
class PrivacyManager {
  constructor() {
    this.telemetryEnabled = false; // Default off
    this.offlineMode = true; // Default on
  }
  
  logDownload(url, success) {
    // Minimal logging - no URLs, hashes, or titles
    const log = {
      timestamp: new Date(),
      success: success,
      size: success ? 'completed' : 'failed',
      // No identifying information
    };
    
    // Store locally only, no external transmission
    this.storeLocalLog(log);
  }
  
  getUserConsent() {
    return {
      message: "Offlinio minimizes data collection. We do not collect URLs, titles, or content identifiers.",
      options: {
        telemetry: false, // Default off
        offlineMode: true, // Default on
        errorReporting: false // Default off
      }
    };
  }
}
```

## User Interface Design

### 1. Legal-First UI
```javascript
// First run notice
const LEGAL_NOTICE = {
  title: "Legal Use Only",
  message: `
    You must have the rights to download this content.
    
    Acceptable uses:
    • Personal backups of content you own
    • Public domain materials
    • Creative Commons licensed content
    • Enterprise internal media
    • Your own user-generated content
    
    By continuing, you confirm you will only download content you have legal rights to access.
  `,
  requireAcceptance: true
};

// DRM Policy Notice
const DRM_POLICY = {
  title: "DRM Policy",
  message: `
    This tool will not access, bypass, or assist in bypassing access controls.
    DRM-protected content will be automatically detected and blocked.
  `,
  requireAcceptance: true
};
```

### 2. User Input Interface
```javascript
class UserInputInterface {
  renderURLInput() {
    return {
      title: "Download Your Content",
      subtitle: "Enter the URL of content you have rights to download",
      fields: [
        {
          label: "Content URL",
          type: "url",
          placeholder: "https://your-content-url.com/video.mp4",
          required: true
        },
        {
          label: "I confirm I have legal rights to this content",
          type: "checkbox",
          required: true
        },
        {
          label: "Content type",
          type: "select",
          options: [
            "Personal backup",
            "Public domain",
            "Creative Commons",
            "Enterprise content",
            "User-generated content"
          ],
          required: true
        }
      ]
    };
  }
}
```

## Deployment Considerations

### 1. Neutral Branding
- **Name**: "Offlinio Personal Media Downloader"
- **Description**: "Download manager for personal media files"
- **Examples**: Only public domain or CC content in screenshots
- **Documentation**: Focus on lawful use cases

### 2. Open Source License
```
MIT License with Acceptable Use Policy

This software is provided for lawful use only:
- Personal backups of user-owned content
- Public domain materials
- Creative Commons licensed content
- Enterprise internal media
- User-generated content

This software will not:
- Bypass DRM or access controls
- Resolve links or provide catalogs
- Index or host content

Users are solely responsible for ensuring they have rights to any content downloaded.
```

### 3. DMCA Compliance (if hosting in US)
```
DMCA Agent: [Name and Contact]
Takedown Process: [Clear steps for rights holders]
Abuse Policy: [Clear procedures for handling reports]
```

## Implementation Checklist

### Legal Safeguards
- [ ] Plain-English "You must have rights" notice on first run
- [ ] DRM policy stating no bypass functionality
- [ ] No bundled add-ons or presets that fetch catalogs
- [ ] Ship only downloader and local file browser
- [ ] DMCA agent designation (if US hosting)
- [ ] Clean monetization (no ads tied to popular shows)

### Technical Safeguards
- [ ] Block .mpd with Widevine indicators
- [ ] Block HLS with FairPlay tags
- [ ] Refuse known license endpoints
- [ ] No link resolution or catalog features
- [ ] No content indexing or discovery
- [ ] Local storage only (no proxying/caching)

### Privacy Features
- [ ] Minimal telemetry (default off)
- [ ] No URL, hash, or title collection
- [ ] Offline mode available
- [ ] Local-only data storage
- [ ] Clear privacy policy

This legal-safe architecture ensures Offlinio operates within the bounds of Israeli law and international best practices while providing useful functionality for legitimate users.
