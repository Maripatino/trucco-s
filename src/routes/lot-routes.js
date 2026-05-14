/**
 * @file        lot-routes.js
 * @description Definición de rutas para los endpoints de lotes
 * @author      Trucco's Dev
 * @date        2025-01-01
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/lot-controller');
const { validateCreateLot } = require('../middlewares/validators/lot-validator');

router.get('/', controller.getAllLots);
router.get('/summary', controller.getSummary);
router.get('/:id', controller.getLotById);
router.post('/', validateCreateLot, controller.createLot);
router.patch('/:id/matrix', controller.updateLotMatrix);
router.patch('/:id/start', controller.startLot);
router.patch('/:id/return', controller.returnLot);
router.delete('/:id', controller.deleteLot);

module.exports = router;