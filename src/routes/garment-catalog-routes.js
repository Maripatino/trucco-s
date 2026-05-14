const express = require('express');
const router = express.Router();
const controller = require('../controllers/garment-catalog-controller');
const { requireAdmin } = require('../middlewares/auth-middleware');

router.get('/', controller.getCatalog);
router.patch('/:gender', requireAdmin, controller.updateGenderCatalog);

module.exports = router;
