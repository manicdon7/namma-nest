import { Telegraf, Markup } from "telegraf";
import type { Context } from "telegraf";
import { updateSession, clearSession } from "../middleware/session";

export function registerSearchCommand(bot: Telegraf<Context>) {
  const startSearch = async (ctx: Context) => {
    if (!ctx.from) return;

    updateSession(ctx.from.id, { step: "location" });

    await ctx.reply(
      '📍 Share your location or type your area name.\n\nExample: "Koramangala, Bengaluru"',
      Markup.keyboard([
        [Markup.button.locationRequest("📍 Share My Location")],
        ["❌ Cancel"],
      ]).resize()
    );
  };

  bot.command("search", startSearch);
  bot.hears("🔍 Search", startSearch);

  bot.hears("❌ Cancel", async (ctx) => {
    if (!ctx.from) return;
    clearSession(ctx.from.id);
    await ctx.reply(
      "Search cancelled. Use /search to start again.",
      Markup.keyboard([["🔍 Search"], ["📋 History", "ℹ️ Help"]]).resize()
    );
  });

  bot.action(/^type_(.+)$/, async (ctx) => {
    if (!ctx.from) return;

    const type = ctx.match[1] as "house" | "pg" | "any";
    updateSession(ctx.from.id, { propertyType: type, step: "budget" });

    await ctx.answerCbQuery();
    await ctx.reply(
      '💰 What\'s your monthly budget range (INR)?\n\nType like: "5000-15000" or "20000"'
    );
  });
}
