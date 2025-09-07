/* Express server with MySQL integration and React static serving */
require('dotenv').config();
const path = require('path');
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Apply rate limiting to API routes
app.use('/api/', limiter);

// Enable CORS with production/development settings
const corsOptions = {
  origin: isProduction 
    ? [`https://${process.env.DOMAIN || 'dev.eliasshamil.com'}`]
    : 'http://localhost:5173',
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));

// Trust first proxy (important for HTTPS in production)
if (isProduction) {
  app.set('trust proxy', 1);
}

// Logging middleware for production
if (isProduction) {
  const morgan = require('morgan');
  app.use(morgan('combined'));
  
  // Serve static files from the client directory
  const staticPath = path.join(__dirname, 'client');
  console.log(`Serving static files from: ${staticPath}`);
  
  app.use(express.static(staticPath, {
    etag: true,
    maxAge: '1y', // Cache static assets for 1 year
    index: 'index.html' // Serve index.html for root route
  }));
  
  // Handle SPA routing - return index.html for all other routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
} else {
  // In development, just serve the client from Vite dev server (handled by CORS)
  app.get('/', (req, res) => {
    res.redirect('http://localhost:5173');
  });
}

// JSON middleware
app.use(express.json());

// Database pool using env vars
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;
(async () => {
  try {
    pool = mysql.createPool(dbConfig);
    // Test a connection on startup
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('MySQL pool created successfully');
  } catch (err) {
    console.error('Failed to initialize MySQL pool:', err.message);
  }
})();

// API routes for diary entries
app.get('/api/entries', async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ error: 'DB pool not initialized' });
    const [rows] = await pool.query('SELECT id, content, created_at, updated_at FROM diary_entries ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('DB query error:', err);
    res.status(500).json({ error: 'Failed to fetch diary entries' });
  }
});

app.post('/api/entries', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    const [result] = await pool.query(
      'INSERT INTO diary_entries (content) VALUES (?)',
      [content.trim()]
    );
    
    const [newEntry] = await pool.query(
      'SELECT id, content, created_at, updated_at FROM diary_entries WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json(newEntry[0]);
  } catch (err) {
    console.error('DB insert error:', err);
    res.status(500).json({ error: 'Failed to save diary entry' });
  }
});

app.delete('/api/entries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM diary_entries WHERE id = ?', [id]);
    res.status(204).send();
  } catch (err) {
    console.error('DB delete error:', err);
    res.status(500).json({ error: 'Failed to delete diary entry' });
  }
});

// Serve React build
const clientBuildPath = path.join(__dirname, 'client', 'build');

// Handle all other routes by serving index.html for SPA routing
if (isProduction) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
  });
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  if (isProduction) {
    console.log('Serving static files from:', path.join(__dirname, 'client/dist'));
  }
});
