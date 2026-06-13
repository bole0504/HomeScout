const express = require('express');
const router = express.Router();
const CrawlConfig = require('../models/CrawlConfig');
const CrawlLog = require('../models/CrawlLog');
const CrawlService = require('../services/CrawlService');
const AIService = require('../services/AIService');
const DataValidator = require('../services/DataValidator');
const Deduplicator = require('../services/Deduplicator');
const SchedulerService = require('../services/SchedulerService');
const { auth } = require('../middleware/auth');
const { admin } = require('../middleware/admin');

// =================== Config CRUD ===================

/**
 * @desc    Get all crawl configurations
 * @route   GET /api/crawl/configs
 * @access  Private/Admin
 */
router.get('/configs', auth, admin, async (req, res) => {
  try {
    const configs = await CrawlConfig.find().sort({ createdAt: -1 });
    res.json(configs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @desc    Create a new crawl configuration
 * @route   POST /api/crawl/configs
 * @access  Private/Admin
 */
router.post('/configs', auth, admin, async (req, res) => {
  try {
    const config = await CrawlConfig.create(req.body);
    // Schedule the new config
    await SchedulerService.syncConfig(config._id.toString());
    res.status(201).json(config);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @desc    Update a crawl configuration
 * @route   PATCH /api/crawl/configs/:id
 * @access  Private/Admin
 */
router.patch('/configs/:id', auth, admin, async (req, res) => {
  try {
    const config = await CrawlConfig.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!config) {
      return res.status(404).json({ message: 'Config not found' });
    }
    // Re-sync scheduler when config changes (e.g. interval, isActive)
    await SchedulerService.syncConfig(config._id.toString());
    res.json(config);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @desc    Delete a crawl configuration
 * @route   DELETE /api/crawl/configs/:id
 * @access  Private/Admin
 */
router.delete('/configs/:id', auth, admin, async (req, res) => {
  try {
    const config = await CrawlConfig.findByIdAndDelete(req.params.id);
    if (!config) {
      return res.status(404).json({ message: 'Config not found' });
    }
    // Remove from scheduler
    SchedulerService.unscheduleConfig(req.params.id);
    res.json({ message: 'Config removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// =================== Run / Execution ===================

/**
 * @desc    Run a single crawl configuration and persist results
 * @route   POST /api/crawl/configs/:id/run
 * @access  Private/Admin
 */
router.post('/configs/:id/run', auth, admin, async (req, res) => {
  try {
    const result = await SchedulerService.runConfig(req.params.id, 'manual');
    res.json({
      success: true,
      stats: result.stats,
      status: result.status,
      logId: result.log._id,
    });
  } catch (error) {
    console.error('[Run Crawl] Failed:', error);
    res.status(500).json({
      success: false,
      message: 'Crawl execution failed',
      error: error.message,
    });
  }
});

/**
 * @desc    Run ALL active crawl configs sequentially
 * @route   POST /api/crawl/run-all
 * @access  Private/Admin
 */
router.post('/run-all', auth, admin, async (req, res) => {
  try {
    const results = await SchedulerService.runAll('run-all');
    const summary = results.reduce(
      (acc, r) => {
        const s = r.stats || {};
        acc.totalScraped += s.totalScraped || 0;
        acc.totalInserted += s.totalInserted || 0;
        acc.totalUpdated += s.totalUpdated || 0;
        acc.totalSkipped += s.totalSkipped || 0;
        acc.totalFailed += s.totalFailed || 0;
        return acc;
      },
      { totalScraped: 0, totalInserted: 0, totalUpdated: 0, totalSkipped: 0, totalFailed: 0 }
    );
    res.json({
      success: true,
      configsRun: results.length,
      summary,
      results: results.map((r) => ({
        configName: r.config?.name,
        status: r.status,
        stats: r.stats,
        logId: r.log?._id,
        error: r.error,
      })),
    });
  } catch (error) {
    console.error('[Run All] Failed:', error);
    res.status(500).json({
      success: false,
      message: 'Run-all execution failed',
      error: error.message,
    });
  }
});

/**
 * @desc    Get scheduler status (active task count)
 * @route   GET /api/crawl/scheduler/status
 * @access  Private/Admin
 */
router.get('/scheduler/status', auth, admin, (req, res) => {
  res.json({ success: true, ...SchedulerService.getStatus() });
});

// =================== Crawl Logs ===================

/**
 * @desc    Get crawl logs (optionally filtered by configId)
 * @route   GET /api/crawl/logs
 * @access  Private/Admin
 */
router.get('/logs', auth, admin, async (req, res) => {
  try {
    const { configId, status, limit = 50, page = 1 } = req.query;
    const query = {};
    if (configId) query.crawlConfigId = configId;
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      CrawlLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      CrawlLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      logs,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @desc    Get crawl logs for a specific config
 * @route   GET /api/crawl/logs/:configId
 * @access  Private/Admin
 */
router.get('/logs/:configId', auth, admin, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const logs = await CrawlLog.find({ crawlConfigId: req.params.configId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// =================== Test / AI ===================

/**
 * @desc    Test crawl a URL with specific selectors (preview only, no save)
 * @route   POST /api/crawl/test
 * @access  Private/Admin
 */
router.post('/test', auth, admin, async (req, res) => {
  const { url, selectors } = req.body;

  if (!url || !selectors) {
    return res.status(400).json({ message: 'URL and selectors are required' });
  }

  try {
    const data = await CrawlService.testCrawl(url, selectors);
    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Crawl test failed',
      error: error.message,
    });
  }
});

/**
 * @desc    Get suggested selectors from AI
 * @route   POST /api/crawl/ai-suggest
 * @access  Private/Admin
 */
router.post('/ai-suggest', auth, admin, async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ message: 'URL is required' });
  }

  try {
    const htmlSnippet = await CrawlService.getDOMSnippet(url);
    const suggestions = await AIService.suggestSelectors(htmlSnippet);

    res.json({
      success: true,
      suggestions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'AI Suggestion failed',
      error: error.message,
    });
  }
});

module.exports = router;
