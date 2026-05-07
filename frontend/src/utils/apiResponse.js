/**
 * Unwrap a single object from a Laravel API response envelope.
 * Handles: { data: { data: {...} } }, { data: {...} }, or raw object.
 */
export function unwrapData(response) {
  if (response?.data?.data !== undefined) return response.data.data;
  if (response?.data !== undefined) return response.data;
  return response;
}

/**
 * Safely extract an array from a Laravel response.
 * Tries response.data.data[key], response.data[key], response.data.data (if array),
 * response.data (if array), response (if array).
 * Falls back to [].
 *
 * @param {*} response  Axios response or already-unwrapped data
 * @param {string[]} possibleKeys  e.g. ['notifications', 'data']
 */
export function unwrapList(response, possibleKeys = []) {
  const tryArr = (v) => (Array.isArray(v) ? v : null);

  const inner = response?.data?.data;
  const outer = response?.data;

  for (const key of possibleKeys) {
    if (inner && tryArr(inner[key])) return inner[key];
    if (outer && tryArr(outer[key])) return outer[key];
  }
  if (tryArr(inner)) return inner;
  if (tryArr(outer)) return outer;
  if (tryArr(response)) return response;
  return [];
}

/**
 * Extract field-level validation errors from a failed Axios request.
 * Returns { field: ['message', ...], ... } or {}.
 */
export function getValidationErrors(error) {
  return error?.response?.data?.errors || {};
}

/**
 * Get the most user-friendly error message from a failed Axios request.
 * Priority: first validation error string > backend message > generic.
 */
export function getErrorMessage(error) {
  const errs = getValidationErrors(error);
  const firstField = Object.values(errs)[0];
  if (firstField) {
    return Array.isArray(firstField) ? firstField[0] : firstField;
  }
  return (
    error?.response?.data?.message ||
    error?.message ||
    'Une erreur inattendue est survenue.'
  );
}

/**
 * Safe number formatter — never returns NaN.
 * @param {*} value
 * @param {number} decimals
 */
export function safeNumber(value, decimals = 2) {
  const n = Number(value);
  return isNaN(n) ? 0 : n;
}

export function formatAmount(value, locale = 'fr-MA', currency = 'MAD') {
  const n = safeNumber(value);
  return `${n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}
