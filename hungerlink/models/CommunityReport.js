const mongoose = require('mongoose');

const communityReportSchema = new mongoose.Schema({
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reporterName: String,
  location: { type: String, required: true },
  estimatedPeople: { type: Number, required: true },
  mealType: { type: String, enum: ['Breakfast', 'Lunch', 'Dinner', 'Snacks'], default: 'Dinner' },
  neededBy: String,
  notes: String,
  status: { type: String, enum: ['Pending', 'Assigned', 'Fulfilled', 'Cancelled'], default: 'Pending' },
  assignedVolunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CommunityReport', communityReportSchema);
