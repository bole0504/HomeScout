const { ROLES } = require('../config/constants');

/**
 * Check if the authenticated user has admin role
 * Must be used AFTER auth middleware
 */
const admin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required.',
    });
  }

  if (req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required.',
    });
  }

  next();
};

module.exports = { admin };
