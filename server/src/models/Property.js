const mongoose = require('mongoose');
const { PROPERTY_STATUS, SOURCE_TYPES } = require('../config/constants');

const propertySchema = new mongoose.Schema(
  {
    // Required: Address
    address: {
      province: {
        type: String,
        required: [true, 'Province/City is required'],
        trim: true,
      },
      district: {
        type: String,
        required: [true, 'District is required'],
        trim: true,
      },
      ward: {
        type: String,
        trim: true,
        default: '',
      },
      street: {
        type: String,
        trim: true,
        default: '',
      },
      fullAddress: {
        type: String,
        trim: true,
        default: '',
      },
    },

    // Optional info
    phone: {
      type: String,
      trim: true,
    },
    pricePerM2: {
      type: Number, // triệu/m²
      min: 0,
    },
    totalPrice: {
      type: Number, // triệu VNĐ
      min: 0,
    },
    area: {
      type: Number, // m²
      min: 0,
    },
    images: [{
      type: String,
    }],
    description: {
      type: String,
      trim: true,
    },

    // --- Valuation Data Groups ---
    // 1. Land Info
    land: {
      actualArea: { type: Number, min: 0 },
      frontWidth: { type: Number, min: 0 },
      depth: { type: Number, min: 0 },
      shape: {
        type: String,
        enum: ['vuông đẹp', 'nở hậu', 'tóp hậu', 'tam giác', 'méo / không vuông'],
      },
      elevation: {
        type: String,
        enum: ['cao hơn đường', 'bằng đường', 'thấp hơn đường'],
      },
      slope: { type: Boolean },
      direction: {
        type: String,
        enum: ['Bắc', 'Nam', 'Đông', 'Tây', 'Đông Bắc', 'Tây Bắc', 'Đông Nam', 'Tây Nam'],
      },
    },

    // 2. Building Info
    building: {
      type: {
        type: String,
        enum: ['đất trống', 'nhà tạm', 'nhà cấp 4', 'nhà 1 tầng', 'nhà nhiều tầng'],
      },
      yearBuilt: { type: Number, min: 1900 },
      yearRenovated: { type: Number, min: 1900 },
      structure: {
        type: String,
        enum: ['tạm', 'BTCT', 'cao cấp'],
      },
      condition: {
        type: String,
        enum: ['mới', 'ở tốt', 'xuống cấp'],
      },
      floors: { type: Number, min: 0 },
      rentable: { type: Boolean },
    },

    // 3. Legal Info
    legal: {
      titleDeed: {
        type: String,
        enum: ['sổ đỏ', 'sổ hồng', 'chờ sổ', 'chưa có sổ'],
      },
      ownerType: {
        type: String,
        enum: ['chính chủ', 'môi giới', 'không rõ'],
      },
      zoning: { type: Boolean },
      dispute: { type: Boolean },
      sharedAccess: { type: Boolean },
      constructionPermit: { type: Boolean },
    },

    // 4. Location Details
    location: {
      roadWidth: { type: Number, min: 0 },
      carAccess: { type: Boolean },
      alleyType: {
        type: String,
        enum: ['mặt tiền', 'hẻm thông', 'hẻm cụt'],
      },
      distanceToMainRoad: { type: Number, min: 0 },
      flooding: { type: Boolean },
      noisy: { type: Boolean },
      neighborhoodQuality: {
        type: String,
        enum: ['cao cấp', 'tốt', 'trung bình', 'kém'],
      },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },

    // 5. Amenities
    amenities: {
      nearSchool: { type: Boolean },
      nearMarket: { type: Boolean },
      nearMetro: { type: Boolean },
      nearIndustrial: { type: Boolean },
      nearPark: { type: Boolean },
      negativeFactors: [{ type: String }],
    },

    dataCompletenessScore: {
      type: Number, // 0-100%
      default: 0,
    },

    bookmarkCount: {
      type: Number,
      default: 0,
    },

    // Calculated
    goodPrice: {
      type: Boolean,
      default: false,
    },
    goodPricePercent: {
      type: Number, // % thấp hơn trung bình
      default: 0,
    },

    // Metadata
    sourceUrl: {
      type: String,
      trim: true,
    },
    sourceType: {
      type: String,
      enum: Object.values(SOURCE_TYPES),
      default: SOURCE_TYPES.WEBSITE,
    },
    crawlConfigId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CrawlConfig',
    },
    contentHash: {
      type: String,
      unique: true,
      sparse: true, // Allow multiple null values
    },

    status: {
      type: String,
      enum: Object.values(PROPERTY_STATUS),
      default: PROPERTY_STATUS.ACTIVE,
    },
    publishedDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for querying
propertySchema.index({ 'address.province': 1, 'address.district': 1, 'address.ward': 1 });
propertySchema.index({ goodPrice: 1, createdAt: -1 });
propertySchema.index({ pricePerM2: 1 });
propertySchema.index({ totalPrice: 1 });
propertySchema.index({ status: 1 });
propertySchema.index({ createdAt: -1 });

// Text index for full-text search
propertySchema.index({
  'address.fullAddress': 'text',
  'address.street': 'text',
  description: 'text',
});

module.exports = mongoose.model('Property', propertySchema);
