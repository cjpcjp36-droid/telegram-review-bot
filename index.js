
const { Bot, InlineKeyboard, Keyboard } = require("grammy");

const BOT_TOKEN = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN || process.env.TOKEN;
const OWNER_ID = Number(process.env.OWNER_ID || process.env.OWNERID);

if (!BOT_TOKEN || !OWNER_ID) {
  throw new Error("BOT_TOKEN or OWNER_ID is missing!");
}

const bot = new Bot(BOT_TOKEN);

const OWNER_USERNAME = "VILLENYOURPAPA";

const CHANNELS = [
  "@villenxpapaof",
  "@villenxpapa",
  "@villenxpapabk"
];

let maintenance = false;
const activity = new Map();
const maintenanceNotified = new Set();

function userInfo(ctx) {
  const u = ctx.from;

  return {
    id: u.id,
    name: [u.first_name, u.last_name]
      .filter(Boolean)
      .join(" "),
    username: u.username ? `@${u.username}` : "No username"
  };
}

async function notifyOwner(ctx, action) {
  const u = userInfo(ctx);
  const now = Date.now();

  let record = activity.get(u.id);

  if (!record) {
    record = { first: now, last: now };
    activity.set(u.id, record);
  } else {
    record.last = now;
  }

  const duration = Math.floor(
    (record.last - record.first) / 1000
  );

  const message =
    `🔔 User Activity\n\n` +
    `👤 Name: ${u.name}\n` +
    `🔗 Username: ${u.username}\n` +
    `🆔 User ID: ${u.id}\n` +
    `📅 First: ${new Date(record.first).toLocaleString()}\n` +
    `🕒 Last: ${new Date(record.last).toLocaleString()}\n` +
    `⏱ Duration: ${duration} seconds\n` +
    `📌 Activity: ${action}`;

  try {
    await bot.api.sendMessage(OWNER_ID, message);
  } catch (e) {
    console.error("Notification error:", e.message);
  }
}

async function checkJoined(ctx) {
  try {
    for (const channel of CHANNELS) {
      const member = await bot.api.getChatMember(
        channel,
        ctx.from.id
      );

      if (
        member.status === "left" ||
        member.status === "kicked"
      ) {
        return false;
      }
    }

    return true;
  } catch (e) {
    console.error("Join check error:", e.message);
    return false;
  }
}

function joinButtons() {
  return new InlineKeyboard()
    .url("Join Channel 1", "https://t.me/villenxpapaof")
    .row()
    .url("Join Channel 2", "https://t.me/villenxpapa")
    .row()
    .url("Join Channel 3", "https://t.me/villenxpapabk")
    .row()
    .text("✅ Verify Join", "verify_join");
}

function mainMenu() {
  return new Keyboard()
    .text("Number Temporary Ban")
    .text("Number Permanent Ban")
    .row()
    .text("Group Suspend Temporary")
    .text("Group Suspend Permanent")
    .resized();
}

async function maintenanceReply(ctx) {
  const u = userInfo(ctx);

  // Avoid repeated maintenance alerts for the same user
  if (!maintenanceNotified.has(u.id)) {
    maintenanceNotified.add(u.id);
    await notifyOwner(ctx, "Tried to use bot during maintenance");
  }

  return ctx.reply(
    "🛠️ Bot is under maintenance.\n\nPlease contact our owner.",
    {
      reply_markup: new InlineKeyboard()
        .url(
          "📞 Contact Owner",
          `https://t.me/${OWNER_USERNAME}`
        )
    }
  );
}

async function showJoinMessage(ctx) {
  return ctx.reply(
    "📢 Join all 3 channels to continue.",
    { reply_markup: joinButtons() }
  );
}

async function showMenu(ctx) {
  return ctx.reply(
    "Welcome! Select an option:",
    { reply_markup: mainMenu() }
  );
}

bot.command("start", async (ctx) => {
  if (ctx.from.id === OWNER_ID) {
    return ctx.reply(
      `👑 Owner Panel\n\nMaintenance: ${maintenance ? "ON" : "OFF"}\n\n` +
      "/maintenance_on\n" +
      "/maintenance_off"
    );
  }

  if (maintenance) {
    return maintenanceReply(ctx);
  }

  await notifyOwner(ctx, "/start");

  if (!(await checkJoined(ctx))) {
    return showJoinMessage(ctx);
  }

  return showMenu(ctx);
});

// Owner-only maintenance controls

bot.command("maintenance_on", async (ctx) => {
  if (ctx.from.id !== OWNER_ID) {
    return ctx.reply("⛔ Owner only.");
  }

  maintenance = true;
  maintenanceNotified.clear();

  return ctx.reply("🛠️ Maintenance is ON.");
});

bot.command("maintenance_off", async (ctx) => {
  if (ctx.from.id !== OWNER_ID) {
    return ctx.reply("⛔ Owner only.");
  }

  maintenance = false;
  maintenanceNotified.clear();

  return ctx.reply("✅ Maintenance is OFF.");
});

// Join verification

bot.callbackQuery("verify_join", async (ctx) => {
  await ctx.answerCallbackQuery();

  if (maintenance && ctx.from.id !== OWNER_ID) {
    return maintenanceReply(ctx);
  }

  if (!(await checkJoined(ctx))) {
    return ctx.reply("❌ You haven't joined all channels yet.");
  }

  await notifyOwner(ctx, "Verified channel membership");

  return showMenu(ctx);
});

// Four menu options

const menuOptions = [
  "Number Temporary Ban",
  "Number Permanent Ban",
  "Group Suspend Temporary",
  "Group Suspend Permanent"
];

bot.hears(menuOptions, async (ctx) => {
  if (ctx.from.id !== OWNER_ID && maintenance) {
    return maintenanceReply(ctx);
  }

  if (ctx.from.id !== OWNER_ID) {
    await notifyOwner(ctx, `Selected: ${ctx.message.text}`);

    if (!(await checkJoined(ctx))) {
      return showJoinMessage(ctx);
    }
  }

  return ctx.reply(
    "تنبيه: لا يستطيع هذا البوت تنفيذ حظر الأرقام أو تعليق مجموعات واتساب مباشرةً. يُرجى استخدام أدوات الإبلاغ والإدارة الرسمية."
  );
});

// General messages during maintenance

bot.on("message", async (ctx) => {
  if (ctx.from.id === OWNER_ID) return;

  if (maintenance) {
    return maintenanceReply(ctx);
  }
});

bot.catch((err) => {
  console.error("Bot error:", err);
});

bot.start();

console.log("Bot is running!");
