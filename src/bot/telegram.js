// src/bot/telegram.js - Telegram бот для Cloudflare

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN не найден');
}

// Простая отправка сообщений через Telegram API
export async function sendTelegramMessage(chatId, text, parseMode = 'Markdown') {
    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: parseMode
            })
        });

        return await response.json();
    } catch (error) {
        console.error('Ошибка отправки в Telegram:', error);
        return null;
    }
}

// Клавиатуры
export const mainMenu = {
    keyboard: [
        ['📱 Мои аккаунты', '➕ Добавить аккаунт'],
        ['⚡ Запустить прогрев', '⏹ Остановить всё'],
        ['📊 Статистика', '📈 Отчет']
    ],
    resize_keyboard: true
};

export const cancelMenu = {
    keyboard: [['❌ Отмена']],
    resize_keyboard: true
};

// Обработка входящих сообщений из Telegram
export async function handleTelegramUpdate(update, env) {
    if (!update.message) return;

    const chatId = update.message.chat.id;
    const text = update.message.text;
    const userId = update.message.from.id;

    // Команды
    if (text === '/start') {
        return sendTelegramMessage(chatId,
            '🤖 *WhatsApp Bot Manager (Cloudflare)*\n\n' +
            'Управляйте своими WhatsApp аккаунтами\n\n' +
            '📌 Выберите действие:',
            'Markdown'
        );
    }

    if (text === '📱 Мои аккаунты') {
        return handleAccounts(chatId, env);
    }

    if (text === '➕ Добавить аккаунт') {
        return sendTelegramMessage(chatId,
            '📱 *Добавление аккаунта*\n\n' +
            'Отправьте номер телефона:\n' +
            '`+79637332642`\n\n' +
            '❌ Для отмены нажмите "Отмена"',
            'Markdown'
        );
    }

    if (text === '📊 Статистика') {
        return handleStats(chatId, env);
    }

    if (text === '📈 Отчет') {
        return handleReport(chatId, env);
    }

    if (text === '⚡ Запустить прогрев') {
        return sendTelegramMessage(chatId,
            '⏱ *Выберите длительность:*\n\n' +
            '3 часа\n' +
            '6 часов\n' +
            '12 часов',
            'Markdown'
        );
    }

    if (text === '⏹ Остановить всё') {
        return sendTelegramMessage(chatId, '⏹ Всё остановлено');
    }

    if (text === '❌ Отмена') {
        return sendTelegramMessage(chatId, '❌ Отменено');
    }

    return null;
}

// ============ ОБРАБОТЧИКИ ============

async function handleAccounts(chatId, env) {
    try {
        const db = env.DB;
        const result = await db.prepare('SELECT * FROM accounts ORDER BY created_at DESC').all();
        const accounts = result.results || [];

        if (accounts.length === 0) {
            return sendTelegramMessage(chatId, '📭 *У вас нет аккаунтов*', 'Markdown');
        }

        let message = '📱 *Мои аккаунты*\n\n';
        accounts.forEach(acc => {
            const statusEmoji = acc.status === 'online' ? '🟢' : '🔴';
            message += `${statusEmoji} *${acc.name || acc.phone}*\n`;
            message += `   📞 \`${acc.phone}\`\n`;
            message += `   📊 Доверие: ${(acc.trust_score || 0).toFixed(1)}%\n`;
            message += `   📌 Статус: ${acc.status || 'offline'}\n\n`;
        });

        return sendTelegramMessage(chatId, message, 'Markdown');
    } catch (error) {
        return sendTelegramMessage(chatId, '❌ Ошибка получения аккаунтов');
    }
}

async function handleStats(chatId, env) {
    try {
        const db = env.DB;
        const accounts = await db.prepare('SELECT COUNT(*) as count FROM accounts').first();
        const online = await db.prepare('SELECT COUNT(*) as count FROM accounts WHERE status = "online"').first();
        const messages = await db.prepare('SELECT COUNT(*) as count FROM messages').first();

        const message = `📊 *Статистика*\n\n` +
            `👥 Аккаунтов: ${accounts?.count || 0}\n` +
            `🟢 Онлайн: ${online?.count || 0}\n` +
            `💬 Сообщений: ${messages?.count || 0}\n`;

        return sendTelegramMessage(chatId, message, 'Markdown');
    } catch (error) {
        return sendTelegramMessage(chatId, '❌ Ошибка получения статистики');
    }
}

async function handleReport(chatId, env) {
    try {
        const db = env.DB;
        const result = await db.prepare('SELECT * FROM accounts ORDER BY trust_score DESC').all();
        const accounts = result.results || [];

        if (accounts.length === 0) {
            return sendTelegramMessage(chatId, '📭 Нет данных', 'Markdown');
        }

        let report = '📈 *Отчет*\n\n';
        report += `📅 ${new Date().toLocaleDateString()}\n\n`;

        accounts.forEach((acc, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
            report += `${medal} ${acc.name || acc.phone}: ${(acc.trust_score || 0).toFixed(1)}%\n`;
        });

        return sendTelegramMessage(chatId, report, 'Markdown');
    } catch (error) {
        return sendTelegramMessage(chatId, '❌ Ошибка получения отчета');
    }
}

// Webhook для Telegram
export async function handleTelegramWebhook(request, env) {
    try {
        const update = await request.json();
        await handleTelegramUpdate(update, env);
        return new Response('OK', { status: 200 });
    } catch (error) {
        console.error('Webhook error:', error);
        return new Response('ERROR', { status: 500 });
    }
}

// Установка вебхука
export async function setTelegramWebhook(url) {
    try {
        const webhookUrl = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`;
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url + '/webhook' })
        });
        return await response.json();
    } catch (error) {
        console.error('Ошибка установки вебхука:', error);
        return null;
    }
}