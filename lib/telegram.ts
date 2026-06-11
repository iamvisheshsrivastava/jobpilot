/**
 * Telegram Bot API helper.
 * Requires TELEGRAM_BOT_TOKEN env var.
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  if (!BOT_TOKEN) return; // silently skip if not configured

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  }).catch((e) => console.error("[telegram] sendMessage failed:", e));
}

/** Build the deep-link URL that opens the bot and auto-sends /start <payload> */
export function telegramStartUrl(botUsername: string, payload: string): string {
  return `https://t.me/${botUsername}?start=${encodeURIComponent(payload)}`;
}
