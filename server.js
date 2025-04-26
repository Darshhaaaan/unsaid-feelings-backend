const express = require('express');
const app = express();
const dotenv = require('dotenv');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const cors = require('cors');

// Allow requests from your frontend
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true // if you're using cookies/auth headers
}));

dotenv.config();

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

app.use(bodyParser.json());

app.use('/api/users', userRoutes);   
app.use('/api/posts', postRoutes);   

app.listen(5000, () => {
  console.log('Server is running on http://localhost:5000');
});
