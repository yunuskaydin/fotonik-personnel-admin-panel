const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const admins = require('../data/admins.json');
const PERSONEL_FILE = path.join(__dirname, '../data/personel.json');
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev_insecure_secret');
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required in production');
}

exports.login = (req, res) => {
  const { username, password } = req.body;
  const user = admins.find(a => a.username === username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ message: 'Kullanıcı adı veya şifre hatalı.' });
  }
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '2h' });
  res.json({ token });
};
