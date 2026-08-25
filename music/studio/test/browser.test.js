// 浏览器集成测试（CDP 驱动，node test/browser.test.js）
// 覆盖需求：R1 音色选择 / R5 拖拽（鼠标+触摸）/ R7 自定义元素 / R8 播放调度 / R9 持久化 / R10 导出 / R11 UI 完整性与零控制台错误
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');        // site-repository/music/studio 的上级
const SERVE_ROOT = path.resolve(__dirname, '..', '..', '..'); // site-repository/（test/ -> studio -> music -> site-repository）
let HTTP_PORT = 0;    // 动态端口，启动后赋值
let CDP_PORT = 0;
let APP_URL = '';

function freePort() {
  return new Promise((ok, no) => {
    const srv = require('net').createServer();
    srv.listen(0, '127.0.0.1', () => { const p = srv.address().port; srv.close(() => ok(p)); });
    srv.on('error', no);
  });
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wav': 'audio/wav', '.md': 'text/markdown', '.json': 'application/json' };

/* ---------- 静态服务器 ---------- */
const server = http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  if (url.endsWith('/')) url += 'index.html';
  const full = path.join(SERVE_ROOT, url);
  if (!full.startsWith(SERVE_ROOT)) { console.log('[runner] 403', req.url); res.writeHead(403); res.end(); return; }
  fs.readFile(full, (err, data) => {
    if (err) { console.log('[runner] 404', req.url); res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
    res.end(data);
  });
});

function startServer() {
  return new Promise((ok, no) => {
    server.on('error', no);
    server.listen(0, '127.0.0.1', () => {
      HTTP_PORT = server.address().port;
      APP_URL = 'http://127.0.0.1:' + HTTP_PORT + '/music/studio/index.html';
      const sanity = path.join(SERVE_ROOT, 'music/studio/index.html');
      console.log('[runner] http port', HTTP_PORT, '| serve root', SERVE_ROOT, '| index exists:', fs.existsSync(sanity));
      ok();
    });
  });
}

/* ---------- Chrome 启动 ---------- */
let chromeProc = null;
const CDP_HTTP = () => 'http://127.0.0.1:' + CDP_PORT;
function startChrome() {
  return new Promise(async (ok, no) => {
    CDP_PORT = await freePort();
    chromeProc = spawn('google-chrome', [
      '--headless=new', '--disable-gpu', '--no-sandbox',
      '--remote-debugging-port=' + CDP_PORT, '--remote-allow-origins=*',
      '--user-data-dir=' + path.join('/tmp', 'gzs-btest-' + Date.now()),
      '--no-first-run', '--no-default-browser-check',
      'about:blank'
    ], { stdio: 'ignore' });
    const deadline = Date.now() + 15000;
    (function poll() {
      http.get(CDP_HTTP() + '/json/version', r => r.resume().on('end', ok)).on('error', () => {
        if (Date.now() > deadline) return no(new Error('chrome 启动超时'));
        setTimeout(poll, 200);
      });
    })();
  });
}

async function getPageWs() {
  for (let i = 0; i < 40; i++) {
    try {
      const t = await new Promise((ok, no) => http.get(CDP_HTTP() + '/json', r => { let d = ''; r.on('data', c => d += c); r.on('end', () => ok(JSON.parse(d))); }).on('error', no));
      const pages = t.filter(x => x.type === 'page');
      if (i === 0) console.log('[runner] CDP pages:', t.map(p => p.type + '/' + (p.url || '').slice(0, 60)).join(' | '));
      const page = pages.find(x => x.url && !x.url.startsWith('chrome://') && !x.url.startsWith('devtools://')) || pages[0];
      if (page) return page.webSocketDebuggerUrl;
    } catch (e) {}
    await sleep(200);
  }
  throw new Error('CDP page 不可用');
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- CDP 客户端 ---------- */
class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.mid = 0;
    this.pending = new Map();
    this.exceptions = [];          // Runtime.exceptionThrown
    this.logErrors = [];           // Log.entryAdded level=error
    this.consoleErrors = [];       // Runtime.consoleAPICalled error
    this._dialogs = 0;
    this._msgQ = [];
    this._waiters = [];
    this.ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id) { const p = this.pending.get(m.id); if (p) { this.pending.delete(m.id); p(m); } return; }
      if (m.method === 'Runtime.exceptionThrown') this.exceptions.push(m.params.exceptionDetails.exception ? (m.params.exceptionDetails.exception.description || m.params.exceptionDetails.text) : m.params.exceptionDetails.text);
      if (m.method === 'Log.entryAdded') {
        const txt = m.params.entry.text || '';
        // 忽略网络资源 404 噪音（favicon 等），只保留真正的 JS/资源异常
        if (m.params.entry.level === 'error' && !/Failed to load resource/.test(txt)) this.logErrors.push(txt);
      }
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') this.consoleErrors.push(m.params.args.map(a => a.value || a.description || '').join(' '));
      if (m.method === 'Page.javascriptDialogOpening') {
        this._dialogs++;
        this.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
      }
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'log') {
        const t = (m.params.args[0] && m.params.args[0].value);
        if (typeof t === 'string' && t.startsWith('__CASE__')) this._caseReady = true;
      }
    };
  }
  async open() { if (this.ws.readyState === 0) await new Promise(r => this.ws.onopen = r); }
  send(method, params) {
    const id = ++this.mid;
    return new Promise((ok, no) => {
      this.pending.set(id, ok);
      this.ws.send(JSON.stringify({ id, method, params: params || {} }));
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); no(new Error('CDP timeout ' + method)); } }, 15000);
    });
  }
  async evaluate(expr) {
    // 包裹 try/catch，避免测试表达式抛错污染页面异常统计
    const wrapped = '(function(){try{return {ok:true,val:(' + expr + ')}}catch(e){return {ok:false,err:String(e && e.stack || e)}}})()';
    const r = await this.send('Runtime.evaluate', { expression: wrapped, returnByValue: true });
    return r.result.result.value;
  }
  resetErrors() { this.exceptions = []; this.logErrors = []; this.consoleErrors = []; }
  errors() { return this.exceptions.concat(this.logErrors, this.consoleErrors); }
}

/* ---------- 用例运行器 ---------- */
const results = [];
async function caseRun(name, fn, cdp) {
  cdp.resetErrors();
  try {
    await cdp.send('Page.navigate', { url: APP_URL });
    // 轮询等待应用就绪（GZS.app 出现且 palette 渲染完成）
    const readyBy = Date.now() + 8000;
    while (Date.now() < readyBy) {
      const ready = await cdp.evaluate(`(function(){var g=window.GZS;return !!(g&&g.app&&document.querySelectorAll('.pal-card--motif').length>0)})()`);
      if (ready && ready.ok && ready.val) break;
      await sleep(200);
    }
    const r = await fn(cdp);
    // 排除测试期间由我们故意触发的（无）；任何异常都算失败
    const errs = cdp.errors();
    if (errs.length) {
      results.push({ name, pass: false, msg: '页面异常: ' + errs[0] });
      return;
    }
    if (r === true) results.push({ name, pass: true });
    else results.push({ name, pass: false, msg: r });
  } catch (e) {
    const errs = cdp.errors();
    results.push({ name, pass: false, msg: '异常: ' + e.message + (errs.length ? ' | 页面异常: ' + errs[0] : '') });
  }
}

/* ---------- 公共断言工具（页面内） ---------- */
const Q = {
  // 解锁音频并隐藏 gate
  unlock: `(function(){var b=document.querySelector('#gate-btn');if(b)b.click();return true})()`,
  // transform: 序列化转出 value
  val: (expr) => expr,
};

/* ================= 用例 ================= */
const cases = [];

cases.push({ name: 'B1 页面加载零异常 + 三栏结构齐全', fn: async (c) => {
  const r = await c.evaluate(`(function(){
    var o = {};
    o.gate = document.querySelector('#gate') ? document.querySelector('#gate').getAttribute('aria-hidden') : 'none';
    o.motifs = document.querySelectorAll('.pal-card--motif').length;
    o.progs = document.querySelectorAll('.pal-card--prog').length;
    o.voices = document.querySelectorAll('.voice-head').length;
    o.blocks = document.querySelectorAll('.tl-block').length;
    o.transport = !!document.querySelector('.gz-transport');
    o.inspector = !!document.querySelector('#inspector');
    o.playhead = !!document.querySelector('#playhead');
    return o;
  })()`);
  if (!r.ok) return 'eval 失败';
  const v = r.val;
  if (v.motifs < 8) return '动机卡片不足: ' + v.motifs;
  if (v.progs < 6) return '和声卡片不足: ' + v.progs;
  if (v.voices < 1) return '无声部';
  if (!v.transport || !v.inspector) return '缺区块';
  if (!v.playhead) return 'playhead 缺（renderTimeline 重建）';
  return true;
}});

cases.push({ name: 'B2 自动播放门：第一次点击前不启动音频', fn: async (c) => {
  const before = await c.evaluate(`(function(){return {started:GZS.audio.getStarted(), state:GZS.audio.loadState()}})()`);
  if (before.val.started !== false) return '未点击就启动了音频';
  await c.evaluate(Q.unlock);
  await sleep(1600); // 等采样
  const after = await c.evaluate(`(function(){return {started:GZS.audio.getStarted(), load:GZS.audio.loadState(), gate:document.querySelector('#gate').getAttribute('aria-hidden')}})()`);
  if (!after.val.started) return '点击后仍未解锁';
  if (after.val.gate !== 'true') return 'gate 未隐藏';
  if (after.val.load !== 'ready') return '采样未就绪: ' + after.val.load;
  return true;
}});

cases.push({ name: 'B3 音色选择器存在且可切换', fn: async (c) => {
  const r = await c.evaluate(`(function(){
    var sels = document.querySelectorAll('.voice-timbre');
    var first = sels[0];
    var opts = first ? Array.prototype.slice.call(first.options).map(o=>o.value) : [];
    first.value = 'pluck';
    first.dispatchEvent(new Event('change',{bubbles:true}));
    return {count:sels.length, opts:opts, timbre:GZS.app.project().voices[0].timbre};
  })()`);
  if (!r.ok) return 'eval err';
  if (r.val.count < 1) return '无音色选择器';
  if (!r.val.opts.includes('sample') || !r.val.opts.includes('pluck')) return '选项不足: ' + r.val.opts;
  if (r.val.timbre !== 'pluck') return '切换不生效: ' + r.val.timbre;
  return true;
}});

cases.push({ name: 'B4 声部增删与块迁移', fn: async (c) => {
  // 先保证 >1 声部
  const r = await c.evaluate(`(function(){
    var before = GZS.app.project().voices.length;
    var addBtn = document.querySelector('#voice-add-btn');
    if (!addBtn) return {err:'no add btn'};
    addBtn.click();
    var mid = GZS.app.project().voices.length;
    // 删除第 2 个声部（其上可能有块）
    var heads = document.querySelectorAll('.voice-head');
    var del = heads[1] ? heads[1].querySelector('.vbtn--del') : null;
    if (del) del.click();
    var after = GZS.app.project().voices.length;
    // 检查没有块指向已删声部
    var alive = new Set(GZS.app.project().voices.map(v=>v.id));
    var orphan = GZS.app.project().blocks.some(b=>!alive.has(b.voiceId));
    return {before:before, mid:mid, after:after, orphan:orphan};
  })()`);
  if (!r.ok) return 'eval err';
  const v = r.val;
  if (v.err) return v.err;
  if (v.mid !== v.before + 1) return '添加声部失败: ' + v.before + '->' + v.mid;
  if (v.after !== v.before) return '删除声部失败: ' + v.mid + '->' + v.after;
  if (v.orphan) return '存在孤儿块（块未迁移）';
  return true;
}});

cases.push({ name: 'B5 M/S/音量 控制生效', fn: async (c) => {
  const r = await c.evaluate(`(function(){
    var head = document.querySelector('.voice-head');
    var v = GZS.app.project().voices[0];
    var m0 = v.mute;
    head.querySelector('.vbtn--mute').click();
    var m1 = v.mute;
    var s0 = v.solo;
    head.querySelector('.vbtn--solo').click();
    var s1 = v.solo;
    head.querySelector('.vbtn--solo').click(); // 复位
    var vol = head.querySelector('.vbtn--vol');
    vol.value = '0.4';
    vol.dispatchEvent(new Event('input',{bubbles:true}));
    var vol2 = v.volume;
    return {m0:m0,m1:m1,s0:s0,s1:s1,vol2:vol2};
  })()`);
  const v = r.val;
  if (v.m0 === v.m1) return '静音未切换';
  if (v.s0 === v.s1) return '独奏未切换';
  if (Math.abs(v.vol2 - 0.4) > 0.02) return '音量未更新: ' + v.vol2;
  return true;
}});

cases.push({ name: 'B6 拍号切换 4/4 ↔ 3/4', fn: async (c) => {
  const r = await c.evaluate(`(function(){
    var sel = document.querySelector('#meter-select');
    sel.value = '3';
    sel.dispatchEvent(new Event('change',{bubbles:true}));
    var bpb3 = GZS.app.project().beatsPerBar;
    var evs3 = GZS.app.expand().length;
    sel.value = '4';
    sel.dispatchEvent(new Event('change',{bubbles:true}));
    return {bpb3:bpb3, evs3:evs3, bpb4:GZS.app.project().beatsPerBar};
  })()`);
  const v = r.val;
  if (v.bpb3 !== 3) return '3/4 未生效';
  if (v.bpb4 !== 4) return '4/4 恢复失败';
  return true;
}});

cases.push({ name: 'B7 调式/主音切换后音符仍在调内', fn: async (c) => {
  const r = await c.evaluate(`(function(){
    var ks = document.querySelector('#key-select');
    ks.value = 'G'; ks.dispatchEvent(new Event('change',{bubbles:true}));
    var ms = document.querySelector('#mode-select');
    ms.value = 'yu'; ms.dispatchEvent(new Event('change',{bubbles:true}));
    var p = GZS.app.project();
    var scale = GZS.theory.MODES.yu.semis;
    var tonic = ({C:0,D:2,G:7}[p.key]) + 60;
    var bad = GZS.app.expand().filter(function(e){
      var off = ((e.midi - tonic) % 12 + 12) % 12;
      return scale.indexOf(off) < 0;
    });
    return {key:p.key, mode:p.mode, bad:bad.length};
  })()`);
  const v = r.val;
  if (v.key !== 'G' || v.mode !== 'yu') return '切换未生效';
  if (v.bad > 0) return '调外音符: ' + v.bad;
  return true;
}});

cases.push({ name: 'B8 素材 pointer 拖拽（鼠标）→ 声部 v0 生成块', fn: async (c) => {
  await c.evaluate(Q.unlock);
  const scrollR = await c.evaluate(`(function(){var lane=document.querySelector('.voice-track');window.scrollTo(0, lane.getBoundingClientRect().top + window.scrollY - 140);return window.scrollY})()`);
  await sleep(200);
  const r = await c.evaluate(`(function(){
    var app = GZS.app;
    var before = app.project().blocks.length;
    var card = document.querySelector('#motif-palette .pal-card');
    var lane = document.querySelector('.voice-track');
    var rect = lane.getBoundingClientRect();
    var pxPerBar = app._pxPerBar();
    var barX = rect.left + 2 * pxPerBar;
    var barY = rect.top + rect.height / 2;
    if (barY > window.innerHeight - 30 || barY < 30) return {skip:'lane 不在视口: y=' + Math.round(barY) + ' vh=' + window.innerHeight};
    card.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true, clientX:rect.left+30, clientY:rect.top+10, pointerId:1, pointerType:'mouse'}));
    document.dispatchEvent(new PointerEvent('pointermove', {bubbles:true, clientX:barX, clientY:barY, pointerId:1, pointerType:'mouse'}));
    document.dispatchEvent(new PointerEvent('pointerup', {bubbles:true, clientX:barX, clientY:barY, pointerId:1, pointerType:'mouse'}));
    var blocks = app.project().blocks;
    var added = blocks[blocks.length-1];
    var hit = document.elementFromPoint(barX, barY);
    return {before:before, after:blocks.length, voice:added?added.voiceId:null, bar:added?added.startBar:null, type:added?added.type:null, skip:null, hit: hit ? (hit.tagName + '|' + hit.outerHTML.slice(0,160)) : 'NULL', laneId: hit ? (hit.closest('.voice-track') ? hit.closest('.voice-track').dataset.voiceId : 'NOLANE') : 'NULL', scrollY: window.scrollY, laneTop: Math.round(rect.top)};
  })()`);
  const v = r.val;
  if (v.skip) return v.skip;
  if (v.after !== v.before + 1) return '未新增块: ' + JSON.stringify(v);
  if (v.type !== 'motif') return '类型不对: ' + v.type;
  if (Math.abs(v.bar - 2) > 1) return '落点小节不对: ' + v.bar;
  return true;
}});

cases.push({ name: 'B9 素材 pointer 拖拽（触摸）→ 同样生效', fn: async (c) => {
  await c.evaluate(Q.unlock);
  await c.evaluate(`(function(){var lane=document.querySelectorAll('.voice-track')[1]||document.querySelector('.voice-track');window.scrollTo(0, lane.getBoundingClientRect().top + window.scrollY - 140);return true})()`);
  await sleep(200);
  const r = await c.evaluate(`(function(){
    var app = GZS.app;
    var before = app.project().blocks.length;
    var card = document.querySelector('#prog-palette .pal-card');
    var lane = document.querySelectorAll('.voice-track')[1] || document.querySelector('.voice-track');
    var rect = lane.getBoundingClientRect();
    var pxPerBar = app._pxPerBar();
    var x = rect.left + 1 * pxPerBar, y = rect.top + rect.height/2;
    if (y > window.innerHeight - 30 || y < 30) return {skip:'lane 不在视口: y=' + Math.round(y)};
    card.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true, clientX:rect.left+20, clientY:rect.top+8, pointerId:7, pointerType:'touch', isPrimary:true}));
    document.dispatchEvent(new PointerEvent('pointermove', {bubbles:true, clientX:x, clientY:y, pointerId:7, pointerType:'touch', isPrimary:true}));
    document.dispatchEvent(new PointerEvent('pointerup', {bubbles:true, clientX:x, clientY:y, pointerId:7, pointerType:'touch', isPrimary:true}));
    var blocks = app.project().blocks;
    var added = blocks[blocks.length-1];
    return {before:before, after:blocks.length, type:added?added.type:null, voice:added?added.voiceId:null, skip:null};
  })()`);
  const v = r.val;
  if (v.skip) return v.skip;
  if (v.after !== v.before + 1) return '触摸拖拽未新增块';
  if (v.type !== 'progression') return '类型不对: ' + v.type;
  return true;
}});

cases.push({ name: 'B10 时间轴块拖动移动 (pointer)', fn: async (c) => {
  await c.evaluate(Q.unlock);
  const r = await c.evaluate(`(function(){
    var app = GZS.app;
    var blk0 = app.project().blocks[0];
    var start0 = blk0.startBar;
    var elB = document.querySelector('.tl-block');
    var rect = elB.getBoundingClientRect();
    var pxPerBar = app._pxPerBar();
    elB.dispatchEvent(new MouseEvent('mousedown', {bubbles:true, clientX:rect.left+Math.min(rect.width/2, pxPerBar*0.5), clientY:rect.top+10, button:0}));
    document.dispatchEvent(new MouseEvent('mousemove', {bubbles:true, clientX:rect.left+Math.min(rect.width/2, pxPerBar*0.5) + pxPerBar*2, clientY:rect.top+10}));
    document.dispatchEvent(new MouseEvent('mouseup', {bubbles:true}));
    return {start0:start0, start1:blk0.startBar};
  })()`);
  const v = r.val;
  if (Math.abs((v.start1 - v.start0) - 2) > 1) return '移动未生效: ' + v.start0 + '->' + v.start1;
  return true;
}});

cases.push({ name: 'B11 手柄改长度 (resize-r)', fn: async (c) => {
  await c.evaluate(Q.unlock);
  const r = await c.evaluate(`(function(){
    var app = GZS.app;
    var blk0 = app.project().blocks[0];
    var b0 = blk0.bars;
    var elB = document.querySelector('.tl-block');
    var handle = elB.querySelector('.tl-block-handle--r');
    var rect = handle.getBoundingClientRect();
    var pxPerBar = app._pxPerBar();
    handle.dispatchEvent(new MouseEvent('mousedown', {bubbles:true, clientX:rect.left + rect.width - 2, clientY:rect.top+5, button:0}));
    document.dispatchEvent(new MouseEvent('mousemove', {bubbles:true, clientX:rect.left + rect.width - 2 + pxPerBar*1.5, clientY:rect.top+5}));
    document.dispatchEvent(new MouseEvent('mouseup', {bubbles:true}));
    return {b0:b0, b1:blk0.bars};
  })()`);
  const v = r.val;
  if (!(v.b1 > v.b0)) return 'resize 未生效: ' + v.b0 + '->' + v.b1;
  return true;
}});

cases.push({ name: 'B12 选中块 → 复制/删除', fn: async (c) => {
  const r = await c.evaluate(`(function(){
    var app = GZS.app;
    var n0 = app.project().blocks.length;
    var elB = document.querySelector('.tl-block');
    elB.dispatchEvent(new MouseEvent('mousedown', {bubbles:true, clientX:1, clientY:1, button:0}));
    document.dispatchEvent(new MouseEvent('mouseup', {bubbles:true}));
    var insp = document.querySelector('#inspector');
    if (insp.innerHTML.indexOf('移调') < 0) return {err:'inspector 无移调'};
    // 复制
    var dup = insp.querySelector('.btn-insp[data-f="dup"]');
    dup.click();
    var n1 = app.project().blocks.length;
    // 删除（第一个块）
    var del = document.querySelector('#inspector').querySelector('.btn-insp--del');
    del.click();
    var n2 = app.project().blocks.length;
    return {n0:n0,n1:n1,n2:n2};
  })()`);
  const v = r.val;
  if (v.err) return v.err;
  if (v.n1 !== v.n0 + 1) return '复制失败: ' + v.n0 + '->' + v.n1;
  if (v.n2 !== v.n0) return '删除失败: ' + v.n1 + '->' + v.n2;
  return true;
}});

cases.push({ name: 'B13 inspector 移调/八度改变发音', fn: async (c) => {
  const r = await c.evaluate(`(function(){
    var app = GZS.app;
    app._setProject(JSON.parse(JSON.stringify((function(){var p={version:1,name:'t',bpm:90,key:'D',mode:'gong',beatsPerBar:4,totalBars:8,loopBars:8,reverb:0.2,volume:0.8,voices:[{id:'v0',name:'a',timbre:'sample',volume:0.8,pan:0,mute:false,solo:false,sustain:'mid'}],blocks:[{id:'bx1',type:'motif',ref:'climb',voiceId:'v0',startBar:0,bars:1,octave:0,transpose:0,density:1,style:'arp'}]};return p})())));
    app.computePlan();
    app.render();
    var before = app.expand().map(function(e){return e.midi});
    var elB = document.querySelector('.tl-block');
    var brect = elB.getBoundingClientRect();
    window.scrollTo(0, brect.top + window.scrollY - 200);
    return {before: before};
  })()`);
  await sleep(200);
  const r2 = await c.evaluate(`(function(){
    var app = GZS.app;
    var elB = document.querySelector('.tl-block');
    var rect = elB.getBoundingClientRect();
    if (rect.top < 30) return {skip:'块不在视口'};
    elB.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,clientX:rect.left+rect.width/2, clientY:rect.top+10, button:0}));
    document.dispatchEvent(new MouseEvent('mouseup',{}));
    var insp = document.querySelector('#inspector');
    if (!insp || insp.innerHTML.indexOf('移调') < 0) return {skip:'inspector 无移调'};
    var before = app.expand().map(function(e){return e.midi});
    var tr = insp.querySelector('input[data-f="transpose"]');
    tr.value = '2';
    tr.dispatchEvent(new Event('input',{bubbles:true}));
    var blk = app.project().blocks[0];
    var after = app.expand().map(function(e){return e.midi});
    var diff = after.length === before.length && after.some(function(m,ix){return m!==before[ix]});
    return {transpose:blk.transpose, diff:diff, skip:null, before:before, after:after};
  })()`);
  const v = r2.val;
  if (v.skip) return v.skip;
  if (v.transpose !== 2) return '移调值未写入: ' + v.transpose;
  if (!v.diff) return '移调未改变发音';
  return true;
}});

cases.push({ name: 'B14 试听按钮触发 audio.preview', fn: async (c) => {
  await c.evaluate(Q.unlock);
  const r = await c.evaluate(`(function(){
    var spy = { calls: 0, notes: 0 };
    var orig = GZS.audio.preview;
    GZS.audio.preview = function(notes, bpm, timbre){ spy.calls++; spy.notes = notes.length; };
    var btn = document.querySelector('#motif-palette .pal-card .pal-card-preview');
    btn.click();
    GZS.audio.preview = orig;
    return spy;
  })()`);
  const v = r.val;
  if (v.calls < 1) return 'preview 未被调用';
  if (v.notes < 5) return 'preview 音符数异常: ' + v.notes;
  return true;
}});

cases.push({ name: 'B15 播放/停止控制', fn: async (c) => {
  await c.evaluate(Q.unlock);
  const r = await c.evaluate(`(function(){
    var btn = document.querySelector('#play-btn');
    btn.click();
    var state1 = Tone.Transport.state;
    var label1 = btn.textContent;
    btn.click();
    var state2 = Tone.Transport.state;
    return {state1:state1, label1:label1, state2:state2, playing:GZS.app.getState()};
  })()`);
  const v = r.val;
  if (v.state1 !== 'started') return '播放未启动: ' + v.state1;
  if (v.label1.indexOf('停') < 0) return '按钮文案未更新';
  if (v.state2 === 'started') return '停止失败';
  return true;
}});

cases.push({ name: 'B16 调度音符语义：调内/循环内/触发音频', fn: async (c) => {
  await c.evaluate(Q.unlock);
  const r = await c.evaluate(`(function(){
    var app = GZS.app;
    var notes = app._notes();
    var loopSec = app.project().loopBars * app.project().beatsPerBar * (60/app.project().bpm);
    var scale = GZS.theory.MODES[app.project().mode].semis;
    var tonic = ({C:0,D:2,G:7,A:9}[app.project().key] || 0) + 60;
    var inScale = notes.every(function(n){ return scale.indexOf(((n.midi-tonic)%12+12)%12) >= 0; });
    var inLoop = notes.every(function(n){ return n.sec >= 0 && n.sec < loopSec - 0.001; });
    var sorted = notes.every(function(n,i){ return i===0 || notes[i-1].sec <= n.sec; });
    // 触发音频
    var fired = 0, mids = [];
    var orig = GZS.audio.trigger;
    GZS.audio.trigger = function(voiceId, vol, pan, opts, midi, when, vel, dur){ fired++; mids.push(midi); };
    notes.slice(0, 20).forEach(function(n){ app._fireNote(n, 0.2); });
    GZS.audio.trigger = orig;
    return {count:notes.length, inScale:inScale, inLoop:inLoop, sorted:sorted, fired:fired};
  })()`);
  const v = r.val;
  if (v.count < 5) return '调度音符过少: ' + v.count;
  if (!v.inScale) return '存在调外音符';
  if (!v.inLoop) return '音符超出循环区';
  if (!v.sorted) return '音符未按时间排序';
  if (v.fired !== Math.min(v.count, 20)) return '音频触发数不符: ' + v.fired;
  return true;
}});

cases.push({ name: 'B17 持久化：hash + localStorage + 刷新恢复', fn: async (c) => {
  const r = await c.evaluate(`(function(){
    try { localStorage.removeItem('gzs-project'); } catch(e){}
    var t = document.querySelector('#title-input');
    t.value = '测试曲目';
    t.dispatchEvent(new Event('input',{bubbles:true}));
    var b = document.querySelector('#bpm-input');
    b.value = '120';
    b.dispatchEvent(new Event('input',{bubbles:true}));
    return {hash:location.hash.slice(0,8), ls:!!localStorage.getItem('gzs-project')};
  })()`);
  const v = r.val;
  if (v.hash !== '#proj=%7B' && v.hash !== '#proj=%7') return 'hash 未写入: ' + v.hash;
  if (!v.ls) return 'localStorage 未写入';
  // 刷新（重载）后校验
  await c.send('Page.reload', { ignoreCache: true });
  await sleep(1500);
  const r2 = await c.evaluate(`(function(){return {name:document.querySelector('#title-input').value, bpm:document.querySelector('#bpm-input').value}})()`);
  if (r2.val.name !== '测试曲目') return '刷新后标题丢失: ' + r2.val.name;
  if (r2.val.bpm !== '120') return '刷新后 BPM 丢失: ' + r2.val.bpm;
  return true;
}});

cases.push({ name: 'B18 导出 MIDI 不抛错且字节有效', fn: async (c) => {
  const r = await c.evaluate(`(function(){
    var evs = GZS.app.expand();
    var tracks = GZS.app.project().voices.map(function(v){
      return {name:v.name, events: evs.filter(function(e){return e.voiceId===v.id}).map(function(e){return {t:e.bar, dur:e.dur, midi:e.midi, vel:e.vel}})};
    });
    var bytes = GZS.midi.buildMidi({name:'t', bpm:90, beatsPerBar:4, totalBars:8, tracks:tracks});
    var u8 = Array.prototype.slice.call(bytes);
    var head = u8.slice(0,4).map(function(c){return String.fromCharCode(c)}).join('');
    return {len:bytes.length, head:head, hasNoteOn:u8.indexOf(0x90)>=0};
  })()`);
  const v = r.val;
  if (v.head !== 'MThd') return 'MIDI 头错误: ' + v.head;
  if (!v.hasNoteOn) return '无音符';
  return true;
}});

cases.push({ name: 'B19 全过程零控制台异常（汇总）', fn: async (c) => {
  // 已由每个用例的 errors() 检查覆盖；此处补充轮转所有交互后仍无异常
  const r = await c.evaluate(`(function(){
    var btn = document.querySelector('#play-btn');
    btn.click(); btn.click();
    var ks = document.querySelector('#key-select');
    ['C','G','A'].forEach(function(k){ ks.value=k; ks.dispatchEvent(new Event('change',{bubbles:true})); });
    return true;
  })()`);
  return r.ok ? true : '交互异常';
}});

cases.push({ name: 'B21 试听：第一次播放、第二次停止', fn: async (c) => {
  await c.evaluate(Q.unlock);
  const r = await c.evaluate(`(function(){
    var origPreview = GZS.audio.preview, origStop = GZS.audio.stopPreview;
    var calls = 0, stops = 0;
    GZS.audio.preview = function(){ calls++; return origPreview.apply(this, arguments); };
    GZS.audio.stopPreview = function(){ stops++; return origStop.apply(this, arguments); };
    var btn = document.querySelector('#motif-palette .pal-card .pal-card-preview');
    btn.click();                                  // 第一次：播放
    var label1 = btn.textContent;
    var previewing1 = GZS.audio.isPreviewing();
    var btn2 = document.querySelector('#motif-palette .pal-card:nth-child(1) .pal-card-preview');
    btn2.click();                                 // 同一卡片第二次：停止
    var label2 = btn2.textContent;
    var previewing2 = GZS.audio.isPreviewing();
    GZS.audio.preview = origPreview; GZS.audio.stopPreview = origStop;
    return { calls: calls, stops: stops, label1: label1, label2: label2, previewing1: previewing1, previewing2: previewing2 };
  })()`);
  const v = r.val;
  if (v.calls !== 1) return '首次点击未触发 preview: ' + v.calls;
  if (!v.previewing1) return '播放后 isPreviewing 应为 true';
  if (v.label1.indexOf('停止') < 0) return '按钮未变为停止: ' + v.label1;
  if (v.stops < 1 || v.previewing2) return '第二次点击未停止';
  if (v.label2.indexOf('试听') < 0) return '按钮未复位: ' + v.label2;
  return true;
}});

cases.push({ name: 'B22 布局：无可见文本挤压 + 列对齐', fn: async (c) => {
  const r = await c.evaluate(`(function(){
    var crushed = [];
    document.querySelectorAll('.tl-block-name, .tl-block-meta, .pal-card-name, .voice-name, .gz-playhead-readout').forEach(function(el){
      var sw = el.scrollWidth, cw = el.clientWidth, rc = el.getBoundingClientRect();
      if (cw > 0 && sw > cw + 4 && rc.height > 0) {
        var block = el.closest('.tl-block');
        if (block && block.classList.contains('tl-block--narrow')) return; // 窄块省略号属正常
        crushed.push(el.className + ':' + el.textContent.trim().slice(0,12));
      }
    });
    var vh = document.querySelector('.voice-head'), tr = document.querySelector('.voice-track');
    var vb = vh.getBoundingClientRect(), tb = tr.getBoundingClientRect();
    return { crushed: crushed, headAligned: Math.abs(vb.top - tb.top) < 4,
      colRight: Math.round(document.querySelector('.gz-inspector').getBoundingClientRect().right) <= window.innerWidth };
  })()`);
  const v = r.val;
  if (v.crushed.length) return '文本挤压: ' + v.crushed.join('; ');
  if (!v.headAligned) return '声部头与轨道错位';
  if (!v.colRight) return 'inspector 超出右缘';
  return true;
}});

cases.push({ name: 'B20 移动端单列布局', fn: async (c) => {
  await c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await sleep(600);
  const r = await c.evaluate(`(function(){
    var gz = document.querySelector('.gz-layout');
    var cs = getComputedStyle(gz);
    return {cols: cs.gridTemplateColumns, cols2: gz.currentStyle ? gz.currentStyle.gridTemplateColumns : cs.gridTemplateColumns};
  })()`);
  const v = r.val;
  const single = v.cols && (v.cols.split(' ').length === 1 || v.cols === 'none' || v.cols.indexOf('px') === -1);
  if (!single && !(v.cols || '').match(/^\d+px$/)) return '非单列: ' + v.cols;
  return true;
}});

/* ================= 主流程 ================= */
async function main() {
  await startServer();
  await startChrome();
  const wsUrl = await getPageWs();
  const cdp = new CDP(wsUrl);
  await cdp.open();
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  await cdp.send('Log.enable');

  const only = process.argv[2];
  for (const cs of cases) {
    if (only && cs.name.indexOf(only) === -1) { results.push({ name: cs.name, pass: true, msg: '(跳过)' }); continue; }
    const t0 = Date.now();
    await caseRun(cs.name, cs.fn, cdp);
    const dt = Date.now() - t0;
    const last = results[results.length - 1];
    console.log((last.pass ? 'PASS' : 'FAIL') + '  ' + cs.name + (last.msg ? '   [' + last.msg + ']' : '') + '  (' + dt + 'ms)');
  }

  let fail = 0;
  for (const r of results) if (!r.pass) fail++;
  console.log('\n' + results.filter(r => r.msg !== '(跳过)').length + ' 项（跳过除外），失败 ' + fail);
  cdp.ws.close();
  if (chromeProc) chromeProc.kill('SIGKILL');
  server.close();
  process.exit(fail ? 1 : 0);
}

main().catch(e => { console.error('RUNNER 错误:', e); process.exit(2); });