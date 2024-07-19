const express = require('express');
const router = express.Router();
const authController = require('./authController');
const passport = require('../../utils/gauth');

const { authenticate } = require('./authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);

router.post('/forgot-password', authController.forgotPassword);
router.post('/set-password-otp', authController.setPasswordOTP);

router.get('/verify/:token', authController.emailVerification);

router.get('/google', authController.googleAuth);

router.get('/google/BitRank', passport.authenticate('google', { failureRedirect: `${process.env.CLIENT_URL || ''}/login` }),
  authController.googleAuthCallBack
);

router.post('/change-password', authenticate, authController.changePassword);
router.post('/logout', authenticate, authController.logout);

router.post('/test', authenticate, (req, res, next)=> {
  console.log("on test route ...")
  res.status(200).json({
    message: "success"
  })
})

module.exports = router;