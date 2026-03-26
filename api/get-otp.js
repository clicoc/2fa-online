// api/get-otp.js
export const config = {
  runtime: 'edge', // 强制开启 Edge Runtime 以获得类似 CF Workers 的性能
};

export default async function handler(request) {
  const url = new URL(request.url);
  
  // Vercel 路由通常通过查询参数或路径获取
  // 假设你访问 /api/get-otp?secret=YOURSECRET
  let secret = url.searchParams.get('secret');

  // 如果你想保持原有的路径风格（如 /api/YOURSECRET），可以用以下逻辑：
  if (!secret) {
    secret = url.pathname.split('/').pop();
  }

  if (secret) {
    secret = decodeURIComponent(secret).replace(/\s+/g, '');
  }

  if (!secret || secret === 'get-otp') {
    return new Response("缺少或无效的 secret 参数", { status: 400 });
  }

  const loadTime = Math.floor(Date.now() / 1000);
  const otp = await generateOTP(secret);
  const expiresAt = new Date((loadTime + 30) * 1000).toISOString();

  const htmlContent = `
    <html>
      <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
        <h1>您的 2FA 验证码</h1>
        <div style="font-size: 48px; color: #1e90ff; font-weight: bold;">${otp}</div>
        <p>Secret: ${secret}</p>
        <p>将在 <span id="timer">30</span> 秒后过期</p>
        <script>
          let timeLeft = 30;
          setInterval(() => {
            timeLeft--;
            if (timeLeft <= 0) location.reload();
            document.getElementById('timer').innerText = timeLeft;
          }, 1000);
        </script>
      </body>
    </html>
  `;

  return new Response(htmlContent, {
    headers: { "Content-Type": "text/html; charset=UTF-8" },
  });
}

// --- 以下是你的逻辑函数，保持不变 ---

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
