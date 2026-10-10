import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 20,
  },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastSeen: { type: Date },
});

export default mongoose.model('User', userSchema);