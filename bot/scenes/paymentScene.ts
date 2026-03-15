import { Telegraf, Markup } from "telegraf";
import type { Context } from "telegraf";
import { getSession, updateSession, clearSession } from "../middleware/session";

const SEARCH_FEE = Number(process.env.SEARCH_FEE_TOKENS) || 1;

export function registerPaymentScene(bot: Telegraf<Context>) {
  bot.on("text", async (ctx, next) => {
    if (!ctx.from) return next();
    const session = getSession(ctx.from.id);
    const text = ctx.message.text.trim();

    if (text.startsWith("/") || text === "❌ Cancel" || text === "📋 History" || text === "ℹ️ Help") {
      return next();
    }

    // Location step (text input)
    if (session.step === "location") {
      updateSession(ctx.from.id, { location: text, step: "type" });

      await ctx.reply(
        `📍 Location: *${text}*\n\nWhat type of property?`,
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback("🏠 House", "type_house"),
              Markup.button.callback("🛏 PG", "type_pg"),
              Markup.button.callback("🏢 Any", "type_any"),
            ],
          ]),
        }
      );
      return;
    }

    // Budget step
    if (session.step === "budget") {
      const rangeMatch = text.match(/(\d+)\s*[-–to]+\s*(\d+)/);
      let budgetMin: number, budgetMax: number;

      if (rangeMatch) {
        budgetMin = parseInt(rangeMatch[1]);
        budgetMax = parseInt(rangeMatch[2]);
      } else {
        const num = parseInt(text.replace(/[^0-9]/g, ""));
        if (num) {
          budgetMin = Math.max(1000, num - 5000);
          budgetMax = num + 5000;
        } else {
          budgetMin = 5000;
          budgetMax = 30000;
        }
      }

      updateSession(ctx.from.id, { budgetMin, budgetMax, step: "wallet" });

      await ctx.reply(
        `💰 Budget: ₹${budgetMin.toLocaleString("en-IN")} – ₹${budgetMax.toLocaleString("en-IN")}/month\n\n` +
          `💳 Send your *GOAT wallet address* (EVM, 0x...).\n` +
          `You'll pay *${SEARCH_FEE} GOAT token(s)* on GOAT Testnet3.`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    // Wallet address step
    if (session.step === "wallet") {
      if (!/^0x[a-fA-F0-9]{40}$/.test(text)) {
        await ctx.reply(
          "❌ Invalid wallet address. Please send a valid EVM address (0x... 42 characters)."
        );
        return;
      }

      updateSession(ctx.from.id, { walletAddress: text });
      await ctx.reply("⏳ Creating x402 payment order...");

      // The actual order creation is handled by the resultsScene check_x402 flow
      // We emit a synthetic event by calling the create handler
      return next();
    }

    return next();
  });
}
