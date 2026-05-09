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
        address: { type: String, default: '' },
        price: { type: String, default: '' },
        area: { type: String, default: '' },
        phone: { type: String, default: '' },
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
