/**
 * @file        notification-controller.js
 * @description Controlador HTTP para endpoints de notificaciones
 */

const notificationService = require('../services/notification-service');

const getNotifications = (req, res, next) => {
  try {
    notificationService.generateDailyNotifications();
    const notifications = notificationService.getNotificationsForUser(req.user.id);
    res.status(200).json({ success: true, data: notifications });
  } catch (err) {
    next(err);
  }
};

const markNotificationRead = (req, res, next) => {
  try {
    const notification = notificationService.markAsRead(req.user.id, req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, error: { code: 'NOTIFICATION_NOT_FOUND', message: 'Notificación no encontrada' } });
    }
    res.status(200).json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotifications, markNotificationRead };
