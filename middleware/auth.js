const jwt = require('jsonwebtoken');
require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET;

// Admin mi kontrolü
exports.admin = (req, res, next) => {
  const token = (req.headers.authorization || '').split(' ')[1];
  if (!token) return res.status(401).end();
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).end();
  }
};
// Personel mi kontrolü
exports.personel = (req, res, next) => {
  const token = (req.headers.authorization || '').split(' ')[1];
  if (!token) return res.status(401).end();
  try {
    req.personel = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).end();
  }
};
// İkisi de olabilir
exports.personelOrAdmin = (req, res, next) => {
  const token = (req.headers.authorization || '').split(' ')[1];
  if (!token) return res.status(401).end();
  try {
    req.personel = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    try {
      req.admin = jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      res.status(401).end();
    }
  }
};
