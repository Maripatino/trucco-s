const garmentCatalogStore = require('../store/garment-catalog-store');

const getCatalog = (req, res, next) => {
  try {
    const catalog = garmentCatalogStore.getCatalog();
    res.status(200).json({ success: true, data: catalog });
  } catch (err) {
    next(err);
  }
};

const updateGenderCatalog = (req, res, next) => {
  try {
    const gender = String(req.params.gender || '').trim().toLowerCase();
    const garments = req.body?.garments;

    if (!Array.isArray(garments)) {
      return res.status(422).json({
        success: false,
        error: { code: 'MISSING_REQUIRED_FIELD', message: 'El campo garments es obligatorio y debe ser un arreglo' },
      });
    }

    const updated = garmentCatalogStore.updateGenderCatalog(gender, garments);
    res.status(200).json({
      success: true,
      data: updated,
      message: 'Catalogo actualizado correctamente',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCatalog, updateGenderCatalog };
