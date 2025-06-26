const express = require("express");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const router = express.Router();
const pino = require("pino");

const {
  default: makeWASocket,
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  Browsers,
  jidNormalizedUser,
} = require("@whiskeysockets/baileys");

const { upload } = require("./mega");

const MESSAGE = process.env.MESSAGE || `
*SESSION GENERATED SUCCESSFULY* ✅

> උඩ තියෙන්නෙ ඔයාගෙ Sesion ID එක
> ඔයාට පුලුවන් දැන් ඔයාගෙ Bot Deploy කර ගන්න
> පල්ලයහ Site එකෙන් පුලුවන් Free Deploy කරගන්න

*Auto Deploy Website* - https://dew-md.free.nf
*Whatsapp Channel* - https://whatsapp.com/channel/0029Vb2bFCq0LKZGEl4xEe2G
*Bot Owner* - https://wa.me/+94701515609?text=hi_hansa

*㋛ DEW-MD BY HANSA DEWMINA*
> Hansa Dewmina
> Dew-Coders-LK
`;

const AUTH_PATH = path.join(__dirname, "auth_info_baileys");

// 🔒 Ensure the folder exists before using Baileys
if (!fs.existsSync(AUTH_PATH)) {
  fs.mkdirSync(AUTH_PATH, { recursive: true });
}

// 🔁 Remove directory safely
function removeFile(FilePath) {
  if (fs.existsSync(FilePath)) {
    fs.rmSync(FilePath, { recursive: true, force: true });
  }
}

// 🔑 Generate random MEGA filename
function randomMegaId(length = 6, numberLength = 4) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  const number = Math.floor(Math.random() * Math.pow(10, numberLength));
  return `${result}${number}`;
}

// 📱 Main route
router.get("/", async (req, res) => {
  let num = req.query.number;
  if (!num) return res.status(400).send({ error: "Phone number is required" });

  num = num.replace(/[^0-9]/g, "");

  async function RobinPair() {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_PATH);
    try {
      const sock = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
        },
        printQRInTerminal: false,
        logger: pino({ level: "fatal" }),
        browser: Browsers.macOS("Safari"),
      });

      if (!sock.authState.creds.registered) {
        await delay(1500);
        const code = await sock.requestPairingCode(num);
        if (!res.headersSent) return res.send({ code });
      }

      sock.ev.on("creds.update", saveCreds);

      sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
        if (connection === "open") {
          try {
            await delay(10000);

            const credsPath = path.join(AUTH_PATH, "creds.json");
            if (!fs.existsSync(credsPath)) {
              console.log("❌ creds.json not found");
              return;
            }

            const megaUrl = await upload(
              fs.createReadStream(credsPath),
              `${randomMegaId()}.json`
            );
            const sessionId = megaUrl.replace("https://mega.nz/file/", "");
            const userJid = jidNormalizedUser(sock.user.id);

            const msg = await sock.sendMessage(userJid, { text: sessionId });
            await sock.sendMessage(userJid, { text: MESSAGE }, { quoted: msg });

          } catch (err) {
            console.log("❌ Error during session upload:", err);
            exec("pm2 restart DEW-MD");
          }

          await delay(100);
          removeFile(AUTH_PATH);
          process.exit(0);
        }

        if (
          connection === "close" &&
          lastDisconnect?.error?.output?.statusCode !== 401
        ) {
          console.log("🔁 Connection closed. Reconnecting...");
          await delay(5000);
          RobinPair();
        }
      });
    } catch (err) {
      console.error("❌ Fatal error:", err);
      exec("pm2 restart DEW-MD");
      removeFile(AUTH_PATH);
      if (!res.headersSent) res.send({ code: "Service Unavailable" });
    }
  }

  await RobinPair();
});

// Global crash catch
process.on("uncaughtException", (err) => {
  console.error("⚠️ Uncaught Exception:", err);
  exec("pm2 restart DEW-MD");
});

module.exports = router;
