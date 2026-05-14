/**
 * @file        auth-routes.js
 * @description Rutas públicas de autenticación
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth-controller');

router.post('/login', authController.login);

module.exports = router;
