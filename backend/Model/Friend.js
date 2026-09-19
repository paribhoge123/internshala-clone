const mongoose = require("mongoose");

const FriendSchema = new mongoose.Schema({
  requester: { type: String, required: true }, // email of sender
  recipient: { type: String, required: true }, // email of receiver
  status: {
    type: String,
    enum: ["pending", "accepted"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Friend", FriendSchema);
