const mongoose = require("mongoose");

const ResumeSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  name: String,
  phone: String,
  address: String,
  objective: String,
  qualifications: String,
  experience: String,
  skills: String,
  filePath: String, // path to generated PDF on server
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Resume", ResumeSchema);
