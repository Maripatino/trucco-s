/**
 * @file        constants.js
 * @description Constantes globales del sistema: estados, tallas y tipos de prenda
 * @author      Trukos Dev
 * @date        2025-01-01
 */

const LOT_STATUS = {
  SENT: 'SENT',
  IN_PROGRESS: 'IN_PROGRESS',
  RETURNED: 'RETURNED',
};

const VALID_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const VALID_GENDERS = ['hombre', 'mujer'];

const VALID_GARMENTS = {
  hombre: ['blue_jean', 'camiseta', 'sudadera'],
  mujer: ['blue_jean', 'top', 'camisa', 'ropa_interior'],
};

const GARMENT_LABELS = {
  blue_jean: 'Blue Jean',
  camiseta: 'Camiseta',
  sudadera: 'Sudadera',
  top: 'Top',
  camisa: 'Camisa',
  ropa_interior: 'Ropa Interior',
};

const STATUS_TRANSITIONS = {
  [LOT_STATUS.SENT]: LOT_STATUS.IN_PROGRESS,
  [LOT_STATUS.IN_PROGRESS]: LOT_STATUS.RETURNED,
};

const STATUS_LABELS = {
  [LOT_STATUS.SENT]: 'Enviado a confección',
  [LOT_STATUS.IN_PROGRESS]: 'En proceso de confección',
  [LOT_STATUS.RETURNED]: 'Devuelto al almacén de Trukos',
};

// Áreas del proceso productivo
const VALID_AREAS = ['corte', 'confeccion', 'lavanderia', 'terminado'];

const AREA_LABELS = {
  corte: 'Corte',
  confeccion: 'Confección',
  lavanderia: 'Lavandería',
  terminado: 'Terminación',
};

// Alias de roles → área (normalizado, sin tildes, minúsculas)
const ROLE_TO_AREA = {
  corte: 'corte',
  cortador: 'corte',
  cortadora: 'corte',
  confeccion: 'confeccion',
  confeccionista: 'confeccion',
  costura: 'confeccion',
  lavanderia: 'lavanderia',
  lavado: 'lavanderia',
  lavandera: 'lavanderia',
  lavandero: 'lavanderia',
  terminacion: 'terminado',
  terminado: 'terminado',
  terminadora: 'terminado',
  terminador: 'terminado',
  calidad: 'terminado',
};

module.exports = {
  LOT_STATUS,
  VALID_SIZES,
  VALID_GENDERS,
  VALID_GARMENTS,
  GARMENT_LABELS,
  STATUS_TRANSITIONS,
  STATUS_LABELS,
  VALID_AREAS,
  AREA_LABELS,
  ROLE_TO_AREA,
};