const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://127.0.0.1:27017/';

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Đã kết nối MongoDB — database: TreeShop');
  } catch (err) {
    console.error('Lỗi kết nối MongoDB:', err);
    process.exit(1);
  }
}

module.exports = connectDB;
