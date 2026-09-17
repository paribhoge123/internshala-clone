const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  plan: {
    type: String,
    enum: ["free", "bronze", "silver", "gold"],
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  applicationsLimit: {
    type: Number, // -1 means unlimited
    required: true,
  },
  razorpayOrderId: {
    type: String,
  },
  razorpayPaymentId: {
    type: String,
  },
  status: {
    type: String,
    enum: ["active", "pending", "failed"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date, // 30 days from purchase
  },
});

module.exports = mongoose.model("Subscription", SubscriptionSchema);
