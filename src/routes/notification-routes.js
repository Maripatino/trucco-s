/**
 * @file        notification-routes.js
 * @description Definición de rutas para notificaciones
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/notification-controller');

router.get('/', controller.getNotifications);
router.patch('/:id/read', controller.markNotificationRead);

module.exports = router;
