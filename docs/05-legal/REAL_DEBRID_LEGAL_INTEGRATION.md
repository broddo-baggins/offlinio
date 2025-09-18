# Real-Debrid Integration with Legal Compliance

## Overview

Offlinio works seamlessly with Real-Debrid while maintaining full legal compliance. Users with Real-Debrid subscriptions can download content they have access to through their RD account.

## Legal Framework for Real-Debrid Integration

### 1. Real-Debrid as User's Authorized Provider

#### Legal Position
- Real-Debrid is treated as the **user's authorized content provider**
- Users must have their own Real-Debrid subscription
- Offlinio facilitates downloads from user's **existing authorized access**
- No promotion of Real-Debrid for piracy purposes

#### Implementation
```javascript
const REAL_DEBRID_LEGAL_NOTICE = {
  title: "Real-Debrid Integration Notice",
  message: `
    Real-Debrid Integration:
    
    • You must have your own Real-Debrid subscription
    • You are responsible for compliance with Real-Debrid's Terms of Service
    • Only download content you have legal rights to access through Real-Debrid
    • Real-Debrid is your authorized content provider
    
    Offlinio does not promote or facilitate unauthorized access to content.
    This integration helps you manage downloads from your authorized Real-Debrid account.
  `,
  requireAcceptance: true
};
```

### 2. User Authorization Flow

#### Step 1: Installation Legal Notice
```javascript
const INSTALLATION_LEGAL_NOTICE = {
  title: "Offlinio - Legal Use Only",
  message: `
    🛡️ LEGAL USE ONLY 🛡️
    
    You must have legal rights to download any content.
    
    ✅ Acceptable Uses:
    • Personal backups of content you own
    • Public domain materials  
    • Creative Commons licensed content
    • Content from your authorized providers (like Real-Debrid)
    • Your own user-generated content
    
    ❌ This tool will NOT:
    • Bypass DRM or access controls
    • Provide links to unauthorized content
    • Index or catalog content sources
    
    By continuing, you confirm you will only download content you have legal rights to access.
  `,
  buttons: ["I Understand and Agree", "Cancel Installation"],
  requireAcceptance: true,
  showOnFirstRun: true
};
```

#### Step 2: Real-Debrid Configuration (Optional)
```javascript
class RealDebridIntegration {
  async configureRealDebrid() {
    // Show Real-Debrid specific legal notice
    await this.showRealDebridLegalNotice();
    
    // Get user's Real-Debrid API key
    const apiKey = await this.getUserApiKey();
    
    // Validate subscription
    const subscription = await this.validateSubscription(apiKey);
    
    if (!subscription.active) {
      throw new Error('Active Real-Debrid subscription required');
    }
    
    return {
      configured: true,
      disclaimer: 'User configured their own Real-Debrid account',
      subscription: subscription
    };
  }
  
  async showRealDebridLegalNotice() {
    return {
      title: "Real-Debrid Account Configuration",
      message: `
        Configure Your Real-Debrid Account:
        
        • Enter your own Real-Debrid API key
        • You must have an active Real-Debrid subscription
        • You are responsible for Real-Debrid Terms of Service compliance
        • Only download content you have rights to access through your RD account
        
        This integration connects to YOUR authorized Real-Debrid account.
      `,
      requireAcceptance: true
    };
  }
}
```

## Technical Implementation

### 1. First-Run Legal Notice System

#### Installation Hook
```javascript
// addon/src/legal/first-run-notice.js
class FirstRunLegalNotice {
  constructor() {
    this.hasShownNotice = this.checkIfNoticeShown();
  }
  
  async showInstallationNotice() {
    if (this.hasShownNotice) {
      return { accepted: true, previouslyAccepted: true };
    }
    
    const userAcceptance = await this.displayLegalNotice(INSTALLATION_LEGAL_NOTICE);
    
    if (userAcceptance.accepted) {
      await this.recordAcceptance(userAcceptance);
      return { accepted: true, timestamp: new Date() };
    } else {
      throw new Error('Legal notice must be accepted to use Offlinio');
    }
  }
  
  async displayLegalNotice(notice) {
    // This would integrate with Stremio's UI system
    return {
      title: notice.title,
      content: notice.message,
      buttons: [
        {
          text: "I Understand and Agree",
          style: "primary",
          action: () => ({ accepted: true })
        },
        {
          text: "Cancel",
          style: "secondary", 
          action: () => ({ accepted: false })
        }
      ],
      modal: true,
      dismissible: false
    };
  }
  
  async recordAcceptance(acceptance) {
    const record = {
      timestamp: new Date(),
      version: "1.0.0",
      userAgent: navigator.userAgent,
      accepted: acceptance.accepted
    };
    
    // Store locally only - no external transmission
    await this.storeLocalRecord(record);
  }
}
```

### 2. Real-Debrid Integration (Legal)

#### User URL Processing with Real-Debrid
```javascript
class LegalRealDebridProcessor {
  async processUserURL(userSuppliedURL, userRightsDeclaration) {
    // First validate user has declared rights
    if (!userRightsDeclaration.hasRights) {
      throw new Error('User must declare they have rights to this content');
    }
    
    // Check if URL is a magnet link (Real-Debrid compatible)
    if (this.isMagnetLink(userSuppliedURL)) {
      return await this.processRealDebridRequest(userSuppliedURL, userRightsDeclaration);
    }
    
    // Handle direct URLs
    return await this.processDirectURL(userSuppliedURL, userRightsDeclaration);
  }
  
  async processRealDebridRequest(magnetURL, userDeclaration) {
    // Ensure user has configured Real-Debrid
    if (!this.hasRealDebridConfiguration()) {
      throw new Error('Real-Debrid account must be configured to process magnet links');
    }
    
    // Process through user's Real-Debrid account
    const rdResult = await this.realDebridService.processUserMagnet(
      magnetURL, 
      userDeclaration,
      this.getUserRealDebridCredentials()
    );
    
    return {
      source: 'user-real-debrid-account',
      downloadURL: rdResult.directURL,
      userDeclaration: userDeclaration,
      legalBasis: 'User authorized Real-Debrid account access'
    };
  }
}
```

### 3. Legal User Interface

#### Installation Flow
```javascript
// addon/src/ui/installation-flow.js
class InstallationFlow {
  async handleAddonInstallation() {
    try {
      // Step 1: Show legal notice immediately
      const legalAcceptance = await this.firstRunNotice.showInstallationNotice();
      
      if (!legalAcceptance.accepted) {
        this.blockAddonInstallation('Legal notice not accepted');
        return;
      }
      
      // Step 2: Complete addon setup
      await this.setupAddon();
      
      // Step 3: Show optional Real-Debrid configuration
      await this.showOptionalRealDebridSetup();
      
      // Step 4: Show usage instructions
      await this.showUsageInstructions();
      
    } catch (error) {
      this.handleInstallationError(error);
    }
  }
  
  async showOptionalRealDebridSetup() {
    const userChoice = await this.showOptionalSetupDialog({
      title: "Optional: Configure Real-Debrid",
      message: `
        Do you want to configure Real-Debrid integration?
        
        ✅ With Real-Debrid:
        • Download content from your Real-Debrid account
        • Process magnet links through your RD subscription
        • Faster downloads from RD servers
        
        ✅ Without Real-Debrid:
        • Download direct URLs only
        • Must provide direct download links
        • No magnet link support
      `,
      buttons: ["Configure Real-Debrid", "Skip (Direct URLs Only)"]
    });
    
    if (userChoice.configureRealDebrid) {
      await this.realDebridIntegration.configureRealDebrid();
    }
  }
}
```

### 4. User Interface for Legal Downloads

#### Download Request Interface
```javascript
class LegalDownloadInterface {
  renderDownloadForm() {
    return {
      title: "Download Your Content",
      subtitle: "Only download content you have legal rights to access",
      form: {
        fields: [
          {
            label: "Content URL or Magnet Link",
            type: "url",
            placeholder: "https://your-content.com/video.mp4 or magnet:...",
            required: true,
            help: "Provide a direct URL or magnet link for content you have rights to"
          },
          {
            label: "I have legal rights to this content",
            type: "checkbox",
            required: true,
            text: "I confirm I have legal rights to download this content"
          },
          {
            label: "Content Source",
            type: "select",
            required: true,
            options: [
              { value: "personal-backup", label: "Personal backup of content I own" },
              { value: "public-domain", label: "Public domain content" },
              { value: "creative-commons", label: "Creative Commons licensed" },
              { value: "real-debrid-account", label: "From my Real-Debrid account" },
              { value: "enterprise-content", label: "Enterprise/work content" },
              { value: "user-generated", label: "My own user-generated content" }
            ]
          }
        ],
        legalNotice: {
          text: "By submitting, you confirm you have legal rights to download this content.",
          style: "warning"
        }
      }
    };
  }
}
```

## Implementation Checklist

### Legal Notice Implementation
- [ ] **First-run legal notice** appears immediately on installation
- [ ] **Cannot be dismissed** without acceptance
- [ ] **Clear legal boundaries** explained
- [ ] **User acceptance recorded** locally
- [ ] **Version tracking** for notice updates

### Real-Debrid Integration
- [ ] **Optional configuration** - user choice
- [ ] **User's own API key** required
- [ ] **Subscription validation** before use
- [ ] **Clear legal disclaimers** about RD terms
- [ ] **No promotion** of RD for piracy

### User Interface
- [ ] **Rights declaration required** for every download
- [ ] **Content source selection** mandatory
- [ ] **Clear legal messaging** throughout UI
- [ ] **No piracy-related examples** or language

This approach ensures that:
1. **Legal notice is shown immediately** when user installs the plugin
2. **Real-Debrid works seamlessly** for users who have it
3. **All legal boundaries are clear** and enforced
4. **User responsibility is explicit** and documented

The integration treats Real-Debrid as the user's authorized content provider while maintaining strict legal compliance.
