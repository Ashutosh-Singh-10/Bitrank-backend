const Router = require('express').Router();

Router.use('/auth', require('./services/auth/authRoutes'));

// Router.use(require('../middlewares/authMiddleware').authenticate);



module.exports = Router