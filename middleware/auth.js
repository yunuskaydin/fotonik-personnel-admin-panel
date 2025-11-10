const jwt = require('jsonwebtoken');
require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev_insecure_secret');
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required in production');
}

// Admin mi kontrolü
exports.admin = (req, res, next) => {
  const token = (req.headers.authorization || '').split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token bulunamadı.' });
  }
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    console.error('Admin token verification error:', err.message);
    return res.status(401).json({ message: 'Geçersiz veya süresi dolmuş token.' });
  }
};
// Personel mi kontrolü
exports.personel = (req, res, next) => {
  const token = (req.headers.authorization || '').split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token bulunamadı.' });
  }
  try {
    req.personel = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    console.error('Personel token verification error:', err.message);
    return res.status(401).json({ message: 'Geçersiz veya süresi dolmuş token.' });
  }
};
// İkisi de olabilir
exports.personelOrAdmin = (req, res, next) => {
  const token = (req.headers.authorization || '').split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token bulunamadı.' });
  }
  try {
    req.personel = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    try {
      req.admin = jwt.verify(token, JWT_SECRET);
      next();
    } catch (err) {
      console.error('Token verification error:', err.message);
      return res.status(401).json({ message: 'Geçersiz veya süresi dolmuş token.' });
    }
  }
};
