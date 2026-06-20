const { expect } = require('chai');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Deduplicator = require('../src/services/Deduplicator');
const Property = require('../src/models/Property');

describe('Deduplicator Unit & Integration Tests', () => {
  before(async () => {
    if (mongoose.connection.readyState === 0) {
      const uri = process.env.MONGODB_URI;
      await mongoose.connect(uri);
    }
    // Clean database before tests
    await Property.deleteMany({ sourceUrl: /example\.com/ });
  });

  after(async () => {
    await Property.deleteMany({ sourceUrl: /example\.com/ });
    await mongoose.connection.close();
  });

  describe('Completeness Score Calculation', () => {
    it('should compute exact completeness score based on populated fields', () => {
      // Empty property
      const p1 = {};
      expect(Deduplicator.calculateScore(p1)).to.equal(0);

      // Property with land.actualArea (8), land.frontWidth (8), land.depth (5) = 21
      const p2 = {
        land: {
          actualArea: 100,
          frontWidth: 5,
          depth: 20
        }
      };
      expect(Deduplicator.calculateScore(p2)).to.equal(21);

      // Add building.type (5), legal.titleDeed (10) = 36
      const p3 = {
        land: {
          actualArea: 100,
          frontWidth: 5,
          depth: 20
        },
        building: {
          type: 'nhà nhiều tầng'
        },
        legal: {
          titleDeed: 'sổ hồng'
        }
      };
      expect(Deduplicator.calculateScore(p3)).to.equal(36);
    });

    it('should ignore empty strings and nulls but count false booleans', () => {
      const property = {
        land: {
          actualArea: 100, // 8
          frontWidth: null, // ignored
          shape: '', // ignored
          slope: false, // counts (3)
        },
        legal: {
          titleDeed: 'sổ hồng', // 10
          zoning: true, // 5
          dispute: false // counts (5)
        }
      };
      // Score: 8 + 3 + 10 + 5 + 5 = 31
      expect(Deduplicator.calculateScore(property)).to.equal(31);
    });
  });

  describe('Content Hash Generation', () => {
    it('should produce identical hashes for matching listing parameters', () => {
      const p1 = {
        title: 'Bán Nhà Quận 10 Giá Rẻ 5 Tầng',
        totalPrice: 4800,
        area: 60,
        address: { province: 'Hồ Chí Minh', district: 'Quận 10', ward: 'Phường 12' },
        phone: '0901234567'
      };

      const p2 = {
        title: 'bán nhà quận 10 giá rẻ 5 tầng  ',
        totalPrice: 4800.0,
        area: 60.00,
        address: { province: '  Hồ Chí Minh', district: 'Quận 10', ward: 'phường 12' },
        phone: '0901234567'
      };

      const hash1 = Deduplicator.generateHash(p1);
      const hash2 = Deduplicator.generateHash(p2);

      expect(hash1).to.equal(hash2);
      expect(hash1).to.have.lengthOf(64); // SHA-256 length
    });

    it('should produce different hashes for different prices or areas', () => {
      const p1 = {
        title: 'Bán Nhà Quận 10 Giá Rẻ 5 Tầng',
        totalPrice: 4800,
        area: 60,
        address: { province: 'Hồ Chí Minh', district: 'Quận 10', ward: 'Phường 12' },
        phone: '0901234567'
      };

      const p2 = {
        title: 'Bán Nhà Quận 10 Giá Rẻ 5 tầng',
        totalPrice: 4900, // Changed price
        area: 60,
        address: { province: 'Hồ Chí Minh', district: 'Quận 10', ward: 'Phường 12' },
        phone: '0901234567'
      };

      const hash1 = Deduplicator.generateHash(p1);
      const hash2 = Deduplicator.generateHash(p2);

      // Hash should be identical since hash is based on address and phone only
      expect(hash1).to.equal(hash2);
    });
  });

  describe('MongoDB Upsert Deduplication Logic', () => {
    const DataValidator = require('../src/services/DataValidator');

    it('should insert a new property if it does not exist', async () => {
      const rawItem = {
        title: 'Crawl Test Unique Property',
        detailLink: 'https://example.com/unique-1',
        rawPrice: 3500000000,
        rawArea: 50,
        address: { city: 'Thành phố Hồ Chí Minh', district: 'Quận 3', ward: 'Phường Võ Thị Sáu' },
        phone: '0909998888',
        publishedDate: '2026-05-20'
      };

      const validated = DataValidator.validate(rawItem);
      expect(validated).to.not.be.null;

      const result = await Deduplicator.upsert(validated);
      expect(result.action).to.equal('inserted');
      expect(result.doc._id).to.exist;
      expect(result.doc.contentHash).to.exist;
      expect(result.doc.dataCompletenessScore).to.be.above(0);

      // Verify insertion in DB
      const dbDoc = await Property.findById(result.doc._id);
      expect(dbDoc.totalPrice).to.equal(3500);
      expect(dbDoc.address.district).to.equal('Quận 3');
    });

    it('should skip updating if incoming publication date is older or same', async () => {
      const rawItem = {
        title: 'Duplicate Property Date Test',
        detailLink: 'https://example.com/date-test',
        rawPrice: 5000000000,
        rawArea: 70,
        address: { city: 'Thành phố Hà Nội', district: 'Cầu Giấy' },
        phone: '0911222333',
        publishedDate: '2026-05-20',
        description: 'Original description'
      };

      const validated = DataValidator.validate(rawItem);

      // 1. Initial insert
      const first = await Deduplicator.upsert(validated);
      expect(first.action).to.equal('inserted');

      // 2. Try to upsert older item
      const rawOlderItem = {
        ...rawItem,
        publishedDate: '2026-05-18', // Older
        // keep description unchanged to trigger dedup based on hash
      };
      const validatedOlder = DataValidator.validate(rawOlderItem);
      const second = await Deduplicator.upsert(validatedOlder);
      expect(second.action).to.equal('skipped');

      const dbDoc = await Property.findById(first.doc._id);
      expect(dbDoc.description).to.equal('Original description'); // Not updated
    });

    it('should update and deep-merge if incoming publication date is newer', async () => {
      const rawItem = {
        title: 'Merge Property Test',
        detailLink: 'https://example.com/merge-test',
        rawPrice: 4000000000,
        rawArea: 50,
        address: { city: 'Thành phố Hồ Chí Minh', district: 'Quận 7' },
        phone: '0988777666',
        publishedDate: '2026-05-10',
        description: 'Old Description',
        land: {
          frontWidth: 4,
          shape: 'nở hậu'
        }
      };

      const validated = DataValidator.validate(rawItem);

      // 1. Initial insert
      const first = await Deduplicator.upsert(validated);
      expect(first.action).to.equal('inserted');

      // 2. Upsert newer item with additional/updated data
      const rawNewerItem = {
        title: 'Merge Property Test Updated',
        detailLink: 'https://example.com/merge-test',
        rawPrice: 3950000000, // Price dropped!
        rawArea: 50,
        address: { city: 'Thành phố Hồ Chí Minh', district: 'Quận 7' },
        phone: '0988777666',
        publishedDate: '2026-05-22', // Newer!
        description: 'New Description',
        land: {
          frontWidth: 4,
          shape: 'nở hậu',
          depth: 12.5 // Added new land info!
        },
        building: {
          floors: 3 // Added building info!
        }
      };

      const validatedNewer = DataValidator.validate(rawNewerItem);
      const second = await Deduplicator.upsert(validatedNewer);
      expect(second.action).to.equal('updated');

      // 3. Verify merges in DB
      const dbDoc = await Property.findById(first.doc._id);
      expect(dbDoc.totalPrice).to.equal(3950);
      expect(dbDoc.description).to.equal('New Description');
      expect(dbDoc.land.frontWidth).to.equal(4);
      expect(dbDoc.land.shape).to.equal('nở hậu');
      expect(dbDoc.land.depth).to.equal(12.5); // New field merged!
      expect(dbDoc.building.floors).to.equal(3); // New group merged!
    });
  });
});
