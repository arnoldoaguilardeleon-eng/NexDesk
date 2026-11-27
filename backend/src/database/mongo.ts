import { MongoClient, ObjectId } from "mongodb";
import type { Collection, Db } from "mongodb";
import { env } from "../config/env.js";

export interface ConversationDoc {
  _id: ObjectId;
  user_id: string;
  organization_id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
}

export interface MessageDoc {
  _id: ObjectId;
  conversation_id: ObjectId;
  user_id: string;
  organization_id: string;
  ticket_id?: string;
  role: "user" | "assistant" | "tool";
  content: string;
  created_at: Date;
}

const client = new MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
let db: Db | null = null;

function getDb(): Db {
  if (!db) throw new Error("MongoDB no está conectado");
  return db;
}

export const conversations = (): Collection<ConversationDoc> => getDb().collection<ConversationDoc>("conversations");
export const messages = (): Collection<MessageDoc> => getDb().collection<MessageDoc>("messages");

/** Conecta y crea los índices (crear un índice que ya existe no hace nada). */
export async function connectMongo() {
  await client.connect();
  db = client.db(env.MONGODB_DB);

  await conversations().createIndex({ user_id: 1, organization_id: 1, updated_at: -1 });
  await messages().createIndex({ conversation_id: 1, created_at: 1 });
  await messages().createIndex({ user_id: 1, created_at: -1 });
}

export async function pingMongo() {
  await getDb().command({ ping: 1 });
}

export async function closeMongo() {
  await client.close();
  db = null;
}
