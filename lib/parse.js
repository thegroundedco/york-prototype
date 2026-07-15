// Pure text-parsing helpers for turning messy Google-Sheet copy into PDP data.
// No dependencies, no I/O — every function here is a straight string transform.

/**
 * Turn a product name into a URL-safe slug.
 * Lowercases, collapses any run of non `[a-z0-9]` characters (spaces, punctuation,
 * prime marks, etc.) into a single `-`, and trims leading/trailing dashes.
 * @param {string} name
 * @returns {string}
 */
export function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Split a Key-Features blob into an array of bullet strings.
 * Bullets may be separated by newlines (each line prefixed with `-` or `*`) or,
 * within a single line, by inline `* ` markers. The marker itself is stripped.
 * @param {string} raw
 * @returns {string[]}
 */
export function splitBullets(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/\r\n|\r|\n|\s(?=\*\s)/) // newline, or whitespace right before an inline "* " marker
    .map((item) => item.replace(/^[*-]\s*/, '').trim())
    .filter(Boolean);
}

/**
 * Split a Features & Specs blob into an array of raw strings — one per spec line.
 * Splits on newlines and on " - " sequences. Deliberately does NOT parse out a
 * label/value pair; downstream code decides what to do with each string.
 * @param {string} raw
 * @returns {string[]}
 */
export function splitSpecs(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/\r\n|\r|\n| - /)
    .map((item) => item.trim())
    .filter(Boolean);
}

const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escape `& < > " '` for safe interpolation into HTML.
 * @param {string} s
 * @returns {string}
 */
export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/**
 * Format a numeric price as USD, e.g. 1999 -> "$1,999.00". Missing prices
 * (null/undefined/NaN) render as "Price TBD".
 * @param {number|null|undefined} n
 * @returns {string}
 */
export function formatPrice(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return 'Price TBD';
  return `$${Number(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
