# Offlinio Project Overview

## Project Structure

This document provides an overview of the organized project structure for Offlinio - Personal Media Downloader for Stremio.

### Root Directory
```
Offlinio/
├── README.md                      # Main project documentation and story
├── LICENSE                        # MIT License with legal notices
├── CONTRIBUTING.md                # Contributor guidelines
├── PROJECT_OVERVIEW.md            # This file - project structure guide
├── package.json                   # Node.js dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
├── env.example                    # Environment variables template
└── .gitignore                     # Git ignore rules
```

### Source Code (`/src`)
```
src/
├── server.ts                      # Main Express server
├── addon.ts                       # Stremio addon endpoints
├── db.ts                          # Database setup and utilities
├── downloads.ts                   # Download management API
├── files.ts                       # File storage and serving
├── legal.ts                       # Legal compliance API
├── setup-wizard.ts                # First-run setup process
├── services/                      # Business logic services
│   ├── catalog.ts                 # Stremio catalog generation
│   ├── real-debrid-client.ts      # Real-Debrid API integration
│   ├── auto-debrid.ts             # Auto-detection service
│   ├── comet-integration.ts       # Comet magnet source integration
│   ├── legal-notice.ts            # Legal compliance system
│   ├── notification-service.ts    # User notifications
│   ├── local-analytics.ts         # Privacy-first analytics
│   ├── storage-setup.ts           # Storage configuration
│   └── token-manager.ts           # Secure token management
├── routes/                        # API route handlers
│   └── setup.ts                   # Setup wizard routes
├── ui/                            # Web management interface
│   ├── index.html                 # Main dashboard
│   ├── setup.html                 # Setup wizard UI
│   └── app.js                     # Frontend JavaScript
└── utils/                         # Utility functions
    └── logger.ts                  # Privacy-conscious logging
```

### Documentation (`/docs`)

#### 01-concept: Project Vision and User Stories
```
docs/01-concept/
├── USER_STORIES.md                # User journeys and requirements
├── PROJECT_SUMMARY.md             # High-level project overview
└── Stremio Offline Downloads....pdf # Original design document
```

#### 02-discovery: Research and Analysis
```
docs/02-discovery/
├── STREMIO_SDK_IMPLEMENTATION.md  # SDK analysis and capabilities
├── SDK_COMPATIBILITY_TESTING.md   # Compatibility research
└── GAP_ANALYSIS.md                # Technical gaps and solutions
```

#### 03-implementation: Technical Implementation
```
docs/03-implementation/
├── STREMIO_SDK_IMPLEMENTATION_COMPLETE.md # Complete SDK guide
├── ARCHITECTURE_UPDATED.md        # System architecture
├── IMPLEMENTATION_ROADMAP.md      # Development roadmap
└── LOCAL_DEVELOPMENT_GUIDE.md     # Developer setup guide
```

#### 04-security: Security and Privacy
```
docs/04-security/
├── SECURITY_MONITORING_STRATEGY.md # Security framework
└── PRODUCTION_OPTIMIZATION_STRATEGY.md # Performance and security
```

#### 05-legal: Legal Compliance
```
docs/05-legal/
├── LEGAL_COMPLIANCE.md            # Legal framework
├── LEGAL_SAFE_ARCHITECTURE.md     # Compliance architecture
└── REAL_DEBRID_LEGAL_INTEGRATION.md # Service integration compliance
```

#### 06-deployment: Deployment and Distribution
```
docs/06-deployment/
├── PRODUCTION_DEPLOYMENT_CHECKLIST.md # Production readiness
├── GITHUB_SETUP_INSTRUCTIONS.md   # Repository setup guide
└── setup.md                       # User setup guide
```

### Project Management (`/project-management`)
```
project-management/
├── TASK_BREAKDOWN.md              # Sprint planning and status
├── planning/                      # Project planning documents
│   └── COMPLETE_PROPAGATION_PLAN.md # Development plan
└── task-lists/                    # Detailed task lists
    ├── 00_CORRECTED_ARCHITECTURE_TASKS.md
    ├── 00_SINGLE_ADDON_TASKS.md
    ├── 01_FOUNDATION_TASKS.md
    ├── 01_LEGAL_COMPLIANT_TASKS.md
    ├── 02_FIRST_RUN_LEGAL_NOTICE.md
    ├── 02_STREMIO_ADDON_TASKS.md
    ├── 03_REAL_DEBRID_INTEGRATION_TASKS.md
    ├── 04_STREAM_CAPTURE_TASKS.md
    ├── 05_STORAGE_SYSTEM_TASKS.md
    ├── 06_UI_INTERFACE_TASKS.md
    ├── 07_TESTING_QUALITY_TASKS.md
    └── 08_DEPLOYMENT_TASKS.md
```

### Testing (`/tests`)
```
tests/
├── unit/                          # Unit tests
├── integration/                   # Integration tests
├── e2e/                          # End-to-end tests
│   └── user-flows.test.ts        # User workflow tests
├── performance/                   # Performance tests
├── setup/                        # Test setup utilities
│   ├── integration-setup.ts      # Integration test setup
│   └── ...
├── TEST_DESIGN.md                # Testing strategy
└── TEST_EXECUTION_MASTER.md      # Test execution guide
```

### Database (`/prisma`)
```
prisma/
├── schema.prisma                  # Database schema definition
└── migrations/                    # Database migration files
    ├── 20250916133934_init/
    │   └── migration.sql
    └── migration_lock.toml
```

### Configuration Files
```
├── jest.integration.config.js     # Integration test configuration
├── jest.performance.config.js     # Performance test configuration
├── playwright.config.ts           # E2E test configuration
└── .github/                       # GitHub templates
    ├── ISSUE_TEMPLATE/
    │   ├── bug_report.md
    │   └── feature_request.md
    └── pull_request_template.md
```

## Documentation Navigation Guide

### For New Users
1. Start with `README.md` - Complete project story and quick start
2. Read `docs/01-concept/USER_STORIES.md` - Understand the user journey
3. Follow `docs/06-deployment/setup.md` - Setup instructions

### For Developers
1. Read `README.md` - Project overview and architecture
2. Study `docs/03-implementation/LOCAL_DEVELOPMENT_GUIDE.md` - Development setup
3. Review `docs/03-implementation/STREMIO_SDK_IMPLEMENTATION_COMPLETE.md` - Technical details
4. Check `CONTRIBUTING.md` - Development guidelines

### For Contributors
1. Read `CONTRIBUTING.md` - Contribution guidelines
2. Review `docs/05-legal/LEGAL_COMPLIANCE.md` - Legal requirements
3. Study `docs/04-security/SECURITY_MONITORING_STRATEGY.md` - Security requirements
4. Check `project-management/TASK_BREAKDOWN.md` - Current priorities

### For Deployment
1. Review `docs/06-deployment/PRODUCTION_DEPLOYMENT_CHECKLIST.md` - Production readiness
2. Follow `docs/06-deployment/GITHUB_SETUP_INSTRUCTIONS.md` - Repository setup
3. Study `docs/04-security/PRODUCTION_OPTIMIZATION_STRATEGY.md` - Production optimization

## Key Design Principles

### 1. Story-Driven Documentation
- Each document tells part of the complete story
- Clear progression from concept to implementation
- User-centric perspective throughout

### 2. Legal Compliance First
- Legal considerations integrated at every level
- Clear boundaries and user responsibilities
- Compliance verification at each step

### 3. Security by Design
- Privacy-first approach to all features
- Security considerations documented and implemented
- Regular security reviews and updates

### 4. Maintainable Architecture
- Clear separation of concerns
- Comprehensive documentation
- Extensible design patterns

## Project Milestones

### Completed
- ✅ Core Stremio addon implementation
- ✅ Auto-debrid detection system
- ✅ Legal compliance framework
- ✅ Security and privacy architecture
- ✅ Comprehensive documentation
- ✅ Testing framework setup

### Current Status
- **Production Ready** - All core features implemented
- **Documentation Complete** - Comprehensive guides available
- **Testing Framework** - Ready for comprehensive testing
- **Security Reviewed** - Privacy and security measures in place

### Next Steps
1. Community testing and feedback
2. Performance optimization
3. Additional platform support
4. Extended service integrations

---

This structure provides a logical flow from concept through implementation to deployment, making it easy for anyone to understand the project's journey and current state.
