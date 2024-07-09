const express = require('express');
const passport = require('../utils/gauth');
const router = express.Router();
const authController = require('../controllers/authController');

const { authenticate } = require('../middlewares/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/refresh', authController.refreshToken);

router.post('/forgot-password', authController.forgotPassword);
router.post('/set-password-otp', authController.setPasswordOTP);

// router.get('/google', (req, res, next) => {
//   const callbackURL = req.query.callback || process.env.GOOGLE_CALLBACK_URL;
  
//   passport.authenticate('google', {
//     scope: ['profile', 'email'],
//     callbackURL: callbackURL,
//     state: callbackURL // Store the callbackURL in the state
//   })(req, res, next);
// });

// router.get('/google/callback', (req, res, next) => {
//   const callbackURL = req.query.state || process.env.GOOGLE_CALLBACK_URL;
  
//   passport.authenticate('google', {
//     callbackURL: callbackURL
//   })(req, res, next);
// }, (req, res) => {
//   console.log('Google Auth Successful');
//   res.status(200).json({ message: 'Authentication successful', user: req.user });
// });


// // Google OAuth routes
// router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// router.get('/google/BitRank', passport.authenticate('google', { failureRedirect: '/login' }),
//   (req, res) => {
//     res.redirect('/dashboard');
//   }
// );
  
router.post('/change-password', authenticate, authController.changePassword);
router.post('/logout', authenticate, authController.logout);

router.get('/test', authenticate, (req, res, next)=> {
  console.log("on test route ...")
  res.status(200).json({
    message: "success"
  })
})

module.exports = router;