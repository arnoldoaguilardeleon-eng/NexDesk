import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { pool } from "./database/pg.js";

const app = express();
app.use(cors({ origin: env.FRONTEND_ORIGIN }));
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await pool.query("select 1");
    res.json({ ok: true, db: "up" });
  } catch {
    res.status(500).json({ ok: false, db: "down" });
  }
});

app.listen(env.PORT, () => {
  console.log(`API en http://localhost:${env.PORT}`);
});