const nlpProcessor = require('../utils/nlpProcessor');

class DataValidator {
  /**
   * Normalize, validate and enrich a raw crawled listing
   * @param {Object} rawItem - The raw item returned by CrawlService
   * @returns {Object|null} - Normalized property object or null if invalid
   */
  validate(rawItem) {
    if (!rawItem) return null;

    // 1. Title is required
    const title = rawItem.title ? rawItem.title.trim() : '';
    if (!title) {
      console.warn('[Validator] Rejected: Missing title');
      return null;
    }

    // 2. Details link is required
    const sourceUrl = rawItem.detailLink ? rawItem.detailLink.trim() : '';
    if (!sourceUrl) {
      console.warn('[Validator] Rejected: Missing detailLink');
      return null;
    }

    // 3. Address city/province and district are required
    const rawAddress = rawItem.address || {};
    const province = (rawAddress.city || '').trim();
    const district = (rawAddress.district || '').trim();
    if (!province || !district) {
      console.warn(`[Validator] Rejected: Missing address details (province: "${province}", district: "${district}")`);
      return null;
    }

    // 4. Area is required
    const area = rawItem.rawArea || null;
    if (!area || area <= 0) {
      console.warn('[Validator] Rejected: Missing or invalid area');
      return null;
    }

    // 5. Price Normalization (Target schema is in Million VNĐ)
    let totalPrice = null;
    let pricePerM2 = null;

    if (rawItem.rawPrice) {
      totalPrice = rawItem.rawPrice / 1000000; // Convert full VND to million VND
    }
    if (rawItem.rawPricePerM2) {
      pricePerM2 = rawItem.rawPricePerM2 / 1000000; // Convert full VND to million VND
    }

    // Calculate missing values if possible
    if (!totalPrice && pricePerM2) {
      totalPrice = pricePerM2 * area;
    } else if (totalPrice && !pricePerM2) {
      pricePerM2 = totalPrice / area;
    }

    if (!totalPrice || totalPrice <= 0) {
      console.warn('[Validator] Rejected: Missing or invalid price');
      return null;
    }

    // 6. Basic flat attributes cleanups
    const description = rawItem.description ? rawItem.description.trim() : '';
    const phone = rawItem.phone ? rawItem.phone.trim() : '';
    const images = Array.isArray(rawItem.images) ? rawItem.images.filter(img => typeof img === 'string' && img.trim() !== '') : [];

    // Parse bedrooms and toilets
    let bedrooms = null;
    if (rawItem.bedrooms) {
      const match = rawItem.bedrooms.match(/\d+/);
      if (match) bedrooms = parseInt(match[0]);
    }
    if (!bedrooms && description) {
      const match = description.match(/(\d+)\s*(pn|phòng ngủ|phong ngu)/i);
      if (match) bedrooms = parseInt(match[1]);
    }

    let wc = null;
    if (rawItem.wc) {
      const match = rawItem.wc.match(/\d+/);
      if (match) wc = parseInt(match[0]);
    }
    if (!wc && description) {
      const match = description.match(/(\d+)\s*(wc|phòng tắm|phong tam|phòng vệ sinh|toila)/i);
      if (match) wc = parseInt(match[1]);
    }

    // 7. Valuation Data - Land Info
    const landNlp = rawItem.land || {};
    const land = {
      actualArea: area,
      frontWidth: landNlp.frontWidth || null,
      depth: landNlp.depth || null,
      shape: landNlp.shape || undefined,
      elevation: landNlp.elevation || undefined,
      slope: typeof landNlp.slope === 'boolean' ? landNlp.slope : undefined,
      direction: landNlp.direction || undefined
    };

    // 8. Valuation Data - Building Info
    const buildingNlp = rawItem.building || {};
    const building = {
      type: buildingNlp.type || undefined,
      yearBuilt: buildingNlp.yearBuilt || null,
      yearRenovated: buildingNlp.yearRenovated || null,
      structure: buildingNlp.structure || undefined,
      condition: buildingNlp.condition || undefined,
      floors: buildingNlp.floors || null,
      rentable: typeof buildingNlp.rentable === 'boolean' ? buildingNlp.rentable : undefined
    };

    // 9. Valuation Data - Legal Info
    // Merge scraped rawItem.legal string with nlpProcessor's legal object
    const legalNlp = rawItem.legal && typeof rawItem.legal === 'object' ? rawItem.legal : {};
    let titleDeed = legalNlp.titleDeed || undefined;
    let ownerType = legalNlp.ownerType || 'không rõ';
    let sharedAccess = typeof legalNlp.sharedAccess === 'boolean' ? legalNlp.sharedAccess : undefined;
    let constructionPermit = typeof legalNlp.constructionPermit === 'boolean' ? legalNlp.constructionPermit : undefined;

    // If legal flat string was scraped and overrode the nlpData
    if (typeof rawItem.legal === 'string' && rawItem.legal) {
      const legalStr = rawItem.legal.toLowerCase();
      if (legalStr.includes('sổ hồng') || legalStr.includes('shr')) titleDeed = 'sổ hồng';
      else if (legalStr.includes('sổ đỏ')) titleDeed = 'sổ đỏ';
      else if (legalStr.includes('chờ sổ')) titleDeed = 'chờ sổ';
      else if (legalStr.includes('chưa có sổ') || legalStr.includes('chưa sổ') || legalStr.includes('giấy tay')) titleDeed = 'chưa có sổ';

      if (legalStr.includes('chính chủ')) ownerType = 'chính chủ';
      else if (legalStr.includes('môi giới')) ownerType = 'môi giới';

      if (legalStr.includes('hẻm chung') || legalStr.includes('lối đi chung')) sharedAccess = true;
      if (legalStr.includes('đã hoàn công') || legalStr.includes('hoàn công')) constructionPermit = true;
    }

    const legal = {
      titleDeed,
      ownerType,
      zoning: typeof legalNlp.zoning === 'boolean' ? legalNlp.zoning : undefined,
      dispute: typeof legalNlp.dispute === 'boolean' ? legalNlp.dispute : undefined,
      sharedAccess,
      constructionPermit
    };

    // 10. Valuation Data - Location Details
    const locationNlp = rawItem.location || {};
    const street = (rawAddress.street || rawItem.street || '').trim();
    
    const location = {
      roadWidth: locationNlp.roadWidth || null,
      carAccess: typeof locationNlp.carAccess === 'boolean' ? locationNlp.carAccess : undefined,
      alleyType: locationNlp.alleyType || undefined,
      distanceToMainRoad: locationNlp.distanceToMainRoad || null,
      flooding: typeof locationNlp.flooding === 'boolean' ? locationNlp.flooding : undefined,
      noisy: typeof locationNlp.noisy === 'boolean' ? locationNlp.noisy : undefined,
      neighborhoodQuality: locationNlp.neighborhoodQuality || undefined,
      coordinates: locationNlp.coordinates || { lat: null, lng: null }
    };

    // 11. Valuation Data - Amenities
    const amenitiesNlp = rawItem.amenities || {};
    const amenities = {
      nearSchool: typeof amenitiesNlp.nearSchool === 'boolean' ? amenitiesNlp.nearSchool : undefined,
      nearMarket: typeof amenitiesNlp.nearMarket === 'boolean' ? amenitiesNlp.nearMarket : undefined,
      nearMetro: typeof amenitiesNlp.nearMetro === 'boolean' ? amenitiesNlp.nearMetro : undefined,
      nearIndustrial: typeof amenitiesNlp.nearIndustrial === 'boolean' ? amenitiesNlp.nearIndustrial : undefined,
      nearPark: typeof amenitiesNlp.nearPark === 'boolean' ? amenitiesNlp.nearPark : undefined,
      negativeFactors: Array.isArray(amenitiesNlp.negativeFactors) ? amenitiesNlp.negativeFactors : []
    };

    return {
      title,
      address: {
        province,
        district,
        ward: (rawAddress.ward || '').trim(),
        street,
        fullAddress: (rawAddress.fullAddress || '').trim()
      },
      phone,
      pricePerM2,
      totalPrice,
      area,
      bedrooms,
      wc,
      description,
      images,
      sourceUrl,
      publishedDate: rawItem.publishedDate ? new Date(rawItem.publishedDate) : undefined,
      land,
      building,
      legal,
      location,
      amenities
    };
  }
}

module.exports = new DataValidator();
