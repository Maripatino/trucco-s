/**
 * @file        notification-service.js
 * @description Lógica de notificaciones automáticas de RAG Status
 */

const { v4: uuidv4 } = require('uuid');
const notificationStore = require('../store/notification-store');
const lotService = require('./lot-service');
const userStore = require('../store/user-store');
const { calcBusinessDays, getBogotaDateParts } = require('../utils/date-utils');

const normalizeRole = (role) => String(role || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9]/g, '')
  .trim()
  .toLowerCase();

const isAdminRole = (role) => normalizeRole(role) === 'admin';

const normalizeArea = (value) => {
  const role = normalizeRole(value);
  if (['corte', 'cortador', 'cortadora'].includes(role)) return 'corte';
  if (['confeccion', 'confeccionista', 'costura'].includes(role)) return 'confeccion';
  if (['lavanderia', 'lavado', 'lavandera', 'lavandero'].includes(role)) return 'lavanderia';
  if (['terminado', 'terminacion', 'terminador', 'terminadora', 'calidad'].includes(role)) return 'terminacion';
  return null;
};

const getAllowedBusinessDays = (areaKey) => {
  if (areaKey === 'corte') return 3;
  if (areaKey === 'confeccion') return 14;
  if (areaKey === 'lavanderia') return 8;
  if (areaKey === 'terminacion') return 4;
  return 0;
};

const getLotRemainingDays = (areaKey, businessDays) => {
  const allowed = getAllowedBusinessDays(areaKey);
  return allowed - businessDays;
};

const getLotRagColor = (areaKey, remainingDays) => {
  const r = remainingDays;
  if (areaKey === 'corte') {
    if (r >= 2) return 'green';
    if (r === 1) return 'orange';
    return 'red';
  }
  if (areaKey === 'confeccion') {
    if (r >= 8) return 'green';
    if (r >= 3) return 'orange';
    return 'red';
  }
  if (areaKey === 'lavanderia') {
    if (r >= 4) return 'green';
    if (r >= 1) return 'orange';
    return 'red';
  }
  if (areaKey === 'terminacion') {
    if (r >= 2) return 'green';
    if (r === 1) return 'orange';
    return 'red';
  }
  return 'green';
};

const getNotificationDateKey = () => {
  const parts = getBogotaDateParts(new Date());
  if (!parts) return new Date().toISOString().slice(0, 10);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
};

const getNotificationMessage = (color, lotNumber, remainingDays) => {
  if (remainingDays === 0) {
    return `Lote #${lotNumber}: hoy es el último día de entrega. Este es el plazo máximo para completar el lote.`;
  }
  if (color === 'green') {
    return `Lote #${lotNumber}: el proceso continúa dentro del tiempo estimado. Aún faltan ${remainingDays} días hábiles para la entrega.`;
  }
  if (color === 'orange') {
    return `Lote #${lotNumber}: atención, el tiempo de entrega se está acercando. Restan ${remainingDays} días hábiles para completar el proceso.`;
  }
  return `Lote #${lotNumber}: prioridad alta. El tiempo límite de entrega está muy cerca. Solo queda ${remainingDays} día(s) hábil(es) para finalizar el lote.`;
};

const getNotificationsForUser = (userId) => {
  const user = userStore.getUserById(userId);
  if (user && isAdminRole(user.role)) {
    return [];
  }

  return notificationStore.getNotificationsByUser(userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const markAsRead = (userId, notificationId) => {
  const user = userStore.getUserById(userId);
  if (user && isAdminRole(user.role)) {
    return null;
  }

  const notification = notificationStore.findNotification((item) => item.id === notificationId && item.userId === userId);
  if (!notification) return null;
  return notificationStore.updateNotification(notificationId, { read: true, readAt: new Date().toISOString() });
};

const hasNotificationForUserLotOnDate = (userId, lotId, dateKey) => {
  return Boolean(notificationStore.getNotificationsByUser(userId).find((notification) =>
    notification.lotId === lotId && notification.dateKey === dateKey
  ));
};

const findTargetUser = (lot) => {
  if (!lot || !lot.createdBy) return null;
  const byId = lot.createdBy.id ? userStore.getUserById(lot.createdBy.id) : null;
  if (byId) return byId;
  if (lot.createdBy.username) {
    const normalizedUsername = String(lot.createdBy.username || '').trim().toLowerCase();
    const allUsers = userStore.getAllUsers();
    return allUsers.find((user) => String(user.username || '').trim().toLowerCase() === normalizedUsername) || null;
  }
  return null;
};

const generateDailyNotifications = () => {
  const dateKey = getNotificationDateKey();
  const allLots = lotService.getAllLots();

  allLots.forEach((lot) => {
    if (String(lot.status) === 'RETURNED') return;
    const user = findTargetUser(lot);
    if (!user || isAdminRole(user.role)) return;

    const areaKey = normalizeArea(lot.createdBy?.role || '');
    if (!areaKey) return;

    const startAt = lot.currentProcessStartAt || lot.sentAt || lot.firstCreatedAt;
    if (!startAt) return;

    const businessDays = calcBusinessDays(startAt);
    const remainingDays = getLotRemainingDays(areaKey, businessDays);
    if (remainingDays < 0) return;

    const color = getLotRagColor(areaKey, remainingDays);

    if (hasNotificationForUserLotOnDate(user.id, lot.id, dateKey)) return;

    const notification = {
      id: uuidv4(),
      userId: user.id,
      username: user.username,
      lotId: lot.id,
      lotNumber: lot.lotNumber,
      color,
      businessDays,
      remainingDays,
      message: getNotificationMessage(color, lot.lotNumber, remainingDays),
      dateKey,
      read: false,
      createdAt: new Date().toISOString(),
    };

    notificationStore.addNotification(notification);
  });
};

module.exports = {
  getNotificationsForUser,
  markAsRead,
  generateDailyNotifications,
};
