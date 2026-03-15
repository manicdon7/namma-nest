/**
 * Use a Telegram AI bot as the LLM agent.
 * Send the prompt to a chat where an AI bot is present; poll for the reply.
 *
 * Setup:
 * 1. Create a group with your bot + an AI bot (e.g. @ChatGPTBot)
 * 2. Set TELEGRAM_AI_BOT_TOKEN (a bot in that group; can be same as main bot if no webhook)
 * 3. Set TELEGRAM_AI_CHAT_ID (the group chat ID, e.g. -1001234567890)
 *
 * Note: The AI bot token must NOT have a webhook set (we use getUpdates).
 * Use a separate bot for AI if your main bot uses webhook.
 */

const TELEGRAM_AI_BOT_TOKEN = process.env.TELEGRAM_AI_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_AI_CHAT_ID = process.env.TELEGRAM_AI_CHAT_ID || "";
const TELEGRAM_API = "https://api.telegram.org";

export function isTelegramAiConfigured(): boolean {
  return Boolean(TELEGRAM_AI_BOT_TOKEN && TELEGRAM_AI_CHAT_ID);
}

async function sendMessage(text: string): Promise<{ message_id: number }> {
  const res = await fetch(`${TELEGRAM_API}/bot${TELEGRAM_AI_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_AI_CHAT_ID,
      text,
      parse_mode: "HTML",
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram sendMessage failed: ${err}`);
  }

  const data = (await res.json()) as { ok?: boolean; result?: { message_id: number } };
  if (!data.ok || !data.result?.message_id) {
    throw new Error("Telegram sendMessage: no message_id");
  }
  return { message_id: data.result.message_id };
}

async function getUpdates(offset: number): Promise<TelegramUpdate[]> {
  const res = await fetch(
    `${TELEGRAM_API}/bot${TELEGRAM_AI_BOT_TOKEN}/getUpdates?offset=${offset}&timeout=5`,
    { signal: AbortSignal.timeout(15_000) }
  );

  if (!res.ok) {
    throw new Error(`Telegram getUpdates failed: ${await res.text()}`);
  }

  const data = (await res.json()) as { ok?: boolean; result?: TelegramUpdate[] };
  return data.result || [];
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; is_bot?: boolean };
    chat: { id: number };
    text?: string;
    reply_to_message?: { message_id: number };
  };
}

/**
 * Send prompt to Telegram AI chat and wait for reply (polls up to 90s).
 */
export async function callTelegramAi(prompt: string): Promise<string> {
  if (!isTelegramAiConfigured()) {
    throw new Error(
      "TELEGRAM_AI_BOT_TOKEN and TELEGRAM_AI_CHAT_ID are required. " +
        "Add your bot to a group with an AI bot (e.g. @ChatGPTBot)."
    );
  }

  const { message_id } = await sendMessage(prompt);

  const deadline = Date.now() + 90_000;
  let offset = 0;

  while (Date.now() < deadline) {
    const updates = await getUpdates(offset);

    for (const u of updates) {
      offset = Math.max(offset, u.update_id + 1);

      const msg = u.message;
      if (!msg?.text || !msg.reply_to_message) continue;
      if (msg.reply_to_message.message_id !== message_id) continue;
      // Prefer reply from a bot (the AI)
      if (msg.from?.is_bot && msg.text.trim()) {
        return msg.text.trim();
      }
    }

    // Also accept any reply to our message (in case AI bot doesn't set is_bot)
    for (const u of updates) {
      const msg = u.message;
      if (msg?.reply_to_message?.message_id === message_id && msg.text?.trim()) {
        return msg.text.trim();
      }
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  throw new Error("Telegram AI: no reply within 90 seconds");
}
