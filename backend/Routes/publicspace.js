const express = require("express");
const router = express.Router();
const Post = require("../Model/Post");
const Friend = require("../Model/Friend");
const Comment = require("../Model/Comment");
const { upload } = require("../utils/cloudinary");

// Helper: get accepted friend count for a user
async function getFriendCount(email) {
  const count = await Friend.countDocuments({
    $or: [{ requester: email }, { recipient: email }],
    status: "accepted",
  });
  return count;
}

// Helper: get posts made today by user
async function getPostsToday(email) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const count = await Post.countDocuments({
    email,
    createdAt: { $gte: startOfDay },
  });
  return count;
}

// Helper: check if user can post
async function canUserPost(email) {
  const friendCount = await getFriendCount(email);
  const postsToday = await getPostsToday(email);

  if (friendCount === 0) {
    return { allowed: false, reason: "You need at least 1 friend to post." };
  }
  if (friendCount === 1 && postsToday >= 1) {
    return {
      allowed: false,
      reason: "With 1 friend, you can only post once per day.",
    };
  }
  if (friendCount === 2 && postsToday >= 2) {
    return {
      allowed: false,
      reason: "With 2 friends, you can only post twice per day.",
    };
  }
  return { allowed: true };
}

// ─── POSTS ───────────────────────────────────────────────

// GET all posts (feed)
router.get("/posts", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).limit(50);
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST create a post (with optional media)
router.post("/posts", upload.single("media"), async (req, res) => {
  const { email, name, photo, content } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: "Email and name are required" });
  }
  if (!content && !req.file) {
    return res.status(400).json({ error: "Post must have text or media" });
  }

  const { allowed, reason } = await canUserPost(email);
  if (!allowed) {
    return res.status(403).json({ error: reason });
  }

  try {
    const isVideo = req.file?.mimetype?.startsWith("video/");
    const post = await Post.create({
      email,
      name,
      photo,
      content,
      mediaUrl: req.file?.path || null,
      mediaType: req.file ? (isVideo ? "video" : "image") : null,
    });
    res.status(201).json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST like/unlike a post
router.post("/posts/:id/like", async (req, res) => {
  const { email } = req.body;
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const alreadyLiked = post.likes.includes(email);
    if (alreadyLiked) {
      post.likes = post.likes.filter((e) => e !== email);
    } else {
      post.likes.push(email);
    }
    await post.save();
    res.status(200).json({ likes: post.likes.length, liked: !alreadyLiked });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE a post
router.delete("/posts/:id", async (req, res) => {
  const { email } = req.body;
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (post.email !== email) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this post" });
    }
    await Post.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── COMMENTS ────────────────────────────────────────────

// GET comments for a post
router.get("/posts/:id/comments", async (req, res) => {
  try {
    const comments = await Comment.find({ postId: req.params.id }).sort({
      createdAt: 1,
    });
    res.status(200).json(comments);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST add a comment
router.post("/posts/:id/comments", async (req, res) => {
  const { email, name, text } = req.body;
  if (!email || !name || !text) {
    return res.status(400).json({ error: "Email, name and text are required" });
  }
  try {
    const comment = await Comment.create({
      postId: req.params.id,
      email,
      name,
      text,
    });
    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── FRIENDS ─────────────────────────────────────────────

// GET friend status + count for a user
router.get("/friends/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const friends = await Friend.find({
      $or: [{ requester: email }, { recipient: email }],
      status: "accepted",
    });
    const pending = await Friend.find({
      recipient: email,
      status: "pending",
    });
    const friendCount = friends.length;
    res.status(200).json({ friendCount, friends, pendingRequests: pending });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST send friend request
router.post("/friends/request", async (req, res) => {
  const { requester, recipient } = req.body;
  if (!requester || !recipient) {
    return res
      .status(400)
      .json({ error: "Requester and recipient emails are required" });
  }
  if (requester === recipient) {
    return res
      .status(400)
      .json({ error: "You cannot add yourself as a friend" });
  }
  try {
    const existing = await Friend.findOne({
      $or: [
        { requester, recipient },
        { requester: recipient, recipient: requester },
      ],
    });
    if (existing) {
      return res.status(400).json({
        error:
          existing.status === "accepted"
            ? "You are already friends"
            : "Friend request already sent",
      });
    }
    const request = await Friend.create({ requester, recipient });
    res.status(201).json({ success: true, request });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST accept friend request
router.post("/friends/accept", async (req, res) => {
  const { requester, recipient } = req.body;
  try {
    const request = await Friend.findOneAndUpdate(
      { requester, recipient, status: "pending" },
      { status: "accepted" },
      { new: true },
    );
    if (!request) {
      return res.status(404).json({ error: "Friend request not found" });
    }
    res.status(200).json({ success: true, request });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST reject/remove friend
router.post("/friends/remove", async (req, res) => {
  const { requester, recipient } = req.body;
  try {
    await Friend.findOneAndDelete({
      $or: [
        { requester, recipient },
        { requester: recipient, recipient: requester },
      ],
    });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET posting limit info for a user
router.get("/posting-limit/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const friendCount = await getFriendCount(email);
    const postsToday = await getPostsToday(email);
    const { allowed, reason } = await canUserPost(email);

    let limit;
    if (friendCount === 0) limit = 0;
    else if (friendCount === 1) limit = 1;
    else if (friendCount === 2) limit = 2;
    else limit = -1; // unlimited

    res.status(200).json({
      friendCount,
      postsToday,
      limit,
      allowed,
      reason: reason || null,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
