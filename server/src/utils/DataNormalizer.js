class DataNormalizer {
  /**
   * Normalize price string to raw number (Vietnam Dong)
   * Example: "4,8 tỷ" -> 4800000000, "30 triệu" -> 30000000
   */
  parsePrice(priceStr) {
    if (!priceStr) return null;
    
    // Clean string: lower case, remove spaces, change comma to dot
    const cleanStr = priceStr.toLowerCase().replace(/\s/g, '').replace(/,/g, '.');
    
    let value = parseFloat(cleanStr);
    if (isNaN(value)) return null;

    if (cleanStr.includes('tỷ')) {
      return value * 1000000000;
    } else if (cleanStr.includes('triệu') || cleanStr.includes('tr')) {
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
    
    // Remove m2, m2, spaces...
    const cleanStr = areaStr.toLowerCase().replace(/m²/g, '').replace(/m2/g, '').replace(/\s/g, '').replace(/,/g, '.');
    
    const value = parseFloat(cleanStr);
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
