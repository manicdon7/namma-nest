export interface BotSession {
  step: "idle" | "location" | "type" | "budget" | "wallet" | "paying" | "searching";
  location?: string;
  latitude?: number;
  longitude?: number;
  propertyType?: "house" | "pg" | "any";
  budgetMin?: number;
  budgetMax?: number;
  walletAddress?: string;
  sessionId?: string;
  orderId?: string;
  payToAddress?: string;
  userId?: string;
  pollCount?: number;
}

const sessions = new Map<number, BotSession>();

export function getSession(telegramId: number): BotSession {
  if (!sessions.has(telegramId)) {
    sessions.set(telegramId, { step: "idle" });
  }
  return sessions.get(telegramId)!;
}

export function updateSession(telegramId: number, updates: Partial<BotSession>) {
  const current = getSession(telegramId);
  sessions.set(telegramId, { ...current, ...updates });
}

export function clearSession(telegramId: number) {
  sessions.set(telegramId, { step: "idle" });
}

export function hasActiveSession(telegramId: number): boolean {
  const session = sessions.get(telegramId);
  return !!session && session.step !== "idle";
}
