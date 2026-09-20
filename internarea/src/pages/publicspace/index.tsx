import axios from "axios";
import {
  Heart,
  MessageCircle,
  Share2,
  UserPlus,
  Users,
  Image,
  Video,
  Send,
  Trash2,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";

const API = "http://localhost:5000/api/publicspace";

const PublicSpace = () => {
  const user = useSelector(selectuser);
  const email = user?.email || "";
  const name = user?.name || "";
  const photo = user?.photo || "";

  const [posts, setPosts] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [postingLimit, setPostingLimit] = useState<any>(null);
  const [friendEmail, setFriendEmail] = useState("");
  const [friendData, setFriendData] = useState<any>(null);
  const [expandedComments, setExpandedComments] = useState<string[]>([]);
  const [comments, setComments] = useState<{ [postId: string]: any[] }>({});
  const [commentText, setCommentText] = useState<{ [postId: string]: string }>(
    {},
  );
  const [activeTab, setActiveTab] = useState<"feed" | "friends">("feed");

  useEffect(() => {
    fetchPosts();
    if (email) {
      fetchPostingLimit();
      fetchFriendData();
    }
  }, [email]);

  const fetchPosts = async () => {
    try {
      const res = await axios.get(`${API}/posts`);
      setPosts(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchPostingLimit = async () => {
    try {
      const res = await axios.get(`${API}/posting-limit/${email}`);
      setPostingLimit(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchFriendData = async () => {
    try {
      const res = await axios.get(`${API}/friends/${email}`);
      setFriendData(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handlePost = async () => {
    if (!email) {
      toast.error("Please log in to post");
      return;
    }
    if (!content && !mediaFile) {
      toast.error("Please add some text or media");
      return;
    }
    try {
      setIsPosting(true);
      const formData = new FormData();
      formData.append("email", email);
      formData.append("name", name);
      formData.append("photo", photo);
      if (content) formData.append("content", content);
      if (mediaFile) formData.append("media", mediaFile);

      await axios.post(`${API}/posts`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Post created!");
      setContent("");
      setMediaFile(null);
      fetchPosts();
      fetchPostingLimit();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to post");
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!email) {
      toast.error("Please log in to like");
      return;
    }
    try {
      const res = await axios.post(`${API}/posts/${postId}/like`, { email });
      setPosts((prev) =>
        prev.map((p) =>
          p._id === postId
            ? { ...p, likes: Array(res.data.likes).fill("") }
            : p,
        ),
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      await axios.delete(`${API}/posts/${postId}`, { data: { email } });
      toast.success("Post deleted");
      fetchPosts();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to delete");
    }
  };

  const toggleComments = async (postId: string) => {
    if (expandedComments.includes(postId)) {
      setExpandedComments((prev) => prev.filter((id) => id !== postId));
    } else {
      setExpandedComments((prev) => [...prev, postId]);
      if (!comments[postId]) {
        const res = await axios.get(`${API}/posts/${postId}/comments`);
        setComments((prev) => ({ ...prev, [postId]: res.data }));
      }
    }
  };

  const handleComment = async (postId: string) => {
    const text = commentText[postId];
    if (!text || !email) return;
    try {
      const res = await axios.post(`${API}/posts/${postId}/comments`, {
        email,
        name,
        text,
      });
      setComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), res.data],
      }));
      setCommentText((prev) => ({ ...prev, [postId]: "" }));
    } catch (error) {
      console.error(error);
    }
  };

  const handleSendRequest = async () => {
    if (!friendEmail) {
      toast.error("Please enter an email");
      return;
    }
    try {
      await axios.post(`${API}/friends/request`, {
        requester: email,
        recipient: friendEmail,
      });
      toast.success("Friend request sent!");
      setFriendEmail("");
      fetchFriendData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to send request");
    }
  };

  const handleAccept = async (requester: string) => {
    try {
      await axios.post(`${API}/friends/accept`, {
        requester,
        recipient: email,
      });
      toast.success("Friend request accepted!");
      fetchFriendData();
      fetchPostingLimit();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to accept");
    }
  };

  const handleRemove = async (otherEmail: string) => {
    try {
      await axios.post(`${API}/friends/remove`, {
        requester: email,
        recipient: otherEmail,
      });
      toast.success("Friend removed");
      fetchFriendData();
      fetchPostingLimit();
    } catch (error: any) {
      toast.error("Failed to remove friend");
    }
  };

  const handleShare = (postId: string) => {
    const url = `${window.location.origin}/publicspace#${postId}`;
    navigator.clipboard.writeText(url);
    toast.success("Post link copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900">
            Public Space
          </h1>
          <p className="mt-2 text-gray-600">
            Share photos and videos with the community
          </p>
          {postingLimit && (
            <div className="mt-3 inline-block bg-blue-50 text-blue-800 px-4 py-2 rounded-full text-sm">
              Friends: {postingLimit.friendCount} | Posts today:{" "}
              {postingLimit.postsToday} |{" "}
              {postingLimit.limit === -1
                ? "Unlimited posts"
                : postingLimit.limit === 0
                  ? "Add a friend to post"
                  : `${postingLimit.limit - postingLimit.postsToday} posts remaining today`}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setActiveTab("feed")}
            className={`px-6 py-2 rounded-full font-medium text-sm ${
              activeTab === "feed"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            Feed
          </button>
          <button
            onClick={() => setActiveTab("friends")}
            className={`px-6 py-2 rounded-full font-medium text-sm flex items-center gap-2 ${
              activeTab === "friends"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            <Users className="h-4 w-4" />
            Friends
            {friendData?.pendingRequests?.length > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-1.5">
                {friendData.pendingRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* FEED TAB */}
        {activeTab === "feed" && (
          <div className="space-y-6">
            {/* Create Post */}
            {email && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-start space-x-3">
                  {photo ? (
                    <img
                      src={photo}
                      className="w-10 h-10 rounded-full"
                      alt=""
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                      {name?.[0]}
                    </div>
                  )}
                  <div className="flex-1">
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder={
                        postingLimit?.allowed === false
                          ? postingLimit.reason
                          : "What's on your mind?"
                      }
                      disabled={postingLimit?.allowed === false}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-black text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-50 disabled:text-gray-400"
                    />
                    {mediaFile && (
                      <div className="mt-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-lg inline-block">
                        📎 {mediaFile.name}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex space-x-2">
                        <label className="cursor-pointer flex items-center space-x-1 text-sm text-gray-500 hover:text-blue-600 px-3 py-1 rounded-lg hover:bg-blue-50">
                          <Image className="h-4 w-4" />
                          <span>Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              setMediaFile(e.target.files?.[0] || null)
                            }
                          />
                        </label>
                        <label className="cursor-pointer flex items-center space-x-1 text-sm text-gray-500 hover:text-blue-600 px-3 py-1 rounded-lg hover:bg-blue-50">
                          <Video className="h-4 w-4" />
                          <span>Video</span>
                          <input
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={(e) =>
                              setMediaFile(e.target.files?.[0] || null)
                            }
                          />
                        </label>
                      </div>
                      <button
                        onClick={handlePost}
                        disabled={isPosting || postingLimit?.allowed === false}
                        className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isPosting ? "Posting..." : "Post"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Posts Feed */}
            {posts.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                No posts yet. Be the first to share something!
              </div>
            ) : (
              posts.map((post) => (
                <div
                  key={post._id}
                  id={post._id}
                  className="bg-white rounded-2xl shadow-sm p-6"
                >
                  {/* Post Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {post.photo ? (
                        <img
                          src={post.photo}
                          className="w-10 h-10 rounded-full"
                          alt=""
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                          {post.name?.[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">
                          {post.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(post.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {post.email === email && (
                      <button
                        onClick={() => handleDelete(post._id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Post Content */}
                  {post.content && (
                    <p className="text-gray-800 mb-4">{post.content}</p>
                  )}

                  {/* Media */}
                  {post.mediaUrl && (
                    <div className="mb-4 rounded-xl overflow-hidden">
                      {post.mediaType === "video" ? (
                        <video
                          src={post.mediaUrl}
                          controls
                          className="w-full max-h-96 object-cover"
                        />
                      ) : (
                        <img
                          src={post.mediaUrl}
                          alt="post media"
                          className="w-full max-h-96 object-cover"
                        />
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center space-x-6 text-gray-500 border-t pt-3">
                    <button
                      onClick={() => handleLike(post._id)}
                      className={`flex items-center space-x-1 text-sm hover:text-red-500 transition-colors ${
                        post.likes?.includes(email) ? "text-red-500" : ""
                      }`}
                    >
                      <Heart
                        className="h-5 w-5"
                        fill={
                          post.likes?.includes(email) ? "currentColor" : "none"
                        }
                      />
                      <span>{post.likes?.length || 0}</span>
                    </button>
                    <button
                      onClick={() => toggleComments(post._id)}
                      className="flex items-center space-x-1 text-sm hover:text-blue-500 transition-colors"
                    >
                      <MessageCircle className="h-5 w-5" />
                      <span>{comments[post._id]?.length || 0} Comments</span>
                    </button>
                    <button
                      onClick={() => handleShare(post._id)}
                      className="flex items-center space-x-1 text-sm hover:text-green-500 transition-colors"
                    >
                      <Share2 className="h-5 w-5" />
                      <span>Share</span>
                    </button>
                  </div>

                  {/* Comments Section */}
                  {expandedComments.includes(post._id) && (
                    <div className="mt-4 space-y-3">
                      {comments[post._id]?.map((comment) => (
                        <div key={comment._id} className="flex space-x-2">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-bold flex-shrink-0">
                            {comment.name?.[0]}
                          </div>
                          <div className="bg-gray-50 rounded-lg px-3 py-2 flex-1">
                            <p className="text-xs font-semibold text-gray-700">
                              {comment.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {comment.text}
                            </p>
                          </div>
                        </div>
                      ))}
                      {email && (
                        <div className="flex space-x-2 mt-2">
                          <input
                            type="text"
                            value={commentText[post._id] || ""}
                            onChange={(e) =>
                              setCommentText((prev) => ({
                                ...prev,
                                [post._id]: e.target.value,
                              }))
                            }
                            placeholder="Write a comment..."
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-black text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleComment(post._id);
                            }}
                          />
                          <button
                            onClick={() => handleComment(post._id)}
                            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* FRIENDS TAB */}
        {activeTab === "friends" && (
          <div className="space-y-6">
            {/* Add Friend */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-600" />
                Add Friend
              </h2>
              <div className="flex space-x-3">
                <input
                  type="email"
                  value={friendEmail}
                  onChange={(e) => setFriendEmail(e.target.value)}
                  placeholder="Enter friend's email"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-black text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendRequest}
                  className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                >
                  Send Request
                </button>
              </div>
            </div>

            {/* Pending Requests */}
            {friendData?.pendingRequests?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  Pending Requests ({friendData.pendingRequests.length})
                </h2>
                <div className="space-y-3">
                  {friendData.pendingRequests.map((req: any) => (
                    <div
                      key={req._id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <p className="text-sm text-gray-700 font-medium">
                        {req.requester}
                      </p>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleAccept(req.requester)}
                          className="px-3 py-1 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRemove(req.requester)}
                          className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friends List */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                My Friends ({friendData?.friendCount || 0})
              </h2>
              {friendData?.friends?.length === 0 ? (
                <p className="text-gray-400 text-sm">
                  No friends yet. Add friends to unlock posting!
                </p>
              ) : (
                <div className="space-y-3">
                  {friendData?.friends?.map((f: any) => {
                    const otherEmail =
                      f.requester === email ? f.recipient : f.requester;
                    return (
                      <div
                        key={f._id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <p className="text-sm text-gray-700 font-medium">
                          {otherEmail}
                        </p>
                        <button
                          onClick={() => handleRemove(otherEmail)}
                          className="px-3 py-1 bg-red-100 text-red-600 text-xs rounded-lg hover:bg-red-200"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicSpace;
