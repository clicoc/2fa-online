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
      <title>2FA Authenticator | 在线2FA双重身份验证码获取</title>
      <meta name="description" content="安全、私密的在线2FA 验证器。Google Authenticator身份验证器网页版，纯本地计算，无刷新自动更新。">
      <style>
        :root { --primary: #4361ee; --bg-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: var(--bg-gradient); height: 100vh; margin: 0; display: flex; justify-content: center; align-items: center; color: #2d3436; overflow: hidden; }
        .container { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); padding: 2.5rem; border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); width: 90%; max-width: 400px; text-align: center; }
        h1 { font-size: 1.1rem; margin-bottom: 1.5rem; color: #636e72; text-transform: uppercase; letter-spacing: 1px; }
        input[type="text"] { width: 100%; padding: 14px; margin-bottom: 15px; border: 2px solid #dfe6e9; border-radius: 12px; font-size: 1rem; box-sizing: border-box; outline: none; transition: all 0.3s; background: rgba(255,255,255,0.5); }
        input[type="text"]:focus { border-color: var(--primary); background: white; }
        
        /* 按钮基础样式 */
        .btn-submit, .btn-secondary { border: none; padding: 12px; border-radius: 12px; font-size: 0.9rem; cursor: pointer; font-weight: 600; transition: all 0.2s; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; }
        
        .btn-submit { background: var(--primary); color: white; width: 100%; margin-bottom: 10px; }
        .btn-submit:hover { opacity: 0.9; transform: translateY(-1px); }

        /* 底部辅助按钮组 */
        .btn-group { display: flex; gap: 10px; margin-top: 20px; }
        .btn-secondary { background: #f1f2f6; color: #57606f; flex: 1; font-size: 0.8rem; border: 1px solid #dfe6e9; }
        .btn-secondary:hover { background: #dfe4ea; color: var(--primary); }

        .otp-display { font-size: 3.5rem; font-weight: 800; color: var(--primary); margin: 0.5rem 0; cursor: pointer; transition: transform 0.2s; letter-spacing: 4px; font-variant-numeric: tabular-nums; }
        .progress-container { height: 8px; background: #dfe6e9; border-radius: 4px; margin: 1.5rem 0; overflow: hidden; }
        #progress-bar { height: 100%; background: var(--primary); width: 100%; transition: width 1s linear; }
        .footer-info { font-size: 0.7rem; color: #b2bec3; margin-top: 1.5rem; word-break: break-all; opacity: 0.7; }
        .toast { position: fixed; bottom: 30px; background: rgba(0,0,0,0.8); color: white; padding: 10px 20px; border-radius: 25px; font-size: 0.85rem; display: none; z-index: 100; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1 id="title">2FA Authenticator</h1>
        ${!isResultPage ? `
          <form method="POST">
            <input type="text" name="secret" placeholder="Paste Secret here..." required autocomplete="off">
            <button type="submit" class="btn-submit" id="btn-text">Generate Code</button>
          </form>
          <div class="btn-group">
            <a href="/bulk" class="btn-secondary" id="bulk-entry">Bulk Mode</a>
          </div>
        ` : `
          <div class="otp-display" id="otp">------</div>
          <div class="progress-container"><div id="progress-bar"></div></div>
          <p style="font-size: 0.9rem; font-weight: 500; margin:0;">
            <span id="label-text">Expiring in</span> <span id="timer" style="color:#e74c3c">30</span>s
          </p>
          <div class="footer-info">
            Secret: ${secret}
            <div class="btn-group">
              <a href="/" class="btn-secondary" id="back-text">← New Secret</a>
              <a href="/bulk" class="btn-secondary" id="bulk-entry2">Bulk Mode</a>
            </div>
          </div>
        `}
      </div>
      <div id="toast" class="toast">Copied!</div>
      <script>
        const lang = navigator.language.startsWith('zh') ? 'zh' : 'en';
        const i18n = {
          zh: { title:'2FA 验证器', btn:'生成验证码', placeholder:'在此粘贴密钥...', label:'将在', suffix:'秒后过期', toast:'已复制', back:'← 输入新密钥', bulk:'批量模式' },
          en: { title:'2FA Authenticator', btn:'Generate Code', placeholder:'Paste Secret here...', label:'Expiring in', suffix:'s', toast:'Copied', back:'← New Secret', bulk:'Bulk Mode' }
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
              t.innerText = i18n[lang].toast + ": " + this.innerText;
              t.style.display = 'block'; setTimeout(() => t.style.display = 'none', 2000);
            });
          };
        }

        if ('serviceWorker' in navigator) {
          window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed:', err));
          });
        }
      </script>
    </body>
    </html>`;

  return new Response(htmlContent, { headers: { "Content-Type": "text/html; charset=UTF-8" } });
}
