const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");
const Resume = require("../Model/Resume");
const sendMail = require("../utils/mailer");

// Simple in-memory OTP store
const otpStore = {};

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// STEP 1: Send OTP before payment
router.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const otp = generateOTP();
  otpStore[email] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 };

  try {
    await sendMail(
      email,
      "OTP for Resume Payment Verification",
      `Your OTP for resume creation payment is: ${otp}\nThis OTP is valid for 5 minutes.`,
    );
    res.status(200).json({ success: true, message: "OTP sent to your email" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// STEP 2: Verify OTP
router.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore[email];

  if (!record) {
    return res
      .status(400)
      .json({ error: "No OTP request found. Please request again." });
  }
  if (Date.now() > record.expiresAt) {
    delete otpStore[email];
    return res
      .status(400)
      .json({ error: "OTP expired. Please request again." });
  }
  if (record.otp !== otp) {
    return res.status(400).json({ error: "Incorrect OTP." });
  }

  delete otpStore[email];
  res.status(200).json({ success: true, message: "OTP verified successfully" });
});

// STEP 3: Create Razorpay order for resume (₹50)
router.post("/create-order", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const Razorpay = require("razorpay");
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount: 5000, // ₹50 in paise
      currency: "INR",
      receipt: `resume_${Date.now()}`,
    });

    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create payment order" });
  }
});

// STEP 4: Verify payment + generate PDF resume
router.post("/generate", async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    email,
    name,
    phone,
    address,
    objective,
    qualifications,
    experience,
    skills,
  } = req.body;

  // Verify Razorpay signature
  const crypto = require("crypto");
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ error: "Payment verification failed." });
  }

  try {
    // Generate PDF
    const resumesDir = path.join(__dirname, "../resumes");
    if (!fs.existsSync(resumesDir)) {
      fs.mkdirSync(resumesDir);
    }

    const fileName = `resume_${email.replace("@", "_").replace(".", "_")}_${Date.now()}.pdf`;
    const filePath = path.join(resumesDir, fileName);

    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Header
    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .fillColor("#2563eb")
      .text(name || "Your Name", { align: "center" });

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#555")
      .text(`${email}  |  ${phone || ""}  |  ${address || ""}`, {
        align: "center",
      });

    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#2563eb").stroke();
    doc.moveDown(0.5);

    // Objective
    if (objective) {
      doc
        .fontSize(13)
        .font("Helvetica-Bold")
        .fillColor("#1e3a5f")
        .text("OBJECTIVE");
      doc.moveDown(0.2);
      doc.fontSize(10).font("Helvetica").fillColor("#333").text(objective);
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#ddd").stroke();
      doc.moveDown(0.5);
    }

    // Qualifications
    if (qualifications) {
      doc
        .fontSize(13)
        .font("Helvetica-Bold")
        .fillColor("#1e3a5f")
        .text("EDUCATION & QUALIFICATIONS");
      doc.moveDown(0.2);
      doc.fontSize(10).font("Helvetica").fillColor("#333").text(qualifications);
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#ddd").stroke();
      doc.moveDown(0.5);
    }

    // Experience
    if (experience) {
      doc
        .fontSize(13)
        .font("Helvetica-Bold")
        .fillColor("#1e3a5f")
        .text("EXPERIENCE");
      doc.moveDown(0.2);
      doc.fontSize(10).font("Helvetica").fillColor("#333").text(experience);
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#ddd").stroke();
      doc.moveDown(0.5);
    }

    // Skills
    if (skills) {
      doc
        .fontSize(13)
        .font("Helvetica-Bold")
        .fillColor("#1e3a5f")
        .text("SKILLS");
      doc.moveDown(0.2);
      doc.fontSize(10).font("Helvetica").fillColor("#333").text(skills);
      doc.moveDown(0.5);
    }

    doc.end();

    // Wait for PDF to finish writing
    await new Promise((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    // Save to DB
    await Resume.create({
      email,
      name,
      phone,
      address,
      objective,
      qualifications,
      experience,
      skills,
      filePath: fileName,
    });

    // Send confirmation email
    await sendMail(
      email,
      "Your Resume Has Been Generated",
      `Hello ${name},\n\nYour professional resume has been generated and attached to your profile.\n\nPayment ID: ${razorpay_payment_id}\nAmount Paid: ₹50\n\nLog in to your profile to download your resume.\n\n- Internshala Clone Team`,
    );

    res.status(200).json({
      success: true,
      message: "Resume generated successfully. Confirmation email sent.",
      fileName,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate resume" });
  }
});

// STEP 5: Get user's resumes
router.get("/my-resumes/:email", async (req, res) => {
  try {
    const resumes = await Resume.find({ email: req.params.email }).sort({
      createdAt: -1,
    });
    res.status(200).json(resumes);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// STEP 6: Download resume PDF
router.get("/download/:fileName", (req, res) => {
  const filePath = path.join(__dirname, "../resumes", req.params.fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Resume file not found" });
  }
  res.download(filePath);
});

module.exports = router;
