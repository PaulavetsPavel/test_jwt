const express = require('express');
const { generateTokens, verifyToken } = require('../utils/tokens');
const {
  findUserByUsername,
  findUserById,
  createUser,
  updateUserDevices,
  comparePassword,
} = require('../utils/users');

const router = express.Router();

const getDeviceId = (req) => {
  return req.headers['x-device-id'] || 'default-device';
};

// Регистрация
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const deviceId = getDeviceId(req);

  if (!username || !password || username.length < 3 || password.length < 6) {
    return res.status(400).json({ message: 'Invalid username or password' });
  }

  const existingUser = findUserByUsername(username);
  if (existingUser) {
    return res.status(409).json({ message: 'Username already exists' });
  }

  const user = await createUser(username, password);
  const { accessToken, refreshToken } = generateTokens(user.id, deviceId);

  updateUserDevices(user.id, deviceId, refreshToken);

  res.status(201).json({
    accessToken,
    refreshToken,
    user: { id: user.id, username: user.username },
  });
});

// Вход
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const deviceId = getDeviceId(req);

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' });
  }

  const user = findUserByUsername(username);
  if (!user || !(await comparePassword(password, user.password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const { accessToken, refreshToken } = generateTokens(user.id, deviceId);
  updateUserDevices(user.id, deviceId, refreshToken);

  res.json({
    accessToken,
    refreshToken,
    user: { id: user.id, username: user.username },
  });
});

// Обновление токена
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  const deviceId = getDeviceId(req);

  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token required' });
  }

  const decoded = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);
  if (!decoded) {
    return res.status(403).json({ message: 'Invalid or expired refresh token' });
  }

  if (decoded.deviceId !== deviceId) {
    return res.status(403).json({ message: 'Token not valid for this device' });
  }

  const user = findUserById(decoded.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const storedRefreshToken = user.devices?.[deviceId];
  if (storedRefreshToken !== refreshToken) {
    return res.status(403).json({ message: 'Refresh token revoked or invalid' });
  }

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id, deviceId);
  updateUserDevices(user.id, deviceId, newRefreshToken);

  res.json({ accessToken, refreshToken: newRefreshToken });
});

// Защищённый маршрут
router.get('/me', require('../middleware/auth'), (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
    },
    deviceId: req.deviceId,
  });
});

module.exports = router;
