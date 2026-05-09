const express = require('express');
const Property = require('../models/Property');
const Bookmark = require('../models/Bookmark');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

/**
 * @route   GET /api/properties
 * @desc    Get paginated, filtered, sorted properties
 * @access  Private
 */
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { status: 'active' }; 

    if (req.query.province) query['address.province'] = req.query.province;
    if (req.query.district) query['address.district'] = req.query.district;
    if (req.query.ward) query['address.ward'] = req.query.ward;
    
    if (req.query.minPrice || req.query.maxPrice) {
      query.totalPrice = {};
      if (req.query.minPrice) query.totalPrice.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) query.totalPrice.$lte = Number(req.query.maxPrice);
    }
    
    if (req.query.minArea || req.query.maxArea) {
      query.area = {};
      if (req.query.minArea) query.area.$gte = Number(req.query.minArea);
      if (req.query.maxArea) query.area.$lte = Number(req.query.maxArea);
    }

    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    let sortObj = { createdAt: -1 };
    if (req.query.sort) {
      if (req.query.sort === 'price_asc') sortObj = { totalPrice: 1 };
      else if (req.query.sort === 'price_desc') sortObj = { totalPrice: -1 };
      else if (req.query.sort === 'area_desc') sortObj = { area: -1 };
      else if (req.query.sort === 'date_asc') sortObj = { createdAt: 1 };
    }

    if (req.query.goodPrice === 'true') {
      query.goodPrice = true;
    }

    const properties = await Property.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    const total = await Property.countDocuments(query);

    const propertyIds = properties.map(p => p._id);
    const bookmarks = await Bookmark.find({
      userId: req.user.id,
      propertyId: { $in: propertyIds }
    });
    
    const bookmarkedPropertyIds = new Set(bookmarks.map(b => b.propertyId.toString()));
    
    const dataWithBookmarks = properties.map(p => ({
      ...p.toObject(),
      isBookmarked: bookmarkedPropertyIds.has(p._id.toString())
    }));

    res.json({
      success: true,
      data: dataWithBookmarks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/properties/stats
 * @desc    Get property stats
 * @access  Private
 */
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await Property.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$address.province', count: { $sum: 1 }, avgPrice: { $avg: '$pricePerM2' } } },
      { $sort: { count: -1 } }
    ]);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/properties/:id
 * @desc    Get property details
 * @access  Private
 */
router.get('/:id', async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    const bookmark = await Bookmark.findOne({ userId: req.user.id, propertyId: property._id });

    res.json({ 
      success: true, 
      data: {
        ...property.toObject(),
        isBookmarked: !!bookmark
      } 
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
