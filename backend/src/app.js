require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { sequelize, testConnection } = require('./config/database');
const { sequelize: db } = require('./config/database');
const { assertProductionSecrets } = require('./config/security');

assertProductionSecrets();

const app = express();
app.disable('x-powered-by');
const PORT = process.env.PORT || 3001;
// Production: listen on the internal interface only (the reverse proxy connects to it)
const HOST = process.env.HOST || undefined;

// Number of reverse proxies in front of the app (production: 1, the nginx reverse proxy).
// Needed for the real client IP in req.ip and rate limiting.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 0));

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/users', require('./routes/users'));
app.use('/api/certificates', require('./routes/certificates'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Production: serve the built frontend (frontend/dist), so no separate web server
// is needed on the application host
if (process.env.STATIC_DIR) {
  const staticDir = path.resolve(process.env.STATIC_DIR);
  // Vite puts hashed files into assets/: they never change and can be cached forever
  app.use('/assets', express.static(path.join(staticDir, 'assets'), { immutable: true, maxAge: '1y' }));
  // redirect: false — a directory such as courses/ (course images) must not turn the SPA
  // route /courses into a redirect to /courses/
  app.use(express.static(staticDir, { index: false, redirect: false, maxAge: '1h' }));
  // SPA: any other non-API GET is a client-side route
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(staticDir, 'index.html'));
  });
}

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const startServer = async () => {
  const connected = await testConnection();
  if (!connected) {
    console.error('Failed to start server without database connection.');
    process.exit(1);
  }

  try {
    await db.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('✅ Database synced successfully.');

    app.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on ${HOST || '*'}:${PORT}`);
      console.log(`📚 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Failed to sync database:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
