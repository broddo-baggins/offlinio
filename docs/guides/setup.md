# 🚀 Offlinio Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment
```bash
cp env.example .env
```

**Edit `.env` and add your Real-Debrid API key:**
```bash
REAL_DEBRID_API_KEY=your_real_debrid_api_key_here
```

**Get your API key from:** https://real-debrid.com/apitoken

### 3. Initialize Database
```bash
npm run db:generate
npm run db:migrate
```

### 4. Start Development Server
```bash
npm run dev
```

The server will start on http://127.0.0.1:11471

### 5. Add to Stremio

1. Open Stremio
2. Go to **Add-ons** → **Community Add-ons**
3. Paste this URL: `http://127.0.0.1:11471/manifest.json`
4. Click **Install**

## 🎬 How to Use

### Download Content

1. **Browse content in Stremio** (using your existing Comet/Torrentio addons)
2. **Look for "📥 Download for Offline"** in the stream list
3. **Click it** → Offlinio will:
   - Get the same magnet link from Comet
   - Process it through your Real-Debrid account
   - Download the file to your local storage
   - Add it to the Offlinio catalog

### Play Offline Content

1. Go to **Discover** → **Add-ons** → **Offlinio**
2. Browse **Downloaded Movies** or **Downloaded Series**
3. Click any title to play from local storage (no internet needed!)

### Manage Downloads

Visit the web interface: http://127.0.0.1:11471/ui/

- View download progress
- Manage queue
- Delete content
- Check storage usage

---

## 🛠️ Troubleshooting

### Downloads Not Working?

1. **Check Real-Debrid API Key**
   ```bash
   # Test your API key
   curl -H "Authorization: Bearer YOUR_API_KEY" https://api.real-debrid.com/rest/1.0/user
   ```

2. **Check Service Status**
   Visit: http://127.0.0.1:11471/api/downloads/services/status

3. **Check Logs**
   Look in `logs/offlinio.log` for error details

### Addon Not Appearing in Stremio?

1. **Verify server is running**: http://127.0.0.1:11471/health
2. **Check manifest**: http://127.0.0.1:11471/manifest.json
3. **Try removing and re-adding** the addon in Stremio

### No Content Found?

Make sure you have **Comet** addon installed and working in Stremio. Offlinio gets magnet links from Comet's results.

---

## 📋 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `REAL_DEBRID_API_KEY` | ✅ Yes | Your Real-Debrid API token |
| `PORT` | No | Server port (default: 11471) |
| `DATA_DIR` | No | Download directory (auto-detected) |
| `LOG_LEVEL` | No | Logging level (default: info) |

---

## 🔧 Development

### Run Tests
```bash
npm test
```

### Check Linting
```bash
npm run lint
```

### Build for Production
```bash
npm run build
npm start
```

---

## 📚 Architecture

- **Single Process**: Everything runs in one Node.js server
- **Real-Debrid Integration**: Converts magnet links to direct downloads
- **Comet Integration**: Gets same torrent sources user sees
- **Local File Server**: Streams downloaded content to Stremio
- **Legal Compliance**: Built-in legal notice system

---

## 🎯 Your User Story

✅ **You have Stremio + Comet + Torrentio + Trakt working**  
✅ **You have a valid Real-Debrid subscription**  
✅ **Offlinio now integrates with both!**

**What happens:**
1. Comet shows you available torrents
2. You click "📥 Download for Offline" 
3. Offlinio uses the same magnet + your Real-Debrid
4. File downloads automatically to local storage
5. You can play offline from Offlinio's catalog

**No configuration needed** - just add your Real-Debrid API key and it works! 🎉
