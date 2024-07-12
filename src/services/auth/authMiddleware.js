const jwt = require('jsonwebtoken');
const createError = require('http-errors');

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) throw createError.Unauthorized("No token provided");

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    req.user = decoded;
    next();
    
  }catch(error){
    console.log(error)
    if (error.name == "JsonWebTokenError") next(createError.Unauthorized("Invalid token"));
    if (error.name == "TokenExpiredError") next(createError.Unauthorized("Token expired"));
    next(error)
  }
};

const checkVerified = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) throw createError.Unauthorized("No token provided");

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    req.user = {
      isVerified: true,
      email: decoded.email
    };
    next();

  }catch(error){

    req.user = {
      isVerified: false
    }
    
    next()
  }
};

module.exports = { authenticate, checkVerified }
