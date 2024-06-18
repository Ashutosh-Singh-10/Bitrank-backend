const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/authRoutes'); // Import authRoutes
const cors = require('cors');
const app = express();
const corsOptions = {
   origin : "http://localhost:5173",
   methods : "GET, POST,PUT, DELETE, PATCH, HEAD",
   credentials: true,
};
app.use(cors(corsOptions));
require('dotenv').config();


const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use('/api/auth', authRoutes); // Mount authRoutes at /api/auth

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
