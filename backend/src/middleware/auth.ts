import type { NextFunction, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";
import { pool } from "../database/pg.js";
import type { Role } from "../types/auth.js";

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Verifica el JWT de Supabase y carga usuario, organización y rol desde PostgreSQL. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) return res.status(401).json({ error: "Falta el token de autenticación" });

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ error: "Token inválido o expirado" });

    // El rol se consulta en cada petición: nunca se confía en el token ni en el frontend.
    const { rows } = await pool.query(
      `select u.id as user_id, u.full_name, u.email, om.organization_id, om.role
         from users u
         join organization_members om on om.user_id = u.id
               where u.auth_user_id = $1
        order by om.organization_id
        limit 1`,
      [data.user.id],
    );
    if (rows.length === 0) {
      return res.status(403).json({ error: "El usuario no pertenece a ninguna organización" });
    }

    const r = rows[0];
    req.auth = {
      userId: r.user_id,
      authUserId: data.user.id,
      email: r.email,
      fullName: r.full_name,
      organizationId: r.organization_id,
      role: r.role,
    };
    next();
  } catch (err) {
    console.error("Error en requireAuth:", err);
    res.status(500).json({ error: "Error interno de autenticación" });
  }
}

/** Debe usarse después de requireAuth. */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ error: "No tienes permiso para esta operación" });
    }
    next();
  };
}
