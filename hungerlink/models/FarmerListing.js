const mongoose = require('mongoose');
 
const orderSchema = new mongoose.Schema({
  donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  donorName: String,
  donorContact: String,
  quantityRequested: Number,
  message: String,
  status: { type: String, enum: ['Pending', 'Accepted', 'Rejected'], default: 'Pending' },
  orderedAt: { type: Date, default: Date.now }
});
 
const farmerListingSchema = new mongoose.Schema({
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  farmerName: String,
  product: { type: String, required: true },
  category: { type: String, enum: ['Vegetables', 'Fruits', 'Grains', 'Pulses', 'Dairy'], default: 'Vegetables' },
  quantity: { type: Number, required: true },
  pricePerKg: { type: Number, default: 0 },
  harvestDate: String,
  location: String,
  notes: String,
  status: { type: String, enum: ['Available', 'Sold', 'Donated', 'Removed'], default: 'Available' },
  enquiries: { type: Number, default: 0 },
  orders: [orderSchema],
  createdAt: { type: Date, default: Date.now }
});
 
module.exports = mongoose.model('FarmerListing', farmerListingSchema);