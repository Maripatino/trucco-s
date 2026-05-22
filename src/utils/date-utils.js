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

const getBogotaDateParts = (dateValue) => {
  const date = new Date(dateValue || '');
  if (Number.isNaN(date.getTime())) return null;
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value || 0);
  return { year: get('year'), month: get('month'), day: get('day') };
};

const calcBusinessDays = (startDate) => {
  const startParts = getBogotaDateParts(startDate);
  const nowParts = getBogotaDateParts(new Date());
  if (!startParts || !nowParts) return 1;

  const start = new Date(Date.UTC(startParts.year, startParts.month - 1, startParts.day));
  const end = new Date(Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day));
  if (end < start) return 1;

  let days = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getUTCDay();
    if (dow !== 0) days++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  return Math.max(days, 1);
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

module.exports = { nowISO, formatColombiaDate, isValidISODate, calcElapsedTime, getBogotaDateParts, calcBusinessDays };