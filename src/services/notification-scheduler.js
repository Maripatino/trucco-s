/**
 * @file        notification-scheduler.js
 * @description Planificador diario para generar notificaciones automáticas
 */

const notificationService = require('./notification-service');

const DEFAULT_HOUR = Number(process.env.NOTIFICATION_HOUR || 8);
const DEFAULT_MINUTE = Number(process.env.NOTIFICATION_MINUTE || 0);

const getNextScheduleDelay = () => {
  const now = new Date();
  const next = new Date(now);
  next.setHours(DEFAULT_HOUR, DEFAULT_MINUTE, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
};

const scheduleDailyNotificationJob = () => {
  const delay = getNextScheduleDelay();
  console.log(`⏰ Programando notificaciones automáticas en ${DEFAULT_HOUR.toString().padStart(2, '0')}:${DEFAULT_MINUTE.toString().padStart(2, '0')} - próxima ejecución en ${Math.round(delay / 60000)} minutos`);
  setTimeout(async () => {
    try {
      console.log('🔔 Ejecutando generación de notificaciones automáticas');
      notificationService.generateDailyNotifications();
    } catch (error) {
      console.error('Error generando notificaciones diarias:', error);
    } finally {
      scheduleDailyNotificationJob();
    }
  }, delay);
};

const startNotificationScheduler = () => {
  scheduleDailyNotificationJob();
};

module.exports = { startNotificationScheduler };
