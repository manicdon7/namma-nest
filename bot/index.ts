import { Telegraf } from "telegraf";
import { registerStartCommand } from "./commands/start";
import { registerSearchCommand } from "./commands/search";
import { registerHistoryCommand } from "./commands/history";
import { registerLocationScene } from "./scenes/locationScene";
import { registerPaymentScene } from "./scenes/paymentScene";
import { registerResultsScene } from "./scenes/resultsScene";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN is required");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

registerStartCommand(bot);
registerSearchCommand(bot);
registerHistoryCommand(bot);
registerLocationScene(bot);
registerPaymentScene(bot);
registerResultsScene(bot);

bot.catch((err: unknown) => {
  console.error("Bot error:", err);
});

const MODE = process.env.BOT_MODE || "webhook";

if (MODE === "polling") {
  bot.launch().then(() => {
    console.log("Namma Nest bot started in polling mode");
  });

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
} else {
  const WEBHOOK_URL = process.env.NEXT_PUBLIC_APP_URL || "https://namma-nest.vercel.app";
  const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

  bot.telegram
    .setWebhook(`${WEBHOOK_URL}/api/bot/webhook`, {
      secret_token: WEBHOOK_SECRET,
    })
    .then(() => {
      console.log(`Webhook set to ${WEBHOOK_URL}/api/bot/webhook`);
    })
    .catch((err: unknown) => {
      console.error("Failed to set webhook:", err);
    });
}

export default bot;
