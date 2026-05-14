const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'matrix-templates.json');

const DEFAULT_ROWS = ['Referencia 1', 'Referencia 2', 'Referencia 3'];
const DEFAULT_COLUMNS = ['XS', 'S', 'M', 'L', 'XL'];
const SECTION_KEYS = ['corte', 'confeccion', 'lavanderia', 'terminacion'];
const SECTION_LABELS = {
  corte: 'Corte',
  confeccion: 'Confeccion',
  lavanderia: 'Lavanderia',
  terminacion: 'Terminacion',
};

function defaultTemplates() {
  return SECTION_KEYS.map((key) => ({
    key,
    label: SECTION_LABELS[key],
    rows: [...DEFAULT_ROWS],
    columns: [...DEFAULT_COLUMNS],
  }));
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readTemplates() {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    const defaults = defaultTemplates();
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaults, null, 2));
    return defaults;
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return defaultTemplates();
  }
}

function writeTemplates(templates) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(templates, null, 2));
}

function getAllTemplates() {
  return readTemplates();
}

function updateTemplate(sectionKey, { rows, columns }) {
  const templates = readTemplates();
  const idx = templates.findIndex((t) => t.key === sectionKey);
  const label = SECTION_LABELS[sectionKey] || sectionKey;
  const updated = {
    key: sectionKey,
    label,
    rows: Array.isArray(rows) ? rows.map((r) => String(r || '').trim()).filter(Boolean) : DEFAULT_ROWS,
    columns: Array.isArray(columns) ? columns.map((c) => String(c || '').trim()).filter(Boolean) : DEFAULT_COLUMNS,
  };
  if (idx >= 0) {
    templates[idx] = updated;
  } else {
    templates.push(updated);
  }
  writeTemplates(templates);
  return updated;
}

module.exports = { getAllTemplates, updateTemplate, defaultTemplates };
