import { Router } from "express";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from public directory
const publicPath = path.join(__dirname, "../../public");
router.use(express.static(publicPath));

// Redirect root to dashboard
router.get("/", (req, res) => {
  return res.redirect("/dashboard");
});

// Serve dashboard HTML
router.get("/dashboard", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

export default router;
