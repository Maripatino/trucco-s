/**
 * @file        notification-store.js
 * @description Almacenamiento persistente de notificaciones en data/notifications.json
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'notifications.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readNotifications() {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
    return [];
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function writeNotifications(notifications) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(notifications, null, 2));
}

const getAllNotifications = () => readNotifications();

const getNotificationsByUser = (userId) => readNotifications().filter((notification) => notification.userId === userId);

const addNotification = (notification) => {
  const notifications = readNotifications();
  notifications.push(notification);
  writeNotifications(notifications);
  return notification;
};

const updateNotification = (id, changes) => {
  const notifications = readNotifications();
  const index = notifications.findIndex((notification) => notification.id === id);
  if (index === -1) return null;
  notifications[index] = { ...notifications[index], ...changes };
  writeNotifications(notifications);
  return notifications[index];
};

const findNotification = (predicate) => readNotifications().find(predicate);

module.exports = {
  getAllNotifications,
  getNotificationsByUser,
  addNotification,
  updateNotification,
  findNotification,
};
