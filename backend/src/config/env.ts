import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  FRONTEND_ORIGIN: z.string().url(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Variables inválidas o faltantes:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;