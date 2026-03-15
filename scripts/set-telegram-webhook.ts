#!/usr/bin/env npx tsx
/**
 * Set Telegram webhook for the Namma Nest bot.
 * Uses TELEGRAM_BOT_TOKEN and NEXT_PUBLIC_APP_URL from .env
 *
 * Run: npm run set-webhook
 * Or:  npx tsx scripts/set-telegram-webhook.ts
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnv(): Record<string, string> {
  const paths = [".env", ".env.local"];
  for (const p of paths) {
    const full = resolve(process.cwd(), p);
    if (existsSync(full)) {
      const content = readFileSync(full, "utf-8");
      const env: Record<string, string> = {};
      for (const line of content.split("\n")) {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
      }
      return env;
    }
  }
  return {};
}

async function main() {
  const env = loadEnv();
  const token = env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const appUrl = (env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const secret = env.TELEGRAM_WEBHOOK_SECRET || process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!token) {
    console.error("❌ TELEGRAM_BOT_TOKEN not found in .env");
    process.exit(1);
  }

  if (!appUrl) {
    console.error("❌ NEXT_PUBLIC_APP_URL not found in .env");
    process.exit(1);
  }

  const webhookUrl = `${appUrl}/api/bot/webhook`;
  const params = new URLSearchParams({ url: webhookUrl });
  if (secret) params.set("secret_token", secret);

  const apiUrl = `https://api.telegram.org/bot${token}/setWebhook?${params.toString()}`;

  console.log("Setting Telegram webhook...");
  console.log("  URL:", webhookUrl);
  if (secret) console.log("  Secret token: configured");

  const res = await fetch(apiUrl);
  const data = (await res.json()) as { ok?: boolean; description?: string; result?: boolean };

  if (data.ok) {
    console.log("✅ Webhook set successfully. Bot is connected for agent search.");
  } else {
    console.error("❌ Failed:", data.description || JSON.stringify(data));
    process.exit(1);
  }
}

main();
