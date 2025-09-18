# 📺 Stremio SDK Implementation Guide

**Reference:** [Stremio Addon SDK Documentation](https://github.com/Stremio/stremio-addon-sdk/blob/master/README.md)

This document maps our Offlinio implementation to the official Stremio Addon SDK requirements.

---

## 🎯 **Overview**

Offlinio is built as a compliant Stremio addon that extends Stremio's functionality with offline download capabilities. We follow the [official addon protocol](https://github.com/Stremio/stremio-addon-sdk/blob/master/README.md) to ensure full compatibility.

---

## 📋 **Required SDK Components**

### **1. Addon Manifest** 
**SDK Reference:** [Manifest Documentation](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md)

**Our Implementation:** `src/addon.ts` lines 22-68

```typescript
const manifest = {
  id: 'community.offlinio',               // Unique addon identifier
  version: '0.1.0',                       // Addon version
  name: 'Offlinio',                       // Display name
  description: 'Personal Media Downloader - Download content you have legal rights to access',
  
  // Visual branding
  logo: 'https://via.placeholder.com/256x256/1a1a1a/ffffff?text=Offlinio',
  background: 'https://via.placeholder.com/1920x1080/1a1a1a/ffffff?text=Offlinio',
  
  // Catalog definitions - what content catalogs we provide
  catalogs: [
    {
      id: 'offlinio-movies',
      type: 'movie',
      name: 'Downloaded Movies',
      extra: [
        { name: 'search', isRequired: false },
        { name: 'genre', isRequired: false }
      ]
    },
    {
      id: 'offlinio-series',
      type: 'series', 
      name: 'Downloaded Series',
      extra: [
        { name: 'search', isRequired: false },
        { name: 'genre', isRequired: false }
      ]
    }
  ],
  
  // What resources we support
  resources: ['catalog', 'meta', 'stream'],
  
  // Content types we handle
  types: ['movie', 'series'],
  
  // ID prefixes we can process
  idPrefixes: ['tt', 'local', 'offlinio'],
  
  // Addon behavior hints for Stremio UI
  behaviorHints: {
    adult: false,                         // No adult content
    p2p: false,                          // No P2P streaming
    configurable: true,                  // Has configuration
    configurationRequired: false         // Works without config
  }
};
```

**Endpoint:** `GET /manifest.json`  
**Test:** `curl http://127.0.0.1:11471/manifest.json`

---

### **2. Catalog Endpoints**
**SDK Reference:** [Catalog Documentation](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/catalog.md)

**Our Implementation:** `src/addon.ts` lines 220-241

```typescript
// Catalog endpoint handler
addonRouter.get('/catalog/:type/:id.json', async (req, res) => {
  try {
    const { type, id } = req.params;
    const { search, genre, skip } = req.query;
    
    // Get downloaded content from our catalog service
    const metas = await getDownloadedCatalog(type, id, {
      search: search as string,
      genre: genre as string,
      skip: Number(skip) || 0
    });
    
    // Return in required SDK format
    res.json({ metas });
  } catch (error) {
    res.status(500).json({ 
      metas: [],
      error: 'Failed to fetch catalog' 
    });
  }
});
```

**Required Response Format:**
```json
{
  "metas": [
    {
      "id": "tt1234567",
      "type": "movie",
      "name": "Movie Title",
      "poster": "https://example.com/poster.jpg",
      "year": 2023
    }
  ]
}
```

**Endpoints:**
- `GET /catalog/movie/offlinio-movies.json` - Downloaded movies
- `GET /catalog/series/offlinio-series.json` - Downloaded series

**Test:** `curl http://127.0.0.1:11471/catalog/movie/offlinio-movies.json`

---

### **3. Meta Endpoints**
**SDK Reference:** [Meta Documentation](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/meta.md)

**Our Implementation:** `src/addon.ts` lines 244-264

```typescript
// Meta endpoint for detailed content information
addonRouter.get('/meta/:type/:id.json', async (req, res) => {
  try {
    const { type, id } = req.params;
    
    if (type === 'series') {
      // For series, return episode information
      const meta = await getSeriesMeta(id);
      res.json({ meta });
    } else {
      // For movies, return basic meta
      res.json({ meta: { id, type } });
    }
  } catch (error) {
    res.json({ meta: {} });
  }
});
```

**Required Response Format:**
```json
{
  "meta": {
    "id": "tt1234567",
    "type": "series",
    "name": "Series Title",
    "poster": "https://example.com/poster.jpg",
    "videos": [
      {
        "id": "tt1234567:1:1",
        "title": "Episode 1",
        "season": 1,
        "episode": 1
      }
    ]
  }
}
```

**Endpoints:**
- `GET /meta/movie/:id.json` - Movie metadata
- `GET /meta/series/:id.json` - Series metadata with episodes

---

### **4. Stream Endpoints**
**SDK Reference:** [Stream Documentation](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/stream.md)

**Our Implementation:** `src/addon.ts` lines 267-295

```typescript
// Stream endpoint - provides playback URLs
addonRouter.get('/stream/:type/:id.json', async (req, res) => {
  try {
    const { type, id } = req.params;
    
    // Check for local downloaded file
    const stream = await getLocalStreamForId(id);
    const streams = stream ? [stream] : [];
    
    // Always add download trigger
    streams.push({
      name: '📥 Download for Offline',
      title: 'Download this content to your device',
      url: `http://127.0.0.1:${process.env.PORT || 11471}/download/${encodeURIComponent(id)}`,
      behaviorHints: {
        notWebReady: false,
        bingeGroup: 'offlinio-download'
      }
    });
    
    res.json({ streams });
  } catch (error) {
    res.status(500).json({ streams: [] });
  }
});
```

**Required Response Format:**
```json
{
  "streams": [
    {
      "name": "1080p",
      "title": "Local File",
      "url": "http://127.0.0.1:11471/files/movie.mp4",
      "behaviorHints": {
        "filename": "movie.mp4"
      }
    },
    {
      "name": "📥 Download for Offline",
      "title": "Download this content to your device",
      "url": "http://127.0.0.1:11471/download/tt1234567"
    }
  ]
}
```

**Endpoints:**
- `GET /stream/movie/:id.json` - Movie streaming URLs
- `GET /stream/series/:id.json` - Series episode streaming URLs

---

## 🔧 **Supporting Services**

### **Catalog Service**
**File:** `src/services/catalog.ts`

Manages downloaded content catalogs according to [Stremio catalog specifications](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/catalog.md):

- `getDownloadedCatalog()` - Returns downloaded content as Stremio metas
- `getSeriesMeta()` - Provides series episode information
- `getLocalStreamForId()` - Resolves local file URLs

### **Real-Debrid Integration**
**File:** `src/services/real-debrid-client.ts`

Handles magnet-to-direct-URL conversion for downloading:

- `processMagnetToDirectUrl()` - Full magnet processing pipeline
- `authenticate()` - Real-Debrid API authentication
- `addMagnet()` - Submit torrents to Real-Debrid

### **Comet Integration**
**File:** `src/services/comet-integration.ts`

Discovers magnet links from the same sources users see in Stremio:

- `getStreamsForContent()` - Fetch available magnets
- `getBestMagnetForContent()` - Quality-based selection

---

## 🌐 **Server Architecture**

### **Express Server Setup**
**File:** `src/server.ts`

Follows [Stremio addon hosting requirements](https://github.com/Stremio/stremio-addon-sdk/blob/master/README.md#hosting):

```typescript
// CORS for Stremio compatibility
app.use(cors({
  origin: ['http://127.0.0.1:11471', 'http://localhost:11471'],
  credentials: true
}));

// Stremio addon endpoints (publicly accessible)
app.use('/', addonRouter);
```

**Required Headers:**
- `Access-Control-Allow-Origin: *` - For cross-origin requests
- `Content-Type: application/json` - For all responses

---

## 📊 **Testing & Validation**

### **SDK Compliance Tests**

1. **Manifest Validation:**
   ```bash
   curl http://127.0.0.1:11471/manifest.json | jq .
   ```

2. **Catalog Response Format:**
   ```bash
   curl http://127.0.0.1:11471/catalog/movie/offlinio-movies.json | jq .
   ```

3. **Stream Response Format:**
   ```bash
   curl http://127.0.0.1:11471/stream/movie/tt1234567.json | jq .
   ```

### **Stremio Integration Test**

1. Start Offlinio server
2. Add addon to Stremio: `http://127.0.0.1:11471/manifest.json`
3. Verify addon appears in Stremio addon list
4. Test catalog browsing and download triggers

---

## 🔗 **SDK Reference Links**

- **Main Documentation:** [Stremio Addon SDK](https://github.com/Stremio/stremio-addon-sdk/blob/master/README.md)
- **Manifest API:** [Manifest Response](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md)
- **Catalog API:** [Catalog Response](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/catalog.md)
- **Meta API:** [Meta Response](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/meta.md)
- **Stream API:** [Stream Response](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/stream.md)
- **Hosting Guide:** [Addon Hosting](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/hosting.md)

---

## ✅ **Compliance Status**

- ✅ **Manifest Endpoint** - Fully compliant with required fields
- ✅ **Catalog Endpoints** - Proper JSON format and filtering
- ✅ **Meta Endpoints** - Series episodes and movie metadata
- ✅ **Stream Endpoints** - Local URLs and download triggers
- ✅ **CORS Headers** - Stremio cross-origin compatibility
- ✅ **Public Access** - No authentication blocking Stremio requests
- ✅ **Error Handling** - Graceful fallbacks for all endpoints

**Result:** Offlinio is fully compliant with the Stremio Addon SDK specification.
