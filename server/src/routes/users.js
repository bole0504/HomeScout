const express = require('express');
const Joi = require('joi');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { admin } = require('../middleware/admin');
const { ROLES } = require('../config/constants');

const router = express.Router();

// All user routes require auth and admin privileges
router.use(auth);
router.use(admin);

const userSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid(...Object.values(ROLES)).default(ROLES.USER),
  isActive: Joi.boolean().default(true),
});

const updateUserSchema = Joi.object({
  username: Joi.string().min(3).max(30),
  email: Joi.string().email(),
  password: Joi.string().min(6).allow(''),
  role: Joi.string().valid(...Object.values(ROLES)),
  isActive: Joi.boolean(),
});

/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Private/Admin
 */
router.get('/', async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: users,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/users
 * @desc    Create a user
 * @access  Private/Admin
 */
router.post('/', async (req, res, next) => {
  try {
    const { error } = userSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
      });
    }

    const { username, email, password, role, isActive } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Username or email already exists',
      });
    }

    const user = await User.create({
      username,
      email,
      password,
      role,
      isActive,
    });

    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private/Admin
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { error } = updateUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
      });
    }

    const userToUpdate = await User.findById(req.params.id);
    
    if (!userToUpdate) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }
    
    // Check if updating to an existing username/email
    if (req.body.email || req.body.username) {
      const query = [];
      if (req.body.email) query.push({ email: req.body.email.toLowerCase() });
      if (req.body.username) query.push({ username: req.body.username });
      
      const existingUser = await User.findOne({
        _id: { $ne: req.params.id },
        $or: query,
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Username or email already in use',
        });
      }
    }

    // Only update password if provided
    if (req.body.password) {
      userToUpdate.password = req.body.password;
    }

    if (req.body.username) userToUpdate.username = req.body.username;
    if (req.body.email) userToUpdate.email = req.body.email;
    if (req.body.role) userToUpdate.role = req.body.role;
    if (req.body.isActive !== undefined) userToUpdate.isActive = req.body.isActive;

    await userToUpdate.save();

    res.json({
      success: true,
      data: userToUpdate,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   PUT /api/users/:id/deactivate
 * @desc    Soft deactivate a user
 * @access  Private/Admin
 */
router.put('/:id/deactivate', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Prevent deactivating oneself
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot deactivate your own account',
      });
    }

    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
