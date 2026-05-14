const express = require('express');
const router = express.Router();
const controller = require('../controllers/template-controller');

router.get('/', controller.getTemplates);
router.patch('/:key', controller.updateTemplate);

module.exports = router;
