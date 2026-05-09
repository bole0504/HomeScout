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
    // Matches: "Mặt Tiền Đường Nguyễn Cửu Vân", "Đường Tố Hữu"
    const streetMatch = text.match(/(mặt tiền đường|đường|phố)\s+([A-ZÀ-Ỹ][a-zà-ỹ]*(\s+[A-ZÀ-Ỹ][a-zà-ỹ]*)+)/i);
    if (streetMatch) {
      info.street = streetMatch[2].trim();
    }

    return info;
  },

  /**
   * Clean phone numbers from trailing garbage like " · Sao chép"
   * @param {string} phone 
   * @returns {string}
   */
  cleanPhone(phone) {
    if (!phone) return '';
    return phone.split('·')[0].trim().replace(/[^\d\s.+]/g, '');
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
  }
};

module.exports = nlpProcessor;
