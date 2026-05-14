/**
 * @file        lot-store.js
 * @description Almacenamiento persistente de lotes en data/lots.json
 * @author      Trucco's Dev
 * @date        2025-01-01
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'lots.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readLots() {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
    return [];
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function writeLots(lots) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(lots, null, 2));
}

const getAllLots = () => readLots();

const getLotById = (id) => readLots().find((lot) => lot.id === id) || null;

const getLotByNumber = (lotNumber) => readLots().find((lot) => lot.lotNumber === lotNumber) || null;

const addLot = (lot) => {
  const lots = readLots();
  lots.push(lot);
  writeLots(lots);
  return lot;
};

const updateLot = (id, changes) => {
  const lots = readLots();
  const index = lots.findIndex((lot) => lot.id === id);
  if (index === -1) return null;
  lots[index] = { ...lots[index], ...changes };
  writeLots(lots);
  return lots[index];
};

const deleteLot = (id) => {
  const lots = readLots();
  const index = lots.findIndex((lot) => lot.id === id);
  if (index === -1) return false;
  lots.splice(index, 1);
  writeLots(lots);
  return true;
};

module.exports = { getAllLots, getLotById, getLotByNumber, addLot, updateLot, deleteLot };