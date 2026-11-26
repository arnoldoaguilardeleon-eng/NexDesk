export type Role = "admin" | "tecnico" | "empleado";

export interface AuthContext {
  userId: string;          // users.id (PostgreSQL)
  authUserId: string;      // auth.users.id (Supabase)
  email: string;
  fullName: string;
  organizationId: string;
  role: Role;
}
