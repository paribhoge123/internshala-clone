const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String, required: true },
  photo: { type: String }, // user's profile photo
  content: { type: String },
  mediaUrl: { type: String }, // cloudinary URL
  mediaType: { type: String, enum: ["image", "video", null] },
  likes: [{ type: String }], // array of emails who liked
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Post", PostSchema);
