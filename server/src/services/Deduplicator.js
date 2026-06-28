const crypto = require('crypto');
const Property = require('../models/Property');

const FIELD_WEIGHTS = {
  // Nhóm 1: Đất (40 điểm)
  'land.actualArea': 8,
  'land.frontWidth': 8,
  'land.depth': 5,
  'land.shape': 7,
  'land.elevation': 4,
  'land.slope': 3,
  'land.direction': 5,

  // Nhóm 2: Nhà (15 điểm)
  'building.type': 5,
  'building.yearBuilt': 3,
  'building.structure': 4,
  'building.condition': 3,

  // Nhóm 3: Pháp lý (25 điểm)
  'legal.titleDeed': 10,
  'legal.ownerType': 5,
  'legal.zoning': 5,
  'legal.dispute': 5,

  // Nhóm 4: Vị trí (15 điểm)
  'location.roadWidth': 5,
  'location.carAccess': 3,
  'location.alleyType': 4,
  'location.distanceToMainRoad': 3,

  // Nhóm 5: Tiện ích (5 điểm)
  'amenities.nearSchool': 1,
  'amenities.nearMarket': 1,
  'amenities.nearMetro': 1,
  'amenities.nearIndustrial': 1,
  'amenities.nearPark': 1,
};

class Deduplicator {
  /**
   * Helper to retrieve nested object value by dot-separated path
   */
  getValueByPath(obj, path) {
    return path.split('.').reduce((acc, part) => {
      return acc && acc[part] !== undefined && acc[part] !== null ? acc[part] : undefined;
    }, obj);
  }

  /**
   * Calculate data completeness score of a property (0-100%)
   * @param {Object} property - Standardized property object
   * @returns {number} - Completeness score (0-100)
   */
  calculateScore(property) {
    if (!property) return 0;
    let score = 0;

    for (const [path, weight] of Object.entries(FIELD_WEIGHTS)) {
      const val = this.getValueByPath(property, path);
      if (val !== undefined && val !== null && val !== '') {
        score += weight;
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Generate stable SHA-256 content hash
   * @param {Object} property - Standardized property object
   * @returns {string} - Unique SHA-256 hash string
   */
  generateHash(property) {
    if (!property) return '';

    // FB raw post (không có địa chỉ): hash theo nội dung gốc hoặc postUrl
    if (property.originalData) {
      const rawKey = property.sourceUrl
        ? `fb_url|${property.sourceUrl}`
        : `fb_text|${(property.originalData || '').slice(0, 200)}`;
      return crypto.createHash('sha256').update(rawKey).digest('hex');
    }

    const provPart = ((property.address && property.address.province) || '').toLowerCase().trim();
    const distPart = ((property.address && property.address.district) || '').toLowerCase().trim();
    const wardPart = ((property.address && property.address.ward) || '').toLowerCase().trim();
    const phonePart = (property.phone || '').replace(/[^0-9]/g, '').trim();

    const payload = `${provPart}|${distPart}|${wardPart}|${phonePart}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Check duplicates and upsert a validated item to the database
   * @param {Object} validatedItem - Item standardized by DataValidator
   * @param {string} crawlConfigId - MongoDB ID of the CrawlConfig
   * @returns {Promise<Object>} - Action status: { action: 'inserted' | 'updated' | 'skipped', doc }
   */
  async upsert(validatedItem, crawlConfigId) {
    if (!validatedItem) {
      throw new Error('Validated item is required for upsert');
    }

    // 1. Calculate completeness score and content hash
    const score = this.calculateScore(validatedItem);
    const hash = this.generateHash(validatedItem);

    validatedItem.dataCompletenessScore = score;
    validatedItem.contentHash = hash;
    if (crawlConfigId) {
      validatedItem.crawlConfigId = crawlConfigId;
    }

    // 2. Check if property already exists in the database
    // IMPORTANT: Only check by contentHash (NOT sourceUrl) to catch cross-site duplicates.
    // The same seller may post the same listing on batdongsan.com.vn, alonhadat.com.vn, etc.
    // The hash is based on: title + price + area + address + phone — sufficient to fingerprint unique listings.
    const existing = await Property.findOne({
      contentHash: validatedItem.contentHash
    });

    // 3. Insert if not exists
    if (!existing) {
      const doc = await Property.create(validatedItem);
      return { action: 'inserted', doc };
    }

    // 4. Update if incoming has a more recent publication date
    const existingDate = existing.publishedDate ? new Date(existing.publishedDate) : new Date(0);
    const incomingDate = validatedItem.publishedDate ? new Date(validatedItem.publishedDate) : new Date();

    if (incomingDate > existingDate) {
      // Deep merge the 5 valuation subgroups
      const groups = ['land', 'building', 'legal', 'location', 'amenities'];
      groups.forEach(group => {
        if (validatedItem[group]) {
          const existingGroup = existing[group] ? existing[group].toObject() : {};
          const incomingGroup = validatedItem[group];
          
          // Clean incoming group of undefined values
          const cleanIncoming = {};
          Object.keys(incomingGroup).forEach(k => {
            if (incomingGroup[k] !== undefined) {
              cleanIncoming[k] = incomingGroup[k];
            }
          });
          
          existing[group] = { ...existingGroup, ...cleanIncoming };
        }
      });

      // Update top level attributes
      const topLevelFields = [
        'title', 'phone', 'pricePerM2', 'totalPrice', 'area',
        'bedrooms', 'wc', 'description', 'images', 'sourceUrl',
        'contentHash', 'dataCompletenessScore', 'publishedDate',
        'sourceType', 'originalData',
      ];
      topLevelFields.forEach(field => {
        if (validatedItem[field] !== undefined) {
          existing[field] = validatedItem[field];
        }
      });

      if (crawlConfigId) {
        existing.crawlConfigId = crawlConfigId;
      }

      const doc = await existing.save();
      return { action: 'updated', doc };
    }

    // 5. Skip if existing date is identical or newer
    return { action: 'skipped', doc: existing };
  }
}

module.exports = new Deduplicator();
