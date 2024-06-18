const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const generateAccessToken = (user) => {
  return jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

const generateRefreshToken = async (user) => {
  const token = jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  await prisma.refreshToken.create({
    data: {
      token,
      userId: user.id,
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });
  return token;
};

exports.register = async (req, res) => {
    const { username, email, password } = req.body;
    console.log(username);
    console.log(email);
    console.log(password);
  const hashedPassword = await bcrypt.hash(password, 10);
      console.log(hashedPassword);
  try {
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword
      }
    });
    
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
   console.log(email);
   console.log(password);
  try {
    console.log("a");
    const user = await prisma.user.findUnique({ where: { email } });
    console.log("hey");
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user);

    res.json({ accessToken, refreshToken });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.refreshToken = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const existingToken = await prisma.refreshToken.findUnique({ where: { token } });
    if (!existingToken) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = await generateRefreshToken(user);

    await prisma.refreshToken.delete({ where: { token: existingToken.token } });

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    res.status(403).json({ message: 'Invalid token' });
  }
};
