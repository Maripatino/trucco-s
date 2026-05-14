/**
 * @file        lot-controller.js
 * @description Controlador HTTP para los endpoints de lotes de prendas
 * @author      Trucco's Dev
 * @date        2025-01-01
 */

const lotService = require('../services/lot-service');
const { formatColombiaDate } = require('../utils/date-utils');
const { STATUS_LABELS } = require('../config/constants');
const garmentCatalogStore = require('../store/garment-catalog-store');

const formatLot = (lot, garmentLabels = garmentCatalogStore.getLabelMap()) => ({
  ...(() => {
    const history = Array.isArray(lot.processHistory) ? lot.processHistory : [];
    const currentOwnerKey = lot.createdBy ? (lot.createdBy.id || lot.createdBy.username || '') : '';
    const latestTransferFromDifferentOwner = [...history].reverse().find((entry) => {
      if (!entry || !entry.createdBy) return false;
      const entryOwnerKey = entry.createdBy.id || entry.createdBy.username || '';
      return entryOwnerKey && entryOwnerKey !== currentOwnerKey;
    });
    const currentProcessStartAt = (latestTransferFromDifferentOwner && latestTransferFromDifferentOwner.movedAt)
      || lot.sentAt
      || lot.firstCreatedAt
      || null;
    const end = lot.lastUpdatedAt || lot.sentAt || currentProcessStartAt;

    let elapsedTime = null;
    if (currentProcessStartAt && end) {
      const diffMs = new Date(end) - new Date(currentProcessStartAt);
      if (diffMs >= 0) {
        const totalMinutes = Math.floor(diffMs / 60000);
        const days = Math.floor(totalMinutes / 1440);
        const hours = Math.floor((totalMinutes % 1440) / 60);
        const minutes = totalMinutes % 60;
        const parts = [];
        if (days > 0) parts.push(`${days} dia${days > 1 ? 's' : ''}`);
        if (hours > 0) parts.push(`${hours} hora${hours > 1 ? 's' : ''}`);
        if (minutes > 0 || parts.length === 0) parts.push(`${minutes} minuto${minutes !== 1 ? 's' : ''}`);
        elapsedTime = parts.join(', ');
      }
    }

    return {
      ...lot,
      currentProcessStartAt,
      garmentLabel: garmentLabels[lot.garmentType] || lot.garmentType,
      statusLabel: STATUS_LABELS[lot.status] || lot.status,
      sentAtFormatted: formatColombiaDate(lot.sentAt),
      firstCreatedAtFormatted: formatColombiaDate(lot.firstCreatedAt || lot.sentAt),
      currentProcessStartAtFormatted: formatColombiaDate(currentProcessStartAt),
      lastUpdatedAtFormatted: formatColombiaDate(lot.lastUpdatedAt || lot.sentAt),
      startedAtFormatted: formatColombiaDate(lot.startedAt),
      returnedAtFormatted: formatColombiaDate(lot.returnedAt),
      elapsedTime,
    };
  })(),
});

const createLot = (req, res, next) => {
  try {
    const createdBy = {
      id: req.user.id,
      username: req.user.username,
      firstName: req.user.firstName || '',
      lastName: req.user.lastName || '',
      role: req.user.role || '',
    };
    const lot = lotService.createLot({ ...req.body, createdBy });
    res.status(201).json({
      success: true,
      data: formatLot(lot),
      message: 'Lote registrado correctamente',
    });
  } catch (err) {
    next(err);
  }
};

const getAllLots = (req, res, next) => {
  try {
    const { gender, garmentType, size, status } = req.query;
    const lots = lotService.getAllLots({ gender, garmentType, size, status });
    const garmentLabels = garmentCatalogStore.getLabelMap();
    res.status(200).json({
      success: true,
      data: lots.map((lot) => formatLot(lot, garmentLabels)),
      total: lots.length,
    });
  } catch (err) {
    next(err);
  }
};

const getLotById = (req, res, next) => {
  try {
    const lot = lotService.getLotById(req.params.id);
    res.status(200).json({ success: true, data: formatLot(lot) });
  } catch (err) {
    next(err);
  }
};

const updateLotMatrix = (req, res, next) => {
  try {
    if (!Array.isArray(req.body?.sizeMatrixSections)) {
      return res.status(422).json({
        success: false,
        error: { code: 'MISSING_REQUIRED_FIELD', message: 'El campo sizeMatrixSections es obligatorio y debe ser un arreglo' },
      });
    }

    const lot = lotService.updateLotMatrix(req.params.id, {
      sizeMatrixSections: req.body.sizeMatrixSections,
      updatedByRole: req.user?.role,
    });

    res.status(200).json({
      success: true,
      data: formatLot(lot),
      message: 'Tabla de tallas actualizada',
    });
  } catch (err) {
    next(err);
  }
};

const startLot = (req, res, next) => {
  try {
    const lot = lotService.advanceLotStatus(req.params.id, req.body.startedAt);
    res.status(200).json({
      success: true,
      data: formatLot(lot),
      message: 'Lote marcado como en proceso de confeccion',
    });
  } catch (err) {
    next(err);
  }
};

const returnLot = (req, res, next) => {
  try {
    const lot = lotService.advanceLotStatus(req.params.id, req.body.returnedAt);
    res.status(200).json({
      success: true,
      data: formatLot(lot),
      message: "Lote marcado como devuelto al almacen de Trucco's",
    });
  } catch (err) {
    next(err);
  }
};

const deleteLot = (req, res, next) => {
  try {
    lotService.deleteLot(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Lote eliminado correctamente',
    });
  } catch (err) {
    next(err);
  }
};

const getSummary = (req, res, next) => {
  try {
    const summary = lotService.getSummary();
    res.status(200).json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
};

module.exports = { createLot, getAllLots, getLotById, updateLotMatrix, startLot, returnLot, deleteLot, getSummary };