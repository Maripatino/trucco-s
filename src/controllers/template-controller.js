const templateStore = require('../store/template-store');

const normalizeRole = (r) =>
  String(r || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

const VALID_SECTION_KEYS = ['corte', 'confeccion', 'lavanderia', 'terminacion'];

const getTemplates = (req, res, next) => {
  try {
    const templates = templateStore.getAllTemplates();
    res.status(200).json({ success: true, data: templates });
  } catch (err) {
    next(err);
  }
};

const updateTemplate = (req, res, next) => {
  try {
    const role = normalizeRole(req.user?.role);
    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Solo el administrador puede modificar las plantillas' },
      });
    }

    const sectionKey = normalizeRole(req.params.key);
    if (!VALID_SECTION_KEYS.includes(sectionKey)) {
      return res.status(422).json({
        success: false,
        error: { code: 'INVALID_SECTION', message: 'Seccion no valida: ' + sectionKey },
      });
    }

    const { rows, columns } = req.body;
    if (!Array.isArray(rows) || !Array.isArray(columns)) {
      return res.status(422).json({
        success: false,
        error: { code: 'MISSING_REQUIRED_FIELD', message: 'Los campos rows y columns son obligatorios y deben ser arreglos' },
      });
    }

    const updated = templateStore.updateTemplate(sectionKey, { rows, columns });
    res.status(200).json({ success: true, data: updated, message: 'Plantilla actualizada correctamente' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getTemplates, updateTemplate };
