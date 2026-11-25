const { Bot, InlineKeyboard, InputFile } = require("grammy");
const path = require("path");

const TOKEN = process.env.BOT_TOKEN;

const CHANNELS = [
  { name: "VILLEN X PAPA OFFICIAL", id: "@villenxpapaof", link: "https://t.me/villenxpapaof" },
  { name: "VILLEN x PAPA", id: "@villenxpapa", link: "https://t.me/villenxpapa" },
  { name: "VILLEN X PAPA BACK-UP", id: "@villenxpapabk", link: "https://t.me/villenxpapabk" },
];

if (!TOKEN) {
  console.error("BOT_TOKEN is missing.");
  process.exit(1);
}

const bot = new Bot(TOKEN);
const sessions = new Map();

const mainMenu = new InlineKeyboard()
  .text("Number Temporary Ban", "nt")
  .row()
  .text("Number Permanent Ban", "np")
  .row()
  .text("Group Temporary Suspension", "gt")
  .row()
  .text("Group Permanent Suspension", "gp");

function channelKeyboard() {
  const keyboard = new InlineKeyboard();

  CHANNELS.forEach((channel) => {
    keyboard.url(channel.name, channel.link).row();
  });

  keyboard.text("Check Membership", "verify");
  return keyboard;
}

async function checkMembership(ctx) {
  for (const channel of CHANNELS) {
    try {
      const member = await ctx.api.getChatMember(channel.id, ctx.from.id);

      if (!["member", "administrator", "creator"].includes(member.status)) {
        return false;
      }
    } catch (error) {
      console.error(error.message);
      return false;
    }
  }

  return true;
}

bot.command("start", async (ctx) => {
  sessions.delete(ctx.from.id);

  await ctx.replyWithPhoto(
    new InputFile(path.join(__dirname, "welcome.jpeg.jpeg")),
    {
      caption:
        "👑 VILLEN OWNER 👑\n\n" +
        "⚡ SELECT AN OPTION ⚡",
      reply_markup: mainMenu
    }
  );
});

bot.command("cancel", async (ctx) => {
  sessions.delete(ctx.from.id);
  await ctx.reply("Cancelled. Send /start to begin again.");
});

bot.callbackQuery(["nt", "np", "gt", "gp"], async (ctx) => {
  await ctx.answerCallbackQuery();

  const type = ctx.callbackQuery.data;

  sessions.set(ctx.from.id, {
    type,
    stage: "input"
  });

  if (type === "nt" || type === "np") {
    await ctx.reply("📱 Please enter the WhatsApp number.");
  } else {
    await ctx.reply("🔗 Please enter the WhatsApp group invite link.");
  }
});

bot.on("message:text", async (ctx) => {
  const session = sessions.get(ctx.from.id);

  if (!session || session.stage !== "input") return;

  if (ctx.message.text.startsWith("/")) return;

  session.input = ctx.message.text.trim();
  session.stage = "channels";

  await ctx.reply(
    "🔐 Join all three channels and verify membership:",
    { reply_markup: channelKeyboard() }
  );
});

bot.callbackQuery("verify", async (ctx) => {
  await ctx.answerCallbackQuery();

  const session = sessions.get(ctx.from.id);

  if (!session || session.stage !== "channels") {
    return ctx.reply("Please start again using /start.");
  }

  const joined = await checkMembership(ctx);

  if (!joined) {
    return ctx.reply(
      "Please join all three channels first.",
      { reply_markup: channelKeyboard() }
    );
  }

  sessions.delete(ctx.from.id);

  await ctx.reply(
    "🔴 STATUS: UNDER PROCESSING\n\n" +
    "⏳ Your request is currently under processing.\n" +
    "🕒 Estimated processing time: 24 hours.\n\n" +
    "ℹ️ This is a status-tracking message, not a WhatsApp enforcement action."
  );
});

bot.catch((error) => {
  console.error("Bot error:", error);
});

bot.start();

console.log("Telegram bot is running.");