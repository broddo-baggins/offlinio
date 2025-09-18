# Real-Debrid Integration Architecture

## Overview

Instead of managing torrents directly, Offlinio leverages Real-Debrid's infrastructure and Stremio's native streaming capabilities to download content via HTTPS. This approach provides several advantages:

- **Reliability**: Real-Debrid handles torrent management and provides stable HTTPS streams
- **Speed**: No need to wait for peer connections or manage seeding
- **Quality**: Access to high-quality streams without torrent complexity
- **Simplicity**: Direct HTTPS downloads are easier to manage and resume

## Integration Strategy

### 1. Real-Debrid API Integration

```javascript
// Real-Debrid API Service
class RealDebridService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.real-debrid.com/rest/1.0';
  }

  async addMagnet(magnetLink) {
    // Add magnet to Real-Debrid
    const response = await this.post('/torrents/addMagnet', {
      magnet: magnetLink
    });
    return response.id;
  }

  async getTorrentInfo(torrentId) {
    // Get torrent information and available files
    return await this.get(`/torrents/info/${torrentId}`);
  }

  async selectFiles(torrentId, fileIds) {
    // Select specific files to download
    return await this.post(`/torrents/selectFiles/${torrentId}`, {
      files: fileIds.join(',')
    });
  }

  async getDownloadLink(link) {
    // Get direct download link from Real-Debrid
    return await this.post('/unrestrict/link', { link });
  }
}
```

### 2. Stremio Stream Capture

```javascript
// Stream Capture Service
class StreamCaptureService {
  async captureStream(streamUrl, outputPath) {
    // Use FFmpeg to capture and download the stream
    const ffmpeg = spawn('ffmpeg', [
      '-i', streamUrl,
      '-c', 'copy', // Copy without re-encoding
      '-f', 'mp4',
      outputPath
    ]);

    return new Promise((resolve, reject) => {
      ffmpeg.on('close', (code) => {
        if (code === 0) resolve(outputPath);
        else reject(new Error(`FFmpeg exited with code ${code}`));
      });
    });
  }

  async getStreamInfo(streamUrl) {
    // Get stream information without downloading
    const ffprobe = spawn('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      streamUrl
    ]);

    return new Promise((resolve, reject) => {
      let data = '';
      ffprobe.stdout.on('data', chunk => data += chunk);
      ffprobe.on('close', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
  }
}
```

## Download Workflow

### 1. Content Discovery
```
User selects content in Stremio
    ↓
Addon receives stream request
    ↓
Check if content already downloaded
    ↓
If not downloaded, proceed to download
```

### 2. Stream URL Resolution
```
Get stream URL from Stremio addon
    ↓
Check if stream is Real-Debrid compatible
    ↓
If torrent/magnet: Add to Real-Debrid
    ↓
Wait for Real-Debrid processing
    ↓
Get direct download link from Real-Debrid
```

### 3. Download Process
```
Start FFmpeg stream capture
    ↓
Monitor download progress
    ↓
Store file with metadata
    ↓
Update database with file info
    ↓
Notify user of completion
```

## TDD Implementation for Real-Debrid Integration

### 1. Real-Debrid Service Tests

```javascript
// tests/services/real-debrid.test.js
describe('Real-Debrid Service', () => {
  let realDebridService;
  let mockAxios;

  beforeEach(() => {
    mockAxios = jest.mock('axios');
    realDebridService = new RealDebridService('test-api-key');
  });

  test('should add magnet link to Real-Debrid', async () => {
    const magnetLink = 'magnet:?xt=urn:btih:test-hash';
    const expectedResponse = { id: 'torrent-123' };

    mockAxios.post.mockResolvedValue({ data: expectedResponse });

    const result = await realDebridService.addMagnet(magnetLink);

    expect(result).toBe('torrent-123');
    expect(mockAxios.post).toHaveBeenCalledWith(
      'https://api.real-debrid.com/rest/1.0/torrents/addMagnet',
      { magnet: magnetLink },
      { headers: { Authorization: 'Bearer test-api-key' } }
    );
  });

  test('should get torrent information', async () => {
    const torrentId = 'torrent-123';
    const expectedInfo = {
      id: torrentId,
      filename: 'movie.mkv',
      status: 'downloaded',
      files: [{ id: 0, path: 'movie.mkv', bytes: 1000000 }]
    };

    mockAxios.get.mockResolvedValue({ data: expectedInfo });

    const result = await realDebridService.getTorrentInfo(torrentId);

    expect(result).toEqual(expectedInfo);
  });

  test('should get direct download link', async () => {
    const link = 'https://real-debrid.com/d/abc123';
    const expectedResponse = { download: 'https://direct-download.com/file.mkv' };

    mockAxios.post.mockResolvedValue({ data: expectedResponse });

    const result = await realDebridService.getDownloadLink(link);

    expect(result).toBe('https://direct-download.com/file.mkv');
  });
});
```

### 2. Stream Capture Tests

```javascript
// tests/services/stream-capture.test.js
describe('Stream Capture Service', () => {
  let streamCaptureService;
  let mockSpawn;

  beforeEach(() => {
    mockSpawn = jest.mock('child_process').spawn;
    streamCaptureService = new StreamCaptureService();
  });

  test('should capture stream successfully', async () => {
    const streamUrl = 'https://stream.example.com/movie.mkv';
    const outputPath = '/downloads/movie.mkv';

    const mockFFmpeg = {
      on: jest.fn((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 100);
        }
      })
    };

    mockSpawn.mockReturnValue(mockFFmpeg);

    const result = await streamCaptureService.captureStream(streamUrl, outputPath);

    expect(result).toBe(outputPath);
    expect(mockSpawn).toHaveBeenCalledWith('ffmpeg', [
      '-i', streamUrl,
      '-c', 'copy',
      '-f', 'mp4',
      outputPath
    ]);
  });

  test('should get stream information', async () => {
    const streamUrl = 'https://stream.example.com/movie.mkv';
    const expectedInfo = {
      format: { duration: '7200', size: '1000000000' },
      streams: [{ codec_name: 'h264', width: 1920, height: 1080 }]
    };

    const mockFFprobe = {
      stdout: { on: jest.fn() },
      on: jest.fn((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 100);
        }
      })
    };

    mockFFprobe.stdout.on.mockImplementation((event, callback) => {
      if (event === 'data') {
        callback(JSON.stringify(expectedInfo));
      }
    });

    mockSpawn.mockReturnValue(mockFFprobe);

    const result = await streamCaptureService.getStreamInfo(streamUrl);

    expect(result).toEqual(expectedInfo);
  });
});
```

### 3. Download Manager Tests

```javascript
// tests/services/download-manager.test.js
describe('Download Manager', () => {
  let downloadManager;
  let mockRealDebrid;
  let mockStreamCapture;

  beforeEach(() => {
    mockRealDebrid = {
      addMagnet: jest.fn(),
      getTorrentInfo: jest.fn(),
      getDownloadLink: jest.fn()
    };
    mockStreamCapture = {
      captureStream: jest.fn(),
      getStreamInfo: jest.fn()
    };
    downloadManager = new DownloadManager(mockRealDebrid, mockStreamCapture);
  });

  test('should download content from magnet link', async () => {
    const magnetLink = 'magnet:?xt=urn:btih:test-hash';
    const torrentId = 'torrent-123';
    const downloadLink = 'https://direct-download.com/file.mkv';
    const outputPath = '/downloads/movie.mkv';

    mockRealDebrid.addMagnet.mockResolvedValue(torrentId);
    mockRealDebrid.getTorrentInfo.mockResolvedValue({
      status: 'downloaded',
      files: [{ id: 0, path: 'movie.mkv' }]
    });
    mockRealDebrid.getDownloadLink.mockResolvedValue(downloadLink);
    mockStreamCapture.captureStream.mockResolvedValue(outputPath);

    const result = await downloadManager.downloadFromMagnet(magnetLink, outputPath);

    expect(result).toBe(outputPath);
    expect(mockRealDebrid.addMagnet).toHaveBeenCalledWith(magnetLink);
    expect(mockStreamCapture.captureStream).toHaveBeenCalledWith(downloadLink, outputPath);
  });

  test('should handle download progress', async () => {
    const streamUrl = 'https://stream.example.com/movie.mkv';
    const outputPath = '/downloads/movie.mkv';

    const progressCallback = jest.fn();
    mockStreamCapture.captureStream.mockImplementation((url, path, callback) => {
      // Simulate progress updates
      setTimeout(() => callback(25), 100);
      setTimeout(() => callback(50), 200);
      setTimeout(() => callback(100), 300);
      return Promise.resolve(path);
    });

    await downloadManager.downloadStream(streamUrl, outputPath, progressCallback);

    expect(progressCallback).toHaveBeenCalledWith(25);
    expect(progressCallback).toHaveBeenCalledWith(50);
    expect(progressCallback).toHaveBeenCalledWith(100);
  });
});
```

## Configuration

### Environment Variables
```bash
# Real-Debrid Configuration
REAL_DEBRID_API_KEY=your_api_key_here
REAL_DEBRID_BASE_URL=https://api.real-debrid.com/rest/1.0

# Download Configuration
DOWNLOAD_DIRECTORY=/path/to/downloads
MAX_CONCURRENT_DOWNLOADS=3
DOWNLOAD_TIMEOUT=3600000

# FFmpeg Configuration
FFMPEG_PATH=/usr/bin/ffmpeg
FFPROBE_PATH=/usr/bin/ffprobe
```

### Real-Debrid API Endpoints Used
- `POST /torrents/addMagnet` - Add magnet link
- `GET /torrents/info/{id}` - Get torrent information
- `POST /torrents/selectFiles/{id}` - Select files to download
- `POST /unrestrict/link` - Get direct download link
- `GET /user` - Get user information

## Error Handling

### Common Error Scenarios
1. **Real-Debrid API Errors**
   - Invalid API key
   - Rate limiting
   - Torrent processing failures

2. **Stream Capture Errors**
   - FFmpeg not found
   - Stream URL invalid
   - Network interruptions

3. **File System Errors**
   - Insufficient disk space
   - Permission denied
   - File already exists

### Error Recovery Strategies
```javascript
class DownloadErrorHandler {
  async handleRealDebridError(error) {
    if (error.status === 401) {
      throw new Error('Invalid Real-Debrid API key');
    } else if (error.status === 429) {
      // Rate limited - wait and retry
      await this.wait(60000);
      return this.retry();
    } else if (error.status >= 500) {
      // Server error - retry with exponential backoff
      return this.retryWithBackoff();
    }
  }

  async handleStreamCaptureError(error) {
    if (error.code === 'ENOENT') {
      throw new Error('FFmpeg not found. Please install FFmpeg.');
    } else if (error.code === 'ECONNRESET') {
      // Network error - retry
      return this.retry();
    }
  }
}
```

## Performance Optimizations

### 1. Concurrent Downloads
- Limit concurrent downloads to prevent overwhelming Real-Debrid
- Queue management for download requests
- Priority system for different content types

### 2. Caching Strategy
- Cache Real-Debrid API responses
- Store stream information to avoid repeated FFprobe calls
- Implement download resume capability

### 3. Bandwidth Management
- Throttle downloads to prevent network congestion
- Monitor system resources during downloads
- Implement download scheduling

This Real-Debrid integration approach provides a much more reliable and efficient way to download content compared to managing torrents directly, while leveraging the existing Stremio ecosystem and Real-Debrid's robust infrastructure.
