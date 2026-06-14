/**
 * Parses flexible date formats (e.g., "01-02-2026", "Mar-14")
 * Returns a JS Date object in UTC or a fallback.
 */
function parseFlexibleDate(dateStr) {
  if (!dateStr) return new Date();
  
  dateStr = dateStr.trim();
  
  // Format: DD-MM-YYYY or D-M-YYYY
  const dmYMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmYMatch) {
    const day = parseInt(dmYMatch[1], 10);
    const month = parseInt(dmYMatch[2], 10) - 1; // 0-indexed
    const year = parseInt(dmYMatch[3], 10);
    return new Date(Date.UTC(year, month, day));
  }

  // Format: MMM-DD (e.g. Mar-14)
  const mmmDMatch = dateStr.match(/^([A-Za-z]{3})-(\d{1,2})$/);
  if (mmmDMatch) {
    const monthStr = mmmDMatch[1];
    const day = parseInt(mmmDMatch[2], 10);
    const year = new Date().getFullYear(); // assume current year
    const months = {
      jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11
    };
    const month = months[monthStr.toLowerCase()] || 0;
    return new Date(Date.UTC(year, month, day));
  }

  // Fallback to JS Date parser
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed;

  return new Date();
}

/**
 * Parses amount strings containing commas (e.g. "1,200")
 */
function parseAmount(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const clean = val.replace(/,/g, '');
  return parseFloat(clean) || 0;
}

/**
 * Detects if a row is a settlement based on split_type or notes
 */
function isSettlementRow(row) {
  if (!row.split_type || row.split_type.trim() === '') {
    if (row.split_with && row.split_with.split(';').length === 1) {
      return true; // Single person split with no split type
    }
  }
  if (row.notes && row.notes.toLowerCase().includes('settlement')) {
    return true;
  }
  return false;
}

/**
 * Normalizes split_type enum strings
 */
function normalizeSplitType(rawType) {
  if (!rawType) return 'EQUAL';
  const t = rawType.trim().toUpperCase();
  if (['EQUAL', 'UNEQUAL', 'PERCENTAGE', 'SHARE'].includes(t)) {
    return t;
  }
  return 'EQUAL';
}

module.exports = {
  parseFlexibleDate,
  parseAmount,
  isSettlementRow,
  normalizeSplitType
};
