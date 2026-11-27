import { pool } from "../database/pg.js";
import type { AuthContext } from "../types/auth.js";

export const PRIORITIES = ["low", "medium", "high", "critical"] as const;
export const STATUSES = ["open", "in_progress", "on_hold", "resolved", "closed"] as const;

export type Priority = (typeof PRIORITIES)[number];
export type Status = (typeof STATUSES)[number];

export interface CreateTicketInput {
  title: string;
  description: string;
  category?: string;
  priority?: Priority;
}

export interface ListTicketsFilters {
  status?: Status;
  priority?: Priority;
  limit: number;
}

/** Error con código HTTP para que las rutas respondan sin adivinar. */
export class ServiceError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const COLUMNS = `id, number, organization_id, reported_by, assigned_to,
                 title, description, category, priority, status, created_at, updated_at`;

/** Solo el empleado crea tickets. El usuario y la organización salen de la sesión, nunca del cuerpo. */
export async function createTicket(auth: AuthContext, input: CreateTicketInput) {
  if (auth.role !== "employee") {
    throw new ServiceError(403, "Solo los empleados pueden crear tickets");
  }

  const { rows } = await pool.query(
    `insert into tickets (organization_id, reported_by, title, description, category, priority)
     values ($1, $2, $3, $4, coalesce($5, 'general'), coalesce($6, 'medium'))
     returning ${COLUMNS}`,
    [
      auth.organizationId,
      auth.userId,
      input.title,
      input.description,
      input.category ?? null,
      input.priority ?? null,
    ],
  );
  return rows[0];
}

/** Condiciones de visibilidad comunes: organización + regla del rol. Se usa en listar y en detalle. */
function visibility(auth: AuthContext, params: unknown[]): string[] {
  params.push(auth.organizationId);
  const where = [`organization_id = $${params.length}`];

  if (auth.role === "employee") {
    params.push(auth.userId);
    where.push(`reported_by = $${params.length}`);
  } else if (auth.role === "technician") {
    params.push(auth.userId);
    where.push(`assigned_to = $${params.length}`);
  }
  return where;
}

/** employee = los suyos, technician = los asignados, admin = todos; siempre dentro de su organización. */
export async function listTickets(auth: AuthContext, filters: ListTicketsFilters) {
  const params: unknown[] = [];
  const where = visibility(auth, params);

  if (filters.status) {
    params.push(filters.status);
    where.push(`status = $${params.length}`);
  }
  if (filters.priority) {
    params.push(filters.priority);
    where.push(`priority = $${params.length}`);
  }

  params.push(filters.limit);
  const { rows } = await pool.query(
    `select ${COLUMNS} from tickets
      where ${where.join(" and ")}
      order by created_at desc
      limit $${params.length}`,
    params,
  );
  return rows;
}

/** Devuelve 404 tanto si no existe como si no es visible, para no revelar que existe. */
export async function getTicketById(auth: AuthContext, id: string) {
  const params: unknown[] = [];
  const where = visibility(auth, params);
  params.push(id);
  where.push(`id = $${params.length}`);

  const { rows } = await pool.query(
    `select ${COLUMNS} from tickets where ${where.join(" and ")}`,
    params,
  );
  if (rows.length === 0) throw new ServiceError(404, "Ticket no encontrado");
  return rows[0];
}
