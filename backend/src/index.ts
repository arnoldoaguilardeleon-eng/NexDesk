import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { pool } from "./database/pg.js";
import { connectMongo, pingMongo } from "./database/mongo.js";
import meRoutes from "./routes/me.js";
import ticketRoutes from "./routes/tickets.js";

const app = express();
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_ORIGIN }));
app.use(express.json());

app.get("/health", async (_req, res) => {
  const [pg, mongo] = await Promise.allSettled([pool.query("select 1"), pingMongo()]);
  const db = pg.status === "fulfilled" ? "up" : "down";
  const mongoStatus = mongo.status === "fulfilled" ? "up" : "down";
  const ok = db === "up" && mongoStatus === "up";
  res.status(ok ? 200 : 500).json({ ok, db, mongo: mongoStatus });
});

app.use(meRoutes);
app.use(ticketRoutes);

async function start() {
  await connectMongo();
  app.listen(env.PORT, () => {
    console.log(`API en http://localhost:${env.PORT}`);
  });
}

start().catch((err) => {
  console.error("No se pudo iniciar:", err.message);
  process.exit(1);
});
