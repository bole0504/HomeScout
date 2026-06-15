const addressParser = require('./location/AddressParser');

// ─── Transaction & property type ─────────────────────────────────────────────

const TRANSACTION_PATTERNS = [
  { type: 'rent', regex: /cho\s*thuê|cần\s*thuê|tìm\s*thuê/i },
  { type: 'sell', regex: /bán|sang\s*nhượng|cần\s*bán|chính\s*chủ\s*bán/i },
];

const PROPERTY_TYPE_PATTERNS = [
  { type: 'apartment', regex: /căn\s*hộ|chung\s*cư/i },
  { type: 'villa',     regex: /biệt\s*thự/i },
  { type: 'shophouse', regex: /shophouse|nhà\s*phố\s*thương\s*mại/i },
  // \b doesn't work with Vietnamese — use lookaround on whitespace/punctuation
  { type: 'land',      regex: /đất\s*nền|lô\s*đất|bán\s*đất|nền\s*đất|(?:^|[\s\-*•,\n])đất(?:[\s\-*•,\n]|$)/im },
  { type: 'house',     regex: /nhà\s*phố|nhà\s*riêng|nhà\s*hẻm|nhà\s*mặt\s*tiền|nhà\s*cấp|nhà/i },
];

// ─── Price ────────────────────────────────────────────────────────────────────
// Handles: "495 triệu", "1.2 tỷ", "1,2 tỷ", "☘️Giá bán chỉ 495 triệu", "Giá: 2 tỷ 5"

function parsePrice(text) {
  // "2 tỷ 5" = 2,500,000,000
  const tyNMatch = text.match(/(\d+)\s*tỷ\s*(\d+)(?!\s*triệu)/i);
  if (tyNMatch) {
    return parseInt(tyNMatch[1]) * 1000000000 + parseInt(tyNMatch[2]) * 100000000;
  }

  // "2.5 tỷ" or "2,5 tỷ" = 2,500,000,000
  const tyDecMatch = text.match(/(\d+[.,]\d+)\s*tỷ/i);
  if (tyDecMatch) {
    return Math.round(parseFloat(tyDecMatch[1].replace(',', '.')) * 1000000000);
  }

  // "2 tỷ" = 2,000,000,000
  const tyMatch = text.match(/(\d+)\s*tỷ/i);
  if (tyMatch) return parseInt(tyMatch[1]) * 1000000000;

  // "495 triệu" / "495tr" = 495,000,000
  const trMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:triệu|tr\b)/i);
  if (trMatch) return Math.round(parseFloat(trMatch[1].replace(',', '.')) * 1000000);

  return null;
}

// ─── Area ─────────────────────────────────────────────────────────────────────
// Handles: "5x40m", "5 x 40m", "200m²", "200 m2", "Diện tích: 5x40"

function parseArea(text) {
  // "5 x 40m" or "5x40" = width × length
  const dimMatch = text.match(/(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)\s*m?/);
  if (dimMatch) {
    const w = parseFloat(dimMatch[1].replace(',', '.'));
    const l = parseFloat(dimMatch[2].replace(',', '.'));
    if (w > 0 && l > 0 && w < 200 && l < 1000) return Math.round(w * l);
  }

  // "200m²" or "200 m2"
  const m2Match = text.match(/(\d+(?:[.,]\d+)?)\s*m[²2]/i);
  if (m2Match) return Math.round(parseFloat(m2Match[1].replace(',', '.')));

  return null;
}

// ─── Legal ────────────────────────────────────────────────────────────────────
// Handles: "Thổ cư: 100%", "sổ hồng", "sổ đỏ", "sổ sẵn", "GCNQSDĐ"

function parseLegal(text) {
  if (/thổ\s*cư/i.test(text)) {
    const pct = text.match(/thổ\s*cư[:\s]*(\d+)%/i);
    return pct ? `Thổ cư ${pct[1]}%` : 'Thổ cư';
  }
  if (/sổ\s*hồng/i.test(text))   return 'Sổ hồng';
  if (/sổ\s*đỏ/i.test(text))     return 'Sổ đỏ';
  if (/sổ\s*sẵn/i.test(text))    return 'Sổ sẵn';
  if (/gcnqsdđ|giấy\s*chứng\s*nhận/i.test(text)) return 'GCNQSDĐ';
  if (/pháp\s*lý.*rõ\s*ràng/i.test(text)) return 'Pháp lý rõ ràng';
  return '';
}

// ─── Phone ────────────────────────────────────────────────────────────────────

function parsePhone(text) {
  // Strip non-digit/non-space chars, then find 10-digit sequence starting with 0[3-9]
  // Handles: "0398 048 468", "0398.048.468", "0398-048-468", "039 8048468"
  const stripped = text.replace(/[^\d\s]/g, ' ');
  const groups = stripped.match(/[\d][\d ]{9,14}/g) || [];
  for (const g of groups) {
    const digits = g.replace(/\s/g, '');
    if (digits.length === 10 && /^0[3-9]/.test(digits)) return digits;
  }
  return '';
}

// ─── Structural info ─────────────────────────────────────────────────────────

function parseFloors(text) {
  const m = text.match(/(\d+)\s*(?:lầu|tầng)/i);
  return m ? parseInt(m[1]) : null;
}

function parseBedrooms(text) {
  const m = text.match(/(\d+)\s*(?:phòng\s*ngủ|pn\b|buồng)/i);
  return m ? parseInt(m[1]) : null;
}

function parseWC(text) {
  const m = text.match(/(\d+)\s*(?:wc|toilet|nhà\s*vệ\s*sinh|phòng\s*tắm)/i);
  return m ? parseInt(m[1]) : null;
}

function parseDirection(text) {
  const m = text.match(/hướng\s*(đông\s*nam|đông\s*bắc|tây\s*nam|tây\s*bắc|đông|tây|nam|bắc)/i);
  return m ? m[1].toLowerCase().trim() : '';
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Parse raw Facebook BĐS post text into structured property data.
 */
function parse(rawText, images = [], postUrl = '') {
  if (!rawText || rawText.trim().length < 20) return null;

  const text = rawText.trim();

  // Transaction type
  let transactionType = 'sell';
  for (const p of TRANSACTION_PATTERNS) {
    if (p.regex.test(text)) { transactionType = p.type; break; }
  }

  // Property type
  let propertyType = 'house';
  for (const p of PROPERTY_TYPE_PATTERNS) {
    if (p.regex.test(text)) { propertyType = p.type; break; }
  }

  const rawPrice       = parsePrice(text);
  const rawArea        = parseArea(text);
  const rawPricePerM2  = rawPrice && rawArea ? Math.round(rawPrice / rawArea) : null;
  const phone          = parsePhone(text);
  const legal          = parseLegal(text);
  const floors         = parseFloors(text);
  const bedrooms       = parseBedrooms(text);
  const wc             = parseWC(text);
  const direction      = parseDirection(text);

  // Address
  const parsedLocation = addressParser.parse(text);
  const address = {
    city:        parsedLocation.city        || '',
    district:    parsedLocation.district    || '',
    ward:        parsedLocation.ward        || '',
    street:      parsedLocation.street      || '',
    fullAddress: parsedLocation.fullAddress || '',
  };

  // Title = first meaningful line
  const firstLine = text.split('\n').find(l => l.replace(/[*\-•☘️☎️📞📍\s]/g, '').length > 10) || text;
  const title = firstLine.trim().replace(/^[*\-•☘️☎️📞📍\s]+/, '').substring(0, 150);

  return {
    title,
    transactionType,
    propertyType,
    address,
    rawPrice,
    rawArea,
    rawPricePerM2,
    phone,
    legal,
    floors,
    bedrooms,
    wc,
    direction,
    description: text,
    images,
    sourceUrl: postUrl,
    source: 'facebook',
  };
}

module.exports = { parse };
