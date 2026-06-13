const mongoose = require('mongoose');

/**
 * CrawlLog — Records the result of each crawl execution.
 * Logs are automatically purged after 7 days via the TTL index.
 * Property data is NOT affected by this purge.
 */
const crawlLogSchema = new mongoose.Schema(
  {
    crawlConfigId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CrawlConfig',
      required: true,
      index: true,
    },
    configName: {
      type: String,
      required: true,
      trim: true,
    },
    configUrl: {
      type: String,
      trim: true,
    },
    triggeredBy: {
      type: String,
      enum: ['scheduler', 'manual', 'run-all'],
      default: 'manual',
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    duration: {
      type: Number, // milliseconds
      default: 0,
    },
    status: {
      type: String,
      enum: ['running', 'success', 'partial', 'failed'],
      default: 'running',
    },
    stats: {
      totalScraped: { type: Number, default: 0 },
      totalInserted: { type: Number, default: 0 },
      totalUpdated: { type: Number, default: 0 },
      totalSkipped: { type: Number, default: 0 },
      totalFailed: { type: Number, default: 0 },
    },
    error: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// TTL index: auto-delete logs after 7 days
crawlLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

// Index for efficient queries
crawlLogSchema.index({ crawlConfigId: 1, createdAt: -1 });
crawlLogSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('CrawlLog', crawlLogSchema);
