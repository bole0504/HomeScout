require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const { ROLES } = require('../src/config/constants');
const { connectDatabase } = require('../src/config/database');

const seedAdmin = async () => {
  try {
    console.log('🌱 Seeding database...');
    await connectDatabase();

    const adminEmail = 'admin@capnhatgia.com';
    const adminUsername = 'admin';
    
    let adminUser = await User.findOne({ email: adminEmail });
    
    if (adminUser) {
      console.log('✅ Admin user already exists. Skipping connection.');
    } else {
      adminUser = await User.create({
        username: adminUsername,
        email: adminEmail,
        password: 'Admin@123', // Hardcoded default password, should change in production
        role: ROLES.ADMIN,
        isActive: true,
      });
      console.log(`✅ Default Admin user created: ${adminEmail}`);
    }
    
    console.log('🎉 Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedAdmin();
