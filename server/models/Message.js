import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  user: { type: String, required: true },
  text: { type: String, required: true, maxlength: 5000 },
  timestamp: { type: Number, default: () => Date.now() },
  readBy: { type: [String], default: [] },
  deliveredTo: { type: [String], default: [] },
  edited: { type: Boolean, default: false },
  system: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  reactions: { type: [{ _id: false, user: String, emoji: String }], default: [] },
});

messageSchema.index({ conversation: 1, timestamp: 1 });

messageSchema.set('toJSON', {
  transform: (doc, ret) => {
    if (ret.deleted) {
      ret.text = '';
      ret.reactions = [];
      ret.replyTo = null;
    }
    return ret;
  },
});

export default mongoose.model('Message', messageSchema);