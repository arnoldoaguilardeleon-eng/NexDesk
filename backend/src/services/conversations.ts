import { ObjectId } from "mongodb";
import { conversations, messages } from "../database/mongo.js";
import type { MessageDoc } from "../database/mongo.js";
import type { AuthContext } from "../types/auth.js";
import { ServiceError } from "./tickets.js";

export interface AddMessageInput {
  role: MessageDoc["role"];
  content: string;
  ticketId?: string;
}

function toObjectId(id: string): ObjectId {
  if (!/^[a-f0-9]{24}$/i.test(id)) throw new ServiceError(400, "Id de conversación inválido");
  return new ObjectId(id);
}

/** Busca la conversación solo si pertenece a este usuario y a esta organización. */
async function findOwnConversation(auth: AuthContext, id: string) {
  const conv = await conversations().findOne({
    _id: toObjectId(id),
    user_id: auth.userId,
    organization_id: auth.organizationId,
  });
  if (!conv) throw new ServiceError(404, "Conversación no encontrada");
  return conv;
}

export async function createConversation(auth: AuthContext, title = "Nueva conversación") {
  const now = new Date();
  const doc = {
    user_id: auth.userId,
    organization_id: auth.organizationId,
    title,
    created_at: now,
    updated_at: now,
  };
  const { insertedId } = await conversations().insertOne(doc as never);
  return { _id: insertedId, ...doc };
}

export async function addMessage(auth: AuthContext, conversationId: string, input: AddMessageInput) {
  const conv = await findOwnConversation(auth, conversationId);
  const doc = {
    conversation_id: conv._id,
    user_id: auth.userId,
    organization_id: auth.organizationId,
    ...(input.ticketId ? { ticket_id: input.ticketId } : {}),
    role: input.role,
    content: input.content,
    created_at: new Date(),
  };
  const { insertedId } = await messages().insertOne(doc as never);
  await conversations().updateOne({ _id: conv._id }, { $set: { updated_at: doc.created_at } });
  return { _id: insertedId, ...doc };
}

export async function listConversations(auth: AuthContext, limit = 20) {
  return conversations()
    .find({ user_id: auth.userId, organization_id: auth.organizationId })
    .sort({ updated_at: -1 })
    .limit(limit)
    .toArray();
}

export async function getMessages(auth: AuthContext, conversationId: string, limit = 50) {
  const conv = await findOwnConversation(auth, conversationId);
  const rows = await messages()
    .find({ conversation_id: conv._id, user_id: auth.userId, organization_id: auth.organizationId })
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();
  return rows.reverse();
}
