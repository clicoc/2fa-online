export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const htmlContent = `<!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bulk 2FA Authenticator</title>
      <script src="https://cdn.jsdelivr.net/npm/otpauth@9.1.4/dist/otpauth.umd.min.js"></script>
      <style>
        :root { --primary: #4361ee; --bg-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        body { font-family: 'Inter', system-ui, sans-serif; background: var(--bg-gradient); min-height: 100vh; margin: 0; display: flex; justify-content: center; padding: 40px 20px; color: #2d3436; box-sizing: border-box; }
        .container { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); padding: 2rem; border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); width: 100%; max-width: 800px; }
        h1 { font-size: 1.5rem; text-align: center; color: #636e72; margin-bottom: 1.5rem; text-transform: uppercase; letter-spacing: 1px; }
        textarea { width: 100%; height: 150px; padding: 15px; border: 2px solid #dfe6e9; border-radius: 12px; font-size: 0.9rem; box-sizing: border-box; outline: none; background: rgba(255,255,255,0.5); font-family: monospace; transition: all 0.3s; }
        textarea:focus { border-color: var(--primary); background: white; }
        button { background: var(--primary); color: white; border: none; padding: 14px; border-radius: 12px; font-size: 1rem; cursor: pointer; width: 100%; font-weight: 600; margin: 20px 0; transition: transform 0.2s; }
        button:active { transform: scale(0.98); }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
        th { background: #f8f9fa; color: #636e72; font-size: 0.85rem; padding: 12px; text-transform: uppercase; }
        td { padding: 15px; text-align: center; border-bottom: 1px solid #f1f2f6; font-size: 0.95rem; }
        .code { font-size: 1.4rem; font-weight: 800; color: var(--primary); cursor: pointer; letter-spacing: 2px; font-variant-numeric: tabular-nums; }
        .remain { color: #e74c3c; font-weight: bold; width: 80px; }
        .back-link { display: block; text-align: center; margin-top: 20px; color: #b2bec3; text-decoration: none; font-size: 0.8rem; opacity: 0.8; }
        .back-link:hover { color: var(--primary); }
        .toast { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: white; padding: 10px 20px; border-radius: 25px; font-size: 0.85rem; display: none; z-index: 100; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1 id="title">Bulk 2FA</h1>
        <p id="tip" style="font-size: 0.8rem; color: #95a5a6; margin-bottom: 10px;">Format: Account [Space/Tab] Secret</p>
        <textarea id="inputBox" placeholder="Example:\nGoogleValue JBSWY3DPEHPK3PXP\nMyAccount 4S6C7G..."></textarea>
        <button onclick="loadAccounts()" id="btn-text">Generate All</button>
        <table id="resultTable" style="display:none;">
          <thead>
            <tr>
              <th id="th-acc">Account</th>
              <th id="th-code">OTP (Click)</th>
              <th id="th-time">Left</th>
            </tr>
          </thead>
          <tbody id="tableBody"></tbody>
        </table>
        <a href="/" class="back-link" id="back-text">← Single OTP Mode</a>
      </div>
      <div id="toast" class="toast">Copied!</div>
      <script>
        const lang = navigator.language.startsWith('zh') ? 'zh' : 'en';
        const i18n = {
          zh: { title: '批量验证码生成', btn: '开始生成', thAcc: '账号', thCode: '验证码 (点击复制)', thTime: '剩余', toast: '已复制', tip: '格式：账号 [空格/Tab] 密钥', back: '← 单账号模式' },
          en: { title: 'Bulk 2FA', btn: 'Generate All', thAcc: 'Account', thCode: 'OTP (Click)', thTime: 'Left', toast: 'Copied', tip: 'Format: Account [Space/Tab] Secret', back: '← Single OTP Mode' }
        };
        document.getElementById('title').innerText = i18n[lang].title;
        document.getElementById('btn-text').innerText = i18n[lang].btn;
        document.getElementById('tip').innerText = i18n[lang].tip;
        document.getElementById('th-acc').innerText = i18n[lang].thAcc;
        document.getElementById('th-code').innerText = i18n[lang].thCode;
        document.getElementById('th-time').innerText = i18n[lang].thTime;
        document.getElementById('back-text').innerText = i18n[lang].back;

        let accounts = [];
        function loadAccounts() {
          const lines = document.getElementById("inputBox").value.trim().split("\\n");
          accounts = [];
          for (let line of lines) {
            let parts = line.trim().split(/\\s+|\\t/).filter(x => x);
            if (parts.length < 2) continue;
            try {
              const name = parts[0];
              const secret = parts[1].trim().toUpperCase().replace(/\\s+/g, '');
              const totp = new OTPAuth.TOTP({ algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(secret) });
              accounts.push({ name, totp });
            } catch (e) { console.error("Invalid Secret for:", parts[0]); }
          }
          if (accounts.length > 0) {
            document.getElementById("resultTable").style.display = "table";
            updateTable();
          }
        }
        function updateTable() {
          const tbody = document.getElementById("tableBody");
          const remain = 30 - (Math.floor(Date.now() / 1000) % 30);
          tbody.innerHTML = "";
          for (let acc of accounts) {
            const code = acc.totp.generate();
            const tr = document.createElement('tr');
            tr.innerHTML = \`<td style="color:#636e72">\${acc.name}</td>
                            <td class="code" onclick="copyText('\${code}')">\${code}</td>
                            <td class="remain">\${remain}s</td>\`;
            tbody.appendChild(tr);
          }
          if(remain === 30) setTimeout(updateTable, 500);
        }
        function copyText(txt) {
          navigator.clipboard.writeText(txt).then(() => {
            const t = document.getElementById("toast");
            t.innerText = i18n[lang].toast + ": " + txt;
            t.style.display = "block";
            setTimeout(() => t.style.display = "none", 2000);
          });
        }
        setInterval(() => { if(accounts.length > 0) updateTable(); }, 1000);
      </script>
    </body>
    </html>\`;

  return new Response(htmlContent, {
    headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "no-store" },
  });
}
