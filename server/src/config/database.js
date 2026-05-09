const mongoose = require('mongoose');

const connectDatabase = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      'MONGODB_URI is not defined. Please set it in your .env file.\n' +
      'Copy .env.example to .env and fill in your MongoDB Atlas connection string.'
    );
  }

  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB Atlas connected successfully');
    console.log(`📦 Database: ${mongoose.connection.db.databaseName}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    throw error;
  }

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB runtime error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected');
  });
};

module.exports = { connectDatabase };
