/**
 * @file        error-handler.js
 * @description Middleware global de manejo de errores
 * @author      Trucco's Dev
 * @date        2025-01-01
 */

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = statusCode === 500
    ? 'Ocurrio un error interno en el servidor'
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: { code, message },
  });
}

module.exports = errorHandler;