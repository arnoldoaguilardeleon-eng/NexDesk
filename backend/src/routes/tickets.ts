import { Router } from "express";
import type { Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { PRIORITIES, STATUSES, ServiceError, createTicket, getTicketById, listTickets } from "../services/tickets.js";

const router = Router();

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  category: z.string().trim().min(1).max(50).optional(),
  priority: z.enum(PRIORITIES).optional(),
});

const listSchema = z.object({
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

function handleError(err: unknown, res: Response) {
  if (err instanceof ServiceError) return res.status(err.status).json({ error: err.message });
  console.error("Error en tickets:", err);
  return res.status(500).json({ error: "Error interno" });
}

router.post("/tickets", requireAuth, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Datos inválidos", details: parsed.error.issues });
  }
  try {
    const ticket = await createTicket(req.auth!, parsed.data);
    res.status(201).json(ticket);
  } catch (err) {
    handleError(err, res);
  }
});

router.get("/tickets", requireAuth, async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Parámetros inválidos", details: parsed.error.issues });
  }
  try {
    const tickets = await listTickets(req.auth!, parsed.data);
    res.json(tickets);
  } catch (err) {
    handleError(err, res);
  }
});

router.get("/tickets/:id", requireAuth, async (req, res) => {
  const parsed = z.string().uuid().safeParse(req.params.id);
  if (!parsed.success) return res.status(400).json({ error: "Id de ticket inválido" });
  try {
    res.json(await getTicketById(req.auth!, parsed.data));
  } catch (err) {
    handleError(err, res);
  }
});

export default router;
