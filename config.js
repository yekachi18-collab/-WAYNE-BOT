const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const config = require('./config')
const http = require('http')

http.createServer((req, res) => res.end('WAYNE BOT IS RUNNING 🔥 - Pairing Code in Logs')).listen(process.env.PORT || 3000)

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth')
    const sock = makeWASocket({
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ["WAYNE BOT", "Chrome", "1.0.0"]
    })

    sock.ev.on('creds.update', saveCreds)

    // Show Pairing Code if not registered
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(config.ownerNumber.replace(/[^0-9]/g, ''))
                console.log(`\n\n============================\nYOUR WAYNE BOT PAIRING CODE: ${code}\n============================\nGo to WhatsApp > Linked Devices > Link with phone number > Enter this code\n\n`)
            } catch (e) {
                console.log('Failed to get pairing code: ' + e.message)
            }
        }, 3000)
    }

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
            await sock.sendMessage(from, { text: '🏓 Pong! WAYNE BOT is alive! 🔥' })
        }
        if (command === 'menu' || command === 'help') {
            await sock.sendMessage(from, { text: `*WAYNE BOT MENU*\n\n.ping - check bot\n.menu - this menu\n.owner - owner info\n\nBot: ${config.botName}\nOwner: ${config.ownerName}` })
        }
        if (command === 'owner') {
            await sock.sendMessage(from, { text: `My Owner: ${config.ownerNumber} - ${config.ownerName}` })
        }
    })
}
startBot()
