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

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>2FA Authenticator</title>
      <style>
        :root {
          --primary: #4361ee;
          --bg-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        body {
          font-family: 'Inter', -apple-system, system-ui, sans-serif;
          background: var(--bg-gradient);
          height: 100vh;
          margin: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          color: #2d3436;
        }
        .container {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          padding: 2.5rem;
          border-radius: 24px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
          width: 90%;
          max-width: 400px;
          text-align: center;
        }
        h1 {
          font-size: 1.2rem;
          margin-bottom: 1.5rem;
          color: #636e72;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .otp-display {
          font-size: 3.5rem;
          font-weight: 800;
          color: var(--primary);
          margin: 1rem 0;
          cursor: pointer;
          transition: transform 0.2s;
          letter-spacing: 4px;
        }
        .otp-display:active { transform: scale(0.95); }
        .progress-container {
          height: 6px;
          background: #dfe6e9;
          border-radius: 3px;
          margin: 1.5rem 0;
          overflow: hidden;
        }
        #progress-bar {
          height: 100%;
          background: var(--primary);
          width: 100%;
          transition: width 1s linear;
        }
        .info { font-size: 0.9rem; color: #b2bec3; margin-top: 1rem; word-break: break-all; }
        .toast {
          position: fixed;
          bottom: 20px;
          background: rgba(0,0,0,0.7);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 0.8rem;
          display: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1 id="title">Verification Code</h1>
        <div class="otp-display" id="otp" title="Click to copy">${otp}</div>
        <div class="progress-container"><div id="progress-bar"></div></div>
        <p id="expiry-text" style="font-size: 0.9rem; font-weight: 500;">Expiring in <span id="timer">30</span>s</p>
        <div class="info">Secret: ${secret}</div>
      </div>
      <div id="toast" class="toast">Copied!</div>

      <script>
        const lang = navigator.language.startsWith('zh') ? 'zh' : 'en';
        const i18n = {
          zh: { title: '您的验证码', expiry: '将在 {s} 秒后过期', toast: '已复制到剪贴板' },
          en: { title: 'Your Code', expiry: 'Expiring in {s}s', toast: 'Copied to clipboard' }
        };

        // 更新语言
        document.getElementById('title').innerText = i18n[lang].title;
        
        const updateTimer = () => {
          const now = Math.floor(Date.now() / 1000);
          const timeLeft = 30 - (now % 30);
          document.getElementById('timer').innerText = timeLeft;
          document.getElementById('progress-bar').style.width = (timeLeft / 30 * 100) + '%';
          
          document.getElementById('expiry-text').innerHTML = 
            i18n[lang].expiry.replace('{s}', '<span style="color:#e74c3c">' + timeLeft + '</span>');

          if (timeLeft === 30) {
             setTimeout(() => location.reload(), 500);
          }
        };

        setInterval(updateTimer, 1000);
        updateTimer();

        // 点击复制功能
        document.getElementById('otp').onclick = function() {
          const text = this.innerText;
          navigator.clipboard.writeText(text).then(() => {
            const toast = document.getElementById('toast');
            toast.innerText = i18n[lang].toast;
            toast.style.display = 'block';
            setTimeout(() => toast.style.display = 'none', 2000);
          });
        };
      </script>
    </body>
    </html>
  `;

  return new Response(htmlContent, {
    headers: { "Content-Type": "text/html; charset=UTF-8" },
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
