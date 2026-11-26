import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Cualquier usuario autenticado: su perfil, organización y rol.
router.get("/me", requireAuth, (req, res) => {
  res.json(req.auth);
});

// Solo administradores: demuestra el control de roles en el backend.
router.get("/admin-only", requireAuth, requireRole("admin"), (req, res) => {
  res.json({ ok: true, message: `Hola ${req.auth!.fullName}, tienes acceso de administrador` });
});

export default router;
