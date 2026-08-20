const express = require("express");
const router = express.Router();
const { UAParser } = require("ua-parser-js");
const LoginHistory = require("../Model/LoginHistory");
const sendMail = require("../utils/mailer");

// simple in-memory OTP store: { email: { otp, expiresAt } }
const otpStore = {};

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

function parseDevice(userAgent) {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  const browser = result.browser.name || "Unknown";
  const os = result.os.name || "Unknown";
  const deviceType = result.device.type || "desktop"; // ua-parser leaves this undefined for desktop
  return { browser, os, deviceType };
}

// STEP 1: Called on every login attempt (Google or password, AFTER password/Google itself is verified)
router.post("/check", async (req, res) => {
  const { email, loginMethod } = req.body;
  const userAgent = req.headers["user-agent"] || "";
  const ip = getClientIp(req);
  const { browser, os, deviceType } = parseDevice(userAgent);

  try {
    // RULE 1: Mobile time-window (10 AM - 1 PM only)
    if (deviceType === "mobile") {
      const now = new Date();
      const hour = now.getHours();
      if (hour < 10 || hour >= 13) {
        await LoginHistory.create({
          email,
          loginMethod,
          browser,
          os,
          deviceType,
          ipAddress: ip,
          status: "blocked_time_window",
        });
        return res.status(403).json({
          error: "Mobile login is only allowed between 10:00 AM and 1:00 PM.",
        });
      }
    }

    // RULE 2: Chrome requires OTP verification
    if (browser.toLowerCase().includes("chrome")) {
      const otp = generateOTP();
      otpStore[email] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 }; // 5 min expiry

      await sendMail(
        email,
        "Your Login OTP",
        `Your OTP for logging in via Chrome is: ${otp}\nThis OTP is valid for 5 minutes.`
      );

      await LoginHistory.create({
        email,
        loginMethod,
        browser,
        os,
        deviceType,
        ipAddress: ip,
        status: "blocked_otp_pending",
      });

      return res.status(200).json({
        requiresOtp: true,
        message: "OTP sent to your email. Please verify to complete login.",
      });
    }

    // No special rule triggered — log as successful
    await LoginHistory.create({
      email,
      loginMethod,
      browser,
      os,
      deviceType,
      ipAddress: ip,
      status: "success",
    });

    res.status(200).json({ requiresOtp: false, success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// STEP 2: Verify OTP (only needed for Chrome logins)
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore[email];

  if (!record) {
    return res.status(400).json({ error: "No OTP request found. Please try logging in again." });
  }
  if (Date.now() > record.expiresAt) {
    delete otpStore[email];
    return res.status(400).json({ error: "OTP expired. Please try logging in again." });
  }
  if (record.otp !== otp) {
    return res.status(400).json({ error: "Incorrect OTP." });
  }

  delete otpStore[email];

  // update the most recent pending record to success
  await LoginHistory.findOneAndUpdate(
    { email, status: "blocked_otp_pending" },
    { status: "success" },
    { sort: { createdAt: -1 } }
  );

  res.status(200).json({ success: true, message: "OTP verified. Login complete." });
});

// STEP 3: Get login history for a user
router.get("/history/:email", async (req, res) => {
  try {
    const history = await LoginHistory.find({ email: req.params.email })
      .sort({ createdAt: -1 })
      .limit(20);
    res.status(200).json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;