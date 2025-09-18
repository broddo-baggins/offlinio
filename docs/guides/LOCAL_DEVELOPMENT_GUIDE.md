# 🛠️ Local Development & Testing Guide

Complete guide to run, test, and develop Offlinio locally with your existing Stremio setup.

---

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ 
- Your existing Stremio setup:
  - Stremio desktop app (macOS/Windows/Linux)
  - Torrentio addon installed
  - Real-Debrid account and addon
  - Trakt addon (optional)

### **1. Initial Setup**
```bash
# Clone and navigate to project
cd /path/to/Stremio\ -\ Offlinio

# Install dependencies
npm install

# Set up environment
cp env.example .env

# Edit .env file - comment out placeholder DATA_DIR
# nano .env
# Change: DATA_DIR=/path/to/your/offlinio/downloads
# To:     # DATA_DIR=/path/to/your/offlinio/downloads

# Generate database and run migrations
npm run db:generate
npm run db:migrate

# Build the project
npm run build
```

### **2. Start Development Server**
```bash
# Start in development mode (with hot reload)
npm run dev

# OR start production build
npm run start
```

### **3. Add to Stremio**
1. Open Stremio desktop app
2. Go to **Add-ons** → **Community Add-ons**
3. Click **Add Addon**
4. Paste: `http://127.0.0.1:11471/manifest.json`
5. Click **Install**

---

## 🧪 **Testing Your Setup**

### **Test 1: Server Health**
```bash
curl http://127.0.0.1:11471/health
# Expected: {"status":"healthy","version":"0.1.0",...}
```

### **Test 2: Stremio Manifest**
```bash
curl http://127.0.0.1:11471/manifest.json
# Expected: Valid JSON with addon metadata
```

### **Test 3: Catalog Endpoints**
```bash
# Test movie catalog
curl http://127.0.0.1:11471/catalog/movie/offlinio-movies.json
# Expected: {"metas":[]} (empty initially)

# Test series catalog  
curl http://127.0.0.1:11471/catalog/series/offlinio-series.json
# Expected: {"metas":[]} (empty initially)
```

### **Test 4: Stream Endpoint**
```bash
# Test stream endpoint with sample ID
curl http://127.0.0.1:11471/stream/movie/tt0111161.json
# Expected: {"streams":[{"name":"📥 Download for Offline",...}]}
```

### **Test 5: Stremio Integration**
1. Open Stremio
2. Look for "Downloaded Movies" and "Downloaded Series" in your catalogs
3. Browse any movie/series
4. Verify you see "📥 Download for Offline" option

---

## 🔧 **Development Workflow**

### **File Structure**
```
src/
├── addon.ts              # Stremio addon endpoints
├── server.ts             # Express server setup
├── db.ts                 # Database configuration
├── files.ts              # File storage and serving
├── downloads.ts          # Download management
├── legal.ts              # Legal compliance
├── services/
│   ├── catalog.ts        # Content catalog management
│   ├── real-debrid-client.ts  # Real-Debrid API
│   ├── comet-integration.ts   # Magnet discovery
│   ├── token-manager.ts  # Secure token storage
│   ├── storage-setup.ts  # Storage path management
│   └── legal-notice.ts   # Legal notice service
└── utils/
    └── logger.ts         # Logging utilities
```

### **Key Development Commands**
```bash
# Development (with auto-reload)
npm run dev

# Type checking
npm run build

# Run tests
npm test

# Database operations
npm run db:migrate        # Run migrations
npm run db:generate       # Regenerate Prisma client
npm run db:studio         # Open database viewer

# Linting and formatting
npm run lint              # Check code style
npm run lint:fix          # Fix code style issues
npm run format            # Format code
```

### **Environment Variables**
```bash
# Core settings
PORT=11471                          # Server port
NODE_ENV=development               # Environment mode
DATABASE_URL="file:./prisma/offlinio.db"

# Storage (leave commented for auto-detection)
# DATA_DIR=/custom/path/to/downloads

# Real-Debrid (add when ready to test downloads)
# REAL_DEBRID_API_KEY=your_api_key_here

# Security
ENCRYPTION_KEY=your_32_character_encryption_key_here

# Logging
LOG_LEVEL=info
DEBUG=offlinio:*
```

---

## 🧪 **Integration Testing with Real-Debrid**

### **1. Set Up Real-Debrid Token**
```bash
# Get your API key from: https://real-debrid.com/apitoken
# Add to .env file:
echo "REAL_DEBRID_API_KEY=your_actual_api_key" >> .env

# Restart server
npm run start
```

### **2. Test Download Flow**
1. **Find Content**: Use Stremio to browse movies/series
2. **Trigger Download**: Click "📥 Download for Offline"
3. **Monitor Progress**: Check server logs for download status
4. **Verify Storage**: Downloaded files appear in `/Users/[username]/Movies/Offlinio/`
5. **Test Playback**: Content appears in "Downloaded Movies/Series" catalogs

### **3. Test Real-Debrid Integration**
```bash
# Test API authentication
curl -H "Authorization: Bearer YOUR_API_KEY" https://api.real-debrid.com/rest/1.0/user

# Monitor Offlinio logs for Real-Debrid activities
tail -f logs/offlinio.log | grep "Real-Debrid"
```

---

## 🛠️ **Debugging & Troubleshooting**

### **Common Issues**

1. **Server Won't Start**
   ```bash
   # Check if port is in use
   lsof -i :11471
   
   # Kill existing process
   pkill -f "node dist/server.js"
   
   # Check database issues
   npm run db:migrate
   ```

2. **Addon Not Showing in Stremio**
   - Verify server is running: `curl http://127.0.0.1:11471/health`
   - Check manifest is valid: `curl http://127.0.0.1:11471/manifest.json | jq .`
   - Try reinstalling addon in Stremio

3. **Downloads Not Working**
   - Check Real-Debrid API key is set correctly
   - Verify Real-Debrid account has active subscription
   - Check server logs for error messages

4. **Files Not Playing**
   - Verify files exist in storage directory
   - Check file permissions
   - Test direct file access: `http://127.0.0.1:11471/files/Movies/[filename]`

### **Debug Logging**
```bash
# Enable verbose logging
export DEBUG=offlinio:*
npm run dev

# Or check log files
tail -f logs/offlinio.log
```

### **Database Debugging**
```bash
# Open database viewer
npm run db:studio

# Reset database if corrupted
rm -f prisma/offlinio.db
npm run db:migrate
```

---

## 📋 **Testing Checklist**

### **Before Each Development Session**
- [ ] Server starts without errors
- [ ] Database migrations are up to date
- [ ] Environment variables are set correctly
- [ ] Stremio addon loads successfully

### **Feature Testing**
- [ ] Manifest endpoint returns valid JSON
- [ ] Catalog endpoints return empty arrays initially
- [ ] Stream endpoints return download triggers
- [ ] Download flow integrates with Real-Debrid
- [ ] Files are stored in correct directory structure
- [ ] Downloaded content appears in catalogs
- [ ] Local file playback works

### **Integration Testing**
- [ ] Addon appears in Stremio
- [ ] Download buttons appear on content
- [ ] Real-Debrid authentication works
- [ ] Files download successfully
- [ ] Content plays back from local storage

---

## 🚀 **Ready for Testing**

Your Offlinio development environment is now ready! You can:

1. **Develop locally** with hot reload
2. **Test with your existing Stremio setup**
3. **Use your Real-Debrid account** for downloads
4. **Monitor all operations** through logs and debug output

The addon integrates seamlessly with your existing Torrentio + Real-Debrid + Trakt setup, adding offline download capabilities without disrupting your current workflow.

---

## 📞 **Support**

- **Logs Location**: `logs/offlinio.log`
- **Database Location**: `prisma/offlinio.db`  
- **Storage Location**: `~/Movies/Offlinio/` (macOS) or configured DATA_DIR
- **Configuration**: `.env` file in project root
