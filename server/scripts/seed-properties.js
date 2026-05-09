require('dotenv').config();
const mongoose = require('mongoose');
const Property = require('../src/models/Property');
const { connectDatabase } = require('../src/config/database');

const MOCK_PROPERTIES = [
  {
    address: {
      province: 'Hồ Chí Minh',
      district: 'Quận 1',
      ward: 'Phường Bến Nghé',
      street: 'Lê Thánh Tôn',
      fullAddress: 'Lê Thánh Tôn, Phường Bến Nghé, Quận 1, Hồ Chí Minh',
    },
    pricePerM2: 500,
    totalPrice: 40000,
    area: 80,
    images: ['https://via.placeholder.com/400x300?text=House+1'],
    description: 'Nhà mặt tiền Lê Thánh Tôn, nở hậu, vị trí đắc địa.',
    land: {
      actualArea: 80,
      frontWidth: 4,
      depth: 20,
      shape: 'nở hậu',
      elevation: 'bằng đường',
      slope: false,
      direction: 'Đông Nam',
    },
    building: {
      type: 'nhà nhiều tầng',
      yearBuilt: 2018,
      structure: 'BTCT',
      condition: 'ở tốt',
      floors: 4,
      rentable: true,
    },
    legal: {
      titleDeed: 'sổ hồng',
      ownerType: 'chính chủ',
      zoning: false,
      dispute: false,
      sharedAccess: false,
      constructionPermit: true,
    },
    location: {
      roadWidth: 20,
      carAccess: true,
      alleyType: 'mặt tiền',
      distanceToMainRoad: 0,
      flooding: false,
      noisy: true,
      neighborhoodQuality: 'cao cấp',
      coordinates: { lat: 10.778, lng: 106.702 },
    },
    amenities: {
      nearSchool: true,
      nearMarket: true,
      nearMetro: true,
      nearPark: true,
      negativeFactors: [],
    },
    dataCompletenessScore: 90,
    goodPrice: false,
  },
  {
    address: {
      province: 'Hồ Chí Minh',
      district: 'Quận 7',
      ward: 'Phường Tân Quy',
      street: 'Đường số 15',
      fullAddress: 'Đường số 15, Phường Tân Quy, Quận 7, Hồ Chí Minh',
    },
    pricePerM2: 120,
    totalPrice: 6000,
    area: 50,
    images: ['https://via.placeholder.com/400x300?text=House+2'],
    description: 'Nhà hẻm xe hơi, chính chủ kẹt tiền bán gấp giá hời.',
    land: {
      actualArea: 50,
      frontWidth: 5,
      depth: 10,
      shape: 'vuông đẹp',
      elevation: 'bằng đường',
      slope: false,
      direction: 'Tây Nam',
    },
    building: {
      type: 'nhà 1 tầng',
      yearBuilt: 2015,
      structure: 'BTCT',
      condition: 'xuống cấp',
      floors: 1,
      rentable: false,
    },
    legal: {
      titleDeed: 'sổ hồng',
      ownerType: 'chính chủ',
      zoning: false,
      dispute: false,
      sharedAccess: false,
      constructionPermit: true,
    },
    location: {
      roadWidth: 4,
      carAccess: true,
      alleyType: 'hẻm thông',
      distanceToMainRoad: 50,
      flooding: false,
      noisy: false,
      neighborhoodQuality: 'tốt',
      coordinates: { lat: 10.74, lng: 106.71 },
    },
    amenities: {
      nearSchool: true,
      nearMarket: true,
      nearMetro: false,
      nearPark: false,
      negativeFactors: [],
    },
    dataCompletenessScore: 85,
    goodPrice: true,
    goodPricePercent: 15,
  }
];

const seedProperties = async () => {
  try {
    console.log('🌱 Seeding properties database...');
    await connectDatabase();

    await Property.deleteMany({ sourceType: 'WEBSITE' }); 
    
    await Property.insertMany(MOCK_PROPERTIES);
    
    console.log(`✅ Seeded ${MOCK_PROPERTIES.length} properties!`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding properties failed:', error);
    process.exit(1);
  }
};

seedProperties();
