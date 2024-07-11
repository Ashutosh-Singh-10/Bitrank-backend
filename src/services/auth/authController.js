const createError = require('http-errors');
const { PrismaClient } = require('@prisma/client');
const { sendOTPEmail, sendVerifyEmail } = require('../../utils/mailer');
const prisma = new PrismaClient();
const { generateAccessToken, generateRefreshToken, verifyEmail, verifyRefresh, hashPassword, verifyPassword, generateEmailVerifyToken } = require('../../utils/jwt_n_hash');

const register = async (req, res, next) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return next(createError.BadRequest("Missing required fields"));
  }

  try {
    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword
      }
    });

    const verifyToken = generateEmailVerifyToken(email);
    console.log("verifyEmail", verifyToken)
    sendVerifyEmail(email, verifyToken);
    
    res.status(201).json({ message: 'User registered successfully. Please verify your email' });
  } catch (error) {
    if (error.code == "P2002") next(createError.BadRequest("User already Exists"))
    next(error)
  }
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(createError.BadRequest("Email and password are required"));
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return next(createError.NotFound('User not found'));
    }

    const validPassword = await verifyPassword(password, user.password);
    if (!validPassword) {
      return next(createError.Unauthorized('Invalid password'));
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user);

    res.json({ accessToken, refreshToken });

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
    const newRefreshToken = await generateRefreshToken(user);

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });

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
      console.log(email, otp, expiry)
      
      await prisma.oTP.create({ data: { 
        email, otp, expiry
      } });

    } else {
      otp = user.otp
    }

    sendOTPEmail(email, otp);

    res.status(200).json({
      "message": "OTP SENT SUCCESSFULLY"
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
    if (user.otp !== otp || user.expiry < Date.now()) throw createError.BadRequest("Invalid OTP")

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

    res.status(200).send("Email verified successfully");

  } catch (error) {
    next(error)
  }
}

module.exports = {
  register, login, refreshToken, changePassword, logout, forgotPassword, setPasswordOTP, emailVerification
}