/**
 * @file        lot-service.js
 * @description Lógica de negocio para el ciclo de vida de lotes de prendas
 * @author      Trukos Dev
 * @date        2025-01-01
 */

const { v4: uuidv4 } = require('uuid');
const { LOT_STATUS, STATUS_TRANSITIONS, ROLE_TO_AREA } = require('../config/constants');
const { nowISO, calcElapsedTime, isValidISODate } = require('../utils/date-utils');
const store = require('../store/lot-store');
const userStore = require('../store/user-store');

const normalizeRole = (role) => String(role || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

const normalizeUsername = (username) => String(username || '').trim().toLowerCase();

const normalizeSectionKey = (key) => {
  const normalized = normalizeRole(key);
  if (normalized === 'terminado') return 'terminacion';
  return normalized;
};

const normalizeSectionMatrix = (section) => {
  const key = normalizeSectionKey(section?.key);
  const rows = Array.isArray(section?.rows) ? section.rows.map((x) => String(x || '').trim()).filter(Boolean) : [];
  const columns = Array.isArray(section?.columns) ? section.columns.map((x) => String(x || '').trim()).filter(Boolean) : [];
  const rawCells = Array.isArray(section?.cells) ? section.cells : [];
  const cells = rows.map((_, rowIdx) => {
    const row = Array.isArray(rawCells[rowIdx]) ? rawCells[rowIdx] : [];
    return columns.map((__, colIdx) => Boolean(row[colIdx]));
  });
  const details = Array.isArray(section?.details)
    ? section.details
      .filter((item) => item && item.size)
      .map((item) => ({ size: String(item.size || '').trim(), description: String(item.description || '').trim() }))
      .filter((item) => item.size)
    : [];

  if (!key || !rows.length || !columns.length) return null;
  return {
    key,
    label: section?.label || key,
    rows,
    columns,
    cells,
    details,
  };
};

const normalizeSections = (sections) => {
  const src = Array.isArray(sections) ? sections : [];
  const byKey = new Map();
  src.forEach((section) => {
    const normalized = normalizeSectionMatrix(section);
    if (!normalized) return;
    byKey.set(normalized.key, normalized);
  });
  return Array.from(byKey.values());
};

const mergeSections = (existingSections, incomingSections) => {
  const byKey = new Map();
  normalizeSections(existingSections).forEach((section) => byKey.set(section.key, section));
  normalizeSections(incomingSections).forEach((section) => byKey.set(section.key, section));
  return Array.from(byKey.values());
};

const buildPrimaryMatrixFromSections = (sections) => {
  const first = normalizeSections(sections)[0];
  if (!first) return null;
  return {
    rows: first.rows,
    columns: first.columns,
    cells: first.cells,
  };
};

// Deriva el área productiva a partir del rol del usuario
const deriveArea = (role) => ROLE_TO_AREA[normalizeRole(role || '')] || null;

const calculateStatusByProgress = (totalQuantity, processedQuantity) => {
  if (processedQuantity >= totalQuantity) {
    return LOT_STATUS.RETURNED;
  }
  if (processedQuantity > 10) {
    return LOT_STATUS.IN_PROGRESS;
  }
  return LOT_STATUS.SENT;
};

const enrichCreatedBy = (createdBy) => {
  if (!createdBy || !createdBy.username) return createdBy || null;
  const users = userStore.getAllUsers();
  const byId = createdBy.id ? users.find((u) => u.id === createdBy.id) : null;
  const byUsername = users.find((u) => normalizeUsername(u.username) === normalizeUsername(createdBy.username));
  const user = byId || byUsername;
  if (!user) return createdBy;
  return {
    ...createdBy,
    firstName: createdBy.firstName || user.firstName || '',
    lastName: createdBy.lastName || user.lastName || '',
    role: normalizeRole(createdBy.role || user.role || ''),
  };
};

const withCalculatedStatus = (lot) => {
  const total = Number(lot.totalQuantity ?? lot.quantity ?? 0);
  const processed = Number(lot.processedQuantity ?? 0);
  const createdBy = enrichCreatedBy(lot.createdBy);
  const processHistory = Array.isArray(lot.processHistory)
    ? lot.processHistory.map((entry) => ({
      ...entry,
      createdBy: enrichCreatedBy(entry.createdBy),
    }))
    : [];
  return {
    ...lot,
    createdBy,
    processHistory,
    status: calculateStatusByProgress(total, processed),
  };
};

const createLot = ({ lotNumber, garmentType, gender, size, sizeDetails, sizeMatrix, sizeMatrixSections, quantity, totalQuantity, processedQuantity, sentAt, notes, evidence, createdBy, area }) => {
  const initialSentAt = sentAt || nowISO();
  const registrationTimestamp = initialSentAt;
  const normalizedTotalQuantity = Number(totalQuantity ?? quantity);
  const normalizedProcessedQuantity = Number(processedQuantity ?? 0);
  const initialStatus = calculateStatusByProgress(normalizedTotalQuantity, normalizedProcessedQuantity);
  const normalizedSizeDetails = Array.isArray(sizeDetails)
    ? sizeDetails
      .filter((item) => item && item.size)
      .map((item) => ({ size: item.size, description: item.description || '' }))
    : [];
  const primarySize = normalizedSizeDetails[0]?.size || size;
  const incomingSections = normalizeSections(sizeMatrixSections);
  const primaryMatrix = incomingSections.length
    ? buildPrimaryMatrixFromSections(incomingSections)
    : (sizeMatrix && Array.isArray(sizeMatrix.rows) && Array.isArray(sizeMatrix.columns) && Array.isArray(sizeMatrix.cells)
      ? {
        rows: sizeMatrix.rows.map((x) => String(x || '').trim()).filter(Boolean),
        columns: sizeMatrix.columns.map((x) => String(x || '').trim()).filter(Boolean),
        cells: Array.isArray(sizeMatrix.cells) ? sizeMatrix.cells : [],
      }
      : null);

  const newLot = {
    id: uuidv4(),
    lotNumber,
    garmentType,
    gender,
    size: primarySize,
    sizeDetails: normalizedSizeDetails,
    sizeMatrix: primaryMatrix,
    sizeMatrixSections: incomingSections,
    quantity: normalizedTotalQuantity,
    totalQuantity: normalizedTotalQuantity,
    processedQuantity: normalizedProcessedQuantity,
    status: initialStatus,
    area: area || deriveArea(createdBy?.role) || null,
    sentAt: initialSentAt,
    firstCreatedAt: initialSentAt,
    startedAt: null,
    returnedAt: null,
    notes: notes || null,
    evidence: Array.isArray(evidence) ? evidence : [],
    elapsedTime: null,
    lastUpdatedAt: registrationTimestamp,
    createdBy: createdBy || null,
    processHistory: [],
  };

  if (initialStatus === LOT_STATUS.IN_PROGRESS) {
    newLot.startedAt = initialSentAt;
  }

  if (initialStatus === LOT_STATUS.RETURNED) {
    newLot.startedAt = initialSentAt;
    newLot.returnedAt = initialSentAt;
  }

  // El tiempo transcurrido siempre se calcula desde el primer registro hasta la última actualización
  newLot.elapsedTime = calcElapsedTime(initialSentAt, registrationTimestamp);

  // Verificar si el lote con este número ya existe
  const existingLot = store.getLotByNumber(lotNumber);
  if (existingLot) {
    const existingOwnerId = existingLot.createdBy && existingLot.createdBy.id ? existingLot.createdBy.id : null;
    const newOwnerId = newLot.createdBy && newLot.createdBy.id ? newLot.createdBy.id : null;
    const existingOwnerUsername = normalizeUsername(existingLot.createdBy && existingLot.createdBy.username);
    const newOwnerUsername = normalizeUsername(newLot.createdBy && newLot.createdBy.username);
    const sameOwner = Boolean(
      (existingOwnerId && newOwnerId && existingOwnerId === newOwnerId)
      || (existingOwnerUsername && newOwnerUsername && existingOwnerUsername === newOwnerUsername)
    );

    const updatedTimestamp = initialSentAt;
    const updatedStatus = calculateStatusByProgress(newLot.totalQuantity, newLot.processedQuantity);

    if (sameOwner) {
      // Si edita la misma persona, no crear etapa nueva ni reiniciar el inicio del proceso
      const preservedSentAt = existingLot.sentAt || initialSentAt;
      const sameOwnerStartedAt = updatedStatus === LOT_STATUS.SENT ? null : (existingLot.startedAt || preservedSentAt);
      const sameOwnerReturnedAt = updatedStatus === LOT_STATUS.RETURNED ? updatedTimestamp : null;
      const sameOwnerElapsedTime = calcElapsedTime(preservedSentAt, updatedTimestamp);

      const updatedSameOwner = store.updateLot(existingLot.id, {
        garmentType: newLot.garmentType,
        gender: newLot.gender,
        size: newLot.size,
        sizeDetails: newLot.sizeDetails,
        sizeMatrix: newLot.sizeMatrix,
        sizeMatrixSections: mergeSections(existingLot.sizeMatrixSections, newLot.sizeMatrixSections),
        quantity: newLot.quantity,
        totalQuantity: newLot.totalQuantity,
        processedQuantity: newLot.processedQuantity,
        status: updatedStatus,
        area: existingLot.area || deriveArea(newLot.createdBy?.role) || null,
        sentAt: preservedSentAt,
        firstCreatedAt: existingLot.firstCreatedAt || existingLot.sentAt || initialSentAt,
        startedAt: sameOwnerStartedAt,
        returnedAt: sameOwnerReturnedAt,
        notes: newLot.notes,
        evidence: newLot.evidence,
        elapsedTime: sameOwnerElapsedTime,
        lastUpdatedAt: updatedTimestamp,
        createdBy: newLot.createdBy,
        processHistory: Array.isArray(existingLot.processHistory) ? existingLot.processHistory : [],
      });
      if (updatedSameOwner && Array.isArray(updatedSameOwner.sizeMatrixSections)) {
        const mergedPrimary = buildPrimaryMatrixFromSections(updatedSameOwner.sizeMatrixSections);
        if (mergedPrimary) {
          return store.updateLot(existingLot.id, { sizeMatrix: mergedPrimary }) || updatedSameOwner;
        }
      }
      return updatedSameOwner;
    }

    // Si cambia de persona/departamento, reiniciar proceso y guardar snapshot en historial
    const updatedStartedAt = updatedStatus === LOT_STATUS.SENT ? null : initialSentAt;
    const updatedReturnedAt = updatedStatus === LOT_STATUS.RETURNED ? initialSentAt : null;
    const updatedElapsedTime = calcElapsedTime(initialSentAt, updatedTimestamp);
    const previousHistory = Array.isArray(existingLot.processHistory) ? existingLot.processHistory : [];
    const previousSnapshot = {
      movedAt: updatedTimestamp,
      createdBy: existingLot.createdBy || null,
      area: existingLot.area || deriveArea(existingLot.createdBy?.role) || null,
      status: calculateStatusByProgress(
        Number(existingLot.totalQuantity ?? existingLot.quantity ?? 0),
        Number(existingLot.processedQuantity ?? 0)
      ),
      totalQuantity: Number(existingLot.totalQuantity ?? existingLot.quantity ?? 0),
      processedQuantity: Number(existingLot.processedQuantity ?? 0),
      sentAt: existingLot.sentAt || null,
      startedAt: existingLot.startedAt || null,
      returnedAt: existingLot.returnedAt || null,
      notes: existingLot.notes || null,
      sizeMatrix: existingLot.sizeMatrix || null,
      sizeMatrixSections: Array.isArray(existingLot.sizeMatrixSections) ? existingLot.sizeMatrixSections : [],
    };
    const updatedHistory = [...previousHistory, previousSnapshot];

    const updated = store.updateLot(existingLot.id, {
      garmentType: newLot.garmentType,
      gender: newLot.gender,
      size: newLot.size,
      sizeDetails: newLot.sizeDetails,
      sizeMatrix: newLot.sizeMatrix,
      sizeMatrixSections: mergeSections(existingLot.sizeMatrixSections, newLot.sizeMatrixSections),
      quantity: newLot.quantity,
      totalQuantity: newLot.totalQuantity,
      processedQuantity: newLot.processedQuantity,
      status: updatedStatus,
      area: newLot.area || deriveArea(newLot.createdBy?.role) || null,
      sentAt: initialSentAt,
      firstCreatedAt: existingLot.firstCreatedAt || existingLot.sentAt,
      startedAt: updatedStartedAt,
      returnedAt: updatedReturnedAt,
      notes: newLot.notes,
      evidence: newLot.evidence,
      elapsedTime: updatedElapsedTime,
      lastUpdatedAt: updatedTimestamp,
      createdBy: newLot.createdBy,
      processHistory: updatedHistory,
    });
    if (updated && Array.isArray(updated.sizeMatrixSections)) {
      const mergedPrimary = buildPrimaryMatrixFromSections(updated.sizeMatrixSections);
      if (mergedPrimary) {
        return store.updateLot(existingLot.id, { sizeMatrix: mergedPrimary }) || updated;
      }
    }
    return updated;
  }

  return store.addLot(newLot);
};

const updateLotMatrix = (id, { sizeMatrixSections, updatedByRole }) => {
  const lot = getLotById(id);
  const incoming = normalizeSections(sizeMatrixSections);
  if (!incoming.length) {
    const error = new Error('Debe enviar al menos una seccion valida de matriz');
    error.statusCode = 422;
    error.code = 'INVALID_MATRIX_SECTIONS';
    throw error;
  }

  const role = normalizeRole(updatedByRole);
  let allowedKeys = null;
  if (role === 'admin') {
    allowedKeys = null;
  } else {
    const mapped = normalizeSectionKey(deriveArea(role));
    allowedKeys = mapped ? new Set([mapped]) : new Set();
  }

  const filteredIncoming = allowedKeys
    ? incoming.filter((section) => allowedKeys.has(section.key))
    : incoming;

  if (!filteredIncoming.length) {
    const error = new Error('No tienes permisos para modificar esas secciones');
    error.statusCode = 403;
    error.code = 'FORBIDDEN_MATRIX_SECTION';
    throw error;
  }

  const merged = mergeSections(lot.sizeMatrixSections, filteredIncoming);
  const primaryMatrix = buildPrimaryMatrixFromSections(merged);

  return store.updateLot(id, {
    sizeMatrixSections: merged,
    sizeMatrix: primaryMatrix,
    lastUpdatedAt: nowISO(),
  });
};

const getAllLots = ({ gender, garmentType, size, status } = {}) => {
  let results = store.getAllLots().map(withCalculatedStatus);
  if (gender) results = results.filter((l) => l.gender === gender);
  if (garmentType) results = results.filter((l) => l.garmentType === garmentType);
  if (size) {
    results = results.filter((l) => {
      if (Array.isArray(l.sizeDetails) && l.sizeDetails.length > 0) {
        return l.sizeDetails.some((detail) => detail.size === size);
      }
      return l.size === size;
    });
  }
  if (status) results = results.filter((l) => l.status === status);
  return results;
};

const getLotById = (id) => {
  const lot = store.getLotById(id);
  if (!lot) {
    const error = new Error(`El lote con ID ${id} no existe`);
    error.code = 'LOT_NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }
  return withCalculatedStatus(lot);
};

const advanceLotStatus = (id, customDate) => {
  const lot = getLotById(id);

  const nextStatus = STATUS_TRANSITIONS[lot.status];
  if (!nextStatus) {
    const error = new Error(`El lote ya está en estado final: ${lot.status}`);
    error.code = 'INVALID_STATUS_TRANSITION';
    error.statusCode = 400;
    throw error;
  }

  if (customDate && !isValidISODate(customDate)) {
    const error = new Error('La fecha enviada no tiene un formato válido');
    error.code = 'INVALID_DATE_FORMAT';
    error.statusCode = 422;
    throw error;
  }

  const timestamp = customDate || nowISO();
  const changes = { status: nextStatus, lastUpdatedAt: timestamp };

  if (nextStatus === LOT_STATUS.IN_PROGRESS) {
    changes.startedAt = timestamp;
  }

  if (nextStatus === LOT_STATUS.RETURNED) {
    changes.returnedAt = timestamp;
    changes.elapsedTime = calcElapsedTime(lot.sentAt, timestamp);
  }

  return store.updateLot(id, changes);
};

const deleteLot = (id) => {
  getLotById(id);
  return store.deleteLot(id);
};

const getSummary = () => {
  const all = store.getAllLots().map(withCalculatedStatus);
  const byStatus = { SENT: 0, IN_PROGRESS: 0, RETURNED: 0 };
  const byGarment = {};
  const bySize = {};

  all.forEach((lot) => {
    byStatus[lot.status] = (byStatus[lot.status] || 0) + 1;
    const gKey = `${lot.gender}/${lot.garmentType}`;
    byGarment[gKey] = (byGarment[gKey] || 0) + 1;
    if (Array.isArray(lot.sizeDetails) && lot.sizeDetails.length > 0) {
      const uniqueSizes = [...new Set(lot.sizeDetails.map((detail) => detail.size))];
      uniqueSizes.forEach((sizeCode) => {
        bySize[sizeCode] = (bySize[sizeCode] || 0) + 1;
      });
    } else {
      bySize[lot.size] = (bySize[lot.size] || 0) + 1;
    }
  });

  // Time-series: lotes creados por día (últimos 30 días)
  const byDate = {};
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    byDate[key] = 0;
  }
  all.forEach((lot) => {
    const dateKey = lot.sentAt ? lot.sentAt.slice(0, 10) : null;
    if (dateKey && Object.prototype.hasOwnProperty.call(byDate, dateKey)) {
      byDate[dateKey] += 1;
    }
  });

  return { total: all.length, byStatus, byGarment, bySize, byDate };
};

module.exports = { createLot, getAllLots, getLotById, updateLotMatrix, advanceLotStatus, deleteLot, getSummary };