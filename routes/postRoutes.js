import express from "express";
import multer from "multer";
import path from "path";
import { supabase } from "../lib/supabase.js";

const router = express.Router();

const handleError = (res, error, message = "Something went wrong!") => {
  console.error(error);
  return res.status(500).json({ message, error: error.message });
};

const isValidUUID = (id) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

const validateUUID = (id, res) => {
  if (!isValidUUID(id)) {
    res.status(400).json({ message: "Invalid ID" });
    return false;
  }
  return true;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}_${file.fieldname}${path.extname(file.originalname)}`),
});

const upload = multer({ storage });

// Joined select used for all post queries — matches original .populate("author","username email")
const POST_SELECT = `
  *,
  author:users!posts_author_id_fkey(id, username, email),
  likes:post_likes(user_id),
  comments(id, content, user_id)
`;

// Map snake_case DB row → camelCase API response (matches original Mongoose shape)
function transformPost(post) {
  return {
    _id: post.id,
    content: post.content,
    author: post.author
      ? { _id: post.author.id, username: post.author.username, email: post.author.email }
      : post.author_id,
    image: post.image ?? "",
    likes: post.likes?.map((l) => l.user_id) ?? [],
    comments: post.comments?.map((c) => ({
      _id: c.id,
      content: c.content,
      commentUserId: c.user_id,
    })) ?? [],
    createdAt: post.created_at,
    updatedAt: post.updated_at,
  };
}

// GET /api/posts/  — all posts newest first
router.get("/", async (req, res) => {
  try {
    const { data: posts, error } = await supabase
      .from("posts")
      .select(POST_SELECT)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.status(200).json(posts.map(transformPost));
  } catch (error) {
    handleError(res, error);
  }
});

// GET /api/posts/following/:userId  — feed from followed users
// NOTE: must be defined before /:userId to prevent param shadowing
router.get("/following/:userId", async (req, res) => {
  if (!validateUUID(req.params.userId, res)) return;
  try {
    const { data: followsData, error: followsError } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", req.params.userId);

    if (followsError) throw followsError;

    const followingIds = followsData?.map((f) => f.following_id) ?? [];
    if (followingIds.length === 0) return res.status(200).json([]);

    const { data: posts, error } = await supabase
      .from("posts")
      .select(POST_SELECT)
      .in("author_id", followingIds)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.status(200).json(posts.map(transformPost));
  } catch (error) {
    handleError(res, error);
  }
});

// GET /api/posts/:userId  — all posts by a specific user
router.get("/:userId", async (req, res) => {
  if (!validateUUID(req.params.userId, res)) return;
  try {
    const { data: posts, error } = await supabase
      .from("posts")
      .select(POST_SELECT)
      .eq("author_id", req.params.userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.status(200).json(posts.map(transformPost));
  } catch (error) {
    handleError(res, error);
  }
});

// POST /api/posts/  — create post
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { content, author } = req.body;
    if (!content || !author) {
      return res.status(400).json({ message: "Content and author are required!" });
    }

    const image = req.file ? `/uploads/${req.file.filename}` : "";

    const { data: newPost, error } = await supabase
      .from("posts")
      .insert({ content, author_id: author, image })
      .select(POST_SELECT)
      .single();

    if (error) throw error;

    res.status(201).json(transformPost(newPost));
  } catch (error) {
    handleError(res, error);
  }
});

// PUT /api/posts/:postId  — update post content/image
router.put("/:postId", async (req, res) => {
  if (!validateUUID(req.params.postId, res)) return;
  try {
    const { content, image } = req.body;

    const { data: updatedPost, error } = await supabase
      .from("posts")
      .update({ content, image })
      .eq("id", req.params.postId)
      .select(POST_SELECT)
      .single();

    if (error) throw error;
    if (!updatedPost) return res.status(404).json({ message: "Post not found" });

    res.status(200).json(transformPost(updatedPost));
  } catch (error) {
    handleError(res, error);
  }
});

// POST /api/posts/:postId/like  — toggle like
router.post("/:postId/like", async (req, res) => {
  if (!validateUUID(req.params.postId, res)) return;
  const { userId } = req.body;
  if (!validateUUID(userId, res)) return;

  try {
    const { data: post } = await supabase
      .from("posts")
      .select("id")
      .eq("id", req.params.postId)
      .maybeSingle();

    if (!post) return res.status(404).json({ message: "Post not found" });

    const { data: existingLike } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("post_id", req.params.postId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingLike) {
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", req.params.postId)
        .eq("user_id", userId);

      if (error) throw error;
      return res.status(200).json({ message: "Post unliked" });
    }

    const { error } = await supabase
      .from("post_likes")
      .insert({ post_id: req.params.postId, user_id: userId });

    if (error) throw error;
    return res.status(200).json({ message: "Post liked" });
  } catch (error) {
    handleError(res, error);
  }
});

// POST /api/posts/:postId/comment  — add comment
router.post("/:postId/comment", async (req, res) => {
  if (!validateUUID(req.params.postId, res)) return;
  const { userId, content } = req.body;
  if (!validateUUID(userId, res)) return;

  try {
    const { data: post } = await supabase
      .from("posts")
      .select("id")
      .eq("id", req.params.postId)
      .maybeSingle();

    if (!post) return res.status(404).json({ message: "Post not found" });

    const { error } = await supabase
      .from("comments")
      .insert({ post_id: req.params.postId, user_id: userId, content });

    if (error) throw error;

    res.status(200).json({ message: "Comment added" });
  } catch (error) {
    handleError(res, error);
  }
});

// DELETE /api/posts/:postId/delete  — delete post
router.delete("/:postId/delete", async (req, res) => {
  if (!validateUUID(req.params.postId, res)) return;
  try {
    const { data: post } = await supabase
      .from("posts")
      .select("id")
      .eq("id", req.params.postId)
      .maybeSingle();

    if (!post) return res.status(404).json({ message: "Post not found!" });

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", req.params.postId);

    if (error) throw error;

    res.status(202).json({ message: "Post Deleted Successfully!" });
  } catch (error) {
    handleError(res, error);
  }
});

export default router;
