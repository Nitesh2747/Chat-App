import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { isUserOnline } from '../index.js';
import Conversation from '../models/Conversation.js';
import FriendRequest from '../models/FriendRequest.js';
import requireAuth from '../middleware/requireAuth.js';

const router = express.Router();

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.get('/search', requireAuth, async (req, res) => {
  const q = (req.query.q || '').trim();

  if (q.length < 3) {
    return res.json([]);
  }

  try {
    const users = await User.find({
      _id: { $ne: req.user.id },
      username: { $regex: `^${escapeRegex(q)}`, $options: 'i' },
    })
      .select('username')
      .limit(10)
      .sort({ username: 1 });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Contact info: only available for accepted friends.
router.get('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid user' });
  }

  try {
    const friendship = await FriendRequest.exists({
      status: 'accepted',
      $or: [
        { from: req.user.id, to: id },
        { from: id, to: req.user.id },
      ],
    });
    if (!friendship) return res.status(403).json({ error: 'You can only view friends' });

    const user = await User.findById(id).select('username createdAt lastSeen');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const sharedGroups = await Conversation.find({
      isGroup: true,
      members: { $all: [req.user.id, id] },
      hiddenFor: { $ne: req.user.id },
    }).select('name');

    res.json({
      _id: user._id,
      username: user.username,
      createdAt: user.createdAt,
      lastSeen: user.lastSeen || null,
      online: isUserOnline(user._id.toString()),
      sharedGroups: sharedGroups.map((g) => ({ _id: g._id, name: g.name })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.delete('/me', requireAuth, async (req, res) => {
  try {
    await FriendRequest.deleteMany({ $or: [{ from: req.user.id }, { to: req.user.id }] });
    await User.findByIdAndDelete(req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

export default router;