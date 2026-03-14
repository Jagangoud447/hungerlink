const express = require('express');
const router = express.Router();
const FarmerListing = require('../models/FarmerListing');
const { auth } = require('../middleware/auth');
 
// ─── CREATE listing ───────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'Farmer') {
      return res.status(403).json({ error: 'Only farmers can create listings' });
    }
    const { product, category, quantity, pricePerKg, harvestDate, location, notes } = req.body;
    if (!product || !quantity) return res.status(400).json({ error: 'Product and quantity are required' });
 
    const listing = new FarmerListing({
      farmerId: req.user._id,
      farmerName: req.user.name,
      product,
      category: category || 'Vegetables',
      quantity: parseFloat(quantity),
      pricePerKg: parseFloat(pricePerKg) || 0,
      harvestDate: harvestDate || 'Today',
      location: location || req.user.profile?.farmLocation || '',
      notes
    });
    await listing.save();
    res.status(201).json({ message: 'Produce listed successfully', listing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
// ─── GET listings ─────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    let query = { status: 'Available' };
    if (req.user.role === 'Farmer') query.farmerId = req.user._id;
    const listings = await FarmerListing.find(query).sort({ createdAt: -1 });
    res.json({ listings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
// ─── GET orders received by farmer ───────────────────────────
router.get('/my-orders', auth, async (req, res) => {
  try {
    if (req.user.role !== 'Farmer') {
      return res.status(403).json({ error: 'Only farmers can view their orders' });
    }
    const listings = await FarmerListing.find({ farmerId: req.user._id }).sort({ createdAt: -1 });
    // Flatten all orders across all listings
    const orders = [];
    listings.forEach(listing => {
      listing.orders.forEach(order => {
        orders.push({
          _id: order._id,
          listingId: listing._id,
          product: listing.product,
          category: listing.category,
          pricePerKg: listing.pricePerKg,
          donorName: order.donorName,
          donorContact: order.donorContact,
          quantityRequested: order.quantityRequested,
          message: order.message,
          status: order.status,
          orderedAt: order.orderedAt
        });
      });
    });
    orders.sort((a, b) => new Date(b.orderedAt) - new Date(a.orderedAt));
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
// ─── REMOVE listing ───────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const listing = await FarmerListing.findOne({ _id: req.params.id, farmerId: req.user._id });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    listing.status = 'Removed';
    await listing.save();
    res.json({ message: 'Listing removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
// ─── Place order (restaurant ordering from farmer) ────────────
router.post('/:id/order', auth, async (req, res) => {
  try {
    if (req.user.role !== 'Restaurant / Food Donor') {
      return res.status(403).json({ error: 'Only restaurants can place orders' });
    }
    const listing = await FarmerListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.status !== 'Available') return res.status(400).json({ error: 'This listing is no longer available' });
 
    const { quantityRequested, message } = req.body;
 
    const newOrder = {
      donorId: req.user._id,
      donorName: req.user.name,
      donorContact: req.user.email || req.user.mobile || '',
      quantityRequested: parseFloat(quantityRequested) || listing.quantity,
      message: message || '',
      status: 'Pending'
    };
 
    listing.orders.push(newOrder);
    listing.enquiries += 1;
    await listing.save();
 
    res.json({ message: 'Order request sent to farmer successfully', listing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
// ─── Accept / Reject order (farmer action) ────────────────────
router.patch('/:listingId/order/:orderId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'Farmer') {
      return res.status(403).json({ error: 'Only farmers can update order status' });
    }
    const listing = await FarmerListing.findOne({ _id: req.params.listingId, farmerId: req.user._id });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
 
    const order = listing.orders.id(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
 
    const { status } = req.body;
    if (!['Accepted', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be Accepted or Rejected' });
    }
 
    order.status = status;
    if (status === 'Accepted') listing.status = 'Sold';
    await listing.save();
 
    res.json({ message: 'Order ' + status.toLowerCase() + ' successfully', listing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
module.exports = router;