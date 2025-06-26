const express = require('express');
const fs = require('fs-extra');
const { exec } = require("child_process");
const pino = require("pino");
const { Boom } = require("@hapi/boom");

const { upload } = require('./mega');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    DisconnectReason
} = require("@whiskeysockets/baileys");

const router = express.Router();

const MESSAGE = process.env.MESSAGE || `
*SESSION GENERATED SUCCESSFULY* ✅
> https://whatsapp.com/channel/0029Vb2bFCq0LKZGEl4xEe2G

*㋛ DEW-MD BY HANSA DEWMINA*
> Hansa Dewmina
> Dew-Coders-LK
`;

// Cleanup old sessions on startup
const AUTH_PATH = './auth_info_baileys';
if (fs.existsSync(AUTH_PATH)) {
    fs.emptyDirSync(AUTH_PATH);
}

// Route for generating session
router.get('/', async (req, res) => {
    let number = req.query.number;
    if (!number) return res.send({ error: "Phone number required!" });

    await connectToWhatsApp(number.replace(/[^0-9]/g, ''), res);
});

// Function to generate random MEGA upload filename
function randomMegaId(length = 6, numberLength = 4) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    const number = Math.floor(Math.random() * Math.pow(10, numberLength));
    return `${result}${number}`;
}

// Main connection logic
async function connectToWhatsApp(number, res) {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_PATH);

    try {
        const sock = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }))
            },
            printQRInTerminal: false,
            logger: pino({ level: "fatal" }),
            browser: Browsers.macOS("Safari")
        });

        if (!sock.authState.creds.registered) {
            await delay(1500);
            const code = await sock.requestPairingCode(number);
            if (!res.headersSent) return res.send({ code });
        }

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;

            if (connection === "open") {
                try {
                    console.log("✅ Connected successfully.");

                    await delay(10000);
                    if (fs.existsSync(`${AUTH_PATH}/creds.json`)) {
                        const sessionUrl = await upload(
                            fs.createReadStream(`${AUTH_PATH}/creds.json`),
                            `${randomMegaId()}.json`
                        );
                        const id = sessionUrl.replace("https://mega.nz/file/", "");

                        let msg = await sock.sendMessage(sock.user.id, { text: id });
                        await sock.sendMessage(sock.user.id, { text: MESSAGE }, { quoted: msg });
                    }

                } catch (e) {
                    console.log("❌ Error during upload or message send:", e);
                } finally {
                    await delay(1000);
                    await fs.emptyDirSync(AUTH_PATH);
                }
            }

            if (connection === "close") {
                console.log(`🔌 Connection closed. Reason: ${reason}`);

                switch (reason) {
                    case DisconnectReason.connectionClosed:
                    case DisconnectReason.connectionLost:
                    case DisconnectReason.timedOut:
                        console.log("🔁 Reconnecting in 5 seconds...");
                        await delay(5000);
                        connectToWhatsApp(number, res);
                        break;

                    case DisconnectReason.restartRequired:
                        console.log("🔄 Restart Required. Restarting...");
                        exec('pm2 restart DEW-MD');
                        break;

                    default:
                        console.log("❌ Unknown disconnect reason. Restarting...");
                        await delay(5000);
                        exec('pm2 restart DEW-MD');
                        break;
                }
            }
        });

    } catch (err) {
        console.log("❌ Fatal error:", err);
        await delay(5000);
        exec('pm2 restart DEW-MD');

        if (!res.headersSent) {
            res.send({ code: "Try again later." });
        }

        await fs.emptyDirSync(AUTH_PATH);
    }
}

module.exports = router;
