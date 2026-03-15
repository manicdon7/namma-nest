/**
 * LLM client — uses Telegram AI bot first, then Google Gemini as fallback.
 *
 * Telegram AI: Add your bot to a group with an AI bot (e.g. @ChatGPTBot).
 * Set TELEGRAM_AI_CHAT_ID and TELEGRAM_AI_BOT_TOKEN (or TELEGRAM_BOT_TOKEN).
 *
 * Gemini fallback: Get a free key from https://aistudio.google.com/apikey
 */

import { isTelegramAiConfigured, callTelegramAi } from "./telegram-ai";

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your-gemini-api-key"
    ? process.env.GEMINI_API_KEY
    : "";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

export async function callLlm(prompt: string): Promise<string> {
  // Prefer Telegram AI bot when configured
  if (isTelegramAiConfigured()) {
    try {
      return await callTelegramAi(prompt);
    } catch (err) {
      console.warn("Telegram AI failed, falling back to Gemini:", err);
    }
  }

  if (!GEMINI_API_KEY) {
    throw new Error(
      "No AI configured. Set TELEGRAM_AI_CHAT_ID + TELEGRAM_BOT_TOKEN (bot in group with AI bot), " +
        "or GEMINI_API_KEY. For testing, set USE_MOCK_SEARCH=true."
    );
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192,
      },
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(`Gemini API error (${response.status}): ${errBody}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text =
    data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

  if (!text) {
    throw new Error("Gemini returned empty response");
  }

  return text;
}

export function isLlmConfigured(): boolean {
  return isTelegramAiConfigured() || Boolean(GEMINI_API_KEY);
}
