const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const config = require('./config')
const http = require('http')

// Keep Render alive
http.createServer((req, res) => res.end('WAYNE BOT IS RUNNING 🔥')).listen(process.env.PORT || 3000)

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth')

    const sock = makeWASocket({
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ["WAYNE BOT", "Chrome", "1.0.0"]
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            if (shouldReconnect) startBot()
        } else if (connection === 'open') {
            console.log('✅ WAYNE BOT Connected! Owner: ' + config.ownerNumber)
        }
    })

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0]
        if (!msg.message) return
        const from = msg.key.remoteJid
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || ""

        if (!body.startsWith(config.prefix)) return
        const args = body.slice(config.prefix.length).trim().split(/ +/)
        const command = args.shift().toLowerCase()

        if (command === 'ping') {
            await sock.sendMessage(from, { text: '🏓 Pong! WAYNE BOT is alive!' })
        }
        if (command === 'menu' || command === 'help') {
            await sock.sendMessage(from, { text: `*WAYNE BOT MENU*\n\n.ping - check bot\n.menu - this menu\n.owner - owner info` })
        }
        if (command === 'owner') {
            await sock.sendMessage(from, { text: `My Owner: ${config.ownerNumber}` })
        }
    })
}

startBot()
