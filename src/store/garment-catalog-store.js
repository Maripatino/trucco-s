const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'garment-catalog.json');

const VALID_GENDERS = ['hombre', 'mujer'];

const DEFAULT_CATALOG = {
  hombre: [
    { value: 'blue_jean', label: 'Blue Jean' },
    { value: 'camiseta', label: 'Camiseta' },
    { value: 'sudadera', label: 'Sudadera' },
  ],
  mujer: [
    { value: 'blue_jean', label: 'Blue Jean' },
    { value: 'top', label: 'Top' },
    { value: 'camisa', label: 'Camisa' },
    { value: 'ropa_interior', label: 'Ropa Interior' },
  ],
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeGarments(garments) {
  const src = Array.isArray(garments) ? garments : [];
  const seen = new Set();
  const normalized = [];

  src.forEach((item) => {
    const rawLabel = typeof item === 'string' ? item : item?.label;
    const label = String(rawLabel || '').trim();
    if (!label) return;

    let value = String(item?.value || '').trim();
    value = slugify(value || label);
    if (!value) return;

    let finalValue = value;
    let i = 2;
    while (seen.has(finalValue)) {
      finalValue = value + '_' + i;
      i += 1;
    }
    seen.add(finalValue);

    normalized.push({ value: finalValue, label });
  });

  return normalized;
}

function withDefaults(catalog) {
  const source = catalog && typeof catalog === 'object' ? catalog : {};
  return {
    hombre: normalizeGarments(source.hombre).length
      ? normalizeGarments(source.hombre)
      : DEFAULT_CATALOG.hombre,
    mujer: normalizeGarments(source.mujer).length
      ? normalizeGarments(source.mujer)
      : DEFAULT_CATALOG.mujer,
  };
}

function readCatalog() {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_CATALOG, null, 2));
    return { ...DEFAULT_CATALOG };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    return withDefaults(parsed);
  } catch {
    return { ...DEFAULT_CATALOG };
  }
}

function writeCatalog(catalog) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(withDefaults(catalog), null, 2));
}

function getCatalog() {
  return withDefaults(readCatalog());
}

function updateGenderCatalog(gender, garments) {
  const key = String(gender || '').trim().toLowerCase();
  if (!VALID_GENDERS.includes(key)) {
    const err = new Error('Genero invalido');
    err.statusCode = 422;
    err.code = 'INVALID_GENDER';
    throw err;
  }

  const normalized = normalizeGarments(garments);
  if (!normalized.length) {
    const err = new Error('Debes enviar al menos una prenda valida');
    err.statusCode = 422;
    err.code = 'INVALID_GARMENTS';
    throw err;
  }

  const catalog = getCatalog();
  catalog[key] = normalized;
  writeCatalog(catalog);
  return catalog;
}

function getLabelMap() {
  const catalog = getCatalog();
  const map = {};
  VALID_GENDERS.forEach((gender) => {
    (catalog[gender] || []).forEach((item) => {
      if (!item?.value) return;
      map[item.value] = item.label || item.value;
    });
  });
  return map;
}

module.exports = {
  VALID_GENDERS,
  getCatalog,
  updateGenderCatalog,
  getLabelMap,
};
