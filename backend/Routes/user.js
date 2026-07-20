const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../Model/User");
const sendMail = require("../utils/mailer");

// Generates a random password using only uppercase and lowercase letters
function generateRandomPassword(length = 10) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// SIGNUP - creates a test user
router.post("/signup", async (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required" });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      phone,
      password: hashedPassword,
    });

    await newUser.save();
    res.status(201).json({ success: true, message: "User created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// FORGOT PASSWORD
router.post("/forgot-password", async (req, res) => {
  const { identifier } = req.body; // identifier = email OR phone

  if (!identifier) {
    return res.status(400).json({ error: "Email or phone is required" });
  }

  try {
    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });

    if (!user) {
      return res.status(404).json({ error: "No user found with this email or phone" });
    }

    // Check once-per-day rule
    if (user.lastPasswordResetAt) {
      const now = new Date();
      const lastReset = new Date(user.lastPasswordResetAt);
      const hoursSinceLastReset = (now - lastReset) / (1000 * 60 * 60);

      if (hoursSinceLastReset < 24) {
        return res.status(429).json({
          error: "You can use this option only once per day.",
        });
      }
    }

    // Generate new password (letters only)
    const newPassword = generateRandomPassword(10);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.lastPasswordResetAt = new Date();
    await user.save();

    // Email the new password
    await sendMail(
      user.email,
      "Your Password Has Been Reset",
      `Hello ${user.name},\n\nYour new password is: ${newPassword}\n\nPlease log in and change it if needed.\n\n- Internshala Clone Team`
    );

    res.status(200).json({
      success: true,
      message: "A new password has been sent to your registered email.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;