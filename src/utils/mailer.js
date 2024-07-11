const nodemailer = require('nodemailer');

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify the transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.log('Error with email transporter:', error);
  } else {
    console.log('Email transporter is ready to send emails');
  }
});

async function sendEmail({ to, subject, text, html }) {
  try {
    const info = await transporter.sendMail({
      from: `"BitRank" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      text: text,
      html: html
    });

    console.log('Email sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}

async function sendOTPEmail(email, otp) {
  const subject = 'Bitrank OTP';
  
  // HTML template for the email
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your OTP</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 5px;
        }
        .otp {
          font-size: 32px;
          font-weight: bold;
          color: #4CAF50;
          letter-spacing: 5px;
          text-align: center;
          margin: 20px 0;
          padding: 10px;
          background-color: #f0f0f0;
          border-radius: 5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>BitRank One-Time-Password</h2>
        <p>Hello user,</p>
        <p>Your One-Time-Password is as follows:</p>
        <div class="otp">${otp}</div>
        <p>This OTP is valid for a limited time. Please do not share it with anyone.</p>
        <p>If you didn't request this OTP, please ignore this email.</p>
        <p>Best regards,<br>BitRank</p>
      </div>
    </body>
    </html>
  `;

  // Plain text version for email clients that don't support HTML
  const textContent = `
    Hello user,

    Your One-Time-Password is as follows: ${otp}

    This OTP is valid for a limited time. Please do not share it with anyone.

    If you didn't request this OTP, please ignore this email.

    Best regards,
    BitRank
  `;

  try {
    const result = await sendEmail({
      to: email,
      subject: subject,
      text: textContent,
      html: htmlContent
    });

    if (result.success) {
      console.log('OTP email sent successfully');
      return { success: true, message: 'OTP email sent successfully' };
    } else {
      console.error('Failed to send OTP email:', result.error);
      return { success: false, error: 'Failed to send OTP email' };
    }
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return { success: false, error: 'Error sending OTP email' };
  }
}

const sendVerifyEmail = async (email, token) => {
  
  const subject = 'Bitrank Email Verification';
  
  // HTML template for the email
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your OTP</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 5px;
        }
        .otp {
          font-size: 32px;
          font-weight: bold;
          color: #4CAF50;
          letter-spacing: 5px;
          text-align: center;
          margin: 20px 0;
          padding: 10px;
          background-color: #f0f0f0;
          border-radius: 5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>BitRank Email Verification</h2>
        <p>Hello user,</p>
        <p>Please click on the below link to verify your email</p>
        <div class="otp" ><a href="${process.env.CLIENT_URL}/verify-email?token=${token}">Verify Email</a></div>
        <p>Please do not share it with anyone.</p>
        <p>If you didn't request this email, please don't follow the link.</p>
        <p>Best regards,<br>BitRank</p>
      </div>
    </body>
    </html>
  `;

  // Plain text version for email clients that don't support HTML
  const textContent = `
    Hello user,

    Your email verification link is as below

    https://${process.env.CLIENT_URL}/verify-email?token=${token}

    Please do not share it with anyone.

    If you didn't request this email, please DON'T follow the link.

    Best regards,
    BitRank
  `;

  try {
    const result = await sendEmail({
      to: email,
      subject: subject,
      text: textContent,
      html: htmlContent
    });

    if (result.success) {
      console.log('Verification email sent successfully');
      return { success: true, message: 'Verification email sent successfully' };
    } else {
      console.error('Failed to send verification email:', result.error);
      return { success: false, error: 'Failed to send verification email' };
    }
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: 'Error sending verification email' };
  }
}
  
  // Don't forget to export the new function
module.exports = { sendEmail, sendOTPEmail, sendVerifyEmail };