import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

function createToken(user) {
  return jwt.sign(
    { id: user._id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

router.post('/signup', async (req, res) => {
  const { username, password } = req.body;

  if (!username || username.trim().length < 3 || username.trim().length > 20) {
    return res.status(400).json({ error: 'Username must be between 3-20 characters' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  } 

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ username, passwordHash });
    res.status(201).json({
      token: createToken(user),
      user: { id: user._id, username: user.username },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Username already taken' });
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username: username?.trim().toLowerCase() });
    const valid = user && (await bcrypt.compare(password, user.passwordHash));

    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    res.json({
      token: createToken(user),
      user: { id: user._id, username: user.username },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

export default router;