import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { createStarterDataForUser } from "../lib/starterData.js";

const router = Router();
router.use(requireAuth);

// POST /api/admin/reset — delete all of the current user's goals/sessions/rooms
// and reinstall the starter goals. Scoped to the caller only; no one else's
// data is touched.
router.post("/reset", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // study_sessions and goal_subjects cascade from study_goals via ON DELETE CASCADE
    await client.query("DELETE FROM study_goals WHERE user_id = $1", [req.userId]);
    // Clean up any other user-scoped rows
    await client.query("DELETE FROM user_google_tokens WHERE user_id = $1", [req.userId]);
    await client.query("DELETE FROM room_members WHERE user_id = $1", [req.userId]);
    // Re-seed starter goals
    await createStarterDataForUser(client, req.userId);
    await client.query("COMMIT");
    res.json({ ok: true, message: "Account reset to starter state" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("account reset failed:", err);
    res.status(500).json({ error: "Failed to reset account" });
  } finally {
    client.release();
  }
});

export default router;
