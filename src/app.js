const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session'); // Add express-session
const authRoutes = require('./routes/authRoutes'); // Import authRoutes
const cors = require('cors');
const passport = require('./config/passportConfig'); // Ensure you have the correct path
require('dotenv').config();

const app = express();

const corsOptions = {
  origin: 'http://localhost:5173',
  methods: 'GET, POST, PUT, DELETE, PATCH, HEAD',
  credentials: true,
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

// Add express-session middleware
app.use(session({
  secret: 'your_secret_key', // Replace with your own secret
  resave: false,
  saveUninitialized: true,
}));

// Initialize Passport and session support
app.use(passport.initialize());
app.use(passport.session());

app.use('/api/auth', authRoutes); // Mount authRoutes at /api/auth

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
