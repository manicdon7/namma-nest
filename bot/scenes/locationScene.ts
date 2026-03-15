import { Telegraf, Markup } from "telegraf";
import type { Context } from "telegraf";
import { getSession, updateSession } from "../middleware/session";

export function registerLocationScene(bot: Telegraf<Context>) {
  bot.on("location", async (ctx) => {
    if (!ctx.from) return;
    const session = getSession(ctx.from.id);
    if (session.step !== "location") return;

    const { latitude, longitude } = ctx.message.location;

    let locationName: string;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        { headers: { "User-Agent": "NammaNest/1.0" } }
      );
      const data = await res.json();
      const addr = data.address;
      const parts = [
        addr.neighbourhood || addr.suburb,
        addr.city || addr.town,
      ].filter(Boolean);
      locationName = parts.join(", ") || data.display_name;
    } catch {
      locationName = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }

    updateSession(ctx.from.id, {
      location: locationName,
      latitude,
      longitude,
      step: "type",
    });

    await ctx.reply(
      `📍 Location: *${locationName}*\n\nWhat type of property?`,
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
}
