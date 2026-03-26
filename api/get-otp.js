export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const url = new URL(request.url);
  const method = request.method;

  // 获取 Secret：优先级为 POST表单 > 查询参数 > 路径参数
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

  // 判定是否显示 OTP 结果
  let otp = "";
  let isResultPage = false;
  if (secret && secret !== 'get-otp' && secret !== '/' && secret !== 'favicon.ico') {
    try {
      otp = await generateOTP(secret);
      isResultPage = true;
    } catch (e) {
      secret = ""; // Secret 非法，回退到输入页
    }
  }

  const htmlContent = `<!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>2FA Authenticator</title>
      <style>
        :root { --primary: #4361ee; --bg-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: var(--bg-gradient); height: 100vh; margin: 0; display: flex; justify-content: center; align-items: center; color: #2d3436; overflow: hidden; }
        .container { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); padding: 2.5rem; border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); width: 90%; max-width: 400px; text-align: center; }
        h1 { font-size: 1.1rem; margin-bottom: 1.5rem; color: #636e72; text-transform: uppercase; letter-spacing: 1px; }
        
        /* 输入模式样式 */
        input[type="text"] { width: 100%; padding: 14px; margin-bottom: 15px; border: 2px solid #dfe6e9; border-radius: 12px; font-size: 1rem; box-sizing: border-box; outline: none; transition: all 0.3s; background: rgba(255,255,255,0.5); }
        input[type="text"]:focus { border-color: var(--primary); background: white; }
        .btn-submit { background: var(--primary); color: white; border: none; padding: 14px; border-radius: 12px; font-size: 1rem; cursor: pointer; width: 100%; font-weight: 600; transition: transform 0.2s, opacity 0.3s; }
        .btn-submit:active { transform: scale(0.98); }

        /* 结果显示样式 */
        .otp-display { font-size: 3.5rem; font-weight: 800; color: var(--primary); margin: 0.5rem 0; cursor: pointer; transition: transform 0.2s; letter-spacing: 4px; font-variant-numeric: tabular-nums; }
        .otp-display:active { transform: scale(0.95); }
        .progress-container { height: 8px; background: #dfe6e9; border-radius: 4px; margin: 1.5rem 0; overflow: hidden; }
        #progress-bar { height: 100%; background: var(--primary); width: 100%; transition: width 0.1s linear; }
        
        /* 隐蔽的底部信息和返回链接 */
        .footer-info { font-size: 0.7rem; color: #b2bec3; margin-top: 1.5rem; word-break: break-all; opacity: 0.7; }
        .back-link { display: inline-block; margin-top: 10px; color: #b2bec3; text-decoration: none; font-size: 0.7rem; transition: color 0.3s; opacity: 0.6; }
        .back-link:hover { color: #636e72; opacity: 1; }

        .toast { position: fixed; bottom: 30px; background: rgba(0,0,0,0.8); color: white; padding: 10px 20px; border-radius: 25px; font-size: 0.85rem; display: none; z-index: 100; animation: fadeIn 0.3s; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
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
        ` : `
          <div class="otp-display" id="otp" title="点击复制">${otp}</div>
          <div class="progress-container"><div id="progress-bar"></div></div>
          <p id="expiry-text" style="font-size: 0.9rem; font-weight: 500; margin:0;">
            <span id="label-text">Expiring in</span> <span id="timer" style="color:#e74c3c">30</span>s
          </p>
          <div class="footer-info">
            Secret: ${secret}<br>
            <a href="/" class="back-link" id="back-text">← New Secret</a>
          </div>
        `}
      </div>
      <div id="toast" class="toast">Copied!</div>

      <script>
        const lang = navigator.language.startsWith('zh') ? 'zh' : 'en';
        const i18n = {
          zh: { title: '2FA 验证器', btn: '生成验证码', placeholder: '在此粘贴密钥...', label: '将在', suffix: '秒后过期', toast: '已复制到剪贴板', back: '← 输入新密钥' },
          en: { title: '2FA Authenticator', btn: 'Generate Code', placeholder: 'Paste Secret here...', label: 'Expiring in', suffix: 's', toast: 'Copied to clipboard', back: '← New Secret' }
        };

        document.getElementById('title').innerText = i18n[lang].title;
        if(document.getElementById('btn-text')) document.getElementById('btn-text').innerText = i18n[lang].btn;
        if(document.getElementsByName('secret')[0]) document.getElementsByName('secret')[0].placeholder = i18n[lang].placeholder;
        if(document.getElementById('back-text')) document.getElementById('back-text').innerText = i18n[lang].back;

        const otpEl = document.getElementById('otp');
        if (otpEl) {
          function update() {
            const now = Math.floor(Date.now() / 1000);
            const timeLeft = 30 - (now % 30);
            document.getElementById('timer').innerText = timeLeft;
            document.getElementById('label-text').innerText = i18n[lang].label;
            document.getElementById('timer').nextSibling.textContent = i18n[lang].suffix;
            document.getElementById('progress-bar').style.width = (timeLeft / 30 * 100) + '%';
            if (timeLeft === 30) location.reload();
          }
          setInterval(update, 1000);
          update();

          otpEl.onclick = function() {
            navigator.clipboard.writeText(this.innerText).then(() => {
              const toast = document.getElementById('toast');
              toast.innerText = i18n[lang].toast;
              toast.style.display = 'block';
              setTimeout(() => toast.style.display = 'none', 2000);
            });
          };
        }
      </script>
    </body>
    </html>`;

  return new Response(htmlContent, {
    headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "no-store" },
  });
}

// --- TOTP 核心算法 (保持不变) ---
async function generateOTP(secret) {
  const epochTime = Math.floor(Date.now() / 1000);
  const timeStep = 30;
  let counter = Math.floor(epochTime / timeStep);
  const counterBytes = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) { counterBytes[i] = counter & 255; counter >>>= 8; }
  const key = await crypto.subtle.importKey("raw", base32toByteArray(secret), { name: "HMAC", hash: { name: "SHA-1" } }, false, ["sign"]);
  const hmacBuffer = await crypto.subtle.sign("HMAC", key, counterBytes.buffer);
  const hmacArray = Array.from(new Uint8Array(hmacBuffer));
  const offset = hmacArray[hmacArray.length - 1] & 15;
  const truncatedHash = hmacArray.slice(offset, offset + 4);
  const otpValue = new DataView(new Uint8Array(truncatedHash).buffer).getUint32(0) & 0x7fffffff;
  return (otpValue % 1e6).toString().padStart(6, "0");
}

function base32toByteArray(base32) {
  const charTable = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const base32Chars = base32.toUpperCase().replace(/=+$/, '').split("");
  const bits = base32Chars.map(c => {
    const i = charTable.indexOf(c);
    return (i === -1 ? "00000" : i.toString(2).padStart(5, "0"));
  }).join("");
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) { bytes.push(parseInt(bits.slice(i, i + 8), 2)); }
  return new Uint8Array(bytes);
}
