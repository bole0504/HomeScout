/**
 * Utility to extract structured information from unstructured Vietnamese real estate descriptions
 */

const nlpProcessor = {
  /**
   * Extract key attributes from description text
   * @param {string} text - The raw description text
   * @returns {Object} - Extracted attributes
   */
  extractFromDescription(text) {
    if (!text) return {};

    const info = {};

    // 1. Dimensions (W x L)
    // Matches: 5x20, 5.5 x 15, 8 x 25m, 5m x 20m
    const dimsMatch = text.match(/(\d+[.,]\d+|\d+)\s*[xX*]\s*(\d+[.,]\d+|\d+)/);
    if (dimsMatch) {
      info.width = parseFloat(dimsMatch[1].replace(',', '.'));
      info.length = parseFloat(dimsMatch[2].replace(',', '.'));
    }

    // 2. Floors
    // Matches: 1 trệt 2 lầu, 3 tầng, Hầm 7 Tầng
    const floorsMatch = text.match(/(\d+)\s*(tầng|lầu)/i);
    if (floorsMatch) {
      info.floors = parseInt(floorsMatch[1]);
    } else if (text.match(/1 trệt\s*(\d*)\s*lầu/i)) {
      const lầu = text.match(/1 trệt\s*(\d+)\s*lầu/i);
      info.floors = lầu ? parseInt(lầu[1]) + 1 : 1;
    }

    // 3. Legal status
    if (text.match(/sổ hồng|sổ đỏ|pháp lý rõ ràng|đã có sổ/i)) {
      info.legal = 'Sổ hồng/Sổ đỏ';
    } else if (text.match(/giấy tay|đang chờ sổ/i)) {
      info.legal = 'Chưa có sổ';
    }

    // 4. Position / Road width
    const roadMatch = text.match(/(đường|ngõ|hẻm)\s*(rộng|vào)?\s*(\d+[.,]\d+|\d+)\s*m/i);
    if (roadMatch) {
      info.roadWidth = parseFloat(roadMatch[3].replace(',', '.'));
    }

    // 5. Street Name (Basic heuristic)
    // Avoid descriptive words like "biệt thự", "văn phòng" if they aren't followed by a real name
    const streetMatch = text.match(/(mặt tiền đường|đường|phố)\s+([A-ZÀ-Ỹ\d][a-zà-ỹ\d]*(\s+[A-ZÀ-Ỹ\d][a-zà-ỹ\d]*)*)/i);
    if (streetMatch) {
      const potential = streetMatch[2].trim();
      // Filter out some false positives
      if (!/^(cao cấp|biệt thự|văn phòng|hiện đại|đẹp|giá rẻ)$/i.test(potential)) {
        info.street = potential;
      }
    }

    return info;
  },

  /**
   * Parse a raw address string into components
   * Example: "Phường 14, Tân Bình, Hồ Chí Minh"
   */
  parseStructuredAddress(addressStr) {
    if (!addressStr) return {};
    
    // Clean garbage prefix like "·\n" or special chars
    const cleanStr = addressStr.replace(/^[·\s\n-]+/, '').trim();
    if (!cleanStr) return {};

    const parts = cleanStr.split(',').map(p => p.trim());
    const structured = { fullAddress: cleanStr };

    // Heuristic: Vietnamese addresses usually end with City/Province, then District, then Ward
    // We reverse to work from largest to smallest
    const reversed = [...parts].reverse();

    if (reversed.length >= 1) structured.city = reversed[0];
    if (reversed.length >= 2) structured.district = reversed[1];
    if (reversed.length >= 3) structured.ward = reversed[2];
    
    // If there are more parts, the remaining at the beginning is likely the street or specific location
    if (parts.length > 3) {
      structured.street = parts.slice(0, parts.length - 3).join(', ');
    }

    return structured;
  },

  /**
   * Deeply extract address info from a generic text (Title or Description)
   * if no structured address is provided by the site.
   */
  extractAddressFromText(text) {
    if (!text) return {};
    
    const info = {};
    
    // 1. City / Province
    const cityMatch = text.match(/(tại|ở|khu vực|thành phố|tp|tỉnh)\s+([A-ZÀ-Ỹ][a-zà-ỹ]*(\s+[A-ZÀ-Ỹ][a-zà-ỹ]*)*)/i);
    // Common cities shortcut
    if (/Hồ Chí Minh|TPHCM|Sài Gòn/i.test(text)) info.city = "Hồ Chí Minh";
    else if (/Hà Nội/i.test(text)) info.city = "Hà Nội";
    else if (/Đà Nẵng/i.test(text)) info.city = "Đà Nẵng";
    else if (cityMatch) info.city = cityMatch[2].trim();

    // 2. District
    const districtMatch = text.match(/(quận|huyện|q\.|h\.)\s+([A-ZÀ-Ỹ\d][a-zà-ỹ\d]*(\s+[A-ZÀ-Ỹ\d][a-zà-ỹ\d]*)*)/i);
    if (districtMatch) info.district = districtMatch[2].trim();

    // 3. Ward
    const wardMatch = text.match(/(phường|xã|p\.)\s+([A-ZÀ-Ỹ\d][a-zà-ỹ\d]*(\s+[A-ZÀ-Ỹ\d][a-zà-ỹ\d]*)*)/i);
    if (wardMatch) info.ward = wardMatch[2].trim();

    // 4. Street (Reuse existing logic or refine)
    const streetMatch = text.match(/(đường|phố)\s+([A-ZÀ-Ỹ\d][a-zà-ỹ\d]*(\s+[A-ZÀ-Ỹ\d][a-zà-ỹ\d]*)*)/i);
    if (streetMatch) {
      const potential = streetMatch[2].trim();
      if (!/^(cao cấp|biệt thự|văn phòng|hiện đại|đẹp|giá rẻ)$/i.test(potential)) {
        info.street = potential;
      }
    }

    return info;
  },

  /**
   * Cleans and formats phone numbers from noise (e.g., "0936 324 033 · Sao chép")
   */
  cleanPhone(phoneStr) {
    if (!phoneStr) return '';
    
    // 1. Remove noise parts like "Sao chép", "Copy", etc.
    let text = phoneStr.split('·')[0].split('Sao chép')[0].split('Copy')[0].trim();
    
    // 2. Extract only digits
    let cleaned = text.replace(/\D/g, '');
    
    // 3. Handle 84 prefix
    if (cleaned.startsWith('84')) {
      cleaned = '0' + cleaned.substring(2);
    }
    
    // 4. Ensure it starts with 0 for VN numbers
    if (cleaned.length === 9 && !cleaned.startsWith('0')) {
      cleaned = '0' + cleaned;
    }
    
    // 5. If it's still too long, take the first 10 digits (standard VN phone)
    if (cleaned.length > 10 && cleaned.startsWith('0')) {
      return cleaned.substring(0, 10);
    }
    
    return cleaned;
  },

  /**
   * Normalize price strings like "2.5 tỷ", "35 triệu/m2" to numbers
   * @param {string} priceStr - Raw price string
   * @param {number} area - Total area for calculation if per m2
   * @returns {number} - Price in million VNĐ
   */
  parsePrice(priceStr, area = 0) {
    if (!priceStr) return 0;
    
    // Clean string
    const cleanStr = priceStr.toLowerCase().replace(/,/g, '.').trim();
    
    // Extract numeric part
    const numMatch = cleanStr.match(/(\d+[.,]\d+|\d+)/);
    if (!numMatch) return 0;
    
    let value = parseFloat(numMatch[1]);
    
    if (cleanStr.includes('tỷ')) {
      value *= 1000;
    } else if (cleanStr.includes('triệu')) {
      // already in million unit
    } else if (cleanStr.includes('nghìn') || cleanStr.includes('k')) {
      value /= 1000;
    }
    
    // Handle "per m2"
    if (cleanStr.includes('/m') || cleanStr.includes('m2')) {
      if (area > 0) {
        value *= area;
      }
    }
    
    return value;
  },

  /**
   * Parse relative time strings like "3 ngày trước" or "Hôm nay" to Date
   * @param {string} text 
   * @returns {Date|null}
   */
  parseRelativeDate(text) {
    if (!text) return null;
    const cleanText = text.toLowerCase().trim();
    const now = new Date();
    
    // Exact matches
    if (cleanText.includes('vừa xong') || cleanText.includes('mới đây')) return now;
    if (cleanText.includes('hôm nay') || cleanText.includes('nay')) return now;
    if (cleanText.includes('hôm qua') || cleanText.includes('qua')) {
      now.setDate(now.getDate() - 1);
      return now;
    }
    
    // Pattern matches: "x ngày/giờ/phút trước"
    const numMatch = cleanText.match(/(\d+)/);
    if (!numMatch) return null;
    
    const value = parseInt(numMatch[1]);
    const date = new Date();
    
    if (cleanText.includes('phút')) {
      date.setMinutes(date.getMinutes() - value);
    } else if (cleanText.includes('giờ')) {
      date.setHours(date.getHours() - value);
    } else if (cleanText.includes('ngày')) {
      date.setDate(date.getDate() - value);
    } else if (cleanText.includes('tuần')) {
      date.setDate(date.getDate() - (value * 7));
    } else if (cleanText.includes('tháng')) {
      date.setMonth(date.getMonth() - value);
    } else if (cleanText.includes('năm')) {
      date.setFullYear(date.getFullYear() - value);
    } else {
      return null;
    }
    
    return date;
  }
};

module.exports = nlpProcessor;
