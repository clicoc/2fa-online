export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const url = new URL(request.url);
  const method = request.method;

  let secret = "";
  if (method === "POST") {
    try {
      const formData = await request.formData();
      secret = formData.get("secret");
    } catch (e) {}
  } else {
    secret = url.searchParams.get('secret') || url.pathname.split('/').pop();
  }

  if (secret) {
    secret = decodeURIComponent(secret).trim().replace(/\s+/g, '');
  }

  const isResultPage = !!(secret && !['get-otp', '/', 'favicon.ico', 'bulk'].includes(secret.toLowerCase()));

  const htmlContent = `<!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>2FA Authenticator | 在线2FA验证器</title>
      <style>
        :root { 
          --primary: #4361ee; 
          --primary-hover: #374ccf;
          --bg-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          --glass-bg: rgba(255, 255, 255, 0.85);
          --btn-secondary-bg: rgba(255, 255, 255, 0.4);
        }
        
        body { 
          font-family: 'Inter', -apple-system, sans-serif; 
          background: var(--bg-gradient); 
          height: 100vh; margin: 0; 
          display: flex; justify-content: center; align-items: center; 
          color: #2d3436; overflow: hidden; 
        }

        .container { 
          background: var(--glass-bg); 
          backdrop-filter: blur(15px); 
          -webkit-backdrop-filter: blur(15px);
          padding: 2.5rem; border-radius: 28px; 
          box-shadow: 0 25px 50px rgba(0,0,0,0.15); 
          width: 90%; max-width: 380px; text-align: center;
          border: 1px solid rgba(255,255,255,0.3);
        }

        h1 { font-size: 1rem; margin-bottom: 2rem; color: #636e72; text-transform: uppercase; letter-spacing: 2px; font-weight: 700; }
        
        input[type="text"] { 
          width: 100%; padding: 16px; margin-bottom: 20px; 
          border: 1px solid rgba(0,0,0,0.1); border-radius: 16px; 
          font-size: 1rem; box-sizing: border-box; outline: none; 
          transition: all 0.3s; background: rgba(255,255,255,0.5); 
        }
        input[type="text"]:focus { border-color: var(--primary); background: white; box-shadow: 0 0 0 4px rgba(67, 97, 238, 0.1); }

        /* 按钮容器 */
        .btn-stack { display: flex; flex-direction: column; gap: 12px; margin-top: 10px; }
        .btn-row { display: flex; gap: 12px; margin-top: 25px; }

        /* 通用按钮样式 */
        .btn { 
          padding: 14px; border-radius: 16px; font-size: 0.95rem; 
          cursor: pointer; font-weight: 600; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          text-decoration: none; border: none; display: inline-flex; align-items: center; justify-content: center;
        }

        /* 主按钮 */
        .btn-primary { background: var(--primary); color: white; width: 100%; box-shadow: 0 8px 20px rgba(67, 97, 238, 0.25); }
        .btn-primary:hover { background: var(--primary-hover); transform: translateY(-2px); box-shadow: 0 12px 24px rgba(67, 97, 238, 0.35); }
        .btn-primary:active { transform: translateY(0); }

        /* 辅助按钮（毛玻璃质感） */
        .btn-secondary { 
          background: var(--btn-secondary-bg); color: #4b5563; flex: 1;
          border: 1px solid rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(5px);
        }
        .btn-secondary:hover { background: rgba(255, 255, 255, 0.6); color: var(--primary); border-color: var(--primary); }

        /* OTP 显示区域 */
        .otp-display { font-size: 3.8rem; font-weight: 800; color: var(--primary); margin: 0.5rem 0; cursor: pointer; letter-spacing: 4px; font-variant-numeric: tabular-nums; }
        .progress-container { height: 6px; background: rgba(0,0,0,0.05); border-radius: 10px; margin: 1.5rem 0; overflow: hidden; }
        #progress-bar { height: 100%; background: var(--primary); width: 100%; transition: width 1s linear; }
        
        .footer-info { font-size: 0.75rem; color: #9ca3af; margin-top: 2rem; word-break: break-all; }
        .toast { position: fixed; bottom: 40px; background: rgba(0,0,0,0.7); backdrop-filter: blur(10px); color: white; padding: 12px 24px; border-radius: 50px; font-size: 0.9rem; display: none; z-index: 100; animation: slideUp 0.3s ease; }
        
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      </style>
    </head>
    <body>
      <div class="container">
        <h1 id="title">2FA Authenticator</h1>
        ${!isResultPage ? `
          <form method="POST" class="btn-stack">
            <input type="text" name="secret" placeholder="Paste Secret here..." required autocomplete="off">
            <button type="submit" class="btn btn-primary" id="btn-text">Generate Code</button>
            <a href="/bulk" class="btn btn-secondary" id="bulk-entry">Bulk Mode</a>
          </form>
        ` : `
          <div class="otp-display" id="otp" title="Click to copy">------</div>
          <div class="progress-container"><div id="progress-bar"></div></div>
          <p style="font-size: 0.9rem; font-weight: 500; color: #666;">
            <span id="label-text">Expiring in</span> <span id="timer" style="color:#ef4444">30</span>s
          </p>
          <div class="footer-info">
            <div style="margin-bottom: 15px; opacity: 0.6;">Key: ${secret}</div>
            <div class="btn-row">
              <a href="/" class="btn btn-secondary" id="back-text">New Key</a>
              <a href="/bulk" class="btn btn-secondary" id="bulk-entry2">Bulk Mode</a>
            </div>
          </div>
        `}
      </div>
      <div id="toast" class="toast">Copied!</div>
      
      <script>
        const lang = navigator.language.startsWith('zh') ? 'zh' : 'en';
        const i18n = {
          zh: { title:'2FA 验证器', btn:'生成验证码', placeholder:'在此粘贴密钥...', label:'将在', suffix:'秒后过期', toast:'验证码已复制', back:'新密钥', bulk:'批量模式' },
          en: { title:'2FA Authenticator', btn:'Generate Code', placeholder:'Paste Secret here...', label:'Expiring in', suffix:'s', toast:'Copied to clipboard', back:'New Key', bulk:'Bulk Mode' }
        };
        
        const updateUI = (id, text) => { const el = document.getElementById(id); if(el) el.innerText = text; };
        updateUI('title', i18n[lang].title); 
        updateUI('btn-text', i18n[lang].btn);
        if(document.getElementsByName('secret')[0]) document.getElementsByName('secret')[0].placeholder = i18n[lang].placeholder;
        updateUI('back-text', i18n[lang].back); 
        updateUI('bulk-entry', i18n[lang].bulk); 
        updateUI('bulk-entry2', i18n[lang].bulk);

        const secret = "${secret}";
        function base32toBuf(b32) {
          const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
          let bits = "";
          for (let i = 0; i < b32.length; i++) {
            const val = alphabet.indexOf(b32.charAt(i).toUpperCase());
            if (val >= 0) bits += val.toString(2).padStart(5, '0');
          }
          const buf = new Uint8Array(Math.floor(bits.length / 8));
          for (let i = 0; i < buf.length; i++) buf[i] = parseInt(bits.substr(i * 8, 8), 2);
          return buf;
        }

        async function getOTP(keyStr) {
          try {
            const epoch = Math.floor(Date.now() / 1000);
            const counter = Math.floor(epoch / 30);
            const packet = new Uint8Array(8);
            let c = BigInt(counter);
            for (let i = 7; i >= 0; i--) { packet[i] = Number(c & 0xffn); c >>= 8n; }
            const keyBuf = base32toBuf(keyStr);
            const cryptoKey = await window.crypto.subtle.importKey("raw", keyBuf, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
            const signature = await window.crypto.subtle.sign("HMAC", cryptoKey, packet);
            const hmac = new Uint8Array(signature);
            const offset = hmac[hmac.length - 1] & 0xf;
            const code = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
            return (code % 1000000).toString().padStart(6, '0');
          } catch (e) { return "ERROR"; }
        }

        const otpEl = document.getElementById('otp');
        if (otpEl && secret) {
          async function tick() {
            const now = Math.floor(Date.now() / 1000);
            const timeLeft = 30 - (now % 30);
            if (timeLeft === 30 || otpEl.innerText === "------") otpEl.innerText = await getOTP(secret);
            document.getElementById('timer').innerText = timeLeft;
            document.getElementById('label-text').innerText = i18n[lang].label;
            document.getElementById('timer').nextSibling.textContent = i18n[lang].suffix;
            document.getElementById('progress-bar').style.width = (timeLeft / 30 * 100) + '%';
          }
          setInterval(tick, 1000); tick();
          otpEl.onclick = function() {
            navigator.clipboard.writeText(this.innerText).then(() => {
              const t = document.getElementById('toast');
              t.innerText = i18n[lang].toast;
              t.style.display = 'block'; setTimeout(() => t.style.display = 'none', 2000);
            });
          };
        }
      </script>
    </body>
    </html>`;

  return new Response(htmlContent, { headers: { "Content-Type": "text/html; charset=UTF-8" } });
}
