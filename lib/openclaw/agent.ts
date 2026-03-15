import type { SearchParams } from "@/types/search";
import type { RawListing } from "@/types/listing";
import { searchRentals } from "./search";
import { validateListings } from "./validate";

// Primary: OpenClaw API key
// Fallback: Telegram Bot Token (used when OPENCLAW_API_KEY is not set)
const OPENCLAW_API_KEY =
  process.env.OPENCLAW_API_KEY && process.env.OPENCLAW_API_KEY !== "your-openclaw-api-key"
    ? process.env.OPENCLAW_API_KEY
    : process.env.TELEGRAM_BOT_TOKEN || "";

const OPENCLAW_BASE_URL =
  process.env.OPENCLAW_BASE_URL || "https://api.openclaw.ai";

export interface OpenClawConfig {
  apiKey: string;
  baseUrl: string;
  maxIterations: number;
  tools: string[];
}

function getConfig(): OpenClawConfig {
  if (!OPENCLAW_API_KEY) {
    throw new Error(
      "No API key configured. Set OPENCLAW_API_KEY in .env or ensure TELEGRAM_BOT_TOKEN is set."
    );
  }
  return {
    apiKey: OPENCLAW_API_KEY,
    baseUrl: OPENCLAW_BASE_URL,
    maxIterations: 15,
    tools: ["web_search", "web_fetch", "validate"],
  };
}

export async function callOpenClaw(prompt: string): Promise<string> {
  const config = getConfig();

  const response = await fetch(`${config.baseUrl}/v1/agent/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      prompt,
      max_iterations: config.maxIterations,
      tools: config.tools,
      response_format: "json",
    }),
    signal: AbortSignal.timeout(120_000), // 2 min timeout
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(`OpenClaw API error (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  return data.result || data.output || data.content || JSON.stringify(data);
}

export async function runNammaNestAgent(params: SearchParams): Promise<RawListing[]> {
  const rawListings = await searchRentals(params);
  if (rawListings.length === 0) return [];

  const validatedListings = await validateListings(rawListings, params.location);
  return validatedListings;
}
