const { verifyToken } = require('../utils/tokens');
const { findUserById } = require('../utils/users');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token missing' });
  }

  const decoded = verifyToken(token, process.env.JWT_ACCESS_SECRET);
  if (!decoded) {
    return res.status(403).json({ message: 'Invalid or expired access token' });
  }

  const user = findUserById(decoded.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  req.user = user;
  req.deviceId = decoded.deviceId;
  next();
};

module.exports = authMiddleware;
