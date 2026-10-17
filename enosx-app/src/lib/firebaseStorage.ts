import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import type { Conversation, Message } from "@/lib/types";
import { requireFirebase } from "@/lib/firebase";

function clean<T>(value: T): T {
  if (Array.isArray(value)) return value.map(clean) as T;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value).filter(([, child]) => child !== undefined).map(([key, child]) => [key, clean(child)]),
    ) as T;
  }
  return value;
}

function toDate(value: unknown, fallback = new Date()): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate();
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

export async function saveUserProfile(uid: string, profile: Record<string, unknown>) {
  const { db } = requireFirebase();
  const definedProfile = Object.fromEntries(Object.entries(profile).filter(([, value]) => value !== undefined));
  await setDoc(
    doc(db, "users", uid),
    { ...definedProfile, uid, updatedAt: new Date().toISOString(), serverUpdatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function loadUserProfile(uid: string): Promise<Record<string, unknown> | null> {
  const { db } = requireFirebase();
  const snapshot = await getDoc(doc(db, "users", uid));
  return snapshot.exists() ? snapshot.data() : null;
}

export async function saveConversation(uid: string, conversation: Conversation) {
  const { db } = requireFirebase();
  const chatRef = doc(db, "users", uid, "chats", conversation.id);
  await setDoc(
    chatRef,
    {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      serverUpdatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  // Store messages as individual documents rather than a growing array in one
  // chat document, avoiding Firestore's per-document size limit for long chats.
  for (let offset = 0; offset < conversation.messages.length; offset += 450) {
    const batch = writeBatch(db);
    const slice = conversation.messages.slice(offset, offset + 450);
    for (const message of slice) {
      const messageRef = doc(db, "users", uid, "chats", conversation.id, "messages", message.id);
      batch.set(messageRef, clean({ ...message, timestamp: message.timestamp.toISOString() }), { merge: true });
    }
    if (slice.length) await batch.commit();
  }
}

export async function loadConversations(uid: string): Promise<Conversation[]> {
  const { db } = requireFirebase();
  const chatsRef = collection(db, "users", uid, "chats");
  const chatSnapshots = await getDocs(query(chatsRef, orderBy("updatedAt", "desc")));
  return Promise.all(
    chatSnapshots.docs.map(async (chatSnapshot) => {
      const chat = chatSnapshot.data();
      const messageRef = collection(db, "users", uid, "chats", chatSnapshot.id, "messages");
      const messageSnapshots = await getDocs(query(messageRef, orderBy("timestamp", "asc")));
      const messages = messageSnapshots.docs.map((messageSnapshot) => {
        const data = messageSnapshot.data();
        return {
          ...data,
          id: String(data.id || messageSnapshot.id),
          timestamp: toDate(data.timestamp),
        } as unknown as Message;
      });
      return {
        id: String(chat.id || chatSnapshot.id),
        title: String(chat.title || "New Chat"),
        createdAt: toDate(chat.createdAt),
        updatedAt: toDate(chat.updatedAt),
        messages,
      };
    }),
  );
}

export async function deleteConversation(uid: string, chatId: string) {
  const { db } = requireFirebase();
  const messagesRef = collection(db, "users", uid, "chats", chatId, "messages");
  const messages = await getDocs(messagesRef);
  for (let offset = 0; offset < messages.docs.length; offset += 450) {
    const batch = writeBatch(db);
    messages.docs.slice(offset, offset + 450).forEach((message) => batch.delete(message.ref));
    await batch.commit();
  }
  await deleteDoc(doc(db, "users", uid, "chats", chatId));
}
