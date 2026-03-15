import { Telegraf } from "telegraf";
import type { Context } from "telegraf";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://namma-nest.vercel.app";

export function registerHistoryCommand(bot: Telegraf<Context>) {
  const showHistory = async (ctx: Context) => {
    if (!ctx.from) return;

    try {
      const res = await fetch(`${APP_URL}/api/bot/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramId: String(ctx.from.id) }),
      });

      if (!res.ok) {
        await ctx.reply("📋 No search history yet. Use /search to get started!");
        return;
      }

      const data = await res.json();
      if (!data.sessions || data.sessions.length === 0) {
        await ctx.reply("📋 No search history yet. Use /search to get started!");
        return;
      }

      let message = "📋 *Your Recent Searches*\n\n";
      for (const s of data.sessions) {
        const emoji = s.status === "completed" ? "✅" : s.status === "paid" ? "🔄" : "⏳";
        const date = new Date(s.created_at).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        message += `${emoji} *${s.location_text}*\n`;
        message += `   ${date} • ${s.listing_count || 0} results\n\n`;
      }

      await ctx.reply(message, { parse_mode: "Markdown" });
    } catch {
      await ctx.reply("Failed to load history. Please try again.");
    }
  };

  bot.command("history", showHistory);
  bot.hears("📋 History", showHistory);
}
