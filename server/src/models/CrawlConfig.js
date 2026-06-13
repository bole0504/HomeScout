const mongoose = require('mongoose');
const { SOURCE_TYPES, CRAWL_PAGINATION } = require('../config/constants');

const crawlConfigSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Config name is required'],
      trim: true,
    },
    url: {
      type: String,
      required: [true, 'URL is required'],
      trim: true,
    },
    sourceType: {
      type: String,
      enum: Object.values(SOURCE_TYPES),
      default: SOURCE_TYPES.WEBSITE,
    },

    // DOM Selectors (learned via DOM Learner)
    selectors: {
      listContainer: { type: String, default: '' },
      itemSelector: { type: String, default: '' },
      fields: {
        title: { type: String, default: '' }, // New: selector for listing title
        address: { type: String, default: '' },
        city: { type: String, default: '' },
        district: { type: String, default: '' },
        ward: { type: String, default: '' },
        street: { type: String, default: '' },
        legal: { type: String, default: '' },
        publishedDate: { type: String, default: '' }, // New: selector for listing date
        price: { type: String, default: '' },
        pricePerM2: { type: String, default: '' },
        area: { type: String, default: '' },
        bedrooms: { type: String, default: '' },
        wc: { type: String, default: '' },
        phone: { type: String, default: '' },
        revealPhoneSelector: { type: String, default: '' },
        description: { type: String, default: '' },
        images: { type: String, default: '' },
        detailLink: { type: String, default: '' },
      },
    },

    // Pagination config
    pagination: {
      type: {
        type: String,
        enum: Object.values(CRAWL_PAGINATION),
        default: CRAWL_PAGINATION.URL_PARAM,
      },
      selector: { type: String, default: '' },
      paramName: { type: String, default: 'page' },
      maxPages: { type: Number, default: 5 },
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    // Scheduler interval in minutes (default: 15)
    interval: {
      type: Number,
      default: 15,
      min: 1,
      max: 1440, // max 24 hours
    },
    lastCrawledAt: {
      type: Date,
    },
    totalCrawled: {
      type: Number,
      default: 0,
    },
    lastError: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

crawlConfigSchema.index({ isActive: 1 });

module.exports = mongoose.model('CrawlConfig', crawlConfigSchema);
