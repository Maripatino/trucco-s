/**
 * @file        lot-validator.js
 * @description Middleware de validación para los datos de entrada de lotes
 * @author      Trucco's Dev
 * @date        2025-01-01
 */

const { LOT_STATUS } = require('../../config/constants');
const garmentCatalogStore = require('../../store/garment-catalog-store');

const normalizeRole = (role) => String(role || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

const VALID_SECTION_KEYS = ['corte', 'confeccion', 'lavanderia', 'terminacion'];
const ROLE_TO_SECTION_KEYS = {
  corte: ['corte'],
  confeccion: ['confeccion'],
  lavanderia: ['lavanderia'],
  terminado: ['terminacion'],
  terminacion: ['terminacion'],
};

const getAllowedSectionKeys = (role) => {
  const normalized = normalizeRole(role);
  if (!normalized) return null;
  if (normalized === 'admin') return VALID_SECTION_KEYS;
  return ROLE_TO_SECTION_KEYS[normalized] || null;
};

const validateCreateLot = (req, res, next) => {
  const { lotNumber, garmentType, gender, size, quantity, totalQuantity, processedQuantity, status, sizeDetails, sizeMatrix, sizeMatrixSections, evidence } = req.body;
  const errors = [];
  const isAdmin = normalizeRole(req.user?.role) === 'admin';
  const allowedSectionKeys = getAllowedSectionKeys(req.user?.role);
  const garmentCatalog = garmentCatalogStore.getCatalog();
  const validGenders = Object.keys(garmentCatalog);
  const validGarmentsByGender = {};
  validGenders.forEach((genderKey) => {
    validGarmentsByGender[genderKey] = (garmentCatalog[genderKey] || []).map((item) => item.value).filter(Boolean);
  });

  if (!lotNumber || String(lotNumber).trim() === '') {
    errors.push('El campo lotNumber es obligatorio');
  } else if (!/^\d+$/.test(String(lotNumber).trim())) {
    errors.push('El campo lotNumber solo puede contener numeros');
  }

  if (!isAdmin) {
    if (!gender) {
      errors.push('El campo gender es obligatorio');
    } else if (!validGenders.includes(gender)) {
      errors.push(`El genero "${gender}" no es valido. Valores permitidos: ${validGenders.join(', ')}`);
    }

    if (!garmentType) {
      errors.push('El campo garmentType es obligatorio');
    } else if (gender && validGenders.includes(gender)) {
      if (!validGarmentsByGender[gender]?.includes(garmentType)) {
        errors.push(`El tipo de prenda "${garmentType}" no es valido para genero ${gender}. Validos: ${(validGarmentsByGender[gender] || []).join(', ')}`);
      }
    }
  } else {
    if (gender && !validGenders.includes(gender)) {
      errors.push(`El genero "${gender}" no es valido. Valores permitidos: ${validGenders.join(', ')}`);
    }
    if (gender && garmentType && validGenders.includes(gender) && !validGarmentsByGender[gender]?.includes(garmentType)) {
      errors.push(`El tipo de prenda "${garmentType}" no es valido para genero ${gender}. Validos: ${(validGarmentsByGender[gender] || []).join(', ')}`);
    }
  }

  const hasSizeDetails = Array.isArray(sizeDetails) && sizeDetails.length > 0;

  if (sizeDetails !== undefined && !Array.isArray(sizeDetails)) {
    errors.push('El campo sizeDetails debe ser un arreglo de tallas');
  }

  if (sizeMatrix !== undefined) {
    const rows = Array.isArray(sizeMatrix?.rows) ? sizeMatrix.rows : null;
    const columns = Array.isArray(sizeMatrix?.columns) ? sizeMatrix.columns : null;
    const cells = Array.isArray(sizeMatrix?.cells) ? sizeMatrix.cells : null;

    if (!rows || !columns || !cells) {
      errors.push('El campo sizeMatrix debe incluir rows, columns y cells como arreglos');
    } else if (rows.length === 0 || columns.length === 0) {
      errors.push('El campo sizeMatrix debe tener al menos una fila y una columna');
    }
  }

  if (!Array.isArray(sizeMatrixSections)) {
    errors.push('El campo sizeMatrixSections es obligatorio y debe ser un arreglo');
  } else if (!allowedSectionKeys) {
    errors.push('El rol del usuario no tiene permisos para configurar la matriz de tallas');
  } else {
    const receivedKeys = sizeMatrixSections.map((section) => normalizeRole(section?.key)).filter(Boolean);
    const uniqueReceivedKeys = Array.from(new Set(receivedKeys));
    const expectedKeys = allowedSectionKeys;

    if (uniqueReceivedKeys.length !== receivedKeys.length) {
      errors.push('No se permiten secciones de tallas duplicadas');
    }

    const unexpectedKeys = receivedKeys.filter((key) => !expectedKeys.includes(key));
    if (unexpectedKeys.length > 0) {
      errors.push('El usuario no puede modificar secciones de tallas fuera de su area');
    }

    // Non-admin must send all their sections; admin can send partial
    if (!isAdmin && (uniqueReceivedKeys.length !== expectedKeys.length || expectedKeys.some((key) => !uniqueReceivedKeys.includes(key)))) {
      errors.push('La matriz de tallas no coincide con los permisos del usuario');
    }

    sizeMatrixSections.forEach((section, idx) => {
      const sectionRow = idx + 1;
      const sectionKey = normalizeRole(section?.key);
      if (!section || typeof section !== 'object') {
        errors.push(`La seccion ${sectionRow} de sizeMatrixSections no es valida`);
        return;
      }
      if (!sectionKey || !VALID_SECTION_KEYS.includes(sectionKey)) {
        errors.push(`La seccion ${sectionRow} de sizeMatrixSections no es valida`);
      }
      if (!Array.isArray(section.rows) || !Array.isArray(section.columns) || !Array.isArray(section.cells)) {
        errors.push(`La seccion ${sectionRow} de sizeMatrixSections debe incluir rows, columns y cells como arreglos`);
      }
    });
  }

  if (!isAdmin) {
    if (hasSizeDetails) {
      sizeDetails.forEach((item, idx) => {
        const row = idx + 1;
        if (!item?.size || String(item.size).trim() === '') {
          errors.push(`La talla en la fila ${row} es obligatoria`);
        }
        if (!item?.description || String(item.description).trim() === '') {
          errors.push(`La descripcion de la talla en la fila ${row} es obligatoria`);
        }
      });
    } else if (!size || String(size).trim() === '') {
      errors.push('El campo size es obligatorio');
    }

    const normalizedTotal = totalQuantity ?? quantity;
    if (normalizedTotal === undefined || normalizedTotal === null || normalizedTotal === '') {
      errors.push('El campo totalQuantity es obligatorio');
    } else if (!Number.isInteger(Number(normalizedTotal)) || Number(normalizedTotal) <= 0) {
      errors.push('La cantidad total debe ser un numero entero mayor a cero');
    }

    if (processedQuantity === undefined || processedQuantity === null || processedQuantity === '') {
      errors.push('El campo processedQuantity es obligatorio');
    } else if (!Number.isInteger(Number(processedQuantity)) || Number(processedQuantity) < 0) {
      errors.push('La cantidad procesada debe ser un numero entero mayor o igual a cero');
    } else {
      const normalizedTotal2 = totalQuantity ?? quantity;
      if (Number(normalizedTotal2) >= 0 && Number(processedQuantity) > Number(normalizedTotal2)) {
        errors.push('La cantidad procesada no puede ser mayor que la cantidad total');
      }
    }

    if (!Array.isArray(evidence) || evidence.length === 0) {
      errors.push('El campo evidence es obligatorio y debe incluir minimo una foto o video');
    } else {
      const hasValidEvidence = evidence.some((item) => {
        const type = String(item?.type || '');
        return type.startsWith('image/') || type.startsWith('video/');
      });
      if (!hasValidEvidence) {
        errors.push('Debes enviar minimo una evidencia en foto o video');
      }
    }
  }

  if (status && !Object.values(LOT_STATUS).includes(status)) {
    errors.push(`El estado "${status}" no es valido. Valores permitidos: ${Object.values(LOT_STATUS).join(', ')}`);
  }

  if (errors.length > 0) {
    return res.status(422).json({
      success: false,
      error: { code: 'MISSING_REQUIRED_FIELD', messages: errors },
    });
  }

  next();
};

module.exports = { validateCreateLot };