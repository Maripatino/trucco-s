/**
 * @file        app.js
 * @description Configuración de Express y middlewares globales
 * @author      Trucco's Dev
 * @date        2025-01-01
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const lotRoutes = require('./src/routes/lot-routes');
const authRoutes = require('./src/routes/auth-routes');
const userRoutes = require('./src/routes/user-routes');
const templateRoutes = require('./src/routes/template-routes');
const garmentCatalogRoutes = require('./src/routes/garment-catalog-routes');
const notificationRoutes = require('./src/routes/notification-routes');
const { authenticate } = require('./src/middlewares/auth-middleware');
const errorHandler = require('./src/middlewares/error-handler');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/lots', authenticate, lotRoutes);
app.use('/api/v1/matrix-templates', authenticate, templateRoutes);
app.use('/api/v1/garment-catalog', authenticate, garmentCatalogRoutes);
app.use('/api/v1/notifications', authenticate, notificationRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'ROUTE_NOT_FOUND', message: `La ruta ${req.originalUrl} no existe` },
  });
});

app.use(errorHandler);

module.exports = app;