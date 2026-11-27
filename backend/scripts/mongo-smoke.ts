import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { closeMongo, connectMongo, conversations, messages } from "../src/database/mongo.js";
import { addMessage, createConversation, getMessages, listConversations } from "../src/services/conversations.js";
import type { AuthContext } from "../src/types/auth.js";

const org = randomUUID();
const make = (organizationId: string): AuthContext => ({
  userId: randomUUID(),
  authUserId: randomUUID(),
  email: "smoke@test.com",
  fullName: "Smoke",
  organizationId,
  role: "employee",
});

async function expect404(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    console.log(`FALLA  ${label}: debió rechazarse`);
    process.exitCode = 1;
  } catch (e) {
    console.log(`OK     ${label}: ${(e as Error).message}`);
  }
}

(async () => {
  await connectMongo();
  const a = make(org);
  const otroUsuario = make(org);
  const otraOrg = { ...a, organizationId: randomUUID() };

  const conv = await createConversation(a, "Prueba de humo");
  console.log("OK     conversación creada:", String(conv._id));
  await addMessage(a, String(conv._id), { role: "user", content: "Mi correo no abre" });
  await addMessage(a, String(conv._id), { role: "assistant", content: "¿Qué error te muestra?" });

  const lista = await listConversations(a);
  console.log("OK     conversaciones del usuario:", lista.length);
  const msgs = await getMessages(a, String(conv._id));
  console.log("OK     mensajes en orden:", msgs.map((m) => m.role).join(" -> "));

  await expect404("otro usuario lee la conversación", () => getMessages(otroUsuario, String(conv._id)));
  await expect404("misma persona, otra organización", () => getMessages(otraOrg, String(conv._id)));
  await expect404("otro usuario escribe en ella", () =>
    addMessage(otroUsuario, String(conv._id), { role: "user", content: "x" }),
  );
  await expect404("id inválido", () => getMessages(a, "abc"));

  await messages().deleteMany({ conversation_id: conv._id as ObjectId });
  await conversations().deleteOne({ _id: conv._id as ObjectId });
  console.log("OK     datos de prueba eliminados");
  await closeMongo();
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
