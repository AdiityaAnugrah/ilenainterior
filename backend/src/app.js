const express = require('express');
const cors    = require('cors');
const path    = require('path');
const compression = require('compression');
require('dotenv').config();

const app = express();

app.set('trust proxy', 1);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Compression middleware - compress responses > 1KB
app.use(compression({
  level: 6, // Compression level (6 = balanced between speed and compression ratio)
  threshold: 1024, // Only compress responses larger than 1KB (1024 bytes)
  filter: (req, res) => {
    // Skip compression if explicitly disabled
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Skip compression for already compressed formats (images, videos, models)
    const contentType = res.getHeader('Content-Type');
    if (contentType) {
      const skipTypes = [
        'image/', // All image formats (jpeg, png, webp, gif, etc.)
        'video/', // All video formats (mp4, webm, etc.)
        'audio/', // All audio formats (mp3, ogg, etc.)
        'application/octet-stream', // Binary files like .glb models
        'model/' // 3D model formats
      ];
      
      if (skipTypes.some(type => contentType.includes(type))) {
        return false;
      }
    }
    
    // Use default compression filter for other content types (JSON, text, HTML, CSS, JS)
    return compression.filter(req, res);
  }
}));

// Serve uploaded files (images & .glb models)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/orders',      require('./routes/orders'));
app.use('/api/wallpapers',  require('./routes/wallpapers'));
app.use('/api/admin',       require('./routes/admin'));
app.use('/api/admin',       require('./routes/admin-import'));
app.use('/api/meta',        require('./routes/metaCapi').router);
app.use('/api/notifications', require('./routes/notifications'));

app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  app: 'ILENA INTERIOR API',
  uptime: Math.round(process.uptime()),
  timestamp: new Date().toISOString(),
}));

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;

  // Malformed client JSON/body should return 400 without noisy stack traces.
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ message: 'JSON request body tidak valid' });
  }

  if (status >= 500) {
    console.error(err.stack || err);
  } else {
    console.warn(`[Client Error] ${status} ${req.method} ${req.originalUrl}: ${err.message}`);
  }

  res.status(status).json({ message: err.message || 'Terjadi kesalahan server' });
});

module.exports = app;
