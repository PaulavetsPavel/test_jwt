const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const USERS_FILE = path.join(__dirname, '../data/users.json');

// Убедиться, что файл существует
if (!fs.existsSync(path.dirname(USERS_FILE))) {
  fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
}
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([]));
}

const readUsers = () => {
  const data = fs.readFileSync(USERS_FILE, 'utf8');
  return JSON.parse(data);
};

const writeUsers = (users) => {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

const findUserByUsername = (username) => {
  const users = readUsers();
  return users.find((u) => u.username === username);
};

const findUserById = (id) => {
  const users = readUsers();
  return users.find((u) => u.id === id);
};

const createUser = async (username, password) => {
  const users = readUsers();
  const hashedPassword = await bcrypt.hash(password, 12);
  const newUser = {
    id: Date.now().toString(), // простой ID (в реальном проекте — uuid)
    username,
    password: hashedPassword,
    devices: {}, // deviceId → refreshToken
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  writeUsers(users);
  return newUser;
};

const updateUserDevices = (userId, deviceId, refreshToken) => {
  const users = readUsers();
  const userIndex = users.findIndex((u) => u.id === userId);
  if (userIndex === -1) return false;
  users[userIndex].devices[deviceId] = refreshToken;
  writeUsers(users);
  return true;
};

const comparePassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

module.exports = {
  findUserByUsername,
  findUserById,
  createUser,
  updateUserDevices,
  comparePassword,
};
