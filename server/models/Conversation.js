import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  isGroup: { type: Boolean, default: false },
  name: { type: String, trim: true, maxlength: 40 }, // groups only
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dmKey: { type: String, unique: true, sparse: true }, // DMs only
  lastMessageAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  lastMessage: {
    text: String,
    user: String,
    timestamp: Number,
    messageId: mongoose.Schema.Types.ObjectId,
    status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  },
  lastRead: { type: Map, of: Number, default: {} },
  hiddenFor: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] },
});

conversationSchema.index({ members: 1 });

export default mongoose.model('Conversation', conversationSchema);