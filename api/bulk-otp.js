export const config = { runtime: 'edge' };
export default async function handler(req) {
  const chunks = [
    '<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1.0">',
    '<title>Bulk 2FA Authenticator | 批量2FA验证码生成</title>',
    '<meta name="description" content="批量管理 2FA 密钥。一键生成多个账号验证码，安全高效。">',
    '<script src="https://cdn.jsdelivr.net/npm/otpauth@9.1.4/dist/otpauth.umd.min.js"></script>',
    '<style>:root{--p:#4361ee;--g:linear-gradient(135deg,#667eea 0%,#764ba2 100%)}body{font-family:sans-serif;background:var(--g);min-height:100vh;margin:0;display:flex;justify-content:center;padding:20px;color:#2d3436;box-sizing:border-box}.c{background:rgba(255,255,255,0.9);backdrop-filter:blur(10px);padding:2rem;border-radius:24px;box-shadow:0 20px 40px rgba(0,0,0,0.2);width:100%;max-width:600px}h1{font-size:1.5rem;text-align:center;color:#636e72}textarea{width:100%;height:120px;padding:12px;border:2px solid #dfe6e9;border-radius:12px;box-sizing:border-box;background:rgba(255,255,255,0.5)}button{background:var(--p);color:#fff;border:none;padding:14px;border-radius:12px;width:100%;font-weight:600;margin:15px 0;cursor:pointer}table{width:100%;border-collapse:collapse;margin-top:15px;background:#fff;border-radius:12px;overflow:hidden}th,td{padding:12px;text-align:center;border-bottom:1px solid #eee}.code{font-size:1.3rem;font-weight:800;color:var(--p);cursor:pointer;letter-spacing:1px}.remain{color:#e74c3c;font-weight:bold}.back{display:block;text-align:center;margin-top:15px;color:#b2bec3;text-decoration:none;font-size:0.8rem}.toast{position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:#fff;padding:8px 16px;border-radius:20px;display:none}</style></head>',
    '<body><div class="c"><h1 id="t">Bulk 2FA</h1><textarea id="i" placeholder="Account Secret"></textarea><button onclick="load()" id="b">Generate</button><table id="rt" style="display:none"><thead><tr><th id="h1">Acc</th><th id="h2">OTP</th><th id="h3">Time</th></tr></thead><tbody id="tb"></tbody></table><a href="/" class="back" id="bk">← Single Mode</a></div><div id="ts" class="toast"></div>',
    '<script>',
    'const lang = navigator.language.startsWith("zh") ? "zh" : "en";',
    'const i18n = {zh:{t:"批量验证码",b:"生成",h1:"账号",h2:"验证码",h3:"剩余",bk:"← 单账号模式",s:"已复制"},en:{t:"Bulk 2FA",b:"Generate",h1:"Acc",h2:"OTP",h3:"Left",bk:"← Single Mode",s:"Copied"}};',
    'const D=id=>document.getElementById(id);',
    'D("t").innerText=i18n[lang].t;D("b").innerText=i18n[lang].b;D("h1").innerText=i18n[lang].h1;D("h2").innerText=i18n[lang].h2;D("h3").innerText=i18n[lang].h3;D("bk").innerText=i18n[lang].bk;',
    'let acts=[];',
    'function load(){const lines=D("i").value.trim().split("\\n");acts=[];for(let l of lines){let p=l.trim().split(/\\s+|\\t/).filter(x=>x);if(p.length<2)continue;try{const totp=new OTPAuth.TOTP({secret:OTPAuth.Secret.fromBase32(p[1].trim().toUpperCase())});acts.push({n:p[0],t:totp})}catch(e){}}if(acts.length>0){D("rt").style.display="table";upd()}}',
    'function upd(){const b=D("tb");const r=30-(Math.floor(Date.now()/1000)%30);b.innerHTML="";for(let a of acts){const c=a.t.generate();const tr=document.createElement("tr");',
    'tr.innerHTML="<td>"+a.n+"</td><td class=\'code\' onclick=\'cp(\\""+c+"\\")\'>"+c+"</td><td class=\'remain\'>"+r+"s</td>";',
    'b.appendChild(tr)}if(r===30)setTimeout(upd,500)}',
    'function cp(t){navigator.clipboard.writeText(t).then(()=>{const s=D("ts");s.innerText=i18n[lang].s+": "+t;s.style.display="block";setTimeout(()=>s.style.display="none",2000)})}',
    'setInterval(()=>{if(acts.length>0)upd()},1000);',
    '</script></body></html>'
  ];
  return new Response(chunks.join(''), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
}
