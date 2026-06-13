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

    const land = {};
    const building = {};
    const legal = {};
    const location = {};
    const amenities = { negativeFactors: [] };

    // === LAND INFO ===
    // 1. Dimensions (W x L)
    const dimsMatch = text.match(/(\d+[.,]\d+|\d+)\s*[xX*]\s*(\d+[.,]\d+|\d+)/);
    if (dimsMatch) {
      land.frontWidth = parseFloat(dimsMatch[1].replace(',', '.'));
      land.depth = parseFloat(dimsMatch[2].replace(',', '.'));
    }

    // 2. Shape
    if (text.match(/nở hậu/i)) {
      land.shape = 'nở hậu';
    } else if (text.match(/tóp hậu/i)) {
      land.shape = 'tóp hậu';
    } else if (text.match(/vuông đẹp|vuông vức|vuông vắn|vuông đét/i)) {
      land.shape = 'vuông đẹp';
    } else if (text.match(/tam giác/i)) {
      land.shape = 'tam giác';
    } else if (text.match(/méo|không vuông/i)) {
      land.shape = 'méo / không vuông';
    }

    // 3. Elevation
    if (text.match(/cao hơn đường/i)) {
      land.elevation = 'cao hơn đường';
    } else if (text.match(/bằng đường/i)) {
      land.elevation = 'bằng đường';
    } else if (text.match(/thấp hơn đường/i)) {
      land.elevation = 'thấp hơn đường';
    }

    // 4. Slope
    if (text.match(/(bị dốc|đất dốc)/i)) {
      land.slope = true;
    } else if (text.match(/(phẳng|bằng phẳng)/i)) {
      land.slope = false;
    }

    // 5. Direction
    const dirMatch = text.match(/(hướng|mặt tiền hướng|huong)[:\s]*(Đông Nam|Tây Nam|Đông Bắc|Tây Bắc|Đông|Tây|Nam|Bắc|dong nam|tay nam|dong bac|tay bac|dong|tay|nam|bac)/i);
    if (dirMatch) {
      const dirText = dirMatch[2].toLowerCase();
      if (dirText.includes('đông nam') || dirText.includes('dong nam')) land.direction = 'Đông Nam';
      else if (dirText.includes('tây nam') || dirText.includes('tay nam')) land.direction = 'Tây Nam';
      else if (dirText.includes('đông bắc') || dirText.includes('dong bac')) land.direction = 'Đông Bắc';
      else if (dirText.includes('tây bắc') || dirText.includes('tay bac')) land.direction = 'Tây Bắc';
      else if (dirText.includes('đông') || dirText.includes('dong')) land.direction = 'Đông';
      else if (dirText.includes('tây') || dirText.includes('tay')) land.direction = 'Tây';
      else if (dirText.includes('nam')) land.direction = 'Nam';
      else if (dirText.includes('bắc') || dirText.includes('bac')) land.direction = 'Bắc';
    }

    // === BUILDING INFO ===
    // 1. Floors
    const floorsMatch = text.match(/(\d+)\s*(tầng|lầu)/i);
    if (floorsMatch) {
      building.floors = parseInt(floorsMatch[1]);
    } else if (text.match(/1 trệt\s*(\d*)\s*lầu/i)) {
      const lầu = text.match(/1 trệt\s*(\d+)\s*lầu/i);
      building.floors = lầu ? parseInt(lầu[1]) + 1 : 1;
    }

    // 2. Building Type
    if (text.match(/đất trống|đất thổ cư|đất nền/i)) {
      building.type = 'đất trống';
    } else if (text.match(/nhà tạm|nhà tôn/i)) {
      building.type = 'nhà tạm';
    } else if (text.match(/cấp 4/i)) {
      building.type = 'nhà cấp 4';
    } else if (building.floors > 1 || text.match(/(nhiều tầng|tấm|lầu)/i)) {
      building.type = 'nhà nhiều tầng';
    } else if (building.floors === 1 || text.match(/(1 tầng|1 lầu|1 trệt)/i)) {
      building.type = 'nhà 1 tầng';
    }

    // 3. Structure
    if (text.match(/tôn|gỗ|lá|tạm bợ/i)) {
      building.structure = 'tạm';
    } else if (text.match(/BTCT|bê tông cốt thép|đúc kiên cố/i)) {
      building.structure = 'BTCT';
    } else if (text.match(/cao cấp|biệt thự|villa|premium/i)) {
      building.structure = 'cao cấp';
    }

    // 4. Condition
    if (text.match(/mới xây|vừa xây|mới tinh|đẹp keng|mới đét/i)) {
      building.condition = 'mới';
    } else if (text.match(/ở ngay|ở luôn|ở tốt|kiên cố/i)) {
      building.condition = 'ở tốt';
    } else if (text.match(/xuống cấp|cũ nát|sửa lại/i)) {
      building.condition = 'xuống cấp';
    }

    // 5. Rentable
    if (text.match(/(cho thuê|thu nhập|rental|dòng tiền)/i)) {
      building.rentable = true;
    }

    // === LEGAL INFO ===
    // 1. Title Deed
    if (text.match(/sổ hồng|shr|sổ riêng/i)) {
      legal.titleDeed = 'sổ hồng';
    } else if (text.match(/sổ đỏ/i)) {
      legal.titleDeed = 'sổ đỏ';
    } else if (text.match(/chờ sổ/i)) {
      legal.titleDeed = 'chờ sổ';
    } else if (text.match(/chưa có sổ|chưa sổ|giấy tay|không sổ/i)) {
      legal.titleDeed = 'chưa có sổ';
    }

    // 2. Owner Type
    if (text.match(/chính chủ|bán chính chủ/i)) {
      legal.ownerType = 'chính chủ';
    } else if (text.match(/môi giới|trung gian/i)) {
      legal.ownerType = 'môi giới';
    } else {
      legal.ownerType = 'không rõ';
    }

    // 3. Shared access
    if (text.match(/hẻm chung|lối đi chung/i)) {
      legal.sharedAccess = true;
    }

    // 4. Construction permit
    if (text.match(/hoàn công|đã hoàn công/i)) {
      legal.constructionPermit = true;
    } else if (text.match(/chưa hoàn công/i)) {
      legal.constructionPermit = false;
    }

    // === LOCATION DETAILS ===
    // 1. Road width
    const roadMatch = text.match(/(đường|ngõ|hẻm)\s*(rộng|vào)?\s*(\d+[.,]\d+|\d+)\s*m/i);
    if (roadMatch) {
      location.roadWidth = parseFloat(roadMatch[3].replace(',', '.'));
    }

    // 2. Alley type
    if (text.match(/mặt tiền|mt/i)) {
      location.alleyType = 'mặt tiền';
    } else if (text.match(/hẻm thông|ngõ thông/i)) {
      location.alleyType = 'hẻm thông';
    } else if (text.match(/hẻm cụt|ngõ cụt/i)) {
      location.alleyType = 'hẻm cụt';
    }

    // 3. Car access
    if (text.match(/(hẻm xe hơi|hxh|xe hơi|ô tô|xe hơi vào|xe hơi tránh|đường xe hơi)/i)) {
      location.carAccess = true;
    } else if (location.roadWidth && location.roadWidth >= 4) {
      location.carAccess = true;
    }

    // === AMENITIES ===
    if (text.match(/trường|học/i)) amenities.nearSchool = true;
    if (text.match(/chợ|siêu thị/i)) amenities.nearMarket = true;
    if (text.match(/công viên|hồ|sông/i)) amenities.nearPark = true;

    // Negative factors
    const negativePatterns = {
      'nghĩa trang': /nghĩa trang|mộ/i,
      'bãi rác': /bãi rác|rác/i,
      'cột điện cao thế': /cột điện cao thế|cao thế/i,
      'đường ray xe lửa': /đường ray|tàu hỏa/i
    };
    for (const [factor, regex] of Object.entries(negativePatterns)) {
      if (text.match(regex)) {
        amenities.negativeFactors.push(factor);
      }
    }

    // Street Name (Basic heuristic)
    let street = '';
    const streetMatch = text.match(/(mặt tiền đường|đường|phố)\s+([A-ZÀ-Ỹ\d][a-zà-ỹ\d]*(\s+[A-ZÀ-Ỹ\d][a-zà-ỹ\d]*)*)/i);
    if (streetMatch) {
      const potential = streetMatch[2].trim();
      if (!/^(cao cấp|biệt thự|văn phòng|hiện đại|đẹp|giá rẻ)$/i.test(potential)) {
        street = potential;
      }
    }

    return {
      land,
      building,
      legal,
      location,
      amenities,
      street
    };
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
