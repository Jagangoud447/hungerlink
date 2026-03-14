const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  donorName: String,
  donorLocation: String,
  foodType: { type: String, required: true },
  quantity: { type: Number, required: true }, // number of meals
  preparationTime: String,
  pickupDeadline: { type: String, required: true },
  packagingCondition: String,
  storageCondition: String,
  aiPriority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  aiShelfHours: Number,
  status: {
    type: String,
    enum: ['Pending', 'Volunteer Assigned', 'Picked Up', 'Delivered', 'Cancelled', 'Expired'],
    default: 'Pending'
  },
  assignedVolunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedVolunteerName: String,
  deliveredTo: String,
  mealsServed: Number,
  pickupPhoto: String,
  deliveryPhoto: String,
  safetyChecked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

donationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Donation', donationSchema);
