const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient()

const generateAccessToken = (user) => {
    return jwt.sign({ email: user.email }, process.env.JWT_ACCESS_SECRET, { expiresIn: process.env.JWT_ACCESS_EXPIRY });
};
  
const generateRefreshToken = async (user) => {
    const token = jwt.sign({ email: user.email }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRY });

    const refreshExists = await prisma.refreshToken.findUnique({ where: { email: user.email } });
    if (refreshExists) {
        await prisma.refreshToken.update({ where: { email: user.email }, data: { token, expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
    } else {
        await prisma.refreshToken.create({ data: { email: user.email, token, expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
    }
    return token;
};

const generateEmailVerifyToken = (email) => {
    return jwt.sign({ email }, process.env.JWT_EMAIL_VERIFY_SECRET);
}

const verifyAccess = (token) => {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET)
}
const verifyRefresh = (token) => {
    const res = jwt.verify(token, process.env.JWT_REFRESH_SECRET)
    console.log("RES : ", res)
    return res
}

const verifyEmail = (token) => {
    return jwt.verify(token, process.env.JWT_EMAIL_VERIFY_SECRET)
}

// ----------

const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

const verifyPassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
}

// ----------

module.exports = {
    generateAccessToken, generateRefreshToken, generateEmailVerifyToken, verifyAccess, verifyRefresh, verifyEmail, hashPassword, verifyPassword
}