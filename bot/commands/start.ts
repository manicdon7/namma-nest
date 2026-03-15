import { Telegraf, Markup } from "telegraf";
import type { Context } from "telegraf";

export function registerStartCommand(bot: Telegraf<Context>) {
  bot.command("start", async (ctx) => {
    const name = ctx.from?.first_name || "friend";

    await ctx.reply(
      `Welcome to Namma Nest 🏠, ${name}!\n\n` +
        "I find rental houses & PGs near your location using AI.\n" +
        "Zero brokers, zero spam.\n\n" +
        "How it works:\n" +
        "1. Share your location\n" +
        "2. Pick property type & budget\n" +
        "3. Send your wallet address\n" +
        "4. Pay GOAT tokens via x402\n" +
        "5. AI finds validated listings!\n\n" +
        "Tap 🔍 Search to begin:",
      Markup.keyboard([["🔍 Search"], ["📋 History", "ℹ️ Help"]])
        .resize()
        .oneTime()
    );
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      "🏠 *Namma Nest — How It Works*\n\n" +
        "1\\. Share your location or type an area name\n" +
        "2\\. Choose property type \\(House / PG / Any\\)\n" +
        "3\\. Set your monthly budget\n" +
        "4\\. Send your GOAT wallet address \\(0x\\.\\.\\.\\)\n" +
        "5\\. x402 creates a payment order\n" +
        "6\\. Send GOAT tokens to the provided address\n" +
        "7\\. Once confirmed on\\-chain → AI agent searches\\!\n\n" +
        "🔍 /search — Start searching\n" +
        "📋 /history — Past searches",
      { parse_mode: "MarkdownV2" }
    );
  });

  bot.hears("ℹ️ Help", async (ctx) => {
    await ctx.reply(
      "🏠 *Namma Nest — How It Works*\n\n" +
        "1. Share your location\n" +
        "2. Choose property type\n" +
        "3. Set your budget\n" +
        "4. Paste your wallet address\n" +
        "5. Pay GOAT tokens via x402\n" +
        "6. AI agent searches for rentals!\n\n" +
        "Web: https://namma-nest.vercel.app",
      { parse_mode: "Markdown" }
    );
  });
}
