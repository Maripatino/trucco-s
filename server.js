/**
 * @file        server.js
 * @description Punto de entrada: inicia el servidor
 * @author      Trucco's Dev
 * @date        2025-01-01
 */

const app = require('./app');
const notificationService = require('./src/services/notification-service');
const { startNotificationScheduler } = require('./src/services/notification-scheduler');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📦 API disponible en http://localhost:${PORT}/api/v1/lots`);
  notificationService.generateDailyNotifications();
  startNotificationScheduler();
});