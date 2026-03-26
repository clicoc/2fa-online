export const config = { runtime: 'edge' };
export default async function handler(req) {
  const chunks = [
    '<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1.0">',
    '',
    '<title>Bulk 2FA Authenticator | 高效批量在线2FA验证器</title>',
    '<meta name="description" content="专为多账号管理设计的批量 2FA 验证工具。支持从 Excel/TXT 直接粘贴邮箱和密钥，纯本地安全计算，一页显示数百个验证码。">',
    '<meta name="keywords" content="批量2FA, 批量OTP, 验证码生成器, 多账号管理, Google Authenticator 批量, 在线身份验证器">',
    '<meta property="og:title" content="Bulk 2FA - 高效多账号验证码管理">',
    '<meta property="og:description" content="一键导入，多列显示。专为需要管理大量账号的专业人士设计。">',
    '<meta property="og:type" content="website">',
    '<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚡</text></svg>">',
    '<script src="https://cdn.jsdelivr.net/npm/otpauth@9.1.4/dist/otpauth.umd.min.js"></script>',
    '<style>:root{--p:#4361ee;--bg:#f4f7fe}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:var(--bg);margin:0;padding:15px;display:flex;justify-content:center;color:#2d3436}.c{background:#fff;padding:1.5rem;border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,0.05);width:100%;max-width:1200px}h1{font-size:1.2rem;margin:0 0 10px 0;color:#636e72;display:inline-block}.guide{font-size:0.75rem;color:#95a5a6;margin-bottom:10px;display:inline-block;margin-left:15px}textarea{width:100%;height:80px;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;font-family:monospace;font-size:0.85rem;background:#fafafa;transition:height 0.3s}textarea:focus{height:150px;outline:none;border-color:var(--p);background:#fff}button{background:var(--p);color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:600;margin:10px 0;cursor:pointer;float:right}#grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px;margin-top:15px;clear:both}.item{background:#fff;border:1px solid #edf2f7;padding:6px 10px;border-radius:8px;display:flex;align-items:center;justify-content:space-between;transition:all 0.2s}.item:hover{border-color:var(--p);box-shadow:0 2px 8px rgba(67,97,238,0.1)}.acc{font-size:0.7rem;color:#718096;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px}.code{font-size:1.1rem;font-weight:700;color:var(--p);cursor:pointer;font-family:monospace;letter-spacing:1px}.t-bar{width:3px;height:18px;background:#e2e8f0;border-radius:2px;overflow:hidden;margin-left:8px}.t-fill{width:100%;height:100%;background:#e74c3c;transition:height 1s linear}.back{display:block;text-align:center;margin-top:30px;color:#b2bec3;text-decoration:none;font-size:0.75rem}.toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:#fff;padding:8px 16px;border-radius:8px;display:none;z-index:100}</style></head>',
    '<body><div class="c"><div><h1 id="t">Bulk 2FA</h1><span class="guide" id="g">Format: Email Key</span><button onclick="load()" id="b">Generate</button></div>',
    '<textarea id="i" placeholder="Paste: user@mail.com SECRET"></textarea>',
    '<div id="grid"></div>',
    '<a href="/" class="back" id="bk">← Single Mode</a></div><div id="ts" class="toast"></div>',
    '<script>',
    'const lang=navigator.language.startsWith("zh")?"zh":"en";',
    'const i18n={zh:{t:"批量验证器",b:"立即生成",bk:"← 返回单账号模式",s:"已复制",g:"格式：邮箱/账号 + 密钥",p:"在此粘贴清单，每行一个..."},en:{t:"Bulk 2FA",b:"Generate",bk:"← Single Mode",s:"Copied",g:"Format: Email Key",p:"Paste list here, one per line..."}};',
    'const D=id=>document.getElementById(id);',
    'D("t").innerText=i18n[lang].t;D("b").innerText=i18n[lang].b;D("bk").innerText=i18n[lang].bk;D("g").innerText=i18n[lang].g;D("i").placeholder=i18n[lang].p;',
    'let acts=[];',
    'function load(){const lines=D("i").value.trim().split("\\n");acts=[];for(let l of lines){let p=l.trim().split(/\\s+|\\t/).filter(x=>x);if(p.length<2)continue;try{',
    'const n=p[0];const s=p[p.length-1].toUpperCase().replace(/\\s+/g,"");',
    'const totp=new OTPAuth.TOTP({secret:OTPAuth.Secret.fromBase32(s)});',
    'acts.push({n:n,t:totp})}catch(e){}}if(acts.length>0){upd();D("i").style.height="40px"}}',
    'function upd(){const g=D("grid");const r=30-(Math.floor(Date.now()/1000)%30);g.innerHTML="";for(let a of acts){',
    'const c=a.t.generate();const div=document.createElement("div");div.className="item";',
    'div.innerHTML=`<div class="acc" title="\${a.n}">\${a.n}</div><div style="display:flex;align-items:center"><div class="code" onclick="cp(\'\${c}\')">\${c}</div><div class="t-bar"><div class="t-fill" style="height:\${(r/30)*100}%"></div></div></div>`;',
    'g.appendChild(div)}if(r===30)setTimeout(upd,500)}',
    'function cp(t){navigator.clipboard.writeText(t).then(()=>{const s=D("ts");s.innerText=i18n[lang].s+": "+t;s.style.display="block";setTimeout(()=>s.style.display="none",2000)})}',
    'setInterval(()=>{if(acts.length>0)upd()},1000);',
    '</script></body></html>'
  ];
  return new Response(chunks.join(''), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
}
