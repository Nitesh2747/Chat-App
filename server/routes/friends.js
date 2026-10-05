import express from 'express';
import mongoose from 'mongoose';
import FriendRequest from '../models/FriendRequest.js';
import User from '../models/User.js';
import requireAuth from '../middleware/requireAuth.js';
import { emitToUser } from '../index.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const accepted = await FriendRequest.find({
      status: 'accepted',
      $or: [{ from: req.user.id }, { to: req.user.id }],
    }).populate('from to', 'username');

    const friends = accepted.map((r) =>
      r.from._id.toString() === req.user.id ? r.to : r.from
    );
    res.json(friends);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.get('/requests', async (req, res) => {
  try {
    const incoming = await FriendRequest.find({ to: req.user.id, status: 'pending' })
      .populate('from', 'username');
    res.json(incoming);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.get('/requests/sent', async (req, res) => {
  try {
    const outgoing = await FriendRequest.find({ from: req.user.id, status: 'pending' }).select('to');
    res.json(outgoing.map((r) => r.to.toString()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.post('/request', async (req, res) => {
  const { userId } = req.body;
  if (!mongoose.isValidObjectId(userId) || userId === req.user.id) {
    return res.status(400).json({ error: 'Invalid user' });
  }

  try {
    const other = await User.findById(userId);
    if (!other) return res.status(404).json({ error: 'User not found' });

    const existingMine = await FriendRequest.findOne({ from: req.user.id, to: userId });
    if (existingMine) {
      return res.status(409).json({
        error: existingMine.status === 'accepted' ? 'Already friends' : 'Request already sent',
      });
    }

    const reverse = await FriendRequest.findOne({ from: userId, to: req.user.id });
    if (reverse) {
      if (reverse.status === 'accepted') return res.status(409).json({ error: 'Already friends' });
      reverse.status = 'accepted';
      await reverse.save();
      emitToUser(userId, 'friend request accepted', { by: req.user.username });
      return res.json(reverse);
    }

    const request = await FriendRequest.create({ from: req.user.id, to: userId, status: 'pending' });
    emitToUser(userId, 'friend request received', {});
    res.status(201).json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.post('/requests/:id/accept', async (req, res) => {
  try {
    const request = await FriendRequest.findOne({ _id: req.params.id, to: req.user.id, status: 'pending' });
    if (!request) return res.status(404).json({ error: 'Request not found' });

    request.status = 'accepted';
    await request.save();
    emitToUser(request.from.toString(), 'friend request accepted', { by: req.user.username });
    res.json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.post('/requests/:id/decline', async (req, res) => {
  try {
    const request = await FriendRequest.findOne({ _id: req.params.id, to: req.user.id, status: 'pending' });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    await request.deleteOne();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

export default router;