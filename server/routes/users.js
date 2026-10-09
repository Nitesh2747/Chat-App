import express from 'express';
import User from '../models/User.js';
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