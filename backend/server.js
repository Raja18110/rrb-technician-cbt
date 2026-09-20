const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Parsing Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Simple dev request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.originalUrl.startsWith('/api')) {
      console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Mount REST API
app.use('/api', apiRoutes);

const projectRoot = path.resolve(__dirname, '..');

// Static assets: cards, css, js, data, and root files
app.use(express.static(projectRoot));

// Serve main Single Page Application
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: projectRoot });
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack || err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚆 RRB Technician CBT Backend running at http://localhost:${PORT}`);
    console.log(`📊 REST API endpoints available at http://localhost:${PORT}/api\n`);
  });
}

module.exports = app;
