export type Role = "admin" | "technician" | "employee";

export interface AuthContext {
  userId: string;
  authUserId: string;
  email: string;
  fullName: string;
  organizationId: string;
  role: Role;
}