const express = require('express');
const router = express.Router();
const CommunityReport = require('../models/CommunityReport');
const { auth, adminOnly } = require('../middleware/auth');

// ─── CREATE report ────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { location, estimatedPeople, mealType, neededBy, notes } = req.body;
    if (!location || !estimatedPeople) {
      return res.status(400).json({ error: 'Location and estimated people count required' });
    }
    const report = new CommunityReport({
      reportedBy: req.user._id,
      reporterName: req.user.name,
      location,
      estimatedPeople: parseInt(estimatedPeople),
      mealType: mealType || 'Dinner',
      neededBy,
      notes
    });
    await report.save();
    res.status(201).json({ message: 'Report submitted', report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET reports ──────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'Charity / Shelter') query.reportedBy = req.user._id;
    const reports = await CommunityReport.find(query).sort({ createdAt: -1 });
    res.json({ reports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Assign volunteer (admin only) ────────────────────────────
router.patch('/:id/assign', auth, adminOnly, async (req, res) => {
  try {
    const { volunteerId } = req.body;
    const report = await CommunityReport.findByIdAndUpdate(
      req.params.id,
      { status: 'Assigned', assignedVolunteer: volunteerId },
      { new: true }
    );
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json({ message: 'Volunteer assigned', report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
