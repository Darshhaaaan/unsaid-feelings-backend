const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = async (to, subject, htmlContent) => {
  const mailOptions = {
    from: `"Unsaid Feelings 💌" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
    return { success: true };
  } catch (error) {
    console.error('Email failed:', error);
    return { success: false, error };
  }
};

console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Loaded' : '❌ MISSING');

module.exports = sendEmail;