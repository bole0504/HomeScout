const cron = require('node-cron');
const CrawlConfig = require('../models/CrawlConfig');
const CrawlLog = require('../models/CrawlLog');
const CrawlService = require('./CrawlService');
const DataValidator = require('./DataValidator');
const Deduplicator = require('./Deduplicator');

class SchedulerService {
  constructor() {
    // Map of configId -> cron task
    this._tasks = new Map();
    this._initialized = false;
  }

  /**
   * Initialize the scheduler on server startup.
   * Loads all active configs and schedules them.
   */
  async init() {
    if (this._initialized) return;
    this._initialized = true;

    try {
      const configs = await CrawlConfig.find({ isActive: true });
      console.log(`\n⏰ Scheduler: Initializing ${configs.length} active config(s)...`);

      for (const config of configs) {
        this.scheduleConfig(config);
      }

      console.log('✅ Scheduler ready.\n');
    } catch (err) {
      console.error('❌ Scheduler init failed:', err.message);
    }
  }

  /**
   * Schedule (or re-schedule) a single config.
   * @param {Object} config - CrawlConfig document
   */
  scheduleConfig(config) {
    // Stop existing task if any
    this.unscheduleConfig(config._id.toString());

    if (!config.isActive) return;

    const intervalMinutes = config.interval || 15;
    // Build a cron expression: run every N minutes
    // For intervals < 60 min, use */N * * * *
    // For multiples of 60, use 0 */H * * *
    let cronExpr;
    if (intervalMinutes < 60) {
      cronExpr = `*/${intervalMinutes} * * * *`;
    } else {
      const hours = Math.floor(intervalMinutes / 60);
      cronExpr = `0 */${hours} * * *`;
    }

    const task = cron.schedule(cronExpr, async () => {
      console.log(`\n⏰ [Scheduler] Auto-running config: ${config.name}`);
      await this.runConfig(config._id.toString(), 'scheduler');
    });

    this._tasks.set(config._id.toString(), task);
    console.log(`  📅 Scheduled "${config.name}" every ${intervalMinutes} min (${cronExpr})`);
  }

  /**
   * Unschedule and remove a config's cron task.
   * @param {string} configId
   */
  unscheduleConfig(configId) {
    const existing = this._tasks.get(configId);
    if (existing) {
      existing.stop();
      this._tasks.delete(configId);
    }
  }

  /**
   * Stop all scheduled tasks.
   */
  stopAll() {
    for (const [id, task] of this._tasks.entries()) {
      task.stop();
      this._tasks.delete(id);
    }
    console.log('🛑 Scheduler: all tasks stopped.');
  }

  /**
   * Run a single config: crawl → validate → dedup → persist → log.
   * @param {string} configId
   * @param {string} triggeredBy - 'scheduler' | 'manual' | 'run-all'
   * @returns {Promise<Object>} - stats and log record
   */
  async runConfig(configId, triggeredBy = 'manual') {
    const config = await CrawlConfig.findById(configId);
    if (!config) {
      throw new Error(`Config not found: ${configId}`);
    }

    const startedAt = new Date();

    // Create a log entry immediately with status 'running'
    const log = await CrawlLog.create({
      crawlConfigId: config._id,
      configName: config.name,
      configUrl: config.url,
      triggeredBy,
      startedAt,
      status: 'running',
    });

    const stats = {
      totalScraped: 0,
      totalInserted: 0,
      totalUpdated: 0,
      totalSkipped: 0,
      totalFailed: 0,
    };

    let errorMessage = '';
    let status = 'success';

    try {
      const rawItems = await CrawlService.testCrawl(config.url, config.selectors);
      stats.totalScraped = rawItems.length;

      // Process sequentially
      for (const rawItem of rawItems) {
        try {
          const validated = DataValidator.validate(rawItem);
          if (!validated) {
            stats.totalFailed++;
            continue;
          }

          const result = await Deduplicator.upsert(validated, config._id);
          if (result.action === 'inserted') stats.totalInserted++;
          else if (result.action === 'updated') stats.totalUpdated++;
          else if (result.action === 'skipped') stats.totalSkipped++;
        } catch (itemErr) {
          console.error(`[Scheduler] Item error in "${config.name}":`, itemErr.message);
          stats.totalFailed++;
        }
      }

      if (stats.totalFailed > 0 && stats.totalInserted === 0 && stats.totalUpdated === 0) {
        status = 'failed';
      } else if (stats.totalFailed > 0) {
        status = 'partial';
      }

      // Update config metadata
      config.lastCrawledAt = new Date();
      config.totalCrawled = (config.totalCrawled || 0) + stats.totalInserted;
      config.lastError = '';
      await config.save();
    } catch (err) {
      console.error(`[Scheduler] Critical failure for "${config.name}":`, err.message);
      errorMessage = err.message;
      status = 'failed';

      config.lastError = err.message;
      await config.save().catch(() => {});
    }

    const completedAt = new Date();
    const duration = completedAt - startedAt;

    // Update log with final result
    log.completedAt = completedAt;
    log.duration = duration;
    log.status = status;
    log.stats = stats;
    log.error = errorMessage;
    await log.save();

    console.log(
      `  ✅ "${config.name}" done in ${(duration / 1000).toFixed(1)}s — ` +
      `scraped:${stats.totalScraped} inserted:${stats.totalInserted} ` +
      `updated:${stats.totalUpdated} skipped:${stats.totalSkipped} failed:${stats.totalFailed}`
    );

    return { config, stats, log, status };
  }

  /**
   * Run ALL active configs sequentially.
   * @param {string} triggeredBy - 'manual' | 'run-all'
   * @returns {Promise<Array>} - array of results per config
   */
  async runAll(triggeredBy = 'run-all') {
    const configs = await CrawlConfig.find({ isActive: true });
    console.log(`\n🚀 [Scheduler] Run-All triggered: ${configs.length} config(s) to process...`);

    const results = [];
    for (const config of configs) {
      try {
        const result = await this.runConfig(config._id.toString(), triggeredBy);
        results.push(result);
      } catch (err) {
        console.error(`[Scheduler] runAll failed for "${config.name}":`, err.message);
        results.push({ config, error: err.message, status: 'failed' });
      }
    }

    console.log(`\n✅ Run-All complete. Processed ${results.length} config(s).`);
    return results;
  }

  /**
   * Re-sync scheduler after a config is added/updated/deleted.
   * Call this from API routes after any config change.
   * @param {string} configId
   */
  async syncConfig(configId) {
    try {
      const config = await CrawlConfig.findById(configId);
      if (!config || !config.isActive) {
        this.unscheduleConfig(configId);
      } else {
        this.scheduleConfig(config);
      }
    } catch (err) {
      console.error('[Scheduler] syncConfig error:', err.message);
    }
  }

  /**
   * Get status of all scheduled tasks.
   */
  getStatus() {
    return {
      activeTasks: this._tasks.size,
      configIds: Array.from(this._tasks.keys()),
    };
  }
}

// Export singleton
module.exports = new SchedulerService();
