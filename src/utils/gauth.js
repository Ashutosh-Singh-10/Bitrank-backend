const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

passport.serializeUser((user, done) => {
  done(null, user.email);
});

passport.deserializeUser(async (email, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

passport.use('google', new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
  passReqToCallback: true
},
async (req, accessToken, refreshToken, profile, done) => {
  try {
    let user = await prisma.user.findUnique({ where: { email: profile.emails[0].value } });
    
    if (user) {
      user = await prisma.user.update({
        where: { email: profile.emails[0].value },
        data: { 
          googleId: profile.id,
          verified: true
        }
      });
    } else {
      user = await prisma.user.create({
        data: {
          username: profile.displayName,
          email: profile.emails[0].value,
          collegeName: "CU",
          googleId: profile.id,
          verified: true
        }
      });
    }

    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

module.exports = passport;