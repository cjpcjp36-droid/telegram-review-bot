
const { Bot, InlineKeyboard, Keyboard } = require("grammy");

// ================= CONFIG =================

const BOT_TOKEN =
  process.env.BOT_TOKEN ||
  process.env.TELEGRAM_BOT_TOKEN ||
  process.env.TELEGRAM_TOKEN ||
  process.env.TOKEN;

const OWNER_ID = Number(process.env.OWNER_ID || process.env.OWNERID);

if (!BOT_TOKEN || !OWNER_ID || !Number.isFinite(OWNER_ID)) {
  throw new Error("BOT_TOKEN or OWNER_ID is missing!");
}

const bot = new Bot(BOT_TOKEN);
const OWNER_USERNAME = "VILLENYOURPAPA";

const CHANNELS = [
  {
    name: "VILLEN X PAPA OFFICIAL",
    username: "@villenxpapaof",
    link: "https://t.me/villenxpapaof"
  },
  {
    name: "VILLEN x PAPA",
    username: "@villenxpapa",
    link: "https://t.me/villenxpapa"
  },
  {
    name: "VILLEN X PAPA BACK-UP",
    username: "@villenxpapabk",
    link: "https://t.me/villenxpapabk"
  }
];

// ================= STATE =================

let maintenance = false;

const activity = new Map();
const maintenanceNotified = new Set();
const pending = new Map();
const jobs = new Map();

// ================= USER INFO =================

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

// ================= OWNER NOTIFICATION =================

async function notifyOwner(ctx, action) {
  const u = userInfo(ctx);
  const now = Date.now();

  let record = activity.get(u.id);

  if (!record) {
    record = {
      first: now,
      last: now
    };

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
    console.error("Owner notification:", e.message);
  }
}

// ================= MEMBERSHIP CHECK =================

async function checkJoined(ctx) {
  try {
    for (const channel of CHANNELS) {
      const member = await bot.api.getChatMember(
        channel.username,
        ctx.from.id
      );

      if (
        member.status === "left" ||
        member.status === "kicked" ||
        (
          member.status === "restricted" &&
          member.is_member === false
        )
      ) {
        return false;
      }
    }

    return true;
  } catch (e) {
    console.error("Membership check:", e.message);
    return false;
  }
}

// ================= JOIN KEYBOARD =================

function joinKeyboard() {
  const keyboard = new InlineKeyboard();

  CHANNELS.forEach((channel, index) => {
    keyboard.url(
      `Join Channel ${index + 1}`,
      channel.link
    ).row();
  });

  keyboard.text("Verify Join", "verify_join");

  return keyboard;
}

// ================= MAIN MENU =================

function mainMenu() {
  return new Keyboard()
    .text("Number Temporary Ban")
    .text("Number Permanent Ban")
    .row()
    .text("Group Suspend Temporary")
    .text("Group Suspend Permanent")
    .resized();
}

function connectKeyboard(id) {
  return new InlineKeyboard().text(
    "Connect",
    `connect:${id}`
  );
}

// ================= REPLIES =================

async function maintenanceReply(ctx) {
  const u = userInfo(ctx);

  if (!maintenanceNotified.has(u.id)) {
    maintenanceNotified.add(u.id);

    await notifyOwner(
      ctx,
      "Tried to use bot during maintenance"
    );
  }

  return ctx.reply(
    "Bot is under maintenance. Please contact our owner.",
    {
      reply_markup: new InlineKeyboard().url(
        "Contact Owner",
        `https://t.me/${OWNER_USERNAME}`
      )
    }
  );
}

async function showJoin(ctx) {
  return ctx.reply(
    "Please join all three channels to continue.",
    {
      reply_markup: joinKeyboard()
    }
  );
}

async function showMenu(ctx) {
  return ctx.reply(
    "Welcome! Select an option:",
    {
      reply_markup: mainMenu()
    }
  );
}

// ================= MENU OPTIONS =================

const options = {
  "Number Temporary Ban": {
    id: "nt",
    type: "number",
    title: "Number Temporary Ban"
  },

  "Number Permanent Ban": {
    id: "np",
    type: "number",
    title: "Number Permanent Ban"
  },

  "Group Suspend Temporary": {
    id: "gt",
    type: "group",
    title: "Group Suspend Temporary"
  },

  "Group Suspend Permanent": {
    id: "gp",
    type: "group",
    title: "Group Suspend Permanent"
  }
};

// ================= START =================

bot.command("start", async (ctx) => {
  if (ctx.from.id === OWNER_ID) {
    return ctx.reply(
      `Owner Panel\n\nMaintenance: ${maintenance ? "ON" : "OFF"}\n\n` +
      "/maintenance_on\n" +
      "/maintenance_off\n" +
      "/owner_menu"
    );
  }

  if (maintenance) {
    return maintenanceReply(ctx);
  }

  await notifyOwner(ctx, "/start");

  if (!(await checkJoined(ctx))) {
    return showJoin(ctx);
  }

  return showMenu(ctx);
});

// ================= OWNER MENU =================

bot.command("owner_menu", async (ctx) => {
  if (ctx.from.id !== OWNER_ID) {
    return ctx.reply("Owner only.");
  }

  return showMenu(ctx);
});

// ================= MAINTENANCE =================

bot.command("maintenance_on", async (ctx) => {
  if (ctx.from.id !== OWNER_ID) {
    return ctx.reply("Owner only.");
  }

  maintenance = true;
  maintenanceNotified.clear();

  return ctx.reply("Maintenance is ON.");
});

bot.command("maintenance_off", async (ctx) => {
  if (ctx.from.id !== OWNER_ID) {
    return ctx.reply("Owner only.");
  }

  maintenance = false;
  maintenanceNotified.clear();

  return ctx.reply("Maintenance is OFF.");
});

// ================= VERIFICATION =================

bot.callbackQuery("verify_join", async (ctx) => {
  await ctx.answerCallbackQuery();

  if (maintenance && ctx.from.id !== OWNER_ID) {
    return maintenanceReply(ctx);
  }

  if (!(await checkJoined(ctx))) {
    return ctx.reply(
      "You must join all three channels first.",
      {
        reply_markup: joinKeyboard()
      }
    );
  }

  await notifyOwner(ctx, "Verified channel membership");

  return showMenu(ctx);
});

// ================= MENU SELECTION =================

bot.hears(Object.keys(options), async (ctx) => {
  if (ctx.from.id !== OWNER_ID && maintenance) {
    return maintenanceReply(ctx);
  }

  if (
    ctx.from.id !== OWNER_ID &&
    !(await checkJoined(ctx))
  ) {
    pending.delete(ctx.from.id);
    return showJoin(ctx);
  }

  const selected = options[ctx.message.text];

  await notifyOwner(
    ctx,
    `Selected menu: ${selected.title}`
  );

  pending.set(ctx.from.id, selected);

  if (selected.type === "number") {
    return ctx.reply(
      "Please enter the number with country code."
    );
  }

  return ctx.reply(
    "Please enter your group link."
  );
});

// ================= USER INPUT =================

bot.on("message:text", async (ctx) => {
  if (ctx.from.id === OWNER_ID) {
    return;
  }

  if (maintenance) {
    return maintenanceReply(ctx);
  }

  const selected = pending.get(ctx.from.id);

  if (!selected) {
    return;
  }

  if (!(await checkJoined(ctx))) {
    pending.delete(ctx.from.id);
    return showJoin(ctx);
  }

  const input = ctx.message.text.trim();

  if (input.startsWith("/")) {
    return;
  }

  const taskId = `${selected.id}_${ctx.from.id}`;

  jobs.set(taskId, {
    ...selected,
    input,
    userId: ctx.from.id
  });

  pending.delete(ctx.from.id);

  await notifyOwner(
    ctx,
    `Submitted input for ${selected.title}`
  );

  return ctx.reply(
    "Your input has been received.",
    {
      reply_markup: connectKeyboard(taskId)
    }
  );
});

// ================= CONNECT DEMO =================

bot.callbackQuery(/^connect:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();

  if (maintenance && ctx.from.id !== OWNER_ID) {
    return maintenanceReply(ctx);
  }

  const taskId = ctx.match[1];
  const task = jobs.get(taskId);

  if (!task || task.userId !== ctx.from.id) {
    return ctx.reply(
      "Session expired. Please start again."
    );
  }

  if (
    ctx.from.id !== OWNER_ID &&
    !(await checkJoined(ctx))
  ) {
    jobs.delete(taskId);
    pending.delete(ctx.from.id);
    return showJoin(ctx);
  }

  await notifyOwner(
    ctx,
    `Connect clicked: ${task.title}`
  );

  await ctx.reply("Please wait 20 seconds...");

  // DEMO ONLY - NO REAL BAN OR SUSPENSION

  await new Promise(resolve =>
    setTimeout(resolve, 20000)
  );

  await ctx.reply("Your process was started.");

  await new Promise(resolve =>
    setTimeout(resolve, 10000)
  );

  await ctx.reply(
    "هذه عملية تجريبية فقط، ولا يتم تنفيذ أي حظر حقيقي."
  );

  jobs.delete(taskId);
});

// ================= ERROR HANDLING =================

bot.catch((err) => {
  console.error("Bot error:", err);

  if (err.error) {
    console.error("Underlying error:", err.error);
  }
});

// ================= START BOT =================

bot.start();

console.log("Bot is running!");
