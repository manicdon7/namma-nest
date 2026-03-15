import { Telegraf, Markup } from "telegraf";
import type { Context } from "telegraf";
import { getSession, updateSession, clearSession } from "../middleware/session";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://namma-nest.vercel.app";

export function registerResultsScene(bot: Telegraf<Context>) {
  // Check x402 payment status
  bot.action("check_x402", async (ctx) => {
    if (!ctx.from) return;
    const session = getSession(ctx.from.id);
    if (session.step !== "paying" || !session.orderId) {
      await ctx.answerCbQuery("No active payment session");
      return;
    }

    await ctx.answerCbQuery("Checking on-chain payment...");
    await ctx.reply("🔄 Checking payment status...");

    try {
      const res = await fetch(`${APP_URL}/api/payment/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: session.orderId,
          sessionId: session.sessionId,
        }),
      });
      const data = await res.json();

      if (data.success) {
        await ctx.reply(
          `✅ *Payment Confirmed!*\n` +
            `Tx: \`${data.txHash || "confirmed"}\`\n\n` +
            `🤖 Starting AI agent...`,
          { parse_mode: "Markdown" }
        );

        updateSession(ctx.from.id, { step: "searching" });

        // Trigger agent search via API
        const searchRes = await fetch(`${APP_URL}/api/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: session.sessionId,
            location: session.location,
            latitude: session.latitude,
            longitude: session.longitude,
            type: session.propertyType || "any",
            budgetMin: session.budgetMin || 5000,
            budgetMax: session.budgetMax || 30000,
            preferences: {},
          }),
        });

        const searchData = await searchRes.json();

        if (
          !searchData.listings ||
          searchData.listings.length === 0
        ) {
          await ctx.reply(
            "😔 No listings found. Try a broader area with /search"
          );
          clearSession(ctx.from.id);
          return;
        }

        await ctx.reply(
          `🎉 *Found ${searchData.listings.length} listings!*`,
          { parse_mode: "Markdown" }
        );

        const pageSize = 5;
        for (
          let i = 0;
          i < Math.min(searchData.listings.length, pageSize);
          i++
        ) {
          const l = searchData.listings[i];
          const typeEmoji =
            l.type === "pg" ? "🛏" : l.type === "apartment" ? "🏢" : "🏠";
          const rent =
            l.rentMin && l.rentMax && l.rentMin === l.rentMax
              ? `₹${l.rentMin.toLocaleString("en-IN")}/mo`
              : l.rentMin && l.rentMax
                ? `₹${l.rentMin.toLocaleString("en-IN")} – ₹${l.rentMax.toLocaleString("en-IN")}/mo`
                : "Price on request";

          const msg = [
            `${typeEmoji} *${i + 1}. ${l.title}*`,
            `📍 ${l.address}`,
            `💰 ${rent}`,
            l.validated ? "✅ AI Validated" : "",
            l.contact ? `📞 ${l.contact}` : "",
            `🔗 [View](${l.sourceUrl})`,
          ]
            .filter(Boolean)
            .join("\n");

          await ctx.reply(msg, { parse_mode: "Markdown" });
        }

        if (searchData.listings.length > pageSize) {
          await ctx.reply(
            `Showing ${pageSize} of ${searchData.listings.length}.`,
            Markup.inlineKeyboard([
              [
                Markup.button.callback(
                  "Next →",
                  `page_${session.sessionId}_1`
                ),
              ],
            ])
          );
        }

        clearSession(ctx.from.id);
      } else if (data.pending) {
        await ctx.reply(
          `⏳ Payment not yet confirmed.\nStatus: \`${data.orderStatus}\`\n\nTap again after tx confirms:`,
          {
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard([
              [Markup.button.callback("🔄 Check Again", "check_x402")],
              [Markup.button.callback("❌ Cancel", "cancel_order")],
            ]),
          }
        );
      } else {
        await ctx.reply(
          `❌ Payment ${data.error || "failed"}. Try /search again.`
        );
        clearSession(ctx.from.id);
      }
    } catch {
      await ctx.reply(
        "⚠️ Error checking payment. Try again:",
        Markup.inlineKeyboard([
          [Markup.button.callback("🔄 Check Again", "check_x402")],
        ])
      );
    }
  });

  // Cancel order
  bot.action("cancel_order", async (ctx) => {
    if (!ctx.from) return;
    await ctx.answerCbQuery("Cancelled");
    clearSession(ctx.from.id);
    await ctx.reply(
      "🚫 Order cancelled. Use /search to start again.",
      Markup.keyboard([["🔍 Search"], ["📋 History", "ℹ️ Help"]]).resize()
    );
  });

  // Save listing
  bot.action(/^save_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery("💾 Saved to your dashboard!");
  });

  // Pagination
  bot.action(/^page_(.+)_(\d+)$/, async (ctx) => {
    const sessionId = ctx.match[1];
    const page = parseInt(ctx.match[2]);
    const pageSize = 5;

    try {
      const res = await fetch(`${APP_URL}/api/sessions/${sessionId}`);
      const data = await res.json();

      if (!data.listings) {
        await ctx.answerCbQuery("No more results");
        return;
      }

      await ctx.answerCbQuery();
      const start = page * pageSize;
      const pageListings = data.listings.slice(start, start + pageSize);

      for (let i = 0; i < pageListings.length; i++) {
        const l = pageListings[i];
        const typeEmoji =
          l.type === "pg" ? "🛏" : l.type === "apartment" ? "🏢" : "🏠";
        const rent = l.rentMin
          ? `₹${l.rentMin.toLocaleString("en-IN")}/mo`
          : "Price on request";

        const msg = [
          `${typeEmoji} *${start + i + 1}. ${l.title}*`,
          `📍 ${l.address}`,
          `💰 ${rent}`,
          l.validated ? "✅ AI Validated" : "",
        ]
          .filter(Boolean)
          .join("\n");

        await ctx.reply(msg, { parse_mode: "Markdown" });
      }

      if (start + pageSize < data.listings.length) {
        await ctx.reply(
          `${start + 1}–${Math.min(start + pageSize, data.listings.length)} of ${data.listings.length}`,
          Markup.inlineKeyboard([
            [
              Markup.button.callback(
                "Next →",
                `page_${sessionId}_${page + 1}`
              ),
            ],
          ])
        );
      }
    } catch {
      await ctx.reply("Failed to load more results.");
    }
  });
}
