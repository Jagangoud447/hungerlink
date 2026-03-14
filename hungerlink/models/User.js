const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, sparse: true, lowercase: true, trim: true },
  mobile: { type: String, sparse: true, trim: true },
  role: {
    type: String,
    required: true,
    enum: ['Restaurant / Food Donor', 'Farmer', 'Volunteer', 'Charity / Shelter', 'Administrator']
  },
  isVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpiry: { type: Date },
  // Role-specific profile data
  profile: {
    // Donor
    restaurantName: String,
    address: String,
    fssaiNumber: String,
    // Farmer
    farmName: String,
    farmLocation: String,
    // Volunteer
    reliabilityScore: { type: Number, default: 100 },
    totalDeliveries: { type: Number, default: 0 },
    totalMealsDelivered: { type: Number, default: 0 },
    // Charity
    shelterName: String,
    capacity: Number,
    registrationNumber: String
  },
  createdAt: { type: Date, default: Date.now }
});

// Hash OTP before saving
userSchema.methods.setOTP = async function(otp) {
  const salt = await bcrypt.genSalt(10);
  this.otp = await bcrypt.hash(String(otp), salt);
  this.otpExpiry = new Date(Date.now() + parseInt(process.env.OTP_EXPIRY || 300) * 1000);
};

userSchema.methods.verifyOTP = async function(otp) {
  if (!this.otp || !this.otpExpiry) return false;
  if (new Date() > this.otpExpiry) return false;
  return bcrypt.compare(String(otp), this.otp);
};

module.exports = mongoose.model('User', userSchema);
