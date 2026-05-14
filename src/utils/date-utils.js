/**
 * @file        date-utils.js
 * @description Funciones auxiliares para manejo de fechas y horas
 * @author      Trucco's Dev
 * @date        2025-01-01
 */

const nowISO = () => new Date().toISOString();

const formatColombiaDate = (isoString) => {
  if (!isoString) return null;
  const date = new Date(isoString);
  return date.toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const isValidISODate = (value) => {
  if (!value || typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
};

const calcElapsedTime = (startISO, endISO) => {
  if (!startISO || !endISO) return null;
  const diffMs = new Date(endISO) - new Date(startISO);
  if (diffMs < 0) return null;

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts = [];
  if (days > 0) parts.push(`${days} dia${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hora${hours > 1 ? 's' : ''}`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} minuto${minutes !== 1 ? 's' : ''}`);

  return parts.join(', ');
};

module.exports = { nowISO, formatColombiaDate, isValidISODate, calcElapsedTime };