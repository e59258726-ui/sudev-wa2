import {
    handleStatus,
    handleAccounts,
    handleCreateAccount,
    handleDeleteAccount,
    handleQR,
    handlePairing,
    handleSendMessage,
    handleWarmupStart,
    handleWarmupStop,
    handleWarmupStatus,
    handleStats,
    handleSessionsClean
} from './handlers.js';

export async function handleRequest(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Статус
    if (path === '/api/status' && method === 'GET') {
        return handleStatus(env);
    }

    // Аккаунты
    if (path === '/api/accounts' && method === 'GET') {
        return handleAccounts(env);
    }
    if (path === '/api/accounts' && method === 'POST') {
        return handleCreateAccount(request, env);
    }
    if (path === '/api/accounts' && method === 'DELETE') {
        return handleDeleteAccount(request, env);
    }

    // QR
    if (path === '/api/qr' && method === 'POST') {
        return handleQR(request, env);
    }

    // Парный код
    if (path === '/api/pairing' && method === 'POST') {
        return handlePairing(request, env);
    }

    // Сообщения
    if (path === '/api/messages' && method === 'POST') {
        return handleSendMessage(request, env);
    }

    // Прогрев
    if (path === '/api/warmup/start' && method === 'POST') {
        return handleWarmupStart(request, env);
    }
    if (path === '/api/warmup/stop' && method === 'POST') {
        return handleWarmupStop(env);
    }
    if (path === '/api/warmup/status' && method === 'GET') {
        return handleWarmupStatus(env);
    }

    // Статистика
    if (path === '/api/stats' && method === 'GET') {
        return handleStats(env);
    }

    // Очистка сессий
    if (path === '/api/sessions/clean' && method === 'POST') {
        return handleSessionsClean(env);
    }

    // Веб-интерфейс
    if (path === '/') {
        const html = await getIndexHtml();
        return new Response(html, {
            headers: { 'Content-Type': 'text/html' }
        });
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
    });
}

async function getIndexHtml() {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>sudev-wa2</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,sans-serif;background:#075E54;min-height:100vh;display:flex;justify-content:center;align-items:center;padding:20px}
.container{background:#fff;border-radius:20px;padding:40px;max-width:500px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3)}
.logo{text-align:center;font-size:60px}
h1{text-align:center;color:#075E54;font-size:28px;margin:10px 0}
.subtitle{text-align:center;color:#666;margin-bottom:30px}
.stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px}
.stat{background:#f8f9fa;padding:15px;border-radius:10px;text-align:center}
.stat .value{font-size:24px;font-weight:700;color:#075E54}
.stat .label{font-size:12px;color:#999}
.input-group{margin-bottom:15px}
.input-group label{display:block;font-weight:500;margin-bottom:5px}
.input-group input,.input-group select{width:100%;padding:12px;border:2px solid #e0e0e0;border-radius:10px;font-size:16px}
.btn{width:100%;padding:14px;border:none;border-radius:10px;font-size:16px;font-weight:600;cursor:pointer;transition:0.3s;margin-top:10px}
.btn-primary{background:#075E54;color:#fff}
.btn-primary:hover{background:#064a42;transform:translateY(-2px)}
.btn-success{background:#25D366;color:#fff}
.btn-success:hover{background:#1da851;transform:translateY(-2px)}
.qr-container{text-align:center;padding:20px;background:#f8f9fa;border-radius:10px;margin:15px 0;display:none}
.qr-container.active{display:block}
.qr-container img{max-width:200px;border-radius:10px}
.footer{text-align:center;margin-top:20px;font-size:12px;color:#999}
.footer a{color:#075E54;text-decoration:none}
.alert{padding:12px;border-radius:10px;margin-bottom:15px;display:none}
.alert.show{display:block}
.alert-success{background:#d4edda;color:#155724}
.alert-error{background:#f8d7da;color:#721c24}
.alert-info{background:#d1ecf1;color:#0c5460}
</style>
</head>
<body>
<div class="container">
<div class="logo">🤖</div>
<h1>sudev-wa2</h1>
<p class="subtitle">WhatsApp Auto-Progress</p>
<div id="alert" class="alert"></div>
<div class="stats">
<div class="stat"><div class="value" id="statAccounts">0</div><div class="label">Аккаунтов</div></div>
<div class="stat"><div class="value" id="statOnline">0</div><div class="label">Онлайн</div></div>
</div>
<div class="qr-container" id="qrContainer"><p>📱 QR-код</p><img id="qrImage" src=""><p style="font-size:12px;color:#999;margin-top:10px;">Отсканируйте в WhatsApp</p></div>
<div class="input-group"><label>📞 Номер телефона</label><input type="text" id="phoneInput" placeholder="+79637332642"></div>
<div class="input-group"><label>👤 Имя аккаунта</label><input type="text" id="nameInput" placeholder="Мой аккаунт"></div>
<div class="input-group"><label>🔐 Метод</label><select id="methodSelect"><option value="qr">QR-код</option><option value="pairing">Парный код</option></select></div>
<button class="btn btn-success" onclick="addAccount()">➕ Добавить аккаунт</button>
<button class="btn btn-primary" onclick="loadStatus()" style="margin-top:5px;">🔄 Обновить</button>
<div class="footer"><p><a href="/api/status">📊 API</a> | <a href="/api/accounts">📱 Accounts</a></p><p style="margin-top:5px;">sudev-wa2 | Cloudflare</p></div>
</div>
<script>
const API_URL=window.location.origin;
function showAlert(m,t='info'){const a=document.getElementById('alert');a.className='alert alert-'+t+' show';a.textContent=m;setTimeout(()=>a.classList.remove('show'),5000);}
async function loadStatus(){try{const r=await fetch(API_URL+'/api/status');const d=await r.json();document.getElementById('statAccounts').textContent=d.accounts||0;document.getElementById('statOnline').textContent=d.online||0;}catch(e){console.error(e);}}
async function addAccount(){const phone=document.getElementById('phoneInput').value.trim();const name=document.getElementById('nameInput').value.trim()||phone;const method=document.getElementById('methodSelect').value;if(!phone||!phone.startsWith('+')){showAlert('❌ Введите корректный номер (+79637332642)','error');return;}
try{showAlert('⏳ Добавление аккаунта...','info');const r=await fetch(API_URL+'/api/accounts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone,name,method})});const d=await r.json();if(d.success){showAlert('✅ Аккаунт '+name+' создается...','success');if(d.qr){document.getElementById('qrContainer').classList.add('active');document.getElementById('qrImage').src=d.qr;}
if(d.code){showAlert('🔢 Парный код: '+d.code,'info');}
document.getElementById('phoneInput').value='';document.getElementById('nameInput').value='';loadStatus();}else{showAlert('❌ '+(d.error||'Ошибка'),'error');}}catch(e){showAlert('❌ '+e.message,'error');}}
loadStatus();setInterval(loadStatus,30000);
document.getElementById('phoneInput').addEventListener('keypress',(e)=>{if(e.key==='Enter')addAccount();});
</script>
</body>
</html>`;
}