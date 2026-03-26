export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const url = new URL(request.url);
  let secret = url.searchParams.get('secret') || url.pathname.split('/').pop();

  if (secret) {
    secret = decodeURIComponent(secret).replace(/\s+/g, '');
  }

  if (!secret || secret === 'get-otp') {
    return new Response("Missing or invalid secret parameter", { status: 400 });
  }

  const otp = await generateOTP(secret);

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
        .otp-display { font-size: 3.5rem; font-weight: 800; color: var(--primary); margin: 1rem 0; cursor: pointer; transition: transform 0.2s; letter-spacing: 4px; font-variant-numeric: tabular-nums; }
        .otp-display:active { transform: scale(0.95); }
        .progress-container { height: 8px; background: #dfe6e9; border-radius: 4px; margin: 1.5rem 0; overflow: hidden; position: relative; }
        #progress-bar { height: 100%; background: var(--primary); width: 100%; transition: width 0.1s linear; }
        .info { font-size: 0.75rem; color: #b2bec3; margin-top: 1.5rem; word-break: break-all; opacity: 0.8; }
        .toast { position: fixed; bottom: 30px; background: rgba(0,0,0,0.8); color: white; padding: 10px 20px; border-radius: 25px; font-size: 0.85rem; display: none; z-index: 100; animation: fadeIn 0.3s; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      </style>
    </head>
    <body>
      <div class="container">
        <h1 id="title">Verification Code</h1>
        <div class="otp-display" id="otp" title="点击复制">${otp}</div>
        <div class="progress-container"><div id="progress-bar"></div></div>
        <p id="expiry-text" style="font-size: 0.95rem; font-weight: 500;">
          <span id="label-text">Expiring in</span> <span id="timer" style="color:#e74c3c">30</span>s
        </p>
        <div class="info">Secret: ${secret}</div>
      </div>
      <div id="toast" class="toast">Copied!</div>

      <script>
        const lang = navigator.language.startsWith('zh') ? 'zh' : 'en';
        const i18n = {
          zh: { title: '您的验证码', label: '将在', suffix: '秒后过期', toast: '已复制到剪贴板' },
          en: { title: 'Your Code', label: 'Expiring in', suffix: 's', toast: 'Copied to clipboard' }
        };

        // 初始化语言
        document.getElementById('title').innerText = i18n[lang].title;
        document.getElementById('label-text').innerText = i18n[lang].label;

        function update() {
          const now = Math.floor(Date.now() / 1000);
          const step = 30;
          const timeLeft = step - (now % step);
          
          const timerEl = document.getElementById('timer');
          const progressEl = document.getElementById('progress-bar');
          
          timerEl.innerText = timeLeft;
          // 倒计时文字逻辑，加上单位
          timerEl.nextSibling.textContent = i18n[lang].suffix;

          // 进度条百分比
          const percentage = (timeLeft / step) * 100;
          progressEl.style.width = percentage + '%';

          // 当倒计时刚好归零（即进入下一个30秒）时，自动刷新页面获取新OTP
          if (timeLeft === step) {
             location.reload();
          }
        }

        // 每1秒执行一次倒计时更新
        setInterval(update, 1000);
        update(); // 立即执行一次避免延迟

        // 点击复制功能
        document.getElementById('otp').onclick = function() {
          const text = this.innerText;
          navigator.clipboard.writeText(text).then(() => {
            const toast = document.getElementById('toast');
            toast.innerText = i18n[lang].toast;
            toast.style.display = 'block';
            setTimeout(() => { toast.style.display = 'none'; }, 2000);
          });
        };
      </script>
    </body>
    </html>`;

  return new Response(htmlContent, {
    headers: { 
      "Content-Type": "text/html; charset=UTF-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate", // 禁用缓存
    },
  });
}

// --- TOTP 核心算法函数（保持不变） ---
async function generateOTP(secret) {
  const epochTime = Math.floor(Date.now() / 1000);
  const timeStep = 30;
  let counter = Math.floor(epochTime / timeStep);
  const counterBytes = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = counter & 255;
    counter >>>= 8;
  }
  const key = await crypto.subtle.importKey(
    "raw",
    base32toByteArray(secret),
    { name: "HMAC", hash: { name: "SHA-1" } },
    false,
    ["sign"]
  );
  const hmacBuffer = await crypto.subtle.sign("HMAC", key, counterBytes.buffer);
  const hmacArray = Array.from(new Uint8Array(hmacBuffer));
  const offset = hmacArray[hmacArray.length - 1] & 15;
  const truncatedHash = hmacArray.slice(offset, offset + 4);
  const otpValue = new DataView(new Uint8Array(truncatedHash).buffer).getUint32(0) & 2147483647;
  return (otpValue % 1e6).toString().padStart(6, "0");
}

function base32toByteArray(base32) {
  const charTable = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const base32Chars = base32.toUpperCase().split("");
  const bits = base32Chars.map((char) => {
    const idx = charTable.indexOf(char);
    if (idx === -1) return "00000";
    return idx.toString(2).padStart(5, "0");
  }).join("");
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return new Uint8Array(bytes);
}
