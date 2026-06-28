class DataNormalizer {
  /**
   * Normalize price string to raw number (Vietnam Dong)
   * Example: "4,8 tỷ" -> 4800000000, "30 triệu" -> 30000000
   */
  parsePrice(priceStr) {
    if (!priceStr) return null;

    const lower = priceStr.toLowerCase();
    // Extract the first number (with optional decimal comma/dot) from the string
    const match = priceStr.replace(/,/g, '.').match(/(\d+(?:\.\d+)?)/);
    if (!match) return null;
    const value = parseFloat(match[1]);
    if (isNaN(value)) return null;

    if (lower.includes('tỷ')) {
      return value * 1000000000;
    } else if (lower.includes('triệu') || lower.includes('tr')) {
      return value * 1000000;
    }

    return value;
  }

  /**
   * Normalize area string to number (sqm)
   * Example: "145.2 m²" -> 145.2
   */
  parseArea(areaStr) {
    if (!areaStr) return null;

    // Extract the first number from the string (handles "Diện tích: 100 m²", "145.2 m²", etc.)
    const match = areaStr.replace(/,/g, '.').match(/(\d+(?:\.\d+)?)/);
    if (!match) return null;
    const value = parseFloat(match[1]);
    return isNaN(value) ? null : value;
  }

  /**
   * Parse price per sqm
   * Example: "125,42 tr/m²" -> 125420000
   */
  parsePricePerM2(pricePerStr) {
    if (!pricePerStr) return null;
    const cleanStr = pricePerStr.toLowerCase().replace(/\s/g, '').replace(/,/g, '.');
    
    let value = parseFloat(cleanStr);
    if (isNaN(value)) return null;

    if (cleanStr.includes('tr') || cleanStr.includes('triệu')) {
      return value * 1000000;
    }
    
    return value;
  }
}

module.exports = new DataNormalizer();
