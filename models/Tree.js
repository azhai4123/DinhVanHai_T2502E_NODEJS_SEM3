const mongoose = require('mongoose');

const treeSchema = new mongoose.Schema(
  {
    treename: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, default: '' },
  },
  { collection: 'TreeCollection' }
);

module.exports = mongoose.model('Tree', treeSchema);
