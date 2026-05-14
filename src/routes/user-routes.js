/**
 * @file        user-routes.js
 * @description Rutas de gestión de usuarios (solo admin)
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/user-controller');
const { authenticate, requireAdmin } = require('../middlewares/auth-middleware');

router.use(authenticate, requireAdmin);

router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);
router.patch('/:id/toggle', userController.toggleUserStatus);
router.delete('/:id', userController.deleteUser);

module.exports = router;
