const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const admin = require("firebase-admin");
const { getDatabase, ServerValue } = require("firebase-admin/database");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

if (!process.env.DISCORD_TOKEN) {
  console.error("ERROR: Falta DISCORD_TOKEN en .env");
  process.exit(1);
}

const DISCORD_CHANNEL_ID =
  process.env.DISCORD_CHANNEL_ID || "1517993631661949109";

let db = null;
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const databaseUrl = process.env.FIREBASE_DATABASE_URL;

if (serviceAccountPath && databaseUrl) {
  try {
    const absolutePath = path.resolve(serviceAccountPath);
    if (fs.existsSync(absolutePath)) {
      admin.initializeApp({
        credential: admin.cert(require(absolutePath)),
        databaseURL: databaseUrl,
      });
      db = getDatabase();
    }
  } catch (error) {
    console.error("Error al inicializar Firebase:", error);
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const allowedUsers = ["893129394418229339", "1065297977767375009"];

client.once("clientReady", () => {
  console.log("Bot iniciado!");
});

client.on("messageCreate", async (message) => {
  if (
    message.author.bot ||
    message.channelId !== DISCORD_CHANNEL_ID ||
    !allowedUsers.includes(message.author.id) ||
    !message.content.startsWith("!send-noti ")
  )
    return;

  try {
    const notificationContent = message.content.slice(11).trim();
    if (!notificationContent) return;

    const userProfileUrl = `https://discord.com/users/${message.author.id}`;

    const embed = new EmbedBuilder()
      .setColor(0xeb8f34)
      .setTitle(
        "<a:a_Campanita:1518255488586748017> Una notificación nueva ha sido enviada a la página.",
      )
      .setDescription(notificationContent)
      .addFields({
        name: "<a:Flecha:1518258892340068535> Enviada por",
        value: `<@${message.author.id}> ([${message.author.username}](${userProfileUrl}))`,
        inline: true,
      })
      .setTimestamp()
      .setFooter({
        text: "Buzón de notificaciones",
        iconURL: client.user.displayAvatarURL(),
      });

    const attachmentUrls = [];
    if (message.attachments.size > 0) {
      const firstAttachment = message.attachments.first();
      if (firstAttachment.contentType?.startsWith("image/")) {
        embed.setImage(firstAttachment.url);
      }
      message.attachments.forEach((att) => attachmentUrls.push(att.url));
    }

    if (db) {
      await db.ref(process.env.FIREBASE_WRITE_PATH || "notis-discord").push({
        authorId: message.author.id,
        content: notificationContent,
        attachments: attachmentUrls,
        createdAt: ServerValue.TIMESTAMP,
      });
    }

    await message.delete();
    await message.channel.send({ embeds: [embed] });
  } catch (error) {
    console.error(error);
  }
});

client.login(process.env.DISCORD_TOKEN);
