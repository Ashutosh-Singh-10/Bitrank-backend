const Router = require('express').Router();

Router.use('/auth', require('./authRoutes'));

// Router.use(require('../middlewares/authMiddleware').authenticate);



module.exports = Router