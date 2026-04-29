import express from "express";
import upload from "../middleware/upload.js";
import axios from "axios";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

router.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const imageData = fs.readFileSync(req.file.path);

    const response = await axios.post(
      "https://api.imgur.com/3/image",
      imageData,
      {
        headers: {
          Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`,
          "Content-Type": "application/octet-stream",
        },
      }
    );

    fs.unlinkSync(req.file.path);

    res.json({ url: response.data.data.link });
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

export default router;
