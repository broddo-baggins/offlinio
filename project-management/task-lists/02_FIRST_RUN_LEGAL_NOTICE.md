# First-Run Legal Notice Implementation Tasks

## Priority: CRITICAL - Must be implemented first

### 1. Installation Legal Notice System
**Show legal notice immediately when user installs the plugin**

#### Legal Notice Display
- [ ] **Immediate Display on Installation**
  - [ ] Trigger legal notice on first addon load
  - [ ] Block all functionality until accepted
  - [ ] Cannot be dismissed or bypassed
  - [ ] Clear, prominent display

- [ ] **Legal Notice Content**
  - [ ] "You must have legal rights to download any content"
  - [ ] List acceptable uses (personal backups, public domain, CC, etc.)
  - [ ] List prohibited uses (DRM bypass, unauthorized content)
  - [ ] Clear "I Understand and Agree" button
  - [ ] "Cancel Installation" option

- [ ] **Notice Persistence**
  - [ ] Record user acceptance locally
  - [ ] Store timestamp and version
  - [ ] Check on every addon startup
  - [ ] Re-show if notice version updated

#### Implementation Code
```javascript
// addon/src/legal/installation-notice.js
class InstallationLegalNotice {
  constructor() {
    this.storageKey = 'offlinio_legal_acceptance';
    this.currentVersion = '1.0.0';
  }
  
  async checkAndShowNotice() {
    const acceptance = await this.getStoredAcceptance();
    
    if (!acceptance || acceptance.version !== this.currentVersion) {
      return await this.showLegalNotice();
    }
    
    return { accepted: true, previouslyAccepted: true };
  }
  
  async showLegalNotice() {
    const notice = {
      title: "🛡️ Offlinio - Legal Use Only 🛡️",
      message: `
        You must have legal rights to download any content.
        
        ✅ ACCEPTABLE USES:
        • Personal backups of content you own
        • Public domain materials
        • Creative Commons licensed content
        • Content from your authorized providers
        • Your own user-generated content
        
        ❌ THIS TOOL WILL NOT:
        • Bypass DRM or access controls
        • Provide links to unauthorized content
        • Index or catalog content sources
        
        By continuing, you confirm you will only download content 
        you have legal rights to access.
      `,
      modal: true,
      dismissible: false,
      buttons: [
        {
          text: "I Understand and Agree",
          primary: true,
          action: () => this.recordAcceptance(true)
        },
        {
          text: "Cancel Installation", 
          secondary: true,
          action: () => this.recordAcceptance(false)
        }
      ]
    };
    
    return await this.displayModal(notice);
  }
  
  async recordAcceptance(accepted) {
    const record = {
      accepted: accepted,
      timestamp: new Date().toISOString(),
      version: this.currentVersion,
      userAgent: navigator.userAgent
    };
    
    await this.storeLocally(this.storageKey, record);
    
    if (!accepted) {
      throw new Error('Legal notice must be accepted to use Offlinio');
    }
    
    return { accepted: true, timestamp: record.timestamp };
  }
}
```

### 2. Addon Startup Integration
**Integrate legal notice into addon initialization**

#### Startup Flow
- [ ] **Addon Initialization**
  - [ ] Check legal acceptance before any functionality
  - [ ] Block catalog/stream endpoints until accepted
  - [ ] Show notice in Stremio UI
  - [ ] Graceful error handling if declined

- [ ] **Stremio Integration**
  - [ ] Integrate with Stremio's modal system
  - [ ] Use Stremio's UI components
  - [ ] Proper styling and theming
  - [ ] Responsive design for all devices

#### Implementation Code
```javascript
// addon/src/index.js - Main addon entry point
const { addonBuilder } = require('stremio-addon-sdk');
const InstallationLegalNotice = require('./legal/installation-notice');

const builder = new addonBuilder({
  id: 'community.offlinio',
  version: '1.0.0',
  name: 'Offlinio Personal Media Downloader',
  description: 'Download manager for personal media files',
  resources: ['catalog', 'stream'],
  types: ['movie', 'series'],
  catalogs: []
});

// Initialize legal notice system
const legalNotice = new InstallationLegalNotice();

// Middleware to check legal acceptance
builder.defineStreamHandler(async (args) => {
  // Check legal acceptance before any functionality
  const acceptance = await legalNotice.checkAndShowNotice();
  
  if (!acceptance.accepted) {
    return { streams: [] };
  }
  
  // Continue with normal functionality
  return await handleStreamRequest(args);
});

builder.defineCatalogHandler(async (args) => {
  // Check legal acceptance before any functionality
  const acceptance = await legalNotice.checkAndShowNotice();
  
  if (!acceptance.accepted) {
    return { metas: [] };
  }
  
  // Continue with normal functionality
  return await handleCatalogRequest(args);
});
```

### 3. Real-Debrid Optional Configuration
**Show Real-Debrid setup after legal notice acceptance**

#### Real-Debrid Setup Flow
- [ ] **Optional Configuration**
  - [ ] Show after legal notice acceptance
  - [ ] Clear explanation of Real-Debrid benefits
  - [ ] "Skip" option for direct URLs only
  - [ ] Separate legal notice for Real-Debrid

- [ ] **Real-Debrid Legal Notice**
  - [ ] Specific to Real-Debrid usage
  - [ ] User's own account required
  - [ ] Real-Debrid terms compliance
  - [ ] Authorization provider framing

#### Implementation Code
```javascript
// addon/src/real-debrid/setup.js
class RealDebridSetup {
  async showOptionalSetup() {
    const setupChoice = await this.showSetupDialog({
      title: "Optional: Real-Debrid Integration",
      message: `
        Configure Real-Debrid for enhanced functionality:
        
        ✅ WITH REAL-DEBRID:
        • Download content from your Real-Debrid account
        • Process magnet links through your RD subscription
        • Faster downloads from RD servers
        
        ✅ WITHOUT REAL-DEBRID:
        • Direct URL downloads only
        • Manual URL input required
        • No magnet link support
        
        Choose your preferred mode:
      `,
      buttons: [
        "Configure Real-Debrid",
        "Use Direct URLs Only"
      ]
    });
    
    if (setupChoice.configureRealDebrid) {
      await this.configureRealDebrid();
    }
    
    return setupChoice;
  }
  
  async configureRealDebrid() {
    // Show Real-Debrid specific legal notice
    await this.showRealDebridLegalNotice();
    
    // Get user's API key
    const apiKey = await this.getApiKeyFromUser();
    
    // Validate subscription
    const valid = await this.validateRealDebridSubscription(apiKey);
    
    if (!valid) {
      throw new Error('Valid Real-Debrid subscription required');
    }
    
    await this.saveConfiguration({ apiKey, validated: true });
    
    return { configured: true };
  }
  
  async showRealDebridLegalNotice() {
    return await this.showModal({
      title: "Real-Debrid Account Configuration",
      message: `
        🔑 REAL-DEBRID INTEGRATION NOTICE:
        
        • You must provide your own Real-Debrid API key
        • You must have an active Real-Debrid subscription
        • You are responsible for Real-Debrid Terms of Service compliance
        • Only download content you have rights to access through your RD account
        
        This integration connects to YOUR authorized Real-Debrid account.
        Offlinio does not provide or promote unauthorized access to content.
      `,
      requireAcceptance: true
    });
  }
}
```

### 4. User Interface Integration
**Integrate legal notices into Stremio UI**

#### Stremio Modal Integration
- [ ] **Modal System**
  - [ ] Use Stremio's native modal system
  - [ ] Proper styling and theming
  - [ ] Responsive design
  - [ ] Accessibility compliance

- [ ] **User Experience**
  - [ ] Clear, non-dismissible modals
  - [ ] Progress indication
  - [ ] Error handling
  - [ ] Success confirmation

#### Implementation Code
```javascript
// addon/src/ui/modal-system.js
class StremioModalSystem {
  async displayModal(modalConfig) {
    // This would integrate with Stremio's actual modal system
    return new Promise((resolve, reject) => {
      const modal = {
        type: 'modal',
        title: modalConfig.title,
        content: modalConfig.message,
        dismissible: modalConfig.dismissible || false,
        buttons: modalConfig.buttons.map(btn => ({
          text: btn.text,
          style: btn.primary ? 'primary' : 'secondary',
          onClick: async () => {
            try {
              const result = await btn.action();
              resolve(result);
            } catch (error) {
              reject(error);
            }
          }
        }))
      };
      
      // Show modal in Stremio UI
      this.showStremioModal(modal);
    });
  }
  
  showStremioModal(modal) {
    // Integration with Stremio's modal system
    // This would use Stremio's actual API
    if (window.stremio && window.stremio.showModal) {
      window.stremio.showModal(modal);
    } else {
      // Fallback for development/testing
      this.showBrowserModal(modal);
    }
  }
}
```

### 5. Local Storage & Persistence
**Store legal acceptance locally**

#### Storage Implementation
- [ ] **Local Storage**
  - [ ] Browser localStorage for web
  - [ ] File system for desktop
  - [ ] Encrypted storage for sensitive data
  - [ ] Version tracking for notice updates

- [ ] **Data Management**
  - [ ] Minimal data storage
  - [ ] No external transmission
  - [ ] User control over data
  - [ ] Clear data deletion option

#### Implementation Code
```javascript
// addon/src/storage/legal-storage.js
class LegalStorage {
  constructor() {
    this.storageKey = 'offlinio_legal_data';
  }
  
  async storeAcceptance(acceptanceData) {
    const encrypted = await this.encrypt(acceptanceData);
    
    if (this.isBrowser()) {
      localStorage.setItem(this.storageKey, encrypted);
    } else {
      await this.writeToFile(this.storageKey, encrypted);
    }
  }
  
  async getAcceptance() {
    let encrypted;
    
    if (this.isBrowser()) {
      encrypted = localStorage.getItem(this.storageKey);
    } else {
      encrypted = await this.readFromFile(this.storageKey);
    }
    
    if (!encrypted) return null;
    
    return await this.decrypt(encrypted);
  }
  
  async clearData() {
    if (this.isBrowser()) {
      localStorage.removeItem(this.storageKey);
    } else {
      await this.deleteFile(this.storageKey);
    }
  }
}
```

## Testing & Validation

### Legal Notice Testing
- [ ] **Display Testing**
  - [ ] Notice appears on first installation
  - [ ] Cannot be bypassed or dismissed
  - [ ] Proper styling and layout
  - [ ] Cross-platform compatibility

- [ ] **Acceptance Testing**
  - [ ] Acceptance properly recorded
  - [ ] Functionality blocked until accepted
  - [ ] Graceful handling of rejection
  - [ ] Version update handling

### Integration Testing
- [ ] **Stremio Integration**
  - [ ] Works in Stremio desktop
  - [ ] Works in Stremio web
  - [ ] Proper modal integration
  - [ ] No functionality bypass

- [ ] **Real-Debrid Integration**
  - [ ] Optional setup works correctly
  - [ ] API key validation
  - [ ] Subscription checking
  - [ ] Error handling

## Success Criteria

### Legal Compliance
- [ ] **Legal notice shown immediately** on installation
- [ ] **All functionality blocked** until acceptance
- [ ] **User acceptance recorded** with timestamp
- [ ] **Cannot be bypassed** or dismissed

### User Experience
- [ ] **Clear, understandable** legal language
- [ ] **Professional presentation** in Stremio UI
- [ ] **Smooth setup flow** with Real-Debrid option
- [ ] **Graceful error handling** throughout

### Technical Implementation
- [ ] **Reliable storage** of acceptance data
- [ ] **Cross-platform compatibility**
- [ ] **Proper Stremio integration**
- [ ] **Secure data handling**

This implementation ensures that every user sees the legal notice immediately when they install the plugin, and that all functionality is properly protected by legal compliance checks.
