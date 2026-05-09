const express = require('express');
const UserProperty = require('../models/UserProperty');
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

    const totalUserProperties = await UserProperty.countDocuments({ userId: req.user.id });

    // Find saved properties and populate the property details
    const savedProperties = await UserProperty.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('propertyId'); 

    // Map to an array of property objects
    const properties = savedProperties
      .map(b => b.propertyId)
      .filter(p => p !== null) 
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
        total: totalUserProperties,
        pages: Math.ceil(totalUserProperties / limit) || 1
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

    const propertyExists = await Property.exists({ _id: propertyId });
    if (!propertyExists) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    try {
      const newUserProperty = await UserProperty.create({
        userId: req.user.id,
        propertyId
      });

      await Property.findByIdAndUpdate(propertyId, { $inc: { bookmarkCount: 1 } });

      return res.status(201).json({
        success: true,
        data: newUserProperty
      });
    } catch (err) {
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
 * @route   PUT /api/bookmarks/:propertyId/note
 * @desc    Update personal note for a property (auto-bookmark if not exists)
 * @access  Private
 */
router.put('/:propertyId/note', async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const { note } = req.body;

    let userProperty = await UserProperty.findOne({
      userId: req.user.id,
      propertyId
    });

    if (!userProperty) {
      // Auto-bookmark logic
      const propertyExists = await Property.exists({ _id: propertyId });
      if (!propertyExists) {
        return res.status(404).json({ success: false, error: 'Property not found' });
      }

      userProperty = await UserProperty.create({
        userId: req.user.id,
        propertyId,
        note
      });

      await Property.findByIdAndUpdate(propertyId, { $inc: { bookmarkCount: 1 } });
    } else {
      userProperty.note = note;
      await userProperty.save();
    }

    res.json({
      success: true,
      data: userProperty
    });
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

    const result = await UserProperty.findOneAndDelete({
      userId: req.user.id,
      propertyId
    });

    if (!result) {
      return res.status(404).json({ success: false, error: 'Bookmark not found' });
    }

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
