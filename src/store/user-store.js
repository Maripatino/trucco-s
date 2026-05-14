/**
 * @file        user-store.js
 * @description Almacenamiento persistente de usuarios en data/users.json
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'users.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readUsers() {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    const initial = [
      {
        id: uuidv4(),
        username: 'admin',
        password: bcrypt.hashSync('admin123', 10),
        role: 'admin',
        active: true,
        createdAt: new Date().toISOString(),
      },
    ];
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function writeUsers(users) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
}

const getAllUsers = () => readUsers();

const getUserByUsername = (username) =>
  readUsers().find((u) => u.username === username) || null;

const getUserById = (id) =>
  readUsers().find((u) => u.id === id) || null;

const addUser = (user) => {
  const users = readUsers();
  users.push(user);
  writeUsers(users);
  return user;
};

const updateUser = (id, changes) => {
  const users = readUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...changes };
  writeUsers(users);
  return users[idx];
};

const deleteUser = (id) => {
  const users = readUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return false;
  users.splice(idx, 1);
  writeUsers(users);
  return true;
};

module.exports = { getAllUsers, getUserByUsername, getUserById, addUser, updateUser, deleteUser };
