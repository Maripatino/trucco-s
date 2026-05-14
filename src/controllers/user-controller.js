/**
 * @file        user-controller.js
 * @description Controlador HTTP para gestión de usuarios (solo admin)
 */

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const userStore = require('../store/user-store');

const VALID_ROLES = ['admin', 'corte', 'confeccion', 'lavanderia', 'terminado'];

const getAllUsers = (req, res, next) => {
  try {
    const users = userStore.getAllUsers().map(({ password, ...u }) => u);
    res.status(200).json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

const createUser = (req, res, next) => {
  try {
    const { firstName, lastName, username, password, role } = req.body;
    const errors = [];

    if (!firstName || String(firstName).trim() === '') errors.push('El campo nombre es obligatorio');
    if (!lastName || String(lastName).trim() === '') errors.push('El campo apellido es obligatorio');
    if (!username || String(username).trim() === '') errors.push('El campo username es obligatorio');
    if (!password || String(password).trim() === '') errors.push('El campo password es obligatorio');
    else if (password.length < 6) errors.push('La contrasena debe tener al menos 6 caracteres');
    if (!role) errors.push('El campo role es obligatorio');
    else if (!VALID_ROLES.includes(role)) errors.push(`Rol invalido. Valores permitidos: ${VALID_ROLES.join(', ')}`);

    if (errors.length > 0) {
      return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', messages: errors } });
    }

    const existing = userStore.getUserByUsername(username.trim());
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'USERNAME_TAKEN', message: 'El nombre de usuario ya esta en uso' },
      });
    }

    const newUser = {
      id: uuidv4(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username: username.trim(),
      password: bcrypt.hashSync(password, 10),
      role,
      active: true,
      createdAt: new Date().toISOString(),
    };

    const saved = userStore.addUser(newUser);
    const { password: _, ...response } = saved;
    res.status(201).json({ success: true, data: response });
  } catch (err) {
    next(err);
  }
};

const toggleUserStatus = (req, res, next) => {
  try {
    const user = userStore.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado' },
      });
    }
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: { code: 'SELF_DISABLE', message: 'No puedes desactivar tu propia cuenta' },
      });
    }
    const updated = userStore.updateUser(req.params.id, { active: !user.active });
    const { password: _, ...response } = updated;
    res.status(200).json({ success: true, data: response });
  } catch (err) {
    next(err);
  }
};

const deleteUser = (req, res, next) => {
  try {
    const user = userStore.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado' },
      });
    }
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: { code: 'SELF_DELETE', message: 'No puedes eliminar tu propia cuenta' },
      });
    }
    userStore.deleteUser(req.params.id);
    res.status(200).json({ success: true, message: 'Usuario eliminado correctamente' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllUsers, createUser, toggleUserStatus, deleteUser };
