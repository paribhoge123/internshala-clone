const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const Subscription = require("../Model/Subscription");
const sendMail = require("../utils/mailer");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const PLANS = {
  free: { name: "Free Plan", price: 0, applicationsLimit: 1 },
  bronze: { name: "Bronze Plan", price: 100, applicationsLimit: 3 },
  silver: { name: "Silver Plan", price: 300, applicationsLimit: 5 },
  gold: { name: "Gold Plan", price: 1000, applicationsLimit: -1 },
};

// Check if current time is within payment window (10 AM - 11 AM IST)
function isWithinPaymentWindow() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  const hour = istTime.getUTCHours();
  return hour >= 10 && hour < 11;
}

// GET all plans info
router.get("/plans", (req, res) => {
  res.status(200).json(PLANS);
});

// POST create Razorpay order (time-window check happens here)
router.post("/create-order", async (req, res) => {
  const { plan, email } = req.body;

  if (!plan || !email) {
    return res.status(400).json({ error: "Plan and email are required" });
  }

  const selectedPlan = PLANS[plan];
  if (!selectedPlan) {
    return res.status(400).json({ error: "Invalid plan selected" });
  }

  // Free plan doesn't need payment
  if (selectedPlan.price === 0) {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);

    await Subscription.create({
      email,
      plan,
      price: 0,
      applicationsLimit: selectedPlan.applicationsLimit,
      status: "active",
      expiresAt: expiry,
    });

    await sendMail(
      email,
      "Subscription Confirmed - Free Plan",
      `Hello,\n\nYou have successfully subscribed to the Free Plan.\n\nPlan Details:\n- Plan: Free\n- Applications allowed: 1 per month\n- Valid for: 30 days\n\nThank you!\n- Internshala Clone Team`,
    );

    return res.status(200).json({
      success: true,
      free: true,
      message: "Free plan activated successfully. Confirmation email sent.",
    });
  }

  // Time-window check for paid plans
  if (!isWithinPaymentWindow()) {
    return res.status(403).json({
      error:
        "Payments are only allowed between 10:00 AM and 11:00 AM IST. Please try again during that window.",
    });
  }

  try {
    const order = await razorpay.orders.create({
      amount: selectedPlan.price * 100, // Razorpay uses paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    // Save pending subscription
    await Subscription.create({
      email,
      plan,
      price: selectedPlan.price,
      applicationsLimit: selectedPlan.applicationsLimit,
      razorpayOrderId: order.id,
      status: "pending",
    });

    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      planName: selectedPlan.name,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create payment order" });
  }
});

// POST verify payment + activate subscription + send invoice
router.post("/verify-payment", async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    email,
    plan,
  } = req.body;

  // Verify signature
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return res
      .status(400)
      .json({ error: "Payment verification failed. Invalid signature." });
  }

  try {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);

    const subscription = await Subscription.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        razorpayPaymentId: razorpay_payment_id,
        status: "active",
        expiresAt: expiry,
      },
      { new: true },
    );

    if (!subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    const selectedPlan = PLANS[plan];
    const limitText =
      selectedPlan.applicationsLimit === -1
        ? "Unlimited"
        : `${selectedPlan.applicationsLimit} per month`;

    // Send invoice email
    await sendMail(
      email,
      `Payment Confirmed - ${selectedPlan.name}`,
      `Hello,\n\nThank you for subscribing!\n\n--- INVOICE ---\nPlan: ${selectedPlan.name}\nAmount Paid: ₹${selectedPlan.price}\nPayment ID: ${razorpay_payment_id}\nOrder ID: ${razorpay_order_id}\nApplications Allowed: ${limitText}\nValid Until: ${expiry.toDateString()}\n---------------\n\nThank you!\n- Internshala Clone Team`,
    );

    res.status(200).json({
      success: true,
      message:
        "Payment verified and subscription activated. Invoice sent to your email.",
      subscription,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET user's active subscription
router.get("/my-plan/:email", async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      email: req.params.email,
      status: "active",
    }).sort({ createdAt: -1 });

    res.status(200).json(subscription || null);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
