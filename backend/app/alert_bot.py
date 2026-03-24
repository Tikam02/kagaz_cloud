"""
DocMan Telegram Alert Bot
=========================
Run this as a standalone process alongside the Flask server:

    TELEGRAM_BOT_TOKEN=<token> python -m app.alert_bot

Commands:
  /start [token]  — Link your DocMan account (use the token from Profile page)
  /alerts         — Show your upcoming document reminders
  /status         — Show all documents and their expiry status
  /unlink         — Unlink your Telegram from DocMan
  /help           — Show this help message
"""

import asyncio
import logging
import os

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from telegram import Bot, Update
from telegram.ext import Application, CommandHandler, ContextTypes

logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:5000")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _days_badge(days: int) -> str:
    if days < 0:
        return "🔴 EXPIRED"
    if days == 0:
        return "🔴 DUE TODAY"
    if days <= 7:
        return f"🟠 {days}d left"
    if days <= 30:
        return f"🟡 {days}d left"
    return f"🟢 {days}d left"


# ---------------------------------------------------------------------------
# Command handlers
# ---------------------------------------------------------------------------

async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    /start              — Welcome message
    /start <token>      — Link DocMan account using token from profile page
    """
    chat_id = str(update.effective_chat.id)
    args = context.args or []

    if not args:
        await update.message.reply_text(
            "👋 *Welcome to DocMan Alert Bot!*\n\n"
            "I'll send you expiry reminders for your important documents.\n\n"
            "*To link your DocMan account:*\n"
            "1. Open your DocMan profile\n"
            "2. Click *Connect Telegram*\n"
            "3. Copy the generated command and send it here\n\n"
            "Use /help to see all available commands.",
            parse_mode="Markdown",
        )
        return

    token = args[0]
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{BACKEND_URL}/api/bot/verify-telegram",
                json={"token": token, "chat_id": chat_id},
                timeout=10,
            )
        except httpx.RequestError:
            await update.message.reply_text(
                "⚠️ Could not reach the DocMan server. Please try again later."
            )
            return

    if resp.status_code == 200:
        data = resp.json()
        await update.message.reply_text(
            f"✅ *Account linked successfully!*\n\n"
            f"Hello, *{data['name']}* ({data['email']})!\n\n"
            f"You'll now receive daily document expiry alerts here.\n"
            f"Use /alerts to see your upcoming reminders.",
            parse_mode="Markdown",
        )
    elif resp.status_code == 404:
        await update.message.reply_text(
            "❌ *Invalid or expired token.*\n\n"
            "Please generate a new token from your DocMan profile page.",
            parse_mode="Markdown",
        )
    else:
        await update.message.reply_text("⚠️ Something went wrong. Please try again.")


async def cmd_alerts(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/alerts — Show upcoming reminders for this user."""
    chat_id = str(update.effective_chat.id)

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                f"{BACKEND_URL}/api/bot/alerts/{chat_id}",
                timeout=10,
            )
        except httpx.RequestError:
            await update.message.reply_text("⚠️ Could not reach the DocMan server.")
            return

    if resp.status_code == 404:
        await update.message.reply_text(
            "❌ Your Telegram is not linked to a DocMan account.\n"
            "Use the link from your profile page to connect."
        )
        return

    data = resp.json()
    alerts = data.get("alerts", [])

    if not alerts:
        await update.message.reply_text(
            f"✅ Hi *{data.get('user', 'there')}!* No upcoming reminders — all clear! 🎉",
            parse_mode="Markdown",
        )
        return

    lines = [f"📋 *Upcoming Reminders for {data.get('user', 'you')}:*\n"]
    for a in alerts:
        badge = _days_badge(a["days_until"])
        lines.append(f"{badge}  •  *{a['title']}*")
        lines.append(f"         _{a['label']}_ — {a['important_date']}")

    await update.message.reply_text("\n".join(lines), parse_mode="Markdown")


async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/status — Show all documents with their reminder status."""
    chat_id = str(update.effective_chat.id)

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                f"{BACKEND_URL}/api/bot/alerts/{chat_id}",
                timeout=10,
            )
        except httpx.RequestError:
            await update.message.reply_text("⚠️ Could not reach the DocMan server.")
            return

    if resp.status_code == 404:
        await update.message.reply_text(
            "❌ Your Telegram is not linked to a DocMan account.\n"
            "Use the link from your profile page to connect."
        )
        return

    data = resp.json()
    alerts = data.get("alerts", [])

    if not alerts:
        await update.message.reply_text("✅ No documents with upcoming reminders found.")
        return

    lines = ["📄 *Documents with Active Reminders:*\n"]
    for a in alerts:
        days = a["days_until"]
        if days == 0:
            status = "DUE TODAY 🔴"
        elif days <= 7:
            status = f"Due in {days}d 🟠"
        elif days <= 30:
            status = f"Due in {days}d 🟡"
        else:
            status = f"Due in {days}d 🟢"
        lines.append(f"• *{a['title']}* [{a['category']}] — {status}")

    await update.message.reply_text("\n".join(lines), parse_mode="Markdown")


async def cmd_unlink(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/unlink — Unlink Telegram from DocMan account."""
    chat_id = str(update.effective_chat.id)

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{BACKEND_URL}/api/bot/unlink",
                json={"chat_id": chat_id},
                timeout=10,
            )
        except httpx.RequestError:
            await update.message.reply_text("⚠️ Could not reach the DocMan server.")
            return

    if resp.status_code == 200:
        await update.message.reply_text(
            "✅ Your Telegram account has been unlinked from DocMan.\n"
            "You will no longer receive alert notifications here."
        )
    else:
        await update.message.reply_text("❌ No linked account found for this chat.")


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/help — Show available commands."""
    await update.message.reply_text(
        "📖 *DocMan Bot Commands:*\n\n"
        "/start `<token>` — Link your DocMan account\n"
        "/alerts — View upcoming document reminders\n"
        "/status — View all documents with reminder dates\n"
        "/unlink — Unlink your Telegram from DocMan\n"
        "/help — Show this message\n\n"
        "To get your link token, go to your DocMan Profile page and click *Connect Telegram*.",
        parse_mode="Markdown",
    )


# ---------------------------------------------------------------------------
# Daily alert scheduler
# ---------------------------------------------------------------------------

async def send_daily_alerts(bot: Bot) -> None:
    """Fetch all pending alerts from the backend and push them via Telegram."""
    logger.info("Running daily alert job...")

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{BACKEND_URL}/api/bot/daily-alerts", timeout=15)
        except httpx.RequestError as exc:
            logger.error("Failed to reach backend for daily alerts: %s", exc)
            return

    if resp.status_code != 200:
        logger.error("Daily alerts endpoint returned %s", resp.status_code)
        return

    users_alerts = resp.json().get("alerts", [])
    logger.info("Sending alerts to %d user(s)", len(users_alerts))

    for entry in users_alerts:
        chat_id = entry["chat_id"]
        name = entry["name"]
        items = entry["items"]

        lines = [f"📅 *Good morning, {name}!*\n\nHere are your document reminders for today:\n"]
        for item in items:
            badge = _days_badge(item["days_until"])
            lines.append(f"{badge}  •  *{item['title']}*")
            lines.append(f"         _{item['label']}_")

        lines.append("\nOpen DocMan to view full details.")

        try:
            await bot.send_message(
                chat_id=chat_id,
                text="\n".join(lines),
                parse_mode="Markdown",
            )
            logger.info("Alert sent to chat_id=%s (%s)", chat_id, name)
        except Exception as exc:
            logger.error("Failed to send alert to chat_id=%s: %s", chat_id, exc)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def run_bot() -> None:
    if not BOT_TOKEN:
        logger.error(
            "TELEGRAM_BOT_TOKEN environment variable is not set. Bot will not start."
        )
        return

    app = Application.builder().token(BOT_TOKEN).build()

    app.add_handler(CommandHandler("start",  cmd_start))
    app.add_handler(CommandHandler("alerts", cmd_alerts))
    app.add_handler(CommandHandler("status", cmd_status))
    app.add_handler(CommandHandler("unlink", cmd_unlink))
    app.add_handler(CommandHandler("help",   cmd_help))

    # Schedule daily alerts at 9:00 AM UTC every day
    scheduler = AsyncIOScheduler(timezone="UTC")
    scheduler.add_job(
        lambda: asyncio.ensure_future(send_daily_alerts(app.bot)),
        trigger="cron",
        hour=9,
        minute=0,
        id="daily_alerts",
    )
    scheduler.start()
    logger.info("Scheduler started — daily alerts at 09:00 UTC")

    logger.info("Bot polling started. Press Ctrl+C to stop.")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    run_bot()
