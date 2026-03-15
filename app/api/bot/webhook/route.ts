import { NextRequest, NextResponse } from "next/server";
import { Telegraf, Markup } from "telegraf";
import {
  findOrCreateUser,
  createSearchSession,
  getUserSessions,
  getListingsBySession,
  saveListings,
  updateSessionStatus,
  createPayment,
  logError,
} from "@/lib/db/queries";
import { isSessionPaidOnChain } from "@/lib/payment/contract";
import { runNammaNestAgent } from "@/lib/openclaw/agent";
import { formatListingForTelegram, formatDate } from "@/lib/utils/formatter";
import { reverseGeocode } from "@/lib/utils/location";
import type { SearchParams } from "@/types/search";

// ─── Config ──────────────────────────────────────────────────

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const CONTRACT_ADDRESS = process.env.PAYMENT_CONTRACT_ADDRESS || "";
const SEARCH_FEE_WEI = process.env.SEARCH_FEE_WEI || "100000000000";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

const feeWei = BigInt(SEARCH_FEE_WEI);
const feeDisplay = (Number(feeWei) / 1e18).toFixed(7).replace(/\.?0+$/, "");

const bot = new Telegraf(BOT_TOKEN);

// ─── Session state ───────────────────────────────────────────

interface BotSession {
  step: "location" | "type" | "budget" | "paying" | "searching";
  location?: string;
  latitude?: number;
  longitude?: number;
  type?: "house" | "pg" | "any";
  budgetMin?: number;
  budgetMax?: number;
  sessionId?: string;
}

const userSessions = new Map<number, BotSession>();

// ─── /start ──────────────────────────────────────────────────

bot.command("start", async (ctx) => {
  const name = ctx.from?.first_name || "friend";
  await ctx.reply(
    `🏠 Welcome to *Namma Nest*, ${name}\\!\n\n` +
      "I find rental houses & PGs near your area using AI — zero brokers, zero spam\\.\n\n" +
      "*How it works:*\n" +
      "1\\. Share or type your location\n" +
      "2\\. Pick property type \\(House / PG / Any\\)\n" +
      "3\\. Set your monthly budget\n" +
      "4\\. Pay *0\\.0000001 BTC* via the link I send\n" +
      "5\\. AI searches multiple platforms for you\\!\n\n" +
      "Tap below to start 👇",
    {
      parse_mode: "MarkdownV2",
      ...Markup.keyboard([["🔍 Search"], ["📋 History", "ℹ️ Help"]]).resize(),
    }
  );
});

// ─── /search ─────────────────────────────────────────────────

bot.hears("🔍 Search", startSearch);
bot.command("search", startSearch);

async function startSearch(ctx: { from?: { id: number }; reply: Function }) {
  if (!ctx.from) return;
  userSessions.set(ctx.from.id, { step: "location" });
  await ctx.reply(
    "📍 Share your location or type the area name.\n\nExample: *Koramangala, Bengaluru*",
    {
      parse_mode: "Markdown",
      ...Markup.keyboard([
        [Markup.button.locationRequest("📍 Use My GPS Location")],
        ["❌ Cancel"],
      ]).resize(),
    }
  );
}

// ─── GPS location ────────────────────────────────────────────

bot.on("location", async (ctx) => {
  if (!ctx.from) return;
  const session = userSessions.get(ctx.from.id);
  if (!session || session.step !== "location") return;

  const { latitude, longitude } = ctx.message.location;
  const locationName = await reverseGeocode(latitude, longitude);

  session.latitude = latitude;
  session.longitude = longitude;
  session.location = locationName || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  session.step = "type";

  await ctx.reply(
    `📍 *${session.location}*\n\nWhat type of property are you looking for?`,
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
});

// ─── Property type ───────────────────────────────────────────

bot.action(/^type_(house|pg|any)$/, async (ctx) => {
  if (!ctx.from) return;
  const session = userSessions.get(ctx.from.id);
  if (!session || session.step !== "type") return;

  session.type = ctx.match[1] as "house" | "pg" | "any";
  session.step = "budget";

  await ctx.answerCbQuery();
  const typeLabel = session.type === "pg" ? "PG" : session.type === "house" ? "House" : "Any";
  await ctx.reply(
    `🏷 Type: *${typeLabel}*\n\n💰 What's your monthly budget in INR?\n\nExamples:\n• \`10000-20000\`\n• \`15000\` (I'll set a range)`,
    { parse_mode: "Markdown" }
  );
});

// ─── Text handler ────────────────────────────────────────────

bot.on("text", async (ctx) => {
  if (!ctx.from) return;
  const text = ctx.message.text.trim();

  if (text === "❌ Cancel") {
    userSessions.delete(ctx.from.id);
    await ctx.reply(
      "Search cancelled.",
      Markup.keyboard([["🔍 Search"], ["📋 History", "ℹ️ Help"]]).resize()
    );
    return;
  }

  if (text === "📋 History" || text === "/history") {
    return handleHistory(ctx);
  }

  if (text === "ℹ️ Help" || text === "/help") {
    return sendHelp(ctx);
  }

  const session = userSessions.get(ctx.from.id);
  if (!session) return;

  // ── Step: Location text ──────────────────────────────────
  if (session.step === "location") {
    session.location = text;
    session.step = "type";
    await ctx.reply(
      `📍 *${text}*\n\nWhat type of property?`,
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

  // ── Step: Budget ─────────────────────────────────────────
  if (session.step === "budget") {
    const range = text.match(/(\d+)\s*[-–to]+\s*(\d+)/);
    if (range) {
      session.budgetMin = parseInt(range[1]);
      session.budgetMax = parseInt(range[2]);
    } else {
      const num = parseInt(text.replace(/[^0-9]/g, ""));
      if (num > 0) {
        session.budgetMin = Math.max(1000, num - 5000);
        session.budgetMax = num + 5000;
      } else {
        session.budgetMin = 5000;
        session.budgetMax = 30000;
      }
    }

    await ctx.reply("⏳ Setting up your search session...");
    await handleCreateSession(ctx, session);
    return;
  }
});

// ─── Create search session & send payment instructions ───────

async function handleCreateSession(
  ctx: { from?: { id: number }; reply: Function },
  session: BotSession
) {
  if (!ctx.from) return;

  try {
    if (!CONTRACT_ADDRESS) {
      await ctx.reply(
        "⚠️ Payment contract not configured. Please contact support."
      );
      userSessions.delete(ctx.from.id);
      return;
    }

    const user = await findOrCreateUser({ telegramId: String(ctx.from.id) });

    const dbSession = await createSearchSession({
      userId: user._id.toString(),
      locationText: session.location || "Unknown",
      latitude: session.latitude,
      longitude: session.longitude,
      preferences: {},
    });

    session.sessionId = dbSession._id.toString();
    session.step = "paying";

    await createPayment({
      sessionId: session.sessionId,
      userId: user._id.toString(),
      amountTokens: 0.0000001,
      orderId: `contract_${session.sessionId}`,
    });

    const budgetText = `₹${session.budgetMin!.toLocaleString("en-IN")} – ₹${session.budgetMax!.toLocaleString("en-IN")}/month`;
    const payLink = `${APP_URL}/bot-pay?sid=${session.sessionId}`;

    await ctx.reply(
      `✅ *Search Session Created!*\n\n` +
        `📍 Location: ${session.location}\n` +
        `🏷 Type: ${session.type || "any"}\n` +
        `💰 Budget: ${budgetText}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `💳 *Payment Required*\n` +
        `Amount: *${feeDisplay} BTC* (GOAT Testnet3)\n\n` +
        `👇 Open the link below to pay using your wallet:`,
      { parse_mode: "Markdown" }
    );

    await ctx.reply(
      `🔗 ${payLink}\n\n` +
        `After paying, tap ✅ below to verify:`,
      Markup.inlineKeyboard([
        [Markup.button.url("💳 Open Payment Page", payLink)],
        [Markup.button.callback("✅ I've Paid — Verify Now", "check_payment")],
        [Markup.button.callback("❌ Cancel Search", "cancel_search")],
      ])
    );
  } catch (error) {
    await logError("bot_create_session", String(error), { telegramId: ctx.from.id });
    await ctx.reply("❌ Failed to create session. Please try again with /search");
    userSessions.delete(ctx.from.id);
  }
}

// ─── Check on-chain payment ───────────────────────────────────

bot.action("check_payment", async (ctx) => {
  if (!ctx.from) return;
  const session = userSessions.get(ctx.from.id);

  if (!session || session.step !== "paying" || !session.sessionId) {
    await ctx.answerCbQuery("No active payment session.");
    await ctx.reply(
      "No active session found. Use /search to start a new one.",
      Markup.keyboard([["🔍 Search"], ["📋 History", "ℹ️ Help"]]).resize()
    );
    return;
  }

  await ctx.answerCbQuery("Checking payment on-chain...");
  await ctx.reply("🔍 Verifying payment on GOAT Testnet3...");

  try {
    const paid = await isSessionPaidOnChain(session.sessionId);

    if (paid) {
      await updateSessionStatus(session.sessionId, "paid");
      session.step = "searching";

      await ctx.reply(
        `✅ *Payment Confirmed on GOAT Testnet3!*\n\n` +
          `🤖 Starting AI agent to search rentals...\n` +
          `Searching NoBroker, 99acres, MagicBricks, Housing.com...\n\n` +
          `⏱ This may take 30–60 seconds.`,
        { parse_mode: "Markdown" }
      );

      await performAgentSearch(ctx, session);
    } else {
      const payLink = `${APP_URL}/bot-pay?sid=${session.sessionId}`;
      await ctx.reply(
        "⏳ *Payment not yet confirmed.*\n\n" +
          "Please complete the payment first, then check again:",
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            [Markup.button.url("💳 Pay Now", payLink)],
            [Markup.button.callback("🔄 Check Again", "check_payment")],
            [Markup.button.callback("❌ Cancel", "cancel_search")],
          ]),
        }
      );
    }
  } catch (error) {
    await logError("bot_check_payment", String(error), {
      telegramId: ctx.from.id,
      sessionId: session.sessionId,
    });
    await ctx.reply(
      "⚠️ Error verifying payment. Please try again:",
      Markup.inlineKeyboard([
        [Markup.button.callback("🔄 Try Again", "check_payment")],
      ])
    );
  }
});

// ─── Cancel ──────────────────────────────────────────────────

bot.action("cancel_search", async (ctx) => {
  if (!ctx.from) return;
  const session = userSessions.get(ctx.from.id);
  if (session?.sessionId) {
    await updateSessionStatus(session.sessionId, "failed").catch(() => {});
  }
  userSessions.delete(ctx.from.id);
  await ctx.answerCbQuery("Cancelled.");
  await ctx.reply(
    "🚫 Search cancelled. Use /search to start again.",
    Markup.keyboard([["🔍 Search"], ["📋 History", "ℹ️ Help"]]).resize()
  );
});

// ─── Run AI agent after payment ───────────────────────────────

async function performAgentSearch(
  ctx: { from?: { id: number }; reply: Function },
  session: BotSession
) {
  if (!ctx.from || !session.sessionId) return;

  try {
    const params: SearchParams = {
      location: session.location || "Bengaluru",
      latitude: session.latitude,
      longitude: session.longitude,
      type: session.type || "any",
      budgetMin: session.budgetMin || 5000,
      budgetMax: session.budgetMax || 30000,
      preferences: {},
    };

    let rawListings;
    try {
      rawListings = await runNammaNestAgent(params);
    } catch {
      try {
        rawListings = await runNammaNestAgent(params);
      } catch (retryErr) {
        await logError("bot_agent_retry", String(retryErr), { sessionId: session.sessionId });
        await updateSessionStatus(session.sessionId, "failed");
        await ctx.reply(
          "❌ AI search failed. Your payment is confirmed and recorded on-chain.\n" +
            "Please try /search again or contact support."
        );
        userSessions.delete(ctx.from.id);
        return;
      }
    }

    if (!rawListings || rawListings.length === 0) {
      await updateSessionStatus(session.sessionId, "completed");
      await ctx.reply(
        "😔 No listings found for your search criteria.\n" +
          "Try a broader area or adjusted budget with /search"
      );
      userSessions.delete(ctx.from.id);
      return;
    }

    const savedResults = await saveListings(session.sessionId, rawListings);
    await updateSessionStatus(session.sessionId, "completed");

    await ctx.reply(
      `🎉 *Found ${savedResults.length} listing${savedResults.length !== 1 ? "s" : ""}!*\n` +
        `Showing top ${Math.min(5, savedResults.length)} results:`,
      { parse_mode: "Markdown" }
    );

    const pageSize = 5;
    for (let i = 0; i < Math.min(savedResults.length, pageSize); i++) {
      const r = savedResults[i];
      const formatted = formatListingForTelegram(
        {
          id: r._id.toString(),
          session_id: r.sessionId.toString(),
          title: r.title,
          type: r.type,
          address: r.address,
          rent_min: r.rentMin ?? null,
          rent_max: r.rentMax ?? null,
          amenities: r.amenities,
          contact: r.contact ?? null,
          source_url: r.sourceUrl,
          validated: r.validated,
          raw_data: r.rawData,
          created_at: r.createdAt.toISOString(),
        },
        i + 1
      );
      await ctx.reply(formatted, {
        parse_mode: "Markdown",
        link_preview_options: { is_disabled: true },
        ...Markup.inlineKeyboard([
          [Markup.button.url("🔗 View Listing", r.sourceUrl)],
        ]),
      });
    }

    if (savedResults.length > pageSize) {
      await ctx.reply(
        `Showing ${pageSize} of ${savedResults.length} results.\nTap for more:`,
        Markup.inlineKeyboard([
          [Markup.button.callback("Next 5 →", `page_${session.sessionId}_1`)],
        ])
      );
    }

    await ctx.reply(
      "✅ Search complete! Use /search to find more.",
      Markup.keyboard([["🔍 Search"], ["📋 History", "ℹ️ Help"]]).resize()
    );

    userSessions.delete(ctx.from.id);
  } catch (error) {
    await logError("bot_agent_search", String(error), {
      telegramId: ctx.from.id,
      sessionId: session.sessionId,
    });
    await ctx.reply("❌ Search failed. Please try /search again.");
    userSessions.delete(ctx.from.id);
  }
}

// ─── Pagination ──────────────────────────────────────────────

bot.action(/^page_(.+)_(\d+)$/, async (ctx) => {
  const sessionId = ctx.match[1];
  const page = parseInt(ctx.match[2]);
  const pageSize = 5;

  try {
    const listings = await getListingsBySession(sessionId);
    const start = page * pageSize;
    const pageListings = listings.slice(start, start + pageSize);

    await ctx.answerCbQuery();

    for (let i = 0; i < pageListings.length; i++) {
      const l = pageListings[i];
      const formatted = formatListingForTelegram(
        {
          id: l._id.toString(),
          session_id: l.sessionId.toString(),
          title: l.title,
          type: l.type,
          address: l.address,
          rent_min: l.rentMin ?? null,
          rent_max: l.rentMax ?? null,
          amenities: l.amenities,
          contact: l.contact ?? null,
          source_url: l.sourceUrl,
          validated: l.validated,
          raw_data: l.rawData,
          created_at: l.createdAt.toISOString(),
        },
        start + i + 1
      );
      await ctx.reply(formatted, {
        parse_mode: "Markdown",
        link_preview_options: { is_disabled: true },
        ...Markup.inlineKeyboard([
          [Markup.button.url("🔗 View", l.sourceUrl)],
        ]),
      });
    }

    if (start + pageSize < listings.length) {
      await ctx.reply(
        `Showing ${start + 1}–${Math.min(start + pageSize, listings.length)} of ${listings.length}`,
        Markup.inlineKeyboard([
          [Markup.button.callback("Next 5 →", `page_${sessionId}_${page + 1}`)],
        ])
      );
    }
  } catch {
    await ctx.reply("Failed to load more results.");
  }
});

// ─── History ─────────────────────────────────────────────────

async function handleHistory(ctx: { from?: { id: number }; reply: Function }) {
  if (!ctx.from) return;
  try {
    const user = await findOrCreateUser({ telegramId: String(ctx.from.id) });
    const sessions = await getUserSessions(user._id.toString(), 5);

    if (sessions.length === 0) {
      await ctx.reply("📋 No search history yet. Use /search to get started!");
      return;
    }

    let msg = "📋 *Your Recent Searches*\n\n";
    for (const s of sessions) {
      const emoji = s.status === "completed" ? "✅" : s.status === "paid" ? "🔄" : "⏳";
      const count = await getListingsBySession(s._id.toString());
      msg += `${emoji} *${s.locationText}*\n`;
      msg += `   ${formatDate(s.createdAt.toISOString())} • ${count.length} results\n\n`;
    }

    await ctx.reply(msg, { parse_mode: "Markdown" });
  } catch {
    await ctx.reply("Failed to load history. Try again.");
  }
}

bot.command("history", handleHistory);
bot.hears("📋 History", handleHistory);

// ─── Help ────────────────────────────────────────────────────

async function sendHelp(ctx: { reply: Function }) {
  await ctx.reply(
    "🏠 *Namma Nest — How It Works*\n\n" +
      "1\\. Share your location or type an area\n" +
      "2\\. Choose property type \\(House / PG / Any\\)\n" +
      "3\\. Set your monthly budget in INR\n" +
      "4\\. Open the payment link I send you\n" +
      "5\\. Pay *0\\.0000001 BTC* from MetaMask on GOAT Testnet3\n" +
      "6\\. Tap ✅ *I've Paid* — AI searches rental sites\\!\n\n" +
      "⚡ Payment is recorded on the *NammaNest smart contract*\n" +
      "🔍 /search — Start new search\n" +
      "📋 /history — View past searches",
    { parse_mode: "MarkdownV2" }
  );
}

bot.command("help", sendHelp);
bot.hears("ℹ️ Help", sendHelp);

// ─── Webhook handler ─────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get("x-telegram-bot-api-secret-token");
    if (process.env.TELEGRAM_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    await bot.handleUpdate(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    await logError("bot_webhook", String(error));
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  return NextResponse.json({
    bot: "Namma Nest",
    contract: CONTRACT_ADDRESS || "not deployed",
    fee: `${feeDisplay} BTC`,
    payPage: `${APP_URL}/bot-pay`,
  });
}
