const express = require('express');
const router = express.Router();
const CrawlConfig = require('../models/CrawlConfig');
const CrawlService = require('../services/CrawlService');
const { auth } = require('../middleware/auth');
const { admin } = require('../middleware/admin');

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
    res.json({ message: 'Config removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @desc    Test crawl a URL with specific selectors
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
      error: error.message 
    });
  }
});

module.exports = router;
