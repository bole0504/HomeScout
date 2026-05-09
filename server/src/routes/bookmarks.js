const express = require('express');
const Bookmark = require('../models/Bookmark');
const Property = require('../models/Property');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Require authentication for all bookmark routes
router.use(auth);

/**
 * @route   GET /api/bookmarks
 * @desc    Get bookmarked properties for the current user
 * @access  Private
 */
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;
    const skip = (page - 1) * limit;

    const totalBookmarks = await Bookmark.countDocuments({ userId: req.user.id });

    // Find bookmarks and populate the property details
    const bookmarks = await Bookmark.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('propertyId'); // populates the full property document

    // Map bookmarks to an array of property objects
    // attaching the isBookmarked flag so the UI knows
    const properties = bookmarks
      .map(b => b.propertyId)
      .filter(p => p !== null) // Filter out any deleted properties
      .map(p => ({
        ...p.toObject(),
        isBookmarked: true
      }));

    res.json({
      success: true,
      data: properties,
      pagination: {
        page,
        limit,
        total: totalBookmarks,
        pages: Math.ceil(totalBookmarks / limit) || 1
      }
    });

  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/bookmarks
 * @desc    Bookmark a property
 * @access  Private
 */
router.post('/', async (req, res, next) => {
  try {
    const { propertyId } = req.body;

    if (!propertyId) {
      return res.status(400).json({ success: false, error: 'Property ID is required' });
    }

    // Check if the property exists
    const propertyExists = await Property.exists({ _id: propertyId });
    if (!propertyExists) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    // Try creating the bookmark, relying on the unique index to prevent duplicates
    try {
      const newBookmark = await Bookmark.create({
        userId: req.user.id,
        propertyId
      });

      // Increment property's bookmark count
      await Property.findByIdAndUpdate(propertyId, { $inc: { bookmarkCount: 1 } });

      return res.status(201).json({
        success: true,
        data: newBookmark
      });
    } catch (err) {
      // 11000 is mongodb duplicate key error
      if (err.code === 11000) {
        return res.status(400).json({ success: false, error: 'Property already bookmarked' });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

/**
 * @route   DELETE /api/bookmarks/:propertyId
 * @desc    Remove a bookmark
 * @access  Private
 */
router.delete('/:propertyId', async (req, res, next) => {
  try {
    const { propertyId } = req.params;

    const result = await Bookmark.findOneAndDelete({
      userId: req.user.id,
      propertyId
    });

    if (!result) {
      return res.status(404).json({ success: false, error: 'Bookmark not found' });
    }

    // Decrement property's bookmark count
    await Property.findByIdAndUpdate(propertyId, { $inc: { bookmarkCount: -1 } });

    res.json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
