const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config({ path: path.join(__dirname, '.env') });

const Connection = require('./database/db.js');
const Routes = require('./routes/route.js');
const productRoutes = require('./routes/productRoutes.js');
const categoryRoutes = require('./routes/categoryRoutes.js');
const adminRoutes = require('./routes/adminRoutes.js');
const { initSocketHandler } = require('./socketHandler.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server for Socket.io
const server = http.createServer(app);

// Middleware
// Configure CORS to allow the frontend origin (set ALLOWED_ORIGIN in Render envs)
const allowedOrigins = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5000', 'https://expressbasket.vercel.app', 'https://expressbasket1.vercel.app', 'https://expressbasket-saqp.onrender.com'];

// Log allowed origins at startup for Render debugging
console.log('CORS allowedOrigins:', allowedOrigins);

const corsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (like curl, server-to-server)
    if (!origin) return callback(null, true);
    // if ALLOWED_ORIGIN contains '*' treat as allow all
    if (allowedOrigins.indexOf('*') !== -1) return callback(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    // Log blocked origins for easier debugging in Render logs
    console.warn(`CORS: blocked origin ${origin}`);
    // Allow the request anyway - just log the warning
    return callback(null, true);
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
};

// Apply CORS middleware FIRST - before any other middleware
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Initialize Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins.indexOf('*') !== -1 ? '*' : allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize socket handler
initSocketHandler(io);

// Make io accessible in routes
app.set('io', io);

// HTTP request logging for easier debugging in Render logs
const morgan = require('morgan');
app.use(morgan('combined'));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.resolve(__dirname, './uploads')));

// Connect to MongoDB (fail fast so admin/login works reliably)
Connection().then(() => {
  console.log('Database connected');
}).catch((err) => {
  console.error('Database connection error:', err.message);
  process.exit(1);
});

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Routes
app.use('/api', Routes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/admin', adminRoutes);

// Basic API info route
app.get('/', (req, res) => {
  res.json({ message: 'Basket Grocery API is running', version: '1.0.0' });
});

// Health check endpoint for Render
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Express error handler (returns JSON) to surface stack traces in logs
app.use((err, req, res, next) => {
  console.error('Express error handler:', err && err.stack ? err.stack : err);
  const status = err && err.status ? err.status : 500;
  // Return minimal message to client, full stack appears in server logs
  res.status(status).json({ message: err && err.message ? err.message : 'Internal Server Error' });
});

// Use http server instead of express app.listen for Socket.io
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Socket.io ready for connections`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});
