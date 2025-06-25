
const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys')

const { Boom } = require('@hapi/boom')
const fs = require('fs')
const P = require('pino')
const axios = require('axios')

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const sock = makeWASocket({
    version: await fetchLatestBaileysVersion(),
    logger: P({ level: 'silent' }),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys)
    },
    browser: ['Botku', 'Chrome', '10.0'],
    markOnlineOnConnect: true
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
      console.log(`❌ Koneksi terputus. Alasan: ${reason}`)
      if (reason === DisconnectReason.loggedOut) {
        console.log('🔁 Logout, mencoba ulang...')
        startBot()
      }
    } else if (connection === 'open') {
      console.log('✅ Bot tersambung!')
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    const sender = msg.key.remoteJid
    const text = msg.message?.conversation || ''

    if (text === '.menu') {
      await sock.sendMessage(sender, {
        text: `📋 *Menu*\n\n1. .menu\n2. .crashjpg\n3. .nulis`
      }, { quoted: msg })
    }

    if (text === '.crashjpg') {
      await sock.sendMessage(sender, {
        image: { url: 'http://localhost:3000/crash-jpg' },
        caption: '💥 Crash JPG dikirim!'
      }, { quoted: msg })
    }

    if (text === '.nulis') {
      let tulisan = "Contoh tugas yang kamu kirim..."
      let res = await axios.get(`http://localhost:3000/nulis?text=${encodeURIComponent(tulisan)}`, { responseType: 'arraybuffer' })
      await sock.sendMessage(sender, {
        image: res.data,
        caption: '📝 Nih hasil nulisnya...'
      }, { quoted: msg })
    }
  })
}

startBot()
