const express = require('express');
const router = express.Router();
const dotenv = require('dotenv');
const mysql = require('mysql2');

dotenv.config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

router.post('/posts', (req, res) => {
  const { to_name, content, userId } = req.body;

  const query = 'INSERT INTO posts (user_id, to_name, content) VALUES (?, ?, ?)';
  db.query(query, [userId, to_name, content], (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: 'Error creating post' });
    }

    res.status(201).json({ message: 'Post created successfully!' });
  });
});

router.get('/posts', (req, res) => {
  const { name } = req.query;

  db.query('SELECT * FROM posts WHERE to_name = ?', [name], (err, results) => {
    if (err) {
      console.log(err)
      return res.status(500).json({ error: 'Error fetching posts' });
    }

    res.json({ posts: results });
  });
});

router.get('/userposts', (req, res) => {
  const { userId } = req.query;

  db.query('SELECT * FROM posts WHERE user_id = ?', [userId], (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: 'Error fetching posts' });
    }

    res.json({ posts: results });
  });
});

module.exports = router;