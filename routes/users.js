const express = require('express');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const sendEmail = require('./mailer');

dotenv.config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

router.post('/register', async (req, res) => {
  const { email, phone, username, password } = req.body;

  db.query('SELECT * FROM users WHERE email = ? OR phone = ?', [email, phone], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length > 0) return res.status(400).json({ error: 'User already exists' });

    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) return res.status(500).json({ error: 'Error hashing password' });

      const query = 'INSERT INTO users (email, phone, username, password) VALUES (?, ?, ?, ?)';
      db.query(query, [email, phone, username, hashedPassword], async (err, results) => {
        if (err) return res.status(500).json({ error: 'Error creating user' });

        const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '10m' });
        const link = `http://localhost:5000/api/users/verify?token=${token}`;

        await sendEmail(email, 'Verify Your Email – Unsaid Feelings', `
          <h2>Hello ${username},</h2>
          <p>Click below to verify your email:</p>
          <a href="${link}">Verify Email</a>
        `);

        res.status(201).json({ message: 'User created successfully! Verification email sent.' });
      });
    });
  });
});

router.get('/verify', (req, res) => {
    const token = req.query.token;
    if (!token) return res.status(400).send('Verification token missing');
  
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return res.status(400).send('Invalid or expired token');
  
      const demail = decoded.email;
      db.query('UPDATE users SET verified = TRUE WHERE email = ?', [demail], (err, result) => {
        if (err) return res.status(500).send('Database error during verification');
        if (result.affectedRows === 0) return res.status(404).send('User not found or already verified');
  
        res.redirect('http://localhost:3000/verified-success');
      });
    });
  });

router.post('/login', (req, res) => {
  const { emailOrPhone, password } = req.body;

  if (!emailOrPhone || !password) return res.status(400).json({ error: 'Please provide email/phone and password' });

  const identifier = emailOrPhone.trim().toLowerCase();

  db.query('SELECT * FROM users WHERE email = ? OR phone = ?', [identifier, identifier], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = results[0];

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) return res.status(500).json({ error: 'Password comparison failed' });
      if (!isMatch) return res.status(401).json({ error: 'Incorrect password' });

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

      res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    });
  });
});

router.delete('/delete-account', (req, res) => {
  const { emailOrPhone, password } = req.body;
  if (!emailOrPhone || !password) return res.status(400).json({ error: 'Email/Phone and password required' });

  const identifier = emailOrPhone.trim().toLowerCase();

  db.query('SELECT * FROM users WHERE email = ? OR phone = ?', [identifier, identifier], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = results[0];

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) return res.status(500).json({ error: 'Error verifying password' });
      if (!isMatch) return res.status(401).json({ error: 'Incorrect password' });

      db.query('DELETE FROM users WHERE id = ?', [user.id], async (err) => {
        if (err) return res.status(500).json({ error: 'Error deleting account' });

        await sendEmail(user.email, 'Account Deleted – Unsaid Feelings', `
          <p>Hi ${user.username},</p>
          <p>Your account has been deleted. We hope you found peace here.</p>
        `);

        res.status(200).json({ message: 'Account deleted successfully' });
      });
    });
  });
});

router.post('/forgot-password', (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: 'Email required' });

  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const resetLink = `http://localhost:3000/reset-password?token=${token}`;

  sendEmail(email, 'Reset Your Password – Unsaid Feelings', `
    <h3>Password Reset</h3>
    <p>Click below to reset your password:</p>
    <a href="${resetLink}">Reset Password</a>
    <p>This link expires in 15 minutes.</p>
  `);

  res.status(200).json({ message: 'Reset link sent to email' });
});

router.get('/test-email', async (req, res) => {
    const sendEmail = require('./mailer');
  
    const result = await sendEmail(
      process.env.EMAIL_USER,
      '🧪 Nodemailer Test - Unsaid Feelings',
      '<h3>This is a test email from your project 🚀</h3>'
    );
  
    if (result.success) {
      res.status(200).json({ message: '✅ Test email sent!' });
    } else {
      res.status(500).json({ error: '❌ Failed to send email', detail: result.error });
    }
  });

  
router.post('/request-reset', async (req, res) => {
  const { emailOrPhone } = req.body;

  db.query('SELECT * FROM users WHERE email = ? OR phone = ?', [emailOrPhone, emailOrPhone], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    if (results.length === 0) {
      return res.status(400).json({ error: 'No user found with that email or phone.' });
    }

    const user = results[0];
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });

    const resetLink = `http://localhost:3000/reset-password/${token}`;
    const emailHTML = `<p>You requested a password reset. Click below to reset it:</p><a href="${resetLink}">${resetLink}</a>`;

    const send = await sendEmail(user.email, 'Reset your password – Unsaid Feelings', emailHTML);

    if (send.success) {
      return res.status(200).json({ success: true, message: 'Reset link sent to your email.' });
    } else {
      return res.status(500).json({ error: 'Failed to send email.' });
    }
  });
});

router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password is required.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const hashed = await bcrypt.hash(password, 10);

    db.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashed, decoded.userId],
      (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        return res.json({ success: true, message: 'Password updated.' });
      }
    );
  } catch (err) {
    return res.status(400).json({ error: 'Invalid or expired token.' });
  }
});


module.exports = router;