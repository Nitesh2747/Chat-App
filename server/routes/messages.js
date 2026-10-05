import express from 'express';
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import requireAuth from '../middleware/requireAuth.js';

const router = express.Router();

router.get('/:conversationId', requireAuth, async (req, res) => {
  const { conversationId } = req.params;

  if (!mongoose.isValidObjectId(conversationId)) {
    return res.status(400).json({ error: 'Invalid conversation' });
  }

  try {
    const convo = await Conversation.findOne({
      _id: conversationId,
      members: req.user.id,
    });
    if (!convo) return res.status(403).json({ error: 'Not a member of this conversation' });

    const messages = await Message.find({ conversation: conversationId })
      .sort({ timestamp: 1 })
      .limit(100);
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

export default router;