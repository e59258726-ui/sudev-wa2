import { default as makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import QRCode from 'qrcode';

let clients = new Map();

export async function generateQR(phone) {
    try {
        const sessionDir = `./data/sessions/${phone}`;
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        const socket = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: ['sudev-wa', 'Chrome', '120.0.0']
        });

        clients.set(phone, socket);

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Таймаут получения QR'));
            }, 30000);

            socket.ev.on('connection.update', async (update) => {
                const { qr, connection } = update;

                if (qr) {
                    clearTimeout(timeout);
                    const qrBuffer = await QRCode.toBuffer(qr, {
                        width: 400,
                        margin: 2,
                        color: { dark: '#075E54', light: '#ffffff' }
                    });
                    resolve(`data:image/png;base64,${qrBuffer.toString('base64')}`);
                }

                if (connection === 'open') {
                    clearTimeout(timeout);
                    resolve('connected');
                }
            });
        });
    } catch (error) {
        console.error('Ошибка QR:', error);
        throw error;
    }
}

export async function generatePairing(phone) {
    try {
        const sessionDir = `./data/sessions/${phone}`;
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        const socket = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: ['sudev-wa', 'Chrome', '120.0.0']
        });

        clients.set(phone, socket);
        const code = await socket.requestPairingCode(phone.replace('+', ''));
        return code;
    } catch (error) {
        console.error('Ошибка парного кода:', error);
        throw error;
    }
}

export async function sendMessage(from, to, text) {
    try {
        const client = clients.get(from);
        if (!client) throw new Error('Клиент не найден');
        return await client.sendMessage(to, { text });
    } catch (error) {
        console.error('Ошибка отправки:', error);
        throw error;
    }
}

export async function getAccounts() {
    const accounts = [];
    for (const [phone, client] of clients) {
        accounts.push({
            phone,
            status: client.user ? 'online' : 'offline'
        });
    }
    return accounts;
}

export async function closeClient(phone) {
    const client = clients.get(phone);
    if (client) {
        await client.ws.close();
        clients.delete(phone);
    }
}

export async function closeAllClients() {
    for (const [phone, client] of clients) {
        try {
            await client.ws.close();
        } catch (e) {}
    }
    clients.clear();
}