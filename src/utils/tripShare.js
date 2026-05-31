import { todayISO } from './dates.js';
import { RADIUS_KM_MIN, RADIUS_KM_MAX, RADIUS_KM_DEFAULT } from '../constants/tripLimits.js';

/** Short query keys keep share URLs compact. */
export const SHARE_QUERY_KEYS = {
  destination: 'to',
  startDate: 'start',
  daysCount: 'days',
  radiusKm: 'radius',
  autoRun: 'run',
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @typedef {Object} TripShareInput
 * @property {string} [destination]
 * @property {string} [startDate]
 * @property {number} [daysCount]
 * @property {number} [radiusKm]
 * @property {boolean} [autoRun]
 */

/**
 * @typedef {Object} ParsedTripShare
 * @property {string} destination
 * @property {string|undefined} startDate
 * @property {number|undefined} daysCount
 * @property {number|undefined} radiusKm
 * @property {boolean} autoRun
 * @property {boolean} hasSharedTrip
 */

export function clampDaysCount(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return undefined;
  return Math.min(5, Math.max(1, parsed));
}

export function clampRadiusKm(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return undefined;
  return Math.min(RADIUS_KM_MAX, Math.max(RADIUS_KM_MIN, parsed));
}

export function clampStartDate(value, today = todayISO()) {
  if (!value || !DATE_PATTERN.test(value)) return undefined;
  return value < today ? today : value;
}

/**
 * Builds URLSearchParams for a shareable trip link.
 * @param {TripShareInput} trip
 * @returns {URLSearchParams}
 */
export function buildShareParams(trip) {
  const params = new URLSearchParams();
  const destination = trip.destination?.trim();

  if (destination) {
    params.set(SHARE_QUERY_KEYS.destination, destination);
  }
  if (trip.startDate) {
    params.set(SHARE_QUERY_KEYS.startDate, trip.startDate);
  }
  if (trip.daysCount != null) {
    params.set(SHARE_QUERY_KEYS.daysCount, String(trip.daysCount));
  }
  if (trip.radiusKm != null) {
    params.set(SHARE_QUERY_KEYS.radiusKm, String(trip.radiusKm));
  }
  if (trip.autoRun) {
    params.set(SHARE_QUERY_KEYS.autoRun, '1');
  }

  return params;
}

/**
 * @param {TripShareInput} trip
 * @param {string} [baseUrl]
 * @returns {string}
 */
export function buildShareUrl(trip, baseUrl) {
  const params = buildShareParams(trip);
  const fallbackBase = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}`
    : 'http://localhost/';

  const url = new URL(baseUrl || fallbackBase);
  url.search = params.toString();
  return url.toString();
}

/**
 * Parses share query params into validated trip inputs.
 * @param {URLSearchParams|Record<string, string>|string} input
 * @param {string} [today]
 * @returns {ParsedTripShare}
 */
export function parseShareParams(input, today = todayISO()) {
  const params = input instanceof URLSearchParams
    ? input
    : new URLSearchParams(typeof input === 'string' ? input : input);

  const destination = params.get(SHARE_QUERY_KEYS.destination)?.trim() || '';
  const startDate = clampStartDate(params.get(SHARE_QUERY_KEYS.startDate) || undefined, today);
  const daysCount = clampDaysCount(params.get(SHARE_QUERY_KEYS.daysCount));
  const radiusKm = clampRadiusKm(params.get(SHARE_QUERY_KEYS.radiusKm));
  const autoRun = params.get(SHARE_QUERY_KEYS.autoRun) === '1';

  return {
    destination,
    startDate,
    daysCount,
    radiusKm,
    autoRun,
    hasSharedTrip: Boolean(destination),
  };
}

/**
 * @param {{ search?: string, pathname?: string, hash?: string }} location
 * @param {string} [today]
 * @returns {ParsedTripShare}
 */
export function readShareParamsFromLocation(location = getDefaultLocation(), today = todayISO()) {
  return parseShareParams(location.search || '', today);
}

/**
 * Updates the browser URL with current trip inputs (without auto-run).
 * @param {TripShareInput} trip
 * @param {{ pathname?: string, hash?: string, search?: string }} location
 * @param {{ replaceState?: Function }} history
 * @returns {string}
 */
export function writeShareParamsToLocation(trip, location = getDefaultLocation(), history = getDefaultHistory()) {
  const params = buildShareParams({ ...trip, autoRun: false });
  const pathname = location.pathname || '/';
  const hash = location.hash || '';
  const query = params.toString();
  const nextUrl = `${pathname}${query ? `?${query}` : ''}${hash}`;

  if (typeof history.replaceState === 'function') {
    history.replaceState(null, '', nextUrl);
  }

  return nextUrl;
}

function getDefaultLocation() {
  if (typeof window === 'undefined') {
    return { pathname: '/', search: '', hash: '' };
  }
  return window.location;
}

function getDefaultHistory() {
  if (typeof window === 'undefined') {
    return { replaceState: () => {} };
  }
  return window.history;
}

/**
 * Resolves initial trip form values from URL params with defaults.
 * @param {{ search?: string, pathname?: string, hash?: string }} [location]
 * @param {string} [today]
 */
export function getInitialTripStateFromUrl(location, today = todayISO()) {
  const parsed = readShareParamsFromLocation(location, today);

  return {
    destination: parsed.destination,
    startDate: parsed.startDate || today,
    daysCount: parsed.daysCount ?? 3,
    radiusKm: parsed.radiusKm ?? RADIUS_KM_DEFAULT,
    autoRun: parsed.autoRun,
    hasSharedTrip: parsed.hasSharedTrip,
  };
}
