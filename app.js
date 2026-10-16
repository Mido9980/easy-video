/* EASY VIDEO v3 — app logic */
'use strict';
const $ = id => document.getElementById(id);
const API = 'https://shark-vision-labs.base44.app/functions';
const D = window.DATA, I18N = window.I18N;
const esc = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LS = { phone:'ev3_phone', name:'ev3_name', lang:'ev3_lang', pin:'ev3_pin' };
let LANG = localStorage.getItem(LS.lang) || 'ar';
const LIB = [];
let feedLoaded = false;
let me = null, paid = false, credits = 0, CLOUD = { cloud_name:'', upload_preset:'' }, CARD_URL = '';

/* ============ i18n ============ */
const T = () => I18N[LANG];
function applyI18n() {
  const t = T();
  document.documentElement.lang = LANG === 'ar' ? 'ar-EG' : LANG;
  document.documentElement.dir = t.dir;
  document.querySelectorAll('[data-i]').forEach(el => { const k = el.dataset.i; if (t[k] !== undefined) el.textContent = t[k]; });
  document.querySelectorAll('[data-ph]').forEach(el => { const k = el.dataset.ph; if (t[k] !== undefined) el.placeholder = t[k]; });
  buildNav(); buildLangSeg(); refreshCredPill();
  if (typeof buildUseCases === 'function' && document.getElementById('ucTabs')) { buildUseCases(); buildPrompts(); }
  if (typeof buildTools === 'function' && document.getElementById('toolGrid')) buildTools();
}
function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 2600); }
const track = (type, detail) => fetch(`${API}/vsPublic`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'track', type, detail: String(detail||'').slice(0,180) }) }).catch(()=>{});

/* ============ router ============ */
const PAGES = ['home','studio','models','blog','article','library','pricing','pay','account','admin'];
const NAV = [['home','🏠'],['studio','🎬'],['models','🧠'],['blog','📖'],['library','📂'],['pricing','💳'],['account','👤'],['admin','🛠️']];
function go(p) { if (!PAGES.includes(p)) p = 'home'; location.hash = '#' + p; }
function route() {
  let p = (location.hash || '#home').slice(1); if (!PAGES.includes(p)) p = 'home';
  document.querySelectorAll('.page').forEach(s => s.classList.remove('on'));
  $('pg-' + p).classList.add('on');
  buildNav(); window.scrollTo(0,0); $('drawer').classList.remove('on');
  if (p === 'models') buildModels();
  if (p === 'blog') buildBlog();
  if (p === 'library') buildLibrary();
  if (p === 'pricing') buildPricing();
  if (p === 'pay') loadPay();
  if (p === 'account') initAccount();
  if (p === 'studio') ensureFeed();
  track('page', p);
}
window.addEventListener('hashchange', route);
function buildNav() {
  $('drawerNav').innerHTML = `<a href="#studio" class="try">${T().nav_try || 'Try Free'}</a>` + NAV.filter(([id]) => id !== 'home').map(([id, ic]) => `<a href="#${id}" class="${location.hash === '#'+id ? 'on':''}"><span data-i="nav_${id}"></span>${id==='pricing'?'<span class="pricebadge">50% OFF</span>':''}</a>`).join('');
  const t = T(); document.querySelectorAll('#drawerNav a span[data-i]').forEach(el => { el.textContent = t[el.dataset.i]; });
}
function buildLangSeg() {
  const box = $('langSeg'); if (!box) return;
  box.innerHTML = '';
  Object.keys(I18N).forEach(k => { const b = document.createElement('button'); b.textContent = I18N[k].name; b.className = k === LANG ? 'on' : ''; b.onclick = () => setLang(k); box.appendChild(b); });
}
function setLang(k) { LANG = k; localStorage.setItem(LS.lang, k); applyI18n(); }
$('burger').onclick = () => $('drawer').classList.add('on');
$('drawer').onclick = e => { if (e.target.id === 'drawer') $('drawer').classList.remove('on'); };
$('globeBtn').onclick = () => { const ks = Object.keys(I18N); setLang(ks[(ks.indexOf(LANG)+1) % ks.length]); };

/* ============ api / auth ============ */
const myPhone = () => localStorage.getItem(LS.phone) || '';
async function refreshCredPill() {
  $('credNum').textContent = me && paid ? credits : '∞';
  $('credPill').title = '';
}
async function refreshPaid() {
  if (!myPhone()) { paid = false; refreshCredPill(); return; }
  try {
    const r = await (await fetch(`${API}/vsPublic`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'check_payment', phone: myPhone() }) })).json();
    paid = !!r.paid; credits = r.credits_left || 0;
  } catch (e) {}
  refreshCredPill();
}
async function loadConfig() {
  try {
    const c = await (await fetch(`${API}/vsPublic`)).json();
    CLOUD.cloud_name = c.cloud_name || ''; CLOUD.upload_preset = c.upload_preset || ''; CARD_URL = c.card_url || '';
  } catch (e) {}
}

/* ============ safety ============ */
const BLOCK = [/سياس|رئيس|وزير|عسكري|جيش|election|politic|minister|president(?!.*company)/i, /طفل|أطفال|child|minor|underage|kid/i, /عاري|إباحي|nsfw|nude|xxx|explicit|porn/i];
function safeCheck(p) {
  if (BLOCK.some(rx => rx.test(p))) { toast('⛔ ' + (LANG==='ar'?'المحتوى ده ممنوع — اختار فكرة تانية محترمة.': LANG==='de'?'Dieser Inhalt ist nicht erlaubt — wähle eine respektvolle Idee.':'That content is not allowed — pick a respectful idea.')); track('blocked', p.slice(0,80)); return false; }
  return true;
}

/* ============ render engine (shared) ============ */
const LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" rx="28" fill="#19E3C1"/><polygon points="60,24 92,54 60,100 28,54" fill="#0A0E14"/><polygon points="60,24 92,54 60,54" fill="#A8FFF0"/><polygon points="60,24 60,54 28,54" fill="#5ff0d6"/></svg>';
let LOGO = new Image(); LOGO.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(LOGO_SVG);
function canvasFor(aspect, q) {
  const base = q === 1080 ? 1080 : 720;
  const c = document.createElement('canvas');
  if (aspect === '16:9') { c.width = base === 1080 ? 1920 : 1280; c.height = base; }
  else if (aspect === '1:1') { c.width = base; c.height = base; }
  else { c.width = base === 1080 ? 1080 : 720; c.height = base === 1080 ? 1920 : 1280; }
  return c;
}
function beatAudio(dur, vibe) {
  const ctxA = new (window.AudioContext || window.webkitAudioContext)();
  const dest = ctxA.createMediaStreamDestination();
  const master = ctxA.createGain(); master.gain.value = .7; master.connect(dest);
  const bpm = vibe === 'trap' ? 140 : vibe === 'cinematic' ? 80 : 100, B = 60/bpm;
  const steps = Math.floor(dur / B);
  for (let i = 0; i < steps; i++) {
    const tt = i * B;
    const o = ctxA.createOscillator(), g = ctxA.createGain();
    o.frequency.setValueAtTime(vibe==='trap'?150:140, tt); o.frequency.exponentialRampToValueAtTime(45, tt+.12);
    g.gain.setValueAtTime(.85, tt); g.gain.exponentialRampToValueAtTime(.001, tt+.22);
    o.connect(g); g.connect(master); o.start(tt); o.stop(tt+.25);
    const h = ctxA.createOscillator(), hg = ctxA.createGain();
    h.type='square'; h.frequency.value = 9000;
    hg.gain.setValueAtTime(vibe==='cinematic'?.05:.1, tt+B/2); hg.gain.exponentialRampToValueAtTime(.001, tt+B/2+.05);
    h.connect(hg); hg.connect(master); h.start(tt+B/2); h.stop(tt+B/2+.06);
    if (vibe==='cinematic' && i % 4 === 0) {
      const p = ctxA.createOscillator(), pg = ctxA.createGain();
      p.frequency.setValueAtTime(110, tt); pg.gain.setValueAtTime(.3, tt); pg.gain.exponentialRampToValueAtTime(.001, tt+1.2);
      p.connect(pg); pg.connect(master); p.start(tt); p.stop(tt+1.3);
    }
  }
  return { ctxA, dest };
}
function stamp(c) { // watermark unless paid
  if (paid) return;
  const x = c.getContext('2d');
  x.save(); x.globalAlpha = .5; x.font = `900 ${Math.round(c.width*.035)}px Arial`;
  x.textAlign='right'; x.fillStyle='rgba(255,255,255,.85)';
  x.shadowColor='rgba(0,0,0,.6)'; x.shadowBlur=8;
  x.fillText('EASY CODE', c.width - c.width*.04, c.height - c.width*.05);
  x.restore();
}
async function recordCanvas(cv, dur, audio, onDone) {
  const stream = cv.captureStream(30);
  if (audio) audio.dest.stream.getAudioTracks().forEach(tr => stream.addTrack(tr));
  const mime = ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(m => MediaRecorder.isTypeSupported(m)) || '';
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4500000 });
  const chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  const done = new Promise(r => rec.onstop = r);
  rec.start(200);
  await onDone();
  rec.stop(); await done; if (audio) audio.ctxA.close();
  return new Blob(chunks, { type:'video/webm' });
}
function addLib(blob, title, kind) {
  const url = URL.createObjectURL(blob);
  LIB.unshift({ url, title, kind, st:'done', when: Date.now() });
  try { localStorage.setItem('ev3_lib', JSON.stringify(LIB.map(x => ({ title:x.title, kind:x.kind })))) } catch(e){}
  return url;
}
async function i2vRender(img, prompt, dur, aspect, q, audio) {
  const cv = canvasFor(aspect, q), cx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const run = new Promise(res => {
    const t0 = performance.now();
    const loop = () => {
      const t = (performance.now() - t0) / 1000;
      if (t >= dur) return res();
      const ph = t / dur;
      const z = 1 + .18 * ph;
      cx.fillStyle = '#070a10'; cx.fillRect(0,0,W,H);
      const k = Math.max(W / img.width, H / img.height) * z;
      const dw = img.width * k, dh = img.height * k;
      const dx = (W - dw) / 2 + Math.sin(ph * Math.PI * 1.4) * W * .02;
      const dy = (H - dh) / 2;
      cx.drawImage(img, dx, dy, dw, dh);
      const g = cx.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,H*.9);
      g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.42)');
      cx.fillStyle = g; cx.fillRect(0,0,W,H);
      if (LOGO.complete) { cx.save(); cx.globalAlpha=.9; cx.shadowColor='#19E3C1'; cx.shadowBlur=20; cx.drawImage(LOGO, W*.04, H*.035, W*.13, W*.13); cx.restore(); }
      if (prompt) { cx.save(); cx.font=`bold ${Math.round(W*.045)}px "Segoe UI",Tahoma`; cx.textAlign='center';
        cx.lineWidth=W*.012; cx.strokeStyle='rgba(0,0,0,.55)'; cx.strokeText(prompt.slice(0,60), W/2, H*.93);
        cx.fillStyle='#fff'; cx.fillText(prompt.slice(0,60), W/2, H*.93); cx.restore(); }
      requestAnimationFrame(loop);
    }; loop();
  });
  const blob = await recordCanvas(cv, dur, audio ? beatAudio(dur,'lofi') : null, () => run);
  stamp(cv); // final stamp re-drawn onto last frame via preview only
  return { blob, cv };
}
function fitDraw(cx, img, W, H, z, dx, dy) {
  const k = Math.max(W/img.width, H/img.height) * z;
  cx.drawImage(img, (W - img.width*k)/2 + dx, (H - img.height*k)/2 + dy, img.width*k, img.height*k);
}
async function aiRender(imgs, caption, dur, aspect, q, audio) {
  const cv = canvasFor(aspect, q), cx = cv.getContext('2d');
  const W = cv.width, H = cv.height, n = imgs.length, seg = dur / n, XF = .5;
  const run = new Promise(res => {
    const t0 = performance.now();
    const loop = () => {
      const t = (performance.now() - t0) / 1000;
      if (t >= dur) return res();
      const k = Math.min(n-1, Math.floor(t/seg)), st = t - k*seg, ph = st/seg;
      cx.fillStyle = '#000'; cx.fillRect(0,0,W,H);
      fitDraw(cx, imgs[k], W, H, k%2 ? (1.20-.14*ph) : (1.06+.14*ph), (k%2?1:-1)*W*.012*ph, (k%3?-1:1)*H*.008*ph);
      if (st > seg - XF && k < n-1) { cx.save(); cx.globalAlpha = (st-(seg-XF))/XF; fitDraw(cx, imgs[k+1], W, H, (k+1)%2?1.2:1.06, 0, 0); cx.restore(); }
      const g = cx.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*.95);
      g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.5)');
      cx.fillStyle = g; cx.fillRect(0,0,W,H);
      if (LOGO.complete) { cx.save(); cx.globalAlpha=.85; cx.shadowColor='#19E3C1'; cx.shadowBlur=22; cx.drawImage(LOGO, W*.04, H*.035, W*.13, W*.13); cx.restore(); }
      requestAnimationFrame(loop);
    }; loop();
  });
  const blob = await recordCanvas(cv, dur, audio ? beatAudio(dur,'cinematic') : null, () => run);
  if (caption) { cx.save(); cx.font=`bold ${Math.round(W*.045)}px "Segoe UI",Tahoma`; cx.textAlign='center'; cx.lineWidth=W*.012; cx.strokeStyle='rgba(0,0,0,.55)'; cx.strokeText(caption.slice(0,60),W/2,H*.93); cx.fillStyle='#fff'; cx.fillText(caption.slice(0,60),W/2,H*.93); cx.restore(); }
  return { blob, cv };
}
/* free AI scene images */
async function sceneImgs(prompts, onProg) {
  const grab = s => new Promise(res => {
    const url = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(s + ', photorealistic, cinematic lighting') + '?width=540&height=960&nologo=true&seed=' + Math.floor(Math.random()*99999);
    fetch(url).then(r => r.ok ? r.blob() : null).then(b => { if (!b) return res(null);
      const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = URL.createObjectURL(b);
    }).catch(() => res(null));
  });
  let done = 0;
  const jobs = prompts.slice(0,4).map(s => grab(s).then(im => { done++; onProg && onProg(done); return im; }));
  return (await Promise.all(jobs)).filter(Boolean);
}

/* ============ studio plumbing ============ */
function segVal(id) { const b = document.querySelector(`[data-seg="${id}"] button.on`); return b ? b.textContent : ''; }
document.querySelectorAll('.seg').forEach(sg => sg.addEventListener('click', e => {
  if (e.target.tagName !== 'BUTTON') return;
  sg.querySelectorAll('button').forEach(b => b.classList.remove('on')); e.target.classList.add('on');
}));
const STUDIO_TABS = [['i2v','🖼️','t_i2v'],['t2v','✍️','t_t2v'],['img','🎨','t_img'],['voice','🎙️','t_voice'],['music','🎵','t_music'],['lip','🎤','t_lip'],['ref','🧩','t_ref'],['motion','🕹️','t_motion'],['vtools','🛠️','t_vtools']];
function buildStabs() {
  $('stabs').innerHTML = STUDIO_TABS.map(([id, ic, k], i) => `<button class="stab ${i===0?'on':''}" data-tab="${id}">${ic} <span data-i="${k}"></span></button>`).join('');
  const t = T(); document.querySelectorAll('.stab span').forEach((el,i) => el.textContent = t[STUDIO_TABS[i][2]]);
  document.querySelectorAll('.stab').forEach(b => b.onclick = () => {
    document.querySelectorAll('.stab').forEach(x => x.classList.remove('on')); b.classList.add('on');
    document.querySelectorAll('.spanel').forEach(p => p.classList.remove('on')); $('sp-' + b.dataset.tab).classList.add('on');
    track('studio_tab', b.dataset.tab);
  });
}
function dropZone(el, cb) {
  el.onclick = () => { const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*';
    inp.onchange = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader();
      r.onload = ev => { const im = new Image(); im.onload = () => cb(im, f.name); im.src = ev.target.result; }; r.readAsDataURL(f); };
    inp.click(); };
}
function showRes(box, url, title, kind) {
  const t = T();
  box.innerHTML = `<video src="${url}" controls playsinline></video>
   <div class="modes"><a class="btn p sm" href="${url}" download="easy-video.webm">⬇ ${t.lib_dl}</a>
   <button class="btn g sm" onclick="postToStudio('${url}','${esc(title)}','${kind}')" id="pb-${Date.now()}">⬆ ${t.lib_post}</button></div>`;
}

/* --- i2v --- */
let i2vImg = null;
dropZone($('i2vDrop'), (im, name) => { i2vImg = im; $('i2vDrop').classList.add('has'); $('i2vDrop').innerHTML = `<img src="${im.src}">`; track('i2v_image', name); });
$('i2vGo').onclick = async () => {
  if (!i2vImg) return toast(LANG==='ar'?'ارفع صورة الأول':LANG==='de'?'Lade zuerst ein Foto':'Upload a photo first');
  const p = $('i2vPrompt').value.trim();
  if (!safeCheck(p)) return;
  const btn = $('i2vGo'); btn.disabled = true; btn.textContent = '…';
  try {
    const r = await i2vRender(i2vImg, p, parseInt(segVal('i2vDur')) || 8, segVal('i2vAsp') || '9:16', parseInt(segVal('i2vQ')) || 720, segVal('i2vAud') === 'beat');
    const url = addLib(r.blob, p.slice(0,40) || 'image-to-video', 'i2v');
    showRes($('i2vRes'), url, p.slice(0,40) || 'image-to-video', 'local');
    track('i2v_free', p.slice(0,80));
  } catch (e) { toast('⚠ ' + e.message); }
  btn.disabled = false; btn.textContent = T().gen_btn;
};
$('i2vCin').onclick = () => cinemaFrom($('i2vPrompt').value, $('i2vRes'));


/* on-device template render (fallback / always-available) */
async function templateRender(prompt, dur) {
  const cv = canvasFor('9:16', 720), cx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const st = { c1:'#19E3C1', c2:'#A8FFF0', bg:'#0A0E14' };
  const run = new Promise(res => { const t0 = performance.now();
    const loop = () => { const t = (performance.now()-t0)/1000; if (t >= dur) return res();
      cx.fillStyle = st.bg; cx.fillRect(0,0,W,H);
      const g = cx.createRadialGradient(W/2,H/2,60,W/2,H/2,H*.7);
      g.addColorStop(0,'rgba(25,227,193,.14)'); g.addColorStop(1,'rgba(0,0,0,0)');
      cx.fillStyle = g; cx.fillRect(0,0,W,H);
      for (let i=0;i<18;i++){ const x=(i*137+t*60)%(W+40)-20, y=(i*251+t*90)%H;
        cx.fillStyle='rgba(25,227,193,.3)'; cx.beginPath(); cx.arc(x,y,3+2*Math.sin(t+i),0,7); cx.fill(); }
      const pulse = 1 + .04*Math.sin(t*4);
      cx.save(); cx.strokeStyle=st.c1; cx.lineWidth=W*.012; cx.globalAlpha=.7;
      cx.strokeRect(W*.15/pulse, H*.22*pulse, W*.7/pulse, H*.44*pulse); cx.restore();
      if (LOGO.complete) { cx.save(); cx.globalAlpha=.7+.2*Math.sin(t*2); cx.shadowColor='#19E3C1'; cx.shadowBlur=30;
        cx.drawImage(LOGO, W/2-W*.15, H*.34, W*.3, W*.3); cx.restore(); }
      cx.save(); cx.font=`bold ${Math.round(W*.06)}px "Segoe UI",Tahoma`; cx.textAlign='center';
      cx.lineWidth=W*.014; cx.strokeStyle='rgba(0,0,0,.55)';
      cx.strokeText(prompt.slice(0,44), W/2, H*.86); cx.fillStyle='#fff'; cx.fillText(prompt.slice(0,44), W/2, H*.86); cx.restore();
      requestAnimationFrame(loop); }; loop(); });
  const blob = await recordCanvas(cv, dur, beatAudio(dur,'lofi'), () => run);
  return { blob, cv };
}

/* --- t2v --- */
const STYLES = ['cinematic','anime','3D render','neon','vintage'];
$('styleSeg').innerHTML = STYLES.map((s,i) => `<button class="${i?'':'on'}">${s}</button>`).join('');
$('styleSeg').addEventListener('click', e => { if (e.target.tagName!=='BUTTON') return;
  $('styleSeg').querySelectorAll('button').forEach(b=>b.classList.remove('on')); e.target.classList.add('on'); });
async function freeT2v() {
  const p = $('t2vPrompt').value.trim();
  if (!p) return toast(LANG==='ar'?'اكتب فكرة الأول':LANG==='de'?'Schreibe zuerst eine Idee':'Describe your idea first');
  if (!safeCheck(p)) return;
  const btn = $('t2vGo'); btn.disabled = true;
  const style = segVal('styleSeg') || 'cinematic';
  const box = $('t2vRes');
  box.innerHTML = '<div class="skel" style="height:200px"></div>';
  let scenes = null;
  try {
    const r = await (await fetch(`${API}/vsPublic`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'agent', prompt: p }) })).json();
    if (r.ok && r.scenes) scenes = r.scenes;
  } catch (e) {}
  const prompts = scenes && scenes.length >= 2 ? scenes : [p, p + ', different angle', p + ', dramatic close-up', p + ', wide shot'];
  const themed = prompts.map(s => s + ', ' + style + ' style, vertical');
  let imgs = await sceneImgs(themed, d => box.innerHTML = `<div class="skel" style="height:200px"></div><span class="note">🎨 ${d}/4</span>`);
  if (imgs.length < 2) { await new Promise(r => setTimeout(r, 1500)); imgs = await sceneImgs(themed, null); }
  if (imgs.length < 2) {
    // graceful fallback: on-device template render — free mode never fails
    const fb = await templateRender(p, 8);
    const url = addLib(fb.blob, p.slice(0,40), 't2v');
    showRes(box, url, p.slice(0,40), 'local');
    track('t2v_fallback', p.slice(0,60));
    btn.disabled = false; btn.textContent = T().gen_btn; return;
  }
  const r2 = await aiRender(imgs, p.slice(0,40), 8, '9:16', 720, true);
  const url = addLib(r2.blob, p.slice(0,40), 't2v');
  showRes(box, url, p.slice(0,40), 'local');
  track('t2v_free', p.slice(0,80));
  btn.disabled = false; btn.textContent = T().gen_btn;
}
$('t2vGo').onclick = freeT2v;
$('t2vCin').onclick = () => cinemaFrom($('t2vPrompt').value, $('t2vRes'));

/* --- image generator --- */
$('imgGo').onclick = async () => {
  const p = $('imgPrompt').value.trim();
  if (!p) return toast('✍️'); if (!safeCheck(p)) return;
  const btn = $('imgGo'); btn.disabled = true;
  $('imgRes').innerHTML = '<div class="skel" style="height:160px"></div><div class="skel" style="height:160px"></div><div class="skel" style="height:160px"></div><div class="skel" style="height:160px"></div>';
  const imgs = await sceneImgs([0,1,2,3].map(i => p + ', variation ' + (i+1) + ', photorealistic, high detail'));
  $('imgRes').innerHTML = imgs.map(im => `<a href="${im.src}" download="easy-image.png" target="_blank"><img src="${im.src}"></a>`).join('');
  track('img_gen', p.slice(0,80)); btn.disabled = false;
};

/* --- voice --- */
function pickVoices() {
  const vs = speechSynthesis.getVoices();
  const ar = vs.filter(v => /ar[-_]?EG/i.test(v.lang));
  return { ar: ar[0] || vs.find(v => /^ar/i.test(v.lang)) || vs[0], en: vs.find(v => /^en/i.test(v.lang)) || vs[0] };
}
function loadVoiceSelect() {
  const vs = speechSynthesis.getVoices().filter(v => /^ar|^en/i.test(v.lang)).slice(0, 12);
  $('voicePick').innerHTML = vs.map(v => `<option value="${v.name}">${v.name} (${v.lang})</option>`).join('') || '<option>System</option>';
}
speechSynthesis.onvoiceschanged = loadVoiceSelect;
$('voiceSpeak').onclick = () => {
  const txt = $('voiceText').value.trim(); if (!txt || !safeCheck(txt)) return;
  const v = speechSynthesis.getVoices().find(x => x.name === $('voicePick').value) || pickVoices().ar;
  const u = new SpeechSynthesisUtterance(txt); u.voice = v || null; u.lang = (v && v.lang) || 'ar-EG';
  speechSynthesis.cancel(); speechSynthesis.speak(u); track('tts', '');
};
$('voiceDuo').onclick = () => {
  const l1 = $('voiceL1').value.trim(), l2 = $('voiceL2').value.trim();
  if ((!l1 && !l2) || !safeCheck(l1 + ' ' + l2)) return;
  speechSynthesis.cancel();
  const vs = pickVoices();
  [ [l1, vs.ar], [l2, vs.en] ].filter(x => x[0]).forEach(([txt, v], i) => {
    const u = new SpeechSynthesisUtterance(txt); if (v) u.voice = v; u.pitch = i ? 1.3 : .9;
    setTimeout(() => speechSynthesis.speak(u), i * 2600);
  });
  track('tts_duo', '');
};

/* --- music --- */
let musStop = null;
$('musMake').onclick = async () => {
  const vibe = segVal('musVibe') || 'lofi', dur = parseInt(segVal('musDur')) || 8;
  $('musMake').disabled = true;
  const A = beatAudio(dur + 1, vibe);
  const mime = ['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(m => MediaRecorder.isTypeSupported(m)) || '';
  const rec = new MediaRecorder(A.dest.stream, { mimeType: mime });
  const chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  const done = new Promise(r => rec.onstop = r); rec.start(200);
  $('musStop').style.display = 'inline-flex';
  $('musStop').onclick = () => { try { rec.stop() } catch(e){} };
  await new Promise(r => setTimeout(r, dur * 1000));
  try { rec.stop() } catch(e){} await done; A.ctxA.close();
  const url = URL.createObjectURL(new Blob(chunks, { type:'audio/webm' }));
  $('musRes').innerHTML = `<audio src="${url}" controls style="width:100%"></audio><a class="btn p sm" href="${url}" download="easy-beat.webm">⬇ ${T().lib_dl}</a>`;
  $('musStop').style.display = 'none'; $('musMake').disabled = false; track('music', vibe);
};

/* --- lip sync duo --- */
let lipImgs = { A: null, B: null };
dropZoneByCell();
function dropZoneByCell() {
  [['lipA','A'],['lipB','B']].forEach(([id, k]) => {
    $(id).onclick = () => { const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*';
      inp.onchange = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader();
        r.onload = ev => { const im = new Image(); im.onload = () => { lipImgs[k] = im; $(id).innerHTML = `<img src="${im.src}">`; }; im.src = ev.target.result; }; r.readAsDataURL(f); };
      inp.click(); };
  });
}
$('lipGo').onclick = async () => {
  if (!lipImgs.A || !lipImgs.B) return toast(LANG==='ar'?'ارفع صورتين الأول':LANG==='de'?'Lade zwei Porträts':'Upload both portraits');
  const lines = $('lipTxt').value.split('\n').map(s => s.trim()).filter(Boolean);
  if (!lines.length) return toast('✍️');
  const btn = $('lipGo'); btn.disabled = true;
  const cv = canvasFor('9:16', 720), cx = cv.getContext('2d');
  const W = cv.width, H = cv.height, dur = Math.max(6, lines.length * 2.4), A = beatAudio(dur, 'trap');
  const n1 = $('lipN1').value || 'A', n2 = $('lipN2').value || 'B';
  const drawFace = (im, x, mouth) => {
    const iw = W * .46, ih = iw, ix = x, iy = H * .18;
    cx.save(); cx.beginPath(); cx.arc(ix + iw/2, iy + ih/2, ih/2, 0, 7); cx.clip();
    fitDraw(cx, im, iw, ih, 1.15, 0, 0); cx.restore();
    // mouth animation bar
    cx.fillStyle = '#000'; cx.globalAlpha = .35;
    cx.beginPath(); cx.ellipse(ix + iw/2, iy + ih*.78, iw*.09, iw*(0.02 + 0.06*mouth), 0, 0, 7); cx.fill();
    cx.globalAlpha = 1;
    cx.font = `bold ${Math.round(W*.045)}px "Segoe UI",Tahoma`; cx.textAlign='center'; cx.fillStyle='#fff';
    cx.fillText((x < W/2 ? n1 : n2), ix + iw/2, iy + ih + W*.06);
  };
  const run = new Promise(res => { const t0 = performance.now();
    const loop = () => { const t = (performance.now()-t0)/1000; if (t >= dur) return res();
      const lineIdx = Math.min(lines.length-1, Math.floor(t / (dur/lines.length)));
      const turn = lineIdx % 2; // alternate
      const ph = (t % .3) / .3; const mouth = .5 + .5*Math.sin(t*14);
      cx.fillStyle = '#070a10'; cx.fillRect(0,0,W,H);
      const g = cx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#131a2a'); g.addColorStop(1,'#0a0e14');
      cx.fillStyle = g; cx.fillRect(0,0,W,H);
      for (let i=0;i<20;i++){ cx.fillStyle='rgba(25,227,193,'+(0.05+0.05*Math.abs(Math.sin(t*2+i)))+')';
        cx.beginPath(); cx.arc((i*97+t*80)%W, (i*211)%H, 3, 0, 7); cx.fill(); }
      drawFace(lipImgs.A, W*.03, turn===0 ? mouth : .06);
      drawFace(lipImgs.B, W*.51, turn===1 ? mouth : .06);
      cx.save(); cx.font=`bold ${Math.round(W*.052)}px "Segoe UI",Tahoma`; cx.textAlign='center';
      cx.lineWidth = W*.012; cx.strokeStyle='rgba(0,0,0,.6)';
      cx.strokeText(lines[lineIdx], W/2, H*.82); cx.fillStyle='#fff'; cx.fillText(lines[lineIdx], W/2, H*.82);
      cx.restore();
      if (LOGO.complete) cx.drawImage(LOGO, W*.04, H*.03, W*.12, W*.12);
      requestAnimationFrame(loop); }; loop(); });
  const blob = await recordCanvas(cv, dur, A, () => run);
  const url = addLib(blob, 'rap duo: ' + lines[0].slice(0,30), 'lip');
  showRes($('lipRes'), url, 'rap duo', 'local');
  track('lip_duo', lines.length + ' lines'); btn.disabled = false;
};

/* --- reference to video --- */
let refImgs = [];
(function buildRefRow() {
  const row = $('refRow');
  row.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const c = document.createElement('div'); c.className = 'cell'; c.textContent = '+';
    c.onclick = () => { const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*';
      inp.onchange = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader();
        r.onload = ev => { const im = new Image(); im.onload = () => { refImgs[i] = im; c.innerHTML = `<img src="${im.src}">`; }; im.src = ev.target.result; }; r.readAsDataURL(f); };
      inp.click(); };
    row.appendChild(c);
  }
})();
$('refGo').onclick = async () => {
  const imgs = refImgs.filter(Boolean);
  if (!imgs.length) return toast(LANG==='ar'?'ضيف صورة مرجع واحدة على الأقل':'Add at least one reference');
  const p = $('refPrompt').value.trim(); if (!safeCheck(p)) return;
  const btn = $('refGo'); btn.disabled = true;
  const r = await aiRender(imgs, p.slice(0,40), 8, '9:16', 720, true);
  const url = addLib(r.blob, p.slice(0,40) || 'reference', 'ref');
  showRes($('refRes'), url, p.slice(0,40), 'local'); track('ref_free', imgs.length); btn.disabled = false;
};

/* --- motion control --- */
let mImg = null;
dropZone($('mDrop'), (im) => { mImg = im; $('mDrop').classList.add('has'); $('mDrop').innerHTML = `<img src="${im.src}">`; });
$('mGo').onclick = async () => {
  if (!mImg) return toast('🖼️');
  const pre = segVal('mPre') || 'zoom-in', dur = parseInt(segVal('mDur')) || 8;
  const cv = canvasFor('9:16', 720), cx = cv.getContext('2d'), W = cv.width, H = cv.height;
  const btn = $('mGo'); btn.disabled = true;
  const run = new Promise(res => { const t0 = performance.now();
    const loop = () => { const t = (performance.now()-t0)/1000; if (t>=dur) return res();
      const ph = t/dur;
      cx.fillStyle='#070a10'; cx.fillRect(0,0,W,H);
      let z = 1+.15*ph, dx = 0, dy = 0;
      if (pre==='orbit') { z = 1.12; dx = Math.cos(t*1.2)*W*.05; dy = Math.sin(t*1.2)*H*.03; cx.translate(W/2,H/2); cx.rotate(Math.sin(t)*0.04); cx.translate(-W/2,-H/2); }
      if (pre==='bounce') { z = 1.08+.06*Math.abs(Math.sin(t*3)); dy = -H*.02*Math.abs(Math.sin(t*3)); }
      if (pre==='pan') { z = 1.15; dx = -W*.1+ph*W*.2; }
      fitDraw(cx, mImg, W, H, z, dx, dy);
      if (LOGO.complete) cx.drawImage(LOGO, W*.04, H*.03, W*.12, W*.12);
      requestAnimationFrame(loop); }; loop(); });
  const blob = await recordCanvas(cv, dur, beatAudio(dur,'lofi'), () => run);
  const url = addLib(blob, pre + ' motion', 'motion');
  showRes($('mRes'), url, pre, 'local'); track('motion', pre); btn.disabled = false;
};

/* --- video tools --- */
let vtVid = null, vtURL = null;
(function vtWire() {
  const d = $('vtDrop');
  d.onclick = () => { const inp = document.createElement('input'); inp.type='file'; inp.accept='video/*';
    inp.onchange = e => { const f = e.target.files[0]; if (!f) return; vtVid = f; vtURL = URL.createObjectURL(f);
      d.classList.add('has'); d.innerHTML = `<video src="${vtURL}" controls muted></video>`; };
    inp.click(); };
})();
async function vtRun(kind) {
  if (!vtVid) return toast(LANG==='ar'?'اختار فيديو الأول':LANG==='de'?'Wähle zuerst ein Video':'Pick a video first');
  const box = $('vtRes'); box.innerHTML = '<div class="skel" style="height:160px"></div>';
  const v = document.createElement('video'); v.src = vtURL; v.muted = true;
  await new Promise(r => { v.onloadeddata = r; v.onerror = r; });
  try {
    if (kind === 'up') {
      const c = document.createElement('canvas'); c.width = v.videoWidth*2; c.height = v.videoHeight*2;
      const cx2 = c.getContext('2d'); cx2.imageSmoothingEnabled = true; cx2.imageSmoothingQuality='high';
      v.currentTime = Math.min(.5, (v.duration||1)/2);
      await new Promise(r => { v.onseeked = r; });
      cx2.drawImage(v, 0, 0, c.width, c.height);
      c.toBlob(b => { const url = URL.createObjectURL(b); box.innerHTML = `<img src="${url}" style="max-width:460px;border-radius:14px"><a class="btn p sm" href="${url}" download="upscaled.png">⬇</a>`; });
    } else if (kind === 'bg') {
      const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
      const cx2 = c.getContext('2d');
      v.currentTime = .5; await new Promise(r => { v.onseeked = r; });
      cx2.drawImage(v, 0, 0);
      const d2 = cx2.getImageData(0,0,c.width,c.height), px = d2.data;
      const bg = [px[0], px[1], px[2]];
      for (let i = 0; i < px.length; i += 4) {
        const dd = Math.abs(px[i]-bg[0]) + Math.abs(px[i+1]-bg[1]) + Math.abs(px[i+2]-bg[2]);
        if (dd < 90) { px[i+3] = 0; }
        else if (dd < 160) { px[i+3] = Math.round(255*(dd-90)/70); }
      }
      cx2.putImageData(d2, 0, 0);
      c.toBlob(b => { const url = URL.createObjectURL(b); box.innerHTML = `<img src="${url}" style="max-width:460px;border-radius:14px;background:repeating-conic-gradient(#222 0 90deg,#333 0 180deg)"><a class="btn p sm" href="${url}" download="no-bg.png">⬇</a>`; });
    } else if (kind === 'ext' || kind === 'aud') {
      const dur = Math.min(10, (v.duration || 4) * 2);
      const cv = canvasFor('9:16', 720), cx2 = cv.getContext('2d');
      const stream = cv.captureStream(30);
      if (kind === 'aud') {
        const AA = new (window.AudioContext || window.webkitAudioContext)();
        const src = AA.createMediaElementSource(v.cloneNode()); v.src = vtURL; v.muted = false;
        const g = AA.createGain(); g.gain.value = 2.2;
        const dest = AA.createMediaStreamDestination();
        src.connect(g); g.connect(dest); g.connect(AA.destination);
        dest.stream.getAudioTracks().forEach(tr => stream.addTrack(tr));
        v.play().catch(()=>{});
      }
      const rec = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
      const done = new Promise(r => rec.onstop = r);
      v.currentTime = 0; v.play().catch(()=>{});
      rec.start(200);
      await new Promise(r => setTimeout(r, Math.min(8000, dur*500)));
      rec.stop(); v.pause(); await done;
      const url = URL.createObjectURL(new Blob(chunks, { type:'video/webm' }));
      box.innerHTML = `<video src="${url}" controls playsinline></video><a class="btn p sm" href="${url}" download="easy-tools.webm">⬇</a>`;
    }
  } catch (e) { box.innerHTML = '<span class="note">⚠ ' + e.message + '</span>'; }
  track('vtool', kind);
}
$('vtUp').onclick = () => vtRun('up');
$('vtBg').onclick = () => vtRun('bg');
$('vtExt').onclick = () => vtRun('ext');
$('vtAud').onclick = () => vtRun('aud');

/* ============ cinema (real AI via backend) ============ */
async function cinemaFrom(promptEl, resBox) {
  const p = (typeof promptEl === 'string' ? promptEl : promptEl.value).trim();
  if (!p) return toast('✍️');
  if (!safeCheck(p)) return;
  if (!myPhone()) { toast(T().toast_need_sign); return go('account'); }
  await refreshPaid();
  if (!paid) { go('pay'); return toast(LANG==='ar'?'فَعِّل السينما الأول من صفحة التفعيل':'Activate Cinema first'); }
  const box = resBox;
  box.innerHTML = '<div class="skel" style="height:220px"></div><span class="note">🎬 Kling — 1-3 min…</span>';
  track('cinema_request', p.slice(0,80));
  try {
    const r = await (await fetch(`${API}/vsPublic`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'generate', phone: myPhone(), prompt: p }) })).json();
    if (!r.ok) { box.innerHTML = '<span class="note">⚠ ' + esc(r.error) + '</span>'; if (r.code==='not_paid'||r.code==='no_credits') go('pay'); return; }
    for (let i = 0; i < 90; i++) {
      await new Promise(rs => setTimeout(rs, 5000));
      const s = await (await fetch(`${API}/vsPublic`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'job_status', id: r.job_id }) })).json();
      if (s.status === 'completed') {
        LIB.unshift({ url: s.video_url, title: p.slice(0,40), kind:'cinema', st:'done', when: Date.now() });
        box.innerHTML = `<video src="${s.video_url}" controls playsinline></video>
          <div class="modes"><a class="btn p sm" href="${s.video_url}" target="_blank" rel="noopener">⬇ ${T().lib_dl}</a>
          <button class="btn g sm" onclick="postToStudio('${s.video_url}','${esc(p.slice(0,40))}','ai')">⬆ ${T().lib_post}</button></div>`;
        refreshPaid(); track('cinema_done', ''); return;
      }
      if (s.status === 'failed') { box.innerHTML = '<span class="note">⚠ ' + esc(s.error || 'failed') + '</span>'; return; }
      box.querySelector('.note') && (box.querySelector('.note').textContent = `🎬 ${Math.min((i+1)*5,300)}s…`);
    }
  } catch (e) { box.innerHTML = '<span class="note">⚠ ' + T().net_err + '</span>'; }
}
window.postToStudio = async function (url, title, kind) {
  if (!myPhone()) { toast(T().toast_need_sign); return go('account'); }
  if (!CLOUD.cloud_name || !CLOUD.upload_preset) return toast('☁ ' + (LANG==='ar'?'الكلاود مش مفعّل':'Cloud not configured'));
  toast('⬆ …');
  try {
    let blob = url.startsWith('blob:') ? await (await fetch(url)).blob() : null;
    let cl = url;
    if (blob) {
      const fd = new FormData(); fd.append('file', blob, 'easy-video.webm'); fd.append('upload_preset', CLOUD.upload_preset); fd.append('folder','easy-video');
      const r = await (await fetch(`https://api.cloudinary.com/v1_1/${CLOUD.cloud_name}/video/upload`, { method:'POST', body: fd })).json();
      if (r.error) return toast('⚠ ' + r.error.message);
      cl = r.secure_url;
    }
    const reg = await (await fetch(`${API}/vsVideo`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'register', phone: myPhone(), title: title || 'My video', url: cl, thumb:'', kind }) })).json();
    toast(reg.ok ? '🎉 My Studio' : '⚠ ' + (reg.error || ''));
  } catch (e) { toast('⚠ ' + T().net_err); }
};

/* ============ feed (home) ============ */
async function ensureFeed() { if (feedLoaded) return; feedLoaded = true;
  try { const r = await (await fetch(`${API}/vsVideo`)).json();
    $('feedRow').innerHTML = (r.videos || []).slice(0,10).map(v => `<div class="litem" style="flex:0 0 240px"><video src="${v.url}#t=0.5" preload="metadata" playsinline controls ${v.thumb?`poster="${v.thumb}"`:''}></video><div class="lmeta"><b>${esc(v.title)}</b><span class="mut">${esc(v.name||'')}</span></div></div>`).join('') || `<span class="mut">${T().lib_empty}</span>`;
  } catch (e) { $('feedRow').innerHTML = '<span class="mut">—</span>'; }
}

/* ============ static builders ============ */
const TOOLS = [['i2v','t_i2v','t_i2v_d'],['t2v','t_t2v','t_t2v_d'],['img','t_img','t_img_d'],['voice','t_voice','t_voice_d'],['music','t_music','t_music_d'],['lip','t_lip','t_lip_d'],['ref','t_ref','t_ref_d'],['motion','t_motion','t_motion_d'],['vtools','t_vtools','t_vtools_d']];
const TOOL_COVER = { i2v:'img/i2v.jpg', t2v:'img/t2v.jpg', img:'img/seed.jpg', voice:'img/voice.jpg', music:'img/lip.jpg', lip:'img/lip.jpg', ref:'img/ref.jpg', motion:'img/motion.jpg', vtools:'img/vtools.jpg' };
function buildTools() { const t = T();
  $('toolGrid').className = 'tgrid2';
  $('toolGrid').innerHTML = TOOLS.map(([id,k,kd]) => `<div class="tcard2" onclick="openTool('${id}')">
    <div class="cov"><img src="${TOOL_COVER[id]}" alt="${esc(t[k])}" loading="lazy"></div>
    <h3>${esc(t[k])}</h3><p class="dsc">${esc(t[kd])}</p>
    <div class="demo"><span class="lbl">▶ ${esc(t.demo_watch)}</span>
      <video data-src="demos/${id}.mp4" poster="demos/${id}.jpg" muted loop playsinline preload="none" onclick="event.stopPropagation();this.paused?this.play():this.pause()"></video></div>
  </div>`).join('');
  lazyDemos();
}
/* demos load + autoplay only when scrolled into view (saves data on mobile) */
function lazyDemos() {
  const vids = document.querySelectorAll('video[data-src]');
  if (!('IntersectionObserver' in window)) { vids.forEach(v => { v.src = v.dataset.src; }); return; }
  const io = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting) { if (!v.src) v.src = v.dataset.src; v.play().catch(()=>{}); }
    else if (v.src) v.pause();
  }), { threshold: .35 });
  vids.forEach(v => io.observe(v));
}
window.openTool = id => { go('studio'); const b = document.querySelector(`.stab[data-tab="${id}"]`); b && b.click(); };
let ucCur = 0;
function buildUseCases() { const t = T(), L = LANG, U = D.usecases;
  $('ucTabs').innerHTML = U.map((u,i) => `<button class="uctab ${i===ucCur?'on':''}" data-i2="${i}">${esc(u.tab[L])}</button>`).join('');
  document.querySelectorAll('.uctab').forEach(b => b.onclick = () => { ucCur = +b.dataset.i2; buildUseCases(); });
  const u = U[ucCur];
  $('ucBox').innerHTML = `<div class="uccard"><div class="im"><img src="${u.img}" alt="${esc(u.h[L])}" loading="lazy"></div><h3>${esc(u.h[L])}</h3><p>${esc(u.p[L])}</p></div>`;
}
function buildPrompts() { const t = T(), L = LANG;
  $('peGrid').innerHTML = D.promptex.map((x,i) => `<div class="pe"><div class="im"><img src="${x.img}" loading="lazy" alt=""></div>
   <div class="tx"><p>${esc(x.t[L])}</p><button class="cp" onclick="copyPrompt(${i},this)" title="${esc(t.pe_copy)}">⧉</button></div>
   <button class="btn g sm go" onclick="usePrompt(${i})">${esc(t.ex_try)} →</button></div>`).join('');
}
window.copyPrompt = (i, btn) => { navigator.clipboard.writeText(D.promptex[i].t[LANG]).then(() => { toast(T().pe_copied); btn.textContent = '✓'; setTimeout(() => btn.textContent = '⧉', 1400); }).catch(()=>{}); };
window.usePrompt = i => { openTool('i2v'); setTimeout(() => { $('i2vPrompt').value = D.promptex[i].t[LANG]; $('t2vPrompt').value = D.promptex[i].t[LANG]; toast(T().pe_copied); }, 120); };
function buildModels() { const t = T();
  $('modelGrid').innerHTML = D.models.map(m => `<div class="mcard">
    <div class="mcover img"><img src="${m.img}" alt="${esc(m.name)}" loading="lazy">
      <span class="tag ${m.wired?'':'soon'}">${m.wired ? t.model_wired : t.model_soon}</span></div>
    <div class="mbody"><h3>${esc(m.name)}${m.cost<=4?`<span class="badge-free">${esc(t.free_badge)}</span>`:''}</h3><p class="mut" style="font-size:.83rem;margin-top:6px">${esc(m.desc)}</p>
     <ul>${m.strengths.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>
     <div class="crow"><span class="cost"><span class="gem2"></span>${m.cost} ${t.model_credits}</span>
     <button class="btn p sm" onclick="tryModel('${m.id}')">${t.model_try}</button></div></div></div>`).join('');
}
window.tryModel = id => { openTool('t2v'); toast(id === 'kling' ? (LANG==='ar'?'Kling شغال الآن في وضع السينما':'Kling is live in Cinema mode') : (LANG==='ar'?'الموديل ده هيوصّل قريب — استخدم السينما النهاردة':'Coming soon — use Cinema today')); };
function buildTesti() { $('testiRow').innerHTML = D.testimonials.map(x => `<div class="tst"><div class="qchip">“</div><h4>${esc(x.h||'')}</h4><p>${esc(x.t)}</p><div class="who"><b>${esc(x.n)}</b>, <span class="role">${esc(x.r)}</span></div></div>`).join(''); }
function buildFaq() { $('faqBox').innerHTML = D.faq.map(f => `<details><summary>${esc(f.q)}</summary><div class="a">${esc(f.a)}</div></details>`).join(''); }
function buildBlog() { const t = T();
  $('blogGrid').innerHTML = D.blog.map(b => `<div class="bcard" onclick="readBlog('${b.id}')"><div class="bcover img"><img src="${b.img}" alt="${esc(b.title)}" loading="lazy"></div><div class="bbody"><h3>${esc(b.title)}</h3><p class="mut" style="font-size:.88rem;margin-top:10px">${esc(b.excerpt)}</p><div class="bmeta"><span>📅 ${b.date}</span><span>${esc(b.author)}</span></div></div></div>`).join(''); }
window.readBlog = id => { const b = D.blog.find(x => x.id === id); if (!b) return;
  $('articleBox').innerHTML = `<button class="btn g sm" onclick="go('blog')">← ${T().blog_back}</button>
   <h2 style="margin-top:16px">${esc(b.title)}</h2><p class="mut" style="margin:8px 0 18px">${b.date} · ${esc(b.author)}</p>
   <div class="card"><p style="white-space:pre-line;font-size:.95rem">${esc(b.body)}</p></div>`; go('article'); };
function buildPricing() {
  const t = T();
  $('planGrid').innerHTML = D.plans.map(p => `<div class="plan ${p.pop?'pop':''}">${p.pop?`<span class="pop-badge">${t.plan_pop}</span>`:''}
   <div class="pt">${p.name.toUpperCase()}</div><div class="pr">${p.price}<small> ${p.unit} ${t.plan_mo}</small></div>
   <ul>${p.feats.map(f=>`<li>${esc(f)}</li>`).join('')}</ul>
   <button class="btn ${p.pop?'p':'g'}" onclick="buyPlan('${p.id}',${p.price})">${p.id==='free'?'🎬 '+T().cta:t.plan_cta}</button></div>`).join('');
  $('packGrid').innerHTML = D.packs.map(p => `<div class="pack"><h3>${p.name}</h3><div class="pr" style="font-size:1.4rem;font-weight:900;margin:6px 0">${p.price} EGP</div><p class="mut" style="font-size:.82rem">${p.credits}</p><button class="btn g sm" style="margin-top:10px" onclick="buyPlan('pack',${p.price})">${t.pack_cta}</button></div>`).join('');
}
window.buyPlan = (id, price) => { if (id === 'free') return go('studio'); go('pay'); };
function buildLibrary() {
  const t = T();
  if (!LIB.length) { $('libGrid').innerHTML = `<p class="mut">${t.lib_empty}</p>`; return; }
  $('libGrid').innerHTML = LIB.map((x, i) => `<div class="litem">
   ${x.url.match(/\.(webm|mp4)/) || x.kind !== 'cinema' ? `<video src="${x.url}" controls playsinline preload="metadata"></video>` : `<img src="${x.url}">`}
   <div class="lmeta"><div><b>${esc(x.title)}</b><span class="status d">${t.st_done}</span></div>
   <div class="lbtns"><a class="mini" href="${x.url}" download target="_blank">${t.lib_dl}</a>
   <button class="mini no" onclick="libDel(${i})">${t.lib_del}</button></div></div></div>`).join('');
}
window.libDel = i => { LIB.splice(i, 1); buildLibrary(); };

/* ============ payment ============ */
async function loadPay() {
  try {
    const c = await (await fetch(`${API}/vsPublic`)).json();
    if (!c.initialized) { $('payCardBox').innerHTML = '<p class="mut">🚀</p>'; return; }
    $('payAmount').value = c.price_egp + ' EGP — ' + c.credits_per_payment + ' ' + T().credits;
    $('payWallet').value = (c.wallet_type ? c.wallet_type + ': ' : '') + c.wallet_number;
    if (myPhone()) $('payPhone').value = myPhone();
    $('payCardBtn').style.display = c.card_url ? 'inline-flex' : 'none';
    $('payCardBtn').onclick = () => window.open(c.card_url, '_blank');
  } catch (e) { $('payCardBox').innerHTML = '<p class="mut">' + T().net_err + '</p>'; }
}
$('paySubmit').onclick = async () => {
  const m = $('payMsg'); m.className = 'msg-notice';
  try {
    const r = await (await fetch(`${API}/vsPublic`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'submit_payment', phone: $('payPhone').value.trim(), ref: $('payRef').value.trim() }) })).json();
    if (r.ok) { m.classList.add('ok'); m.textContent = r.message || T().pay_ok; localStorage.setItem(LS.phone, $('payPhone').value.trim()); }
    else { m.classList.add('err'); m.textContent = r.error; }
  } catch (e) { m.classList.add('err'); m.textContent = T().net_err; }
};
$('payCheck').onclick = async () => {
  const m = $('payMsg'); m.className = 'msg-notice';
  try {
    const r = await (await fetch(`${API}/vsPublic`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'check_payment', phone: $('payPhone').value.trim() || myPhone() }) })).json();
    m.classList.add(r.paid ? 'ok' : 'err');
    m.textContent = r.paid ? T().pay_ok + ' (' + r.credits_left + ' ' + T().credits + ')' : (LANG==='ar'?'لسه مفيش تفعيل — استنى الدقايق':'Not active yet');
    refreshPaid();
  } catch (e) { m.classList.add('err'); m.textContent = T().net_err; }
};

/* ============ account ============ */
let accMode = 'up';
function initAccount() {
  if (myPhone()) { $('acctBox').style.display = 'none'; $('acctInfo').style.display = 'block'; showAcct(); }
  else { $('acctBox').style.display = 'block'; $('acctInfo').style.display = 'none'; }
  const ref = 'https://mido9980.github.io/easy-video/?ref=' + (myPhone() || 'friend');
  $('refLink').value = ref;
}
async function showAcct() {
  await refreshPaid();
  $('stCredits').textContent = paid ? credits : '—';
  $('stName').textContent = localStorage.getItem(LS.name) || myPhone().slice(-4);
  $('stStatus').textContent = paid ? T().cinema_mode : T().free_user;
}
$('refCopy').onclick = () => { navigator.clipboard.writeText($('refLink').value).then(() => toast(T().acc_copied)); };
$('accToggle').onclick = () => { accMode = accMode === 'up' ? 'in' : 'up';
  $('accGo').textContent = accMode === 'up' ? T().acc_signup : T().acc_signin;
  $('accToggle').textContent = accMode === 'up' ? T().acc_signin : T().acc_signup; };
$('accGo').onclick = async () => {
  const m = $('accMsg'); m.className = 'msg-notice';
  const phone = $('accPhone').value.trim().replace(/\D/g, ''), pin = $('accPin').value.trim(), name = $('accName').value.trim();
  if (phone.length < 10 || pin.length < 4) { m.classList.add('err'); m.textContent = '⚠ phone 10+ / PIN 4+'; return; }
  try {
    const r = await (await fetch(`${API}/vsPublic`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action: accMode === 'up' ? 'signup' : 'login', phone, pin, name }) })).json();
    if (r.ok) { localStorage.setItem(LS.phone, phone); if (accMode==='up') localStorage.setItem(LS.name, r.name || name);
      m.classList.add('ok'); m.textContent = '✓'; toast('✓'); refreshPaid(); initAccount(); }
    else { m.classList.add('err'); m.textContent = r.error; }
  } catch (e) { m.classList.add('err'); m.textContent = T().net_err; }
};
$('accLogout').onclick = () => { localStorage.removeItem(LS.phone); localStorage.removeItem(LS.name); me = null; paid = false; refreshCredPill(); initAccount(); };
$('accDel').onclick = () => { localStorage.clear(); toast(LANG==='ar'?'اتمسحت بياناتك من الجهاز':'Local data removed'); setTimeout(()=>location.reload(), 800); };

/* ============ admin ============ */
let APASS = '';
$('admGo').onclick = async () => {
  const m = $('admMsg'); m.className = 'msg-notice';
  try {
    const r = await (await fetch(`${API}/vsAdmin`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'stats', password: $('admPass').value }) })).json();
    if (!r.ok) { m.classList.add('err'); m.textContent = r.error; return; }
    APASS = $('admPass').value;
    $('admLogin').style.display = 'none'; $('admPanel').style.display = 'block';
    renderAdmin(r);
    const c = await (await fetch(`${API}/vsPublic`)).json();
    $('setWtype').value = c.wallet_type || ''; $('setWno').value = c.wallet_number || '';
    $('setPrice').value = c.price_egp || 50; $('setCredits').value = c.credits_per_payment || 3;
    $('setCardUrl').value = c.card_url || ''; $('setCloud').value = c.cloud_name || ''; $('setPreset').value = c.upload_preset || '';
    $('setChatModel').value = 'deepseek/deepseek-v4-flash-free'; $('setVideoModel').value = 'kling/kling-v2-5-turbo';
  } catch (e) { m.classList.add('err'); m.textContent = T().net_err; }
};
function renderAdmin(r) { const t = T();
  $('admStats').innerHTML = `<div class="stat"><b>${(r.by_type&&r.by_type.app_open)||0}</b><i>${t.adm_visits}</i></div>
   <div class="stat"><b>${(r.by_type&&r.by_type.free_render)||0}</b><i>${t.adm_free}</i></div>
   <div class="stat"><b>${(r.by_type&&r.by_type.cinema_request)||0}</b><i>${t.adm_cinema}</i></div>
   <div class="stat"><b>${r.approved_count||0}</b><i>${t.adm_subs}</i></div>
   <div class="stat"><b>${r.revenue_egp||0} EGP</b><i>${t.adm_rev}</i></div>`;
  $('admPending').innerHTML = !r.pending || !r.pending.length ? `<p class="mut">${t.adm_none}</p>` :
    '<table><tr><th>' + t.acc_phone + '</th><th>' + t.pay_ref + '</th><th>' + t.pay_amount + '</th><th></th></tr>' +
    r.pending.map(p => `<tr><td>${esc(p.phone)}</td><td>${esc(p.ref)}</td><td>${p.amount}</td>
      <td><button class="mini ok" onclick="admAct('approve','${p.id}')">${t.adm_approve}</button>
      <button class="mini no" onclick="admAct('reject','${p.id}')">${t.adm_reject}</button></td></tr>`).join('') + '</table>';
}
window.admAct = async (action, id) => {
  const r = await (await fetch(`${API}/vsAdmin`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action, id, password: APASS }) })).json();
  toast(r.message || r.error);
  const s = await (await fetch(`${API}/vsAdmin`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'stats', password: APASS }) })).json();
  if (s.ok) renderAdmin(s);
};
$('admSave').onclick = async () => {
  const m = $('admSaveMsg'); m.className = 'msg-notice';
  const r = await (await fetch(`${API}/vsAdmin`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({
    action:'update_config', password: APASS,
    wallet_type: $('setWtype').value, wallet_number: $('setWno').value.trim(),
    price_egp: parseFloat($('setPrice').value) || 50, credits_per_payment: parseInt($('setCredits').value) || 3,
    card_url: $('setCardUrl').value.trim(), cloud_name: $('setCloud').value.trim(), upload_preset: $('setPreset').value.trim(),
    chat_model: $('setChatModel').value.trim(), video_model: $('setVideoModel').value.trim() }) })).json();
  if (r.ok) { m.classList.add('ok'); m.textContent = T().adm_saved; } else { m.classList.add('err'); m.textContent = r.error; }
};

/* ============ boot ============ */
(function boot() {
  applyI18n(); buildTools(); buildUseCases(); buildPrompts(); buildStabs(); buildTesti(); buildFaq(); loadVoiceSelect(); loadConfig();
  route();
  if (myPhone()) refreshPaid();
  track('app_open', LANG);
})();
