/**
 * @file        auth-controller.js
 * @description Controlador HTTP para autenticación
 */

const authService = require('../services/auth-service');

const login = (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(422).json({
        success: false,
        error: { code: 'MISSING_CREDENTIALS', message: 'Usuario y contrasena son obligatorios' },
      });
    }
    const result = authService.login(username, password);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = { login };
