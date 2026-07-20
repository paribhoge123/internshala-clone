const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendMail = async (to, subject, text) => {
  try {
    await transporter.sendMail({
      from: `"Internshala Clone" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    });
    console.log("Email sent to", to);
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

module.exports = sendMail;