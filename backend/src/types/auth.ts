export type Role = "admin" | "tecnico" | "empleado";

export interface AuthContext {
  userId: string;
  authUserId: string;
  email: string;
  fullName: string;
  organizationId: string;
  role: Role;
}