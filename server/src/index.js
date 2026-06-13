require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { connectDatabase } = require('./config/database');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5001;

// --------------- Middleware ---------------
app.use(helmet());
app.use(morgan('dev'));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CLIENT_URL 
    : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// --------------- Routes ---------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// API routes (will be added in subsequent phases)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/crawl', require('./routes/crawl'));
app.use('/api/bookmarks', require('./routes/bookmarks'));
app.use('/api/users', require('./routes/users'));

// --------------- Error Handler ---------------
app.use(errorHandler);

// --------------- Start Server ---------------
const startServer = async () => {
  try {
    await connectDatabase();

    // Start the scheduler after DB is ready
    const SchedulerService = require('./services/SchedulerService');
    await SchedulerService.init();

    app.listen(PORT, () => {
      console.log(`\n🚀 CapNhatGia Server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
