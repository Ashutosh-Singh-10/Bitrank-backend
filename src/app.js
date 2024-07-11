const express = require('express');
const session = require('express-session'); // Add express-session
const cors = require('cors');
const passport = require('./utils/gauth'); // Ensure you have the correct path
require('dotenv').config();

const app = express();

const corsOptions = {
  origin: 'http://localhost:5173',
  methods: 'GET, POST, PUT, DELETE, PATCH, HEAD',
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(require('morgan')('dev'));

// Add express-session middleware
app.use(session({
  secret: process.env.SESSION_SECRET, // Replace with your own secret
  resave: false,
  saveUninitialized: true,
}));

// Initialize Passport and session support
app.use(passport.initialize());
app.use(passport.session());

// Mounting Routes
app.use('/api', require('./serviceIndex'));

// Error Handler
app.use((err, req, res, next)=>{
  if (err) {
    res.status(err.status||500).json({
      error: err.message 
    });
  }
})

// Start Server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});