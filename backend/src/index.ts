import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { pool } from "./database/pg.js";
import meRoutes from "./routes/me.js";
import ticketRoutes from "./routes/tickets.js";

const app = express();
app.use(helmet());
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

app.use(meRoutes);
app.use(ticketRoutes);

app.listen(env.PORT, () => {
  console.log(`API en http://localhost:${env.PORT}`);
});
