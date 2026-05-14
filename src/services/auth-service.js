/**
 * @file        auth-service.js
 * @description Lógica de negocio de autenticación: login y generación de JWT
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userStore = require('../store/user-store');

const JWT_SECRET = process.env.JWT_SECRET || 'truccos-secret-key-2025';
const JWT_EXPIRES = '8h';

const login = (username, password) => {
  const user = userStore.getUserByUsername(username);
  if (!user) {
    const err = new Error('Credenciales inválidas');
    err.statusCode = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  if (!user.active) {
    const err = new Error('Tu cuenta esta desactivada. Contacta al administrador');
    err.statusCode = 403;
    err.code = 'ACCOUNT_DISABLED';
    throw err;
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    const err = new Error('Credenciales inválidas');
    err.statusCode = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, firstName: user.firstName || '', lastName: user.lastName || '' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  return {
    token,
    user: { id: user.id, username: user.username, role: user.role, firstName: user.firstName || '', lastName: user.lastName || '' },
  };
};

module.exports = { login };
