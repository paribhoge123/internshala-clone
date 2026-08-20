const mongoose = require("mongoose");

const LoginHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false, // allows Google logins where we may only have email, not a Mongo _id
  },
  email: {
    type: String,
    required: true,
  },
  loginMethod: {
    type: String,
    enum: ["password", "google"],
    required: true,
  },
  browser: String,
  os: String,
  deviceType: {
    type: String, // "desktop", "mobile", "tablet"
  },
  ipAddress: String,
  status: {
    type: String,
    enum: ["success", "blocked_otp_pending", "blocked_time_window"],
    default: "success",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("LoginHistory", LoginHistorySchema);