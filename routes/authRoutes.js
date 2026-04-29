import express from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import { supabase } from "../lib/supabase.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const handleError = (res, error, message = "Something went wrong!") => {
  console.error(error);
  return res.status(500).json({ message, error: error.message });
};

const isValidUUID = (id) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

const validateUUID = (id, res) => {
  if (!isValidUUID(id)) {
    res.status(400).json({ message: "Invalid user ID" });
    return false;
  }
  return true;
};

// Map snake_case DB row → camelCase API response (matches original Mongoose shape)
function transformUser(row, following = [], followers = []) {
  return {
    _id: row.id,
    firstName: row.first_name,
    lastName: row.last_name ?? "",
    username: row.username,
    email: row.email ?? "",
    password: row.password,
    profilePicture: row.profile_picture ?? "",
    origin: row.origin ?? "",
    currentLocation: row.current_location ?? "",
    birthDate: row.birth_date ?? "",
    gender: row.gender ?? "",
    maritalStatus: row.marital_status ?? "",
    education: row.education ?? "",
    work: row.work ?? "",
    following,
    followers,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/auth/users
router.get("/users", async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from("users")
      .select(`
        *,
        following:follows!follows_follower_id_fkey(following_id),
        followers:follows!follows_following_id_fkey(follower_id)
      `);

    if (error) throw error;

    const result = users.map((u) =>
      transformUser(
        u,
        u.following?.map((f) => f.following_id) ?? [],
        u.followers?.map((f) => f.follower_id) ?? []
      )
    );

    res.status(200).json(result);
  } catch (error) {
    handleError(res, error);
  }
});

// POST /api/auth/register
router.post("/register", upload.single("image"), async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      username,
      email,
      password,
      origin,
      currentLocation,
      birthDate,
      gender,
      maritalStatus,
      education,
      occupation,
    } = req.body;

    const profilePicture = req.file
      ? `data:image/png;base64,${req.file.buffer.toString("base64")}`
      : "";

    if (!firstName || !username || !password) {
      return res
        .status(400)
        .json({ message: "First name, username, and password are required" });
    }

    const { data: existingUsername } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existingUsername) {
      return res.status(400).json({ message: "Username already taken" });
    }

    if (email) {
      const { data: existingEmail } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: newUser, error } = await supabase
      .from("users")
      .insert({
        first_name: firstName,
        last_name: lastName || "",
        username,
        email: email || null,
        password: hashedPassword,
        profile_picture: profilePicture,
        origin: origin || null,
        current_location: currentLocation || null,
        birth_date: birthDate || null,
        gender: gender || null,
        marital_status: maritalStatus || null,
        education: education || null,
        work: occupation || null,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: "Registration successful",
      user: transformUser(newUser),
    });
  } catch (error) {
    handleError(res, error);
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .maybeSingle();

    if (error) throw error;

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const [{ data: following }, { data: followers }] = await Promise.all([
      supabase.from("follows").select("following_id").eq("follower_id", user.id),
      supabase.from("follows").select("follower_id").eq("following_id", user.id),
    ]);

    res.status(200).json({
      message: "Login successful",
      user: transformUser(
        user,
        following?.map((f) => f.following_id) ?? [],
        followers?.map((f) => f.follower_id) ?? []
      ),
    });
  } catch (error) {
    handleError(res, error);
  }
});

// PUT /api/auth/:userId
router.put("/:userId", async (req, res) => {
  const { userId } = req.params;
  if (!validateUUID(userId, res)) return;

  try {
    const body = req.body;
    const fields = {};

    if (body.firstName !== undefined)       fields.first_name       = body.firstName;
    if (body.lastName !== undefined)        fields.last_name        = body.lastName;
    if (body.username !== undefined)        fields.username         = body.username;
    if (body.email !== undefined)           fields.email            = body.email || null;
    if (body.password !== undefined)        fields.password         = body.password;
    if (body.profilePicture !== undefined)  fields.profile_picture  = body.profilePicture;
    if (body.origin !== undefined)          fields.origin           = body.origin || null;
    if (body.currentLocation !== undefined) fields.current_location = body.currentLocation || null;
    if (body.birthDate !== undefined)       fields.birth_date       = body.birthDate || null;
    if (body.gender !== undefined)          fields.gender           = body.gender || null;
    if (body.maritalStatus !== undefined)   fields.marital_status   = body.maritalStatus || null;
    if (body.education !== undefined)       fields.education        = body.education || null;
    if (body.work !== undefined)            fields.work             = body.work || null;

    const { data: updatedUser, error } = await supabase
      .from("users")
      .update(fields)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    const [{ data: following }, { data: followers }] = await Promise.all([
      supabase.from("follows").select("following_id").eq("follower_id", userId),
      supabase.from("follows").select("follower_id").eq("following_id", userId),
    ]);

    res.status(200).json({
      message: "Profile updated successfully",
      user: transformUser(
        updatedUser,
        following?.map((f) => f.following_id) ?? [],
        followers?.map((f) => f.follower_id) ?? []
      ),
    });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/auth/follow
router.post("/follow", async (req, res) => {
  try {
    const { followerId, followingId } = req.body;
    if (!validateUUID(followerId, res) || !validateUUID(followingId, res)) return;

    if (followerId === followingId) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    const [{ data: followerUser }, { data: followingUser }] = await Promise.all([
      supabase.from("users").select("id").eq("id", followerId).maybeSingle(),
      supabase.from("users").select("id").eq("id", followingId).maybeSingle(),
    ]);

    if (!followerUser || !followingUser) {
      return res.status(404).json({ message: "User(s) not found" });
    }

    const { data: existing } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", followerId)
      .eq("following_id", followingId)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ message: "Already following this user" });
    }

    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: followerId, following_id: followingId });

    if (error) throw error;

    res.status(200).json({ message: "User followed successfully" });
  } catch (error) {
    handleError(res, error);
  }
});

// POST /api/auth/unfollow
router.post("/unfollow", async (req, res) => {
  try {
    const { followerId, followingId } = req.body;
    if (!validateUUID(followerId, res) || !validateUUID(followingId, res)) return;

    const [{ data: followerUser }, { data: followingUser }] = await Promise.all([
      supabase.from("users").select("id").eq("id", followerId).maybeSingle(),
      supabase.from("users").select("id").eq("id", followingId).maybeSingle(),
    ]);

    if (!followerUser || !followingUser) {
      return res.status(404).json({ message: "User(s) not found" });
    }

    const { data: existing } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", followerId)
      .eq("following_id", followingId)
      .maybeSingle();

    if (!existing) {
      return res.status(400).json({ message: "Not following this user" });
    }

    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("following_id", followingId);

    if (error) throw error;

    res.status(200).json({ message: "User unfollowed successfully" });
  } catch (error) {
    handleError(res, error);
  }
});

export default router;
