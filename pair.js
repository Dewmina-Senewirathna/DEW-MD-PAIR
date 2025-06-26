const express = require('express');
const fs = require('fs-extra');
const { exec } = require("child_process");
let router = express.Router();
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const MESSAGE = process.env.MESSAGE || `
*SESSION GENERATED SUCCESSFULY* ✅
> https://whatsapp.com/channel/0029Vb2bFCq0LKZGEl4xEe2G

*㋛ DEW-MD BY HANSA DEWMINA*
> Hansa Dewmina
> Dew-Coders-LK
`;

const { upload } = require('./mega');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    DisconnectReason
} = require("@whiskeysockets/baileys");

// Clean up on server start
if (fs.existsSync('./auth_info_baileys')) {
    fs.emptyDirSync(__dirname + '/auth_info_baileys');
}

router.get('/', async (req, res) => {
    let num = req.query.number;

    async function SUHAIL() {
        const { state, saveCreds } = await useMultiFileAuthState(`./auth_info_baileys`);
        try {
            let Smd = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.macOS("Safari"),
            });

            if (!Smd.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await Smd.requestPairingCode(num);
                if (!res.headersSent) {
                    return res.send({ code });
                }
            }

            Smd.ev.on('creds.update', saveCreds);
            Smd.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === "open") {
                    try {
                        await delay(10000);
                        if (fs.existsSync('./auth_info_baileys/creds.json')) {
                            const auth_path = './auth_info_baileys/';
                            let user = Smd.user.id;

                            function randomMegaId(length = 6, numberLength = 4) {
                                const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                                let result = '';
                                for (let i = 0; i < length; i++) {
                                    result += characters.charAt(Math.floor(Math.random() * characters.length));
                                }
                                const number = Math.floor(Math.random() * Math.pow(10, numberLength));
                                return `${result}${number}`;
                            }

                            const mega_url = await upload(fs.createReadStream(auth_path + 'creds.json'), `${randomMegaId()}.json`);
                            const Id_session = mega_url.replace('https://mega.nz/file/', '');

                            const Scan_Id = Id_session;
                            let msgsss = await Smd.sendMessage(user, { text: Scan_Id });
                            await Smd.sendMessage(user, { text: MESSAGE }, { quoted: msgsss });

                            await delay(1000);
                            await fs.emptyDirSync(__dirname + '/auth_info_baileys');
                        }
                    } catch (e) {
                        console.log("❌ Error during file upload or message send:", e);
                    }
                    await delay(100);
                    await fs.emptyDirSync(__dirname + '/auth_info_baileys');
                }

                if (connection === "close") {
                    let reason = new Boom(lastDisconnect?.error)?.output.statusCode;

                    switch (reason) {
                        case DisconnectReason.connectionClosed:
                            console.log("❌ Connection closed!");
                            break;
                        case DisconnectReason.connectionLost:
                            console.log("❌ Connection Lost from Server!");
                            break;
                        case DisconnectReason.restartRequired:
                            console.log("🔄 Restart Required, Restarting...");
                            await delay(5000);
                            exec('pm2 restart DEW-MD');
                            break;
                        case DisconnectReason.timedOut:
                            console.log("❌ Connection TimedOut!");
                            break;
                        default:
                            console.log("❌ Unknown disconnect reason. Restarting bot...");
                            console.log(reason);
                            await delay(5000);
                            exec('pm2 restart DEW-MD');
                            break;
                    }
                }
            });

        } catch (err) {
            console.log("❌ Error in SUHAIL function:", err);
            await delay(5000);
            exec('pm2 restart DEW-MD');
            console.log("🔁 Restarted via PM2 due to error.");
            await fs.emptyDirSync(__dirname + '/auth_info_baileys');

            if (!res.headersSent) {
                res.send({ code: "Try Again in a Few Minutes" });
            }
        }
    }

    await SUHAIL();
});

module.exports = router;
