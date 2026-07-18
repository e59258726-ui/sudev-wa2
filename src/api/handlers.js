import { generateQR, generatePairing, sendMessage, getAccounts } from '../core/whatsapp.js';
import { startWarmup, stopWarmup, getWarmupStatus } from '../core/progress.js';

export async function handleStatus(env) {
    const db = env.DB;
    try {
        const accounts = await db.prepare('SELECT COUNT(*) as count FROM accounts').first();
        const online = await db.prepare('SELECT COUNT(*) as count FROM accounts WHERE status = "online"').first();
        return new Response(JSON.stringify({
            status: 'running',
            timestamp: new Date().toISOString(),
            accounts: accounts?.count || 0,
            online: online?.count || 0,
            warmup: await getWarmupStatus()
        }), { headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function handleAccounts(env) {
    try {
        const db = env.DB;
        const result = await db.prepare('SELECT * FROM accounts ORDER BY created_at DESC').all();
        return new Response(JSON.stringify(result.results || []), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function handleCreateAccount(request, env) {
    try {
        const body = await request.json();
        const { phone, name, method = 'qr' } = body;

        if (!phone || !name) {
            return new Response(JSON.stringify({ error: 'Телефон и имя обязательны' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!phone.startsWith('+')) {
            return new Response(JSON.stringify({ error: 'Номер должен начинаться с +' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const db = env.DB;
        const existing = await db.prepare('SELECT id FROM accounts WHERE phone = ?').bind(phone).first();
        if (existing) {
            return new Response(JSON.stringify({ error: 'Аккаунт уже существует' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        await db.prepare(
            'INSERT INTO accounts (phone, name, status, auth_method, trust_score, warmup_level, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(phone, name, 'waiting_qr', method, 0, 0, new Date().toISOString(), new Date().toISOString()).run();

        let qr = null;
        let code = null;

        if (method === 'qr') {
            qr = await generateQR(phone);
        } else {
            code = await generatePairing(phone);
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'Аккаунт создается...',
            phone,
            name,
            method,
            qr,
            code
        }), { headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function handleDeleteAccount(request, env) {
    try {
        const body = await request.json();
        const { phone } = body;

        if (!phone) {
            return new Response(JSON.stringify({ error: 'Телефон обязателен' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const db = env.DB;
        await db.prepare('DELETE FROM accounts WHERE phone = ?').bind(phone).run();
        await db.prepare('DELETE FROM sessions WHERE phone = ?').bind(phone).run();

        return new Response(JSON.stringify({
            success: true,
            message: 'Аккаунт удален'
        }), { headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function handleQR(request, env) {
    try {
        const body = await request.json();
        const { phone } = body;

        if (!phone) {
            return new Response(JSON.stringify({ error: 'Телефон обязателен' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const qr = await generateQR(phone);
        const db = env.DB;
        await db.prepare('UPDATE accounts SET qr_code = ? WHERE phone = ?').bind(qr, phone).run();

        return new Response(JSON.stringify({
            success: true,
            qr: qr,
            phone: phone
        }), { headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function handlePairing(request, env) {
    try {
        const body = await request.json();
        const { phone } = body;

        if (!phone) {
            return new Response(JSON.stringify({ error: 'Телефон обязателен' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const code = await generatePairing(phone);
        const db = env.DB;
        await db.prepare('UPDATE accounts SET pairing_code = ? WHERE phone = ?').bind(code, phone).run();

        return new Response(JSON.stringify({
            success: true,
            code: code,
            phone: phone
        }), { headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function handleSendMessage(request, env) {
    try {
        const body = await request.json();
        const { from, to, text } = body;

        if (!from || !to || !text) {
            return new Response(JSON.stringify({ error: 'from, to, text обязательны' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const result = await sendMessage(from, to, text);
        const db = env.DB;
        await db.prepare(
            'INSERT INTO messages (from_phone, to_phone, text, is_incoming, sent_at) VALUES (?, ?, ?, ?, ?)'
        ).bind(from, to, text, 0, new Date().toISOString()).run();

        return new Response(JSON.stringify({
            success: true,
            result: result
        }), { headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function handleWarmupStart(request, env) {
    try {
        const body = await request.json();
        const { hours = 3, intensity = 'medium' } = body;
        const result = await startWarmup(hours, intensity);
        return new Response(JSON.stringify({ success: true, result: result }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function handleWarmupStop(env) {
    try {
        const result = await stopWarmup();
        return new Response(JSON.stringify({ success: true, result: result }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function handleWarmupStatus(env) {
    try {
        const status = await getWarmupStatus();
        return new Response(JSON.stringify(status), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function handleStats(env) {
    try {
        const db = env.DB;
        const accounts = await db.prepare('SELECT * FROM accounts').all();
        const messages = await db.prepare('SELECT COUNT(*) as count FROM messages').first();

        const totalAccounts = accounts.results || [];
        const online = totalAccounts.filter(a => a.status === 'online').length;
        const totalTrust = totalAccounts.reduce((sum, a) => sum + (a.trust_score || 0), 0);
        const avgTrust = totalAccounts.length > 0 ? totalTrust / totalAccounts.length : 0;

        return new Response(JSON.stringify({
            totalAccounts: totalAccounts.length,
            onlineAccounts: online,
            totalMessages: messages?.count || 0,
            averageTrust: avgTrust,
            accounts: totalAccounts
        }), { headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function handleSessionsClean(env) {
    try {
        const db = env.DB;
        await db.prepare('DELETE FROM sessions').run();
        return new Response(JSON.stringify({
            success: true,
            message: 'Все сессии очищены'
        }), { headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}