const express = require('express');
const router = express.Router();
const Donation = require('../models/Donation');
const { auth } = require('../middleware/auth');

// AI shelf life estimation helper
function estimateShelfLife(foodType, storageCondition) {
  let hours = 2;
  if (storageCondition && storageCondition.toLowerCase().includes('refrigerat')) hours = 6;
  else if (storageCondition && storageCondition.toLowerCase().includes('hot')) hours = 3;
  else if (foodType && (foodType.toLowerCase().includes('biryani') || foodType.toLowerCase().includes('rice'))) hours = 2;
  else if (foodType && foodType.toLowerCase().includes('bread')) hours = 4;
  else if (foodType && foodType.toLowerCase().includes('sweet')) hours = 8;

  let priority = 'Medium';
  if (hours <= 2) priority = 'High';
  else if (hours >= 5) priority = 'Low';

  return { hours, priority };
}

// ─── CREATE donation ──────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'Restaurant / Food Donor') {
      return res.status(403).json({ error: 'Only donors can create donations' });
    }
    const { foodType, quantity, preparationTime, pickupDeadline, packagingCondition, storageCondition, location, safetyChecked } = req.body;

    if (!foodType || !quantity || !pickupDeadline) {
      return res.status(400).json({ error: 'Food type, quantity, and pickup deadline are required' });
    }
    if (!safetyChecked) {
      return res.status(400).json({ error: 'Please confirm the food safety checklist' });
    }

    const { hours, priority } = estimateShelfLife(foodType, storageCondition);

    const donation = new Donation({
      donorId: req.user._id,
      donorName: req.user.name,
      donorLocation: location || req.user.profile?.address || '',
      foodType,
      quantity: parseInt(quantity),
      preparationTime,
      pickupDeadline,
      packagingCondition,
      storageCondition,
      aiShelfHours: hours,
      aiPriority: priority,
      safetyChecked: true
    });

    await donation.save();
    res.status(201).json({ message: 'Donation created successfully', donation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET donations (role-aware) ────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    const role = req.user.role;

    if (role === 'Restaurant / Food Donor') {
      query.donorId = req.user._id;
    } else if (role === 'Volunteer') {
      query.status = { $in: ['Pending', 'Volunteer Assigned', 'Picked Up'] };
    }
    // Admins and Charities see all

    const donations = await Donation.find(query).sort({ createdAt: -1 });
    res.json({ donations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── UPDATE donation status ────────────────────────────────────
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status, mealsServed, deliveredTo } = req.body;
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ error: 'Donation not found' });

    // Volunteer accepting
    if (status === 'Volunteer Assigned') {
      if (req.user.role !== 'Volunteer') return res.status(403).json({ error: 'Only volunteers can accept tasks' });
      if (donation.assignedVolunteer) return res.status(400).json({ error: 'Task already assigned' });
      donation.assignedVolunteer = req.user._id;
      donation.assignedVolunteerName = req.user.name;
    }

    if (status === 'Delivered') {
      donation.mealsServed = mealsServed || donation.quantity;
      donation.deliveredTo = deliveredTo || '';
      // Update volunteer stats
      if (donation.assignedVolunteer) {
        const User = require('../models/User');
        await User.findByIdAndUpdate(donation.assignedVolunteer, {
          $inc: { 'profile.totalDeliveries': 1, 'profile.totalMealsDelivered': donation.quantity }
        });
      }
    }

    const validTransitions = {
      'Pending': ['Volunteer Assigned', 'Cancelled'],
      'Volunteer Assigned': ['Picked Up', 'Cancelled'],
      'Picked Up': ['Delivered'],
      'Delivered': [],
      'Cancelled': []
    };
    if (!validTransitions[donation.status]?.includes(status)) {
      return res.status(400).json({ error: 'Invalid status transition' });
    }

    donation.status = status;
    await donation.save();
    res.json({ message: 'Status updated', donation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE / Cancel donation ─────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const donation = await Donation.findOne({ _id: req.params.id, donorId: req.user._id });
    if (!donation) return res.status(404).json({ error: 'Donation not found' });
    if (donation.status !== 'Pending') return res.status(400).json({ error: 'Only pending donations can be cancelled' });
    donation.status = 'Cancelled';
    await donation.save();
    res.json({ message: 'Donation cancelled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET platform stats ────────────────────────────────────────
router.get('/stats/platform', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [deliveredToday, totalDelivered, pending] = await Promise.all([
      Donation.find({ status: 'Delivered', updatedAt: { $gte: today } }),
      Donation.find({ status: 'Delivered' }),
      Donation.countDocuments({ status: 'Pending' })
    ]);

    const mealsToday = deliveredToday.reduce((a, d) => a + d.quantity, 0);
    const totalMeals = totalDelivered.reduce((a, d) => a + d.quantity, 0);

    const User = require('../models/User');
    const [donors, volunteers, charities] = await Promise.all([
      User.countDocuments({ role: 'Restaurant / Food Donor', isVerified: true }),
      User.countDocuments({ role: 'Volunteer', isVerified: true }),
      User.countDocuments({ role: 'Charity / Shelter', isVerified: true })
    ]);

    res.json({
      mealsToday,
      totalMeals,
      wasteKgToday: Math.floor(mealsToday * 0.3),
      totalWasteKg: Math.floor(totalMeals * 0.3),
      pendingDonations: pending,
      donors,
      volunteers,
      charities,
      hotspots: 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
