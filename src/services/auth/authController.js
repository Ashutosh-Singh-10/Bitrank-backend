const createError = require('http-errors');
const { PrismaClient } = require('@prisma/client');
const { sendOTPEmail, sendVerifyEmail } = require('../../utils/mailer');
const passport = require('../../utils/gauth');
const prisma = new PrismaClient();
const { generateAccessToken, generateRefreshToken, verifyEmail, verifyRefresh, hashPassword, verifyPassword, generateEmailVerifyToken } = require('../../utils/jwt_n_hash');


// Registration Handler
const register = async (req, res, next) => {
  const { username, email, password, collegeName } = req.body;
  if (!username || !email || !password || !collegeName) {
    return next(createError.BadRequest("Missing required fields"));
  }

  try {
    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) throw createError.BadRequest("User already exists");
    const collegeExists = await prisma.college.findUnique({ where: { collegeName } });
    if (!collegeExists) throw createError.BadRequest("This College is not registered with us")

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        collegeName
      }
    });

    const verifyToken = generateEmailVerifyToken(email);
    sendVerifyEmail(email, verifyToken);
    
    res.status(201).json({ message: 'User registered successfully. Please verify your email' });

  } catch (error) {
    next(error)
  }
};

// Login Handler
const login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(createError.BadRequest("Email and password are required"));
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw createError.NotFound('User not found');
    }
    if (user.password == null) throw createError.BadRequest("User has not set password yet. Login using Google and set password")
    const validPassword = await verifyPassword(password, user.password);
    if (!validPassword) {
      throw createError.Unauthorized('Invalid password');
    }
    if (!user.verified) {
      throw createError.Unauthorized("Please verify your email first")
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user);

    res.status(200).json({ accessToken, refreshToken });

  } catch (error) {
    next(error)
  }
};

const refreshToken = async (req, res, next) => {
  const { token } = req.body;

  if (!token) {
    next(createError.BadRequest("Refresh Token Not Provided"));
  }

  try {
    const decoded = verifyRefresh(token);
    const email = decoded.email;

    const existingToken = await prisma.refreshToken.findUnique({ where: { email, token } });
    if (!existingToken) throw next(createError.Unauthorized('Invalid refresh token'));
    
    const user = await prisma.user.findUnique({ where: { email: decoded.email } });
    const newAccessToken = generateAccessToken(user);
    
    res.json({ accessToken: newAccessToken });

  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const userEmail = req.user.email;
  
  if (!currentPassword || !newPassword) {
    return next(createError.BadRequest("Current password and new password are required"));
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: userEmail } });

    if (!user) {
      return next(createError.NotFound('User not found'));
    }

    const validPassword = await verifyPassword(currentPassword, user.password);
    if (!validPassword) {
      return next(createError.Unauthorized('Current password is incorrect'));
    }

    const hashedNewPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { email: userEmail },
      data: { password: hashedNewPassword }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error)
  }
};

const logout = async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return next(createError.BadRequest("Refresh token is required"));
  }

  try {
    const email = req.user.email;
    console.log(email, req.user);
    
    const existingToken = await prisma.refreshToken.findUnique({ where: { email: req.user.email, token: refreshToken } });
    if (!existingToken) throw next(createError.Unauthorized('User not Logged In'));

    await prisma.refreshToken.delete({ where: { email: req.user.email, token: refreshToken } });

    res.json({ message: 'Logged out successfully' });

  } catch (error) {
    console.log(error);
    next(createError.InternalServerError('Internal server error', { originalError: error }));
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) throw createError.BadRequest("Email is required")
    
    const userExists = prisma.user.findUnique({ where: { email } });
    if (!userExists) throw createError.BadRequest("User does not exist")
    
    const user = await prisma.oTP.findUnique({ where: { email } });

    let otp;

    if (!user || user.expiry < Date.now()) {
      otp = Math.floor(100000 + Math.random() * 900000);
      const expiry = new Date(Date.now() + 15 * 60 * 1000);
      console.log("new OTP:", email, otp, expiry)
      
      if (!user){
        await prisma.oTP.create({ data: { 
          email, otp, expiry
        } });
      } else {
        await prisma.oTP.update({
          where:{email},
          data: {email, otp, expiry}
        })
      }

    } else {
      otp = user.otp
    }

    sendOTPEmail(email, otp);

    res.status(200).json({
      "message": "OTP sent successfully"
    })
  } catch(err){
    next(err)
  }
}

const setPasswordOTP = async (req, res, next) => {
  try {

    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) throw createError.BadRequest("All fields are required")
    
    const user = await prisma.oTP.findUnique({ where: { email } });
    
    if (!user) throw createError.BadRequest("No OTP found for this user, please try again")

    console.log("match :",user, otp, user.otp, user.expiry, Date.now(), user.otp != otp, user.expiry < Date.now(), user.otp !== otp || user.expiry < Date.now())

    if (user.otp != otp || user.expiry < Date.now()) throw createError.BadRequest("Invalid OTP")

    await prisma.user.update({
      where: { email },
      data: { password: await hashPassword(newPassword) }
    })

    res.status(200).json({
      "message": "Password Updated"
    })

  } catch(err){
    next(err)
  }
}

const emailVerification = async (req, res, next) => {
  console.log("En route ...")
  try {
    const { token } = req.params;

    const decoded = verifyEmail(token);
    
    const user = await prisma.user.findUnique({ where: { email: decoded.email } });

    if (!user) {
      return next(createError.BadRequest('User not found'));
    }

    await prisma.user.update({ where: { email: decoded.email }, data: { verified: true } });

    res.status(200).json({message:"Email verified successfully"});

  } catch (error) {
    if (error.name == "TokenExpiredError" || error.name == "JsonWebTokenError") {
      next(createError.BadRequest("This is not a valid verification URL"))
    }
    next(error)
  }
}

const googleAuth = (req, res, next) => {
  const callbackURL = req.query.callback || process.env.GOOGLE_CALLBACK_URL;
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    callbackURL: callbackURL,
    state: callbackURL 
  })(req, res, next);
}

const googleAuthCallBack = async (req, res) => {
  const user = req.user;
  if (!user) res.redirect(`${process.env.CLIENT_URL || ''}/login}`);
  try {
    const accessToken = generateAccessToken(user)
    const refreshToken = await generateRefreshToken(user);
    res.redirect(`${process.env.CLIENT_URL || ''}/login?accessToken=${accessToken}&refreshToken=${refreshToken}`);
  } catch (err){
    res.redirect(`${process.env.CLIENT_URL || ''}/login`);
  }
}

module.exports = {
  register, login, logout, refreshToken, 
  changePassword, forgotPassword, setPasswordOTP, 
  emailVerification, 
  googleAuth, googleAuthCallBack
}