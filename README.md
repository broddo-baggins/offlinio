# Offlinio - Personal Media Downloader

A Stremio addon for downloading and managing your personal media library offline.

## Legal Notice

**You must have legal rights to download any content.**

### Acceptable Uses
- Personal backups of content you own
- Public domain materials
- Creative Commons licensed content
- Content from your authorized debrid services
- Your own user-generated content
- Enterprise internal media

### This tool will NOT
- Bypass DRM or access controls
- Provide links to unauthorized content
- Index or catalog content sources
- Promote or facilitate piracy

## Quick Start

### Prerequisites
- Node.js 18+ and npm 9+
- Debrid service (Real-Debrid, AllDebrid, etc.) - auto-detected

### Installation

1. **Clone and install**
   ```bash
   git clone https://github.com/your-org/offlinio.git
   cd offlinio
   npm install
   ```

2. **Set up environment**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Initialize database**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Add to Stremio**
   - Open Stremio
   - Go to Add-ons
   - Add: `http://127.0.0.1:11471/manifest.json`

## Web Interface

Access the management interface at: `http://127.0.0.1:11471/ui/`

Features:
- Download queue management
- Storage statistics
- Legal compliance interface
- Storage path configuration

## Configuration

### Environment Variables

```bash
# Server
PORT=11471
NODE_ENV=development

# Storage (optional - uses OS default video folders)
DATA_DIR=/path/to/your/downloads

# Auto-detection settings
AUTO_DETECT_SERVICES=true

# Security
ENCRYPTION_KEY=your_32_character_key
```

### Default Storage Locations
- **Windows**: `%UserProfile%\Videos\Offlinio`
- **macOS**: `~/Movies/Offlinio`
- **Linux**: `~/Videos/Offlinio`

## Architecture

**Single Addon Design** - Everything runs in one process:

```
┌─────────────────────────┐
│    Stremio Addon        │
│  ┌─────────────────────┐│
│  │   Manifest API      ││  Port 11471
│  │   Catalog API       ││
│  │   Stream API        ││
│  └─────────────────────┘│
│  ┌─────────────────────┐│
│  │   Download API      ││
│  │   Real-Debrid API   ││
│  │   Legal API         ││
│  └─────────────────────┘│
│  ┌─────────────────────┐│
│  │   Web UI            ││
│  │   File Server       ││
│  └─────────────────────┘│
│  ┌─────────────────────┐│
│  │   SQLite Database   ││
│  │   Local Storage     ││
│  └─────────────────────┘│
└─────────────────────────┘
```

## Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| **Windows** | Full Support | All features available |
| **macOS** | Full Support | All features available |
| **Linux** | Full Support | All features available |
| **iOS** | Limited | Stremio iOS cannot reach localhost |
| **Android** | Supported | Via network IP or local server |

## Auto-Debrid Detection

### How It Works

1. **Automatic Detection**
   - No configuration needed
   - Detects available debrid services automatically
   - Supports Real-Debrid, AllDebrid, Premiumize, DebridLink

2. **Seamless Usage**
   - Find content in Stremio
   - Click "📥 Download for Offline" button
   - Auto-resolves via your debrid service
   - Downloads to local storage

3. **Public Domain Support**
   - Automatically detects public domain content
   - Downloads directly without debrid services
   - Supports Archive.org, Creative Commons

### Legal Framework

Debrid service integration:
- **Auto-detects your existing services**
- **No configuration or tokens stored**
- **Uses your existing subscriptions**
- **Only downloads content you have rights to**

## Legal Compliance

### First-Run Legal Notice
- **Appears immediately** on installation
- **Cannot be bypassed** or dismissed
- **Blocks all functionality** until accepted
- **Version tracked** for updates

### DRM Policy
- **Automatically detects** DRM-protected content
- **Refuses to download** encrypted streams
- **No circumvention tools** included
- **Technical guardrails** implemented

### Privacy-by-Design
- **Minimal telemetry** collection
- **Local storage only** (no external transmission)
- **User control** over data
- **Encrypted sensitive data**

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run lint         # Lint code
npm run format       # Format code
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Prisma Studio
```

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- downloads.test.ts
```

### Database Management

```bash
# Generate Prisma client
npm run db:generate

# Create new migration
npx prisma migrate dev --name your_migration_name

# Reset database
npx prisma migrate reset

# View database
npm run db:studio
```

## API Endpoints

### Stremio Addon
- `GET /manifest.json` - Addon manifest
- `GET /catalog/:type/:id.json` - Content catalogs
- `GET /meta/:type/:id.json` - Content metadata
- `GET /stream/:type/:id.json` - Stream URLs

### Downloads API
- `POST /api/downloads` - Create download
- `GET /api/downloads` - List downloads
- `GET /api/downloads/:id` - Get download details
- `DELETE /api/downloads/:id` - Delete download
- `PATCH /api/downloads/:id/status` - Update status
- `GET /api/downloads/services/status` - Check auto-detected services

### Legal API
- `GET /api/legal/notice` - Get legal notice
- `POST /api/legal/accept` - Accept legal notice
- `GET /api/legal/status` - Check acceptance status

## File Organization

```
DATA_DIR/
├── Movies/
│   ├── Movie Title (2023).mp4
│   └── Another Movie (2022).mkv
└── Series/
    └── Series Name/
        ├── Season 1/
        │   ├── Series Name S01E01.mp4
        │   └── Series Name S01E02.mp4
        └── Season 2/
            └── Series Name S02E01.mp4
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Style
- Use TypeScript for all new code
- Follow ESLint configuration
- Use Prettier for formatting
- Write tests for new features
- Document public APIs

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acceptable Use Policy

This software is provided for **personal, lawful use only**. Users are responsible for:

1. **Having legal rights** to all downloaded content
2. **Complying with applicable laws** in their jurisdiction
3. **Respecting content creators** and copyright holders
4. **Not using this tool** for piracy or unauthorized distribution

The developers do not promote, encourage, or facilitate copyright infringement or any other illegal activity.

## Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Create an issue on GitHub
- **Discussions**: Use GitHub Discussions for questions

---

**Offlinio** - Built for the Stremio community