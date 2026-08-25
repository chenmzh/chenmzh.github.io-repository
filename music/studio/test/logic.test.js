// 需求驱动的纯逻辑测试（node test/logic.test.js）
// 映射需求：R2 动机 / R3 和声 / R4 多声部隔离 / R6 生成正确性 / R10 导出 / 持久化结构
'use strict';
const fs = require('fs');
const path = require('path');

global.window = global;
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'test' }, configurable: true }); } catch (e) {}
function load(rel) {
  const code = fs.readFileSync(path.join(__dirname, rel), 'utf8');
  eval(code);
}
load('../lib/theory.js');
load('../lib/content.js');
load('../lib/engine.js');
load('../lib/midi.js');

const T = global.GZS.theory;
const C = global.GZS.content;
const E = global.GZS.engine;

const results = [];
function check(name, cond, extra) { results.push({ name, pass: !!cond, extra }); }
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ============ 工具：构造测试工程 ============ */
function mkProject(over) {
  const p = {
    version: 1, name: 't', bpm: 90, key: 'D', mode: 'gong', beatsPerBar: 4, totalBars: 8, loopBars: 8,
    reverb: 0.2, volume: 0.8,
    voices: [
      { id: 'v0', name: '甲', timbre: 'sample', volume: 0.8, pan: 0, mute: false, solo: false, sustain: 'mid' },
      { id: 'v1', name: '乙', timbre: 'pluck', volume: 0.7, pan: 0.2, mute: false, solo: false, sustain: 'short' }
    ],
    blocks: []
  };
  Object.assign(p, over || {});
  return p;
}
function blk(partial) {
  return Object.assign({ id: 'b' + Math.random().toString(36).slice(2, 8), type: 'motif', ref: 'run-down', voiceId: 'v0', startBar: 0, bars: 1, octave: 0, transpose: 0, density: 1, style: 'arp' }, partial);
}

/* ============ R2 动机 ============ */
check('R2.1 素材库 ≥8 个动机', C.MOTIFS.length >= 8, 'got ' + C.MOTIFS.length);
check('R2.2 动机 id 唯一', new Set(C.MOTIFS.map(m => m.id)).size === C.MOTIFS.length);
check('R2.3 动机音级均为整数', C.MOTIFS.every(m => m.beats.every(b => Number.isInteger(b.d))));
check('R2.4 动机时长/力度合法', C.MOTIFS.every(m => m.beats.every(b => b.dur > 0 && b.vel >= 40 && b.vel <= 100)));
C.MOTIFS.forEach(m => {
  const evs = C.motifEvents(m, 1, null, 4);
  const maxT = Math.max.apply(null, evs.map(e => e.t + e.dur));
  check('R2.5 动机 ' + m.id + ' 音符不出块边界', maxT <= m.bars * 4 + 1e-9, maxT.toFixed(2));
});

/* ============ R3 和声进行 ============ */
check('R3.1 和声 ≥6 套', C.PROGRESSIONS.length >= 6, 'got ' + C.PROGRESSIONS.length);
check('R3.2 和声 id 唯一', new Set(C.PROGRESSIONS.map(p => p.id)).size === C.PROGRESSIONS.length);
check('R3.3 每套和声小节数与和弦数一致', C.PROGRESSIONS.every(p =>
  (p.chromOnly ? (Array.isArray(p.semis) && p.semis.length === p.bars)
               : (Array.isArray(p.chords) && p.chords.length === p.bars))));
check('R3.4 调内和弦音级有效', C.PROGRESSIONS.filter(p => !p.chromOnly).every(p =>
  p.chords.every(c => Number.isInteger(c.root) && c.tones.every(t => Number.isInteger(t)))));

/* ============ R4 多声部：不同和声放不同声部 ============ */
const twoVoice = mkProject({ blocks: [
  blk({ type: 'progression', ref: 'night-cycle', voiceId: 'v0', startBar: 0, bars: 4, style: 'arp' }),
  blk({ type: 'progression', ref: 'yu-valley', voiceId: 'v1', startBar: 0, bars: 4, style: 'block' })
] });
const ev2 = E.expand(twoVoice);
check('R4.1 两个声部都有事件', ev2.some(e => e.voiceId === 'v0') && ev2.some(e => e.voiceId === 'v1'));
check('R4.2 声部隔离：v0 事件的 midi 来自其自身块', (() => {
  const solo = E.expand(mkProject({ blocks: [blk({ type: 'progression', ref: 'night-cycle', voiceId: 'v0', startBar: 0, bars: 4, style: 'arp' })] }));
  const set0 = new Set(solo.map(x => x.midi));
  return ev2.filter(e => e.voiceId === 'v0').every(e => set0.has(e.midi));
})());
check('R4.3 两个声部内容不同（midi 集合不等）', (() => {
  const s0 = new Set(ev2.filter(e => e.voiceId === 'v0').map(e => e.midi));
  const s1 = new Set(ev2.filter(e => e.voiceId === 'v1').map(e => e.midi));
  return JSON.stringify([...s0].sort()) !== JSON.stringify([...s1].sort());
})());
// 同一块可搬到任何声部
const alt = mkProject({ blocks: [blk({ type: 'progression', ref: 'night-cycle', voiceId: 'v1', startBar: 0, bars: 4, style: 'arp' })] });
check('R4.4 和声块可放到任意声部（v1）', E.expand(alt).every(e => e.voiceId === 'v1') && E.expand(alt).length > 0);

/* ============ R5 织体差异 · 生成正确性 ============ */
function styleProj(style) { return mkProject({ blocks: [blk({ type: 'progression', ref: 'night-cycle', voiceId: 'v0', startBar: 0, bars: 4, style: style })] }); }
const arpE = E.expand(styleProj('arp'));
const bkE = E.expand(styleProj('block'));
const bsE = E.expand(styleProj('bass'));
check('R5.1 block 织体同拍事件 ≥ 和弦音数（柱式同发）', bkE.filter(e => e.bar === 0).length >= 3);
check('R5.2 bass 织体每和弦只 1 音（4 小节 4 和弦 = 4 事件）', bsE.length === 4, 'got ' + bsE.length);
check('R5.3 arp 织体事件数 = 4 和弦 × 3 音', arpE.length === 12, 'got ' + arpE.length);

/* ============ R6 调内诚实（safe mode） ============ */
const K2M = { C: 0, D: 2, F: 5, G: 7, A: 9 };
const KEYS = ['C', 'D', 'F', 'G', 'A'];
const MODES = ['gong', 'shang', 'jue', 'zhi', 'yu'];
const motifRefs = C.MOTIFS.map(m => m.id);
const progRefs = C.PROGRESSIONS.filter(p => !p.chromOnly).map(p => p.id);
let scaleFailures = 0;
KEYS.forEach(k => MODES.forEach(mode => {
  const scale = T.MODES[mode].semis;
  const tonic = K2M[k] + 12; // 基准 8 度
  const proj = mkProject({ key: k, mode: mode, blocks: [
    blk({ type: 'motif', ref: motifRefs[Math.floor(Math.random() * motifRefs.length)], voiceId: 'v0', startBar: 0, bars: 1, octave: 0, transpose: 0 }),
    blk({ type: 'progression', ref: progRefs[Math.floor(Math.random() * progRefs.length)], voiceId: 'v1', startBar: 0, bars: 4, style: 'arp' })
  ] });
  E.expand(proj).forEach(e => {
    const off = ((e.midi - tonic) % 12 + 12) % 12;
    if (!scale.includes(off)) { scaleFailures++; if (scaleFailures < 4) console.log('  off-scale:', k, mode, 'midi', e.midi, 'off', off); }
  });
}));
check('R6.1 所有主音×五声调式展开音符都在调内', scaleFailures === 0, scaleFailures + ' violations');

/* ============ R6.2 八度/移调/转调 ============ */
const baseProj = mkProject({ blocks: [blk({ type: 'motif', ref: 'climb', voiceId: 'v0', startBar: 0, bars: 1 })] });
const baseNotes = E.expand(baseProj).map(e => e.midi);
const octProj = mkProject({ blocks: [blk({ type: 'motif', ref: 'climb', voiceId: 'v0', startBar: 0, bars: 1, octave: 1 })] });
check('R6.2 八度+1 → 所有音 +12', eq(E.expand(octProj).map(e => e.midi), baseNotes.map(n => n + 12)));
const trProj = mkProject({ blocks: [blk({ type: 'motif', ref: 'climb', voiceId: 'v0', startBar: 0, bars: 1, transpose: 2 })] });
const trNotes = E.expand(trProj).map(e => e.midi);
check('R6.3 移调+2 音级 → 所有音仍在 D 宫调内', trNotes.every(n => [0, 2, 4, 7, 9].includes(((n - 62) % 12 + 12) % 12)))
// 移调语义：每个动机音级 +2（scale 内），与 degreeToMidi 一致
const trCheck = (() => {
  const climb = C.motif('climb');
  const evs1 = E.expand(baseProj);
  const evs2 = E.expand(trProj);
  if (evs1.length !== evs2.length) return false;
  let ok = true;
  for (let i = 0; i < evs1.length; i++) {
    const expect = T.degreeToMidi('gong', 62, climb.beats[i].d + 2);
    if (evs2[i].midi !== expect) ok = false;
  }
  return ok;
})();
check('R6.3b 移调+2 = 每个动机音级 +2（与 degreeToMidi 一致）', trCheck);
const keyUp = mkProject({ key: 'E', blocks: [blk({ type: 'motif', ref: 'climb', voiceId: 'v0', startBar: 0, bars: 1 })] });
check('R6.4 主音 D→E（+2 半音）→ 所有音整体 +2', eq(E.expand(keyUp).map(e => e.midi), baseNotes.map(n => n + 2)));

/* ============ R6.5 确定性 / NaN / 空工程 ============ */
check('R6.5 同工程两次展开一致', eq(E.expand(baseProj), E.expand(baseProj)));
check('R6.6 展开结果无 NaN', E.expand(baseProj).every(e => Number.isFinite(e.midi) && Number.isFinite(e.bar) && Number.isFinite(e.dur)));
check('R6.7 空工程 → 0 事件', E.expand(mkProject()).length === 0);

/* ============ R6.8 动机块 3/4 拍号边界 ============ */
const m34 = mkProject({ beatsPerBar: 3, blocks: [blk({ type: 'motif', ref: 'run-down', voiceId: 'v0', startBar: 0, bars: 2 })] });
const m34ev = E.expand(m34);
check('R6.8 3/4 拍号下动机音符都落在小节内（bar×3 拍）', m34ev.every(e => {
  const inBar = (e.bar - Math.floor(e.bar)) * 3 + 1e-9;
  return e.bar >= 0 && inBar < 3;
}));

/* ============ notesForLoop：调度物 ============ */
const loopProj = mkProject({ loopBars: 4, totalBars: 8, blocks: [
  blk({ type: 'progression', ref: 'night-cycle', voiceId: 'v0', startBar: 0, bars: 4, style: 'arp' }),
  blk({ type: 'motif', ref: 'run-down', voiceId: 'v1', startBar: 2, bars: 1 })
] });
const notes = E.notesForLoop(loopProj);
const loopSec = 4 * 4 * (60 / 90);
check('R6.9 notesForLoop 非空', notes.length > 0);
check('R6.10 所有调度秒 ∈ [0, loopSec)', notes.every(n => n.sec >= 0 && n.sec < loopSec));
check('R6.11 调度音符按时间有序', notes.every((n, i) => i === 0 || notes[i - 1].sec <= n.sec));
check('R6.12 两个声部的调度音符都存在', notes.some(n => n.voiceId === 'v0') && notes.some(n => n.voiceId === 'v1'));

/* ============ R6.13/14 mute/solo ============ */
check('R6.13 静音声部不可听', E.isAudible({ voices: [{ id: 'v0', mute: true }] }, 'v0') === false);
check('R6.14 独奏时仅独奏声部可听', (() => {
  const p = mkProject({ voices: [
    { id: 'v0', mute: false, solo: true }, { id: 'v1', mute: false, solo: false }
  ] });
  return E.isAudible(p, 'v0') && !E.isAudible(p, 'v1');
})());

/* ============ R10 MIDI 导出 ============ */
const midiEvents = E.expand(mkProject({ blocks: [blk({ type: 'motif', ref: 'run-down', voiceId: 'v0', startBar: 0, bars: 1 })] }));
const midiBytes = global.GZS.midi.buildMidi({
  bpm: 90, beatsPerBar: 4, name: 't',
  tracks: [{ name: 'v', events: midiEvents.map(e => ({ t: e.bar, dur: e.dur, midi: e.midi, vel: e.vel })) }]
});
const bArr = Array.from(midiBytes);
check('R10.1 MIDI 头 MThd', bArr.slice(0, 4).map(c => String.fromCharCode(c)).join('') === 'MThd');
check('R10.2 MIDI 含 NoteOn', bArr.indexOf(0x90) >= 0);
check('R10.3 MIDI 含 NoteOff(0x80)', bArr.indexOf(0x80) >= 0);
check('R10.4 MIDI 字节数 > 100', midiBytes.length > 100);

/* ============ WAV 导出（audio.wavFromBuffer 纯函数） ============ */
load('../lib/audio.js');
const fakeBuf = {
  sampleRate: 44100, numberOfChannels: 2, length: 1000,
  getChannelData: (ch) => ch === 0 ? Float32Array.from({ length: 1000 }, (_, i) => i === 500 ? 0.7 : 0) : new Float32Array(1000)
};
(async () => {
  const W = global.GZS.audio.wavFromBuffer(fakeBuf);
  const ab = await W.blob.arrayBuffer();
  const u8 = new Uint8Array(ab);
  const ascii = (o, n) => String.fromCharCode.apply(null, u8.slice(o, o + n));
  const dv = new DataView(ab);
  check('R10.5 WAV 头 RIFF/WAVE/fmt/data', ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WAVE' && ascii(12, 4) === 'fmt ' && ascii(36, 4) === 'data');
  check('R10.6 WAV 采样率/声道/位深正确', dv.getUint32(24, true) === 44100 && dv.getUint16(22, true) === 2 && dv.getUint16(34, true) === 16);
  check('R10.7 WAV 数据长度 = 1000×2×2', dv.getUint32(40, true) === 4000);
  check('R10.8 WAV 峰值采样值正确(0.7→22937)', dv.getInt16(44 + 500 * 4, true) > 20000);
  finish();
})();
let finished = false;
function finish() {
  if (finished) return;
  finished = true;
  let fail = 0;
  for (const r of results) {
    console.log((r.pass ? 'PASS' : 'FAIL') + '  ' + r.name + (r.extra ? '   [' + r.extra + ']' : ''));
    if (!r.pass) fail++;
  }
  console.log('\n' + results.length + ' 项，失败 ' + fail);
  process.exit(fail ? 1 : 0);
}
// 兼容：若上面异步没跑（不应发生），保证退出
setTimeout(() => finish(), 5000);

/* ============ R12 每个音的音准复核（采样变调数学） ============ */
load('../lib/audio.js');
// 实测 CC0 采样攻击段基频（A3≈219.4Hz，低 4.7 音分）
const MEASURED = { 57: 219.4, 81: 877.6 };   // 锚点：A3 / A5(由 A3 ×4 生成，基频一致)
(function () {
  const A = GZS.audio;
  let worstCents = 0, worstMidi = null;
  let clampViolations = 0;
  for (let m = 40; m <= 96; m++) {
    const pr = A.pitchRate(m);
    const anchor = pr.anchor;
    const srcHz = MEASURED[anchor];
    const outHz = srcHz * pr.rate;
    const targetHz = 440 * Math.pow(2, (m - 69) / 12);
    const cents = 1200 * Math.log2(outHz / targetHz);
    if (Math.abs(cents) > worstCents) { worstCents = Math.abs(cents); worstMidi = m; }
    if (pr.rate > 2.5) clampViolations++;
  }
  check('R12.1 全音域 40..96 变调倍速均 ≤2.5（无钳位把音拉偏；旧版 2.6 钳位使 E5+ 全偏低）', clampViolations === 0, 'violations:' + clampViolations);
  check('R12.2 每个音的最终频率误差 ≤ ±3 音分', worstCents <= 3, 'worst:' + worstCents.toFixed(2) + 'c @midi' + worstMidi);
  check('R12.3 高音区(≥74)自动选 A5 锚点', (function(){ for (let m=74;m<=96;m++){ if (GZS.audio.pitchRate(m).anchor !== 81) return false; } return true; })());
  check('R12.4 低音区(≤40)自动选 A3 锚点', (function(){ for (let m=40;m<=48;m++){ if (GZS.audio.pitchRate(m).anchor !== 57) return false; } return true; })());
  // 音名复核：每个 midi 的音名与 targetHz 一致
  check('R12.5 高八度 re(E5=76) 输出频率 = 目标 659.26Hz ±3c', (function(){
    const pr = A.pitchRate(76); const out = MEASURED[pr.anchor]*pr.rate;
    return Math.abs(1200*Math.log2(out/659.2551)) <= 3;
  })());
})();

/* ============ 持久化结构 ============ */
const normalized = E.normalize(loopProj);
check('P1 normalize 保留 voices/blocks', normalized.voices.length === 2 && normalized.blocks.length === 2);
check('P2 normalize 补全 sustain', normalized.voices.every(v => ['short', 'mid', 'ring'].includes(v.sustain)));

/* ============ 输出 ============ */
let fail = 0;
for (const r of results) {
  console.log((r.pass ? 'PASS' : 'FAIL') + '  ' + r.name + (r.extra ? '   [' + r.extra + ']' : ''));
  if (!r.pass) fail++;
}
console.log('\n' + results.length + ' 项，失败 ' + fail);
process.exit(fail ? 1 : 0);