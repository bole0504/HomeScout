const mongoose = require('mongoose');

const userPropertySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index — each user can save a property only once
userPropertySchema.index({ userId: 1, propertyId: 1 }, { unique: true });
userPropertySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('UserProperty', userPropertySchema);
