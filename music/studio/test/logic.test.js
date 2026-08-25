// 纯逻辑单元测试：不涉及 DOM / 音频。
// 用 node 运行：node test/logic.test.js
'use strict';
const fs = require('fs');
const path = require('path');

global.window = global;
function load(rel) {
  const code = fs.readFileSync(path.join(__dirname, rel), 'utf8');
  eval(code);
}

const results = [];
function check(name, cond, extra) {
  results.push({ name, pass: !!cond, extra });
}

// 加载模块（它们向 window.GZS 注册命名空间）
load('../lib/theory.js');
load('../lib/content.js');
load('../lib/midi.js');

const T = global.GZS.theory;
const C = global.GZS.content;

// —— theory ——
check('五声宫调半音序列', JSON.stringify(T.MODES.gong.semis) === JSON.stringify([0,2,4,7,9]));
check('度→MIDI: D宫 degree0 = D4', T.degreeToMidi('gong', 62, 0) === 62);
check('度→MIDI: D宫 degree1 = E4', T.degreeToMidi('gong', 62, 1) === 64);
check('度→MIDI: D宫 degree3 = A4(徵)', T.degreeToMidi('gong', 62, 3) === 69);
check('度→MIDI: D宫 degree4 = B4(羽)', T.degreeToMidi('gong', 62, 4) === 71);
check('度→MIDI: D宫 degree5 = 高八度D5', T.degreeToMidi('gong', 62, 5) === 74);
check('度→MIDI: 负度 D宫 -1 = 低八度羽B3', T.degreeToMidi('gong', 62, -1) === 59);
check('羽调-1 = 宫(同degree0)', T.degreeToMidi('yu', 62, 0) === T.degreeToMidi('gong', 62, 0));
check('和弦MIDI: D宫 root0 tones[0,2,4](宫角羽) = D F# B', JSON.stringify(T.chordMidis('gong', 62, {root:0,tones:[0,2,4]},0)) === JSON.stringify([62,66,71]));
check('midiName 62=D4', T.midiName(62) === 'D4');
check('snapDegree 把E#(deg~0.5)吸附回宫', typeof T.snapDegree('gong', 1) === 'number');

// —— content ——
check('动机数量 10', C.MOTIFS.length === 10);
check('和声数量 8', C.PROGRESSIONS.length === 8);
check('动机均含 beats 且 bars>0', C.MOTIFS.every(m => m.beats && Array.isArray(m.beats) && m.beats.length>0 && m.bars>0));
check('每个动机音级在调内连续（d 为整数）', C.MOTIFS.every(m => m.beats.every(b => Number.isInteger(b.d))));
check('chromOnly 和声存在 2 个', C.PROGRESSIONS.filter(p=>p.chromOnly).length === 2);
check('非 chromOnly 和声有 degree 编码, chromOnly 有 semis', C.PROGRESSIONS.every(p => p.chromOnly ? (Array.isArray(p.semis) && p.semis.length===p.bars) : (Array.isArray(p.chords) && p.chords.length===p.bars)));

// motifEvents 展开
const evs = C.motifEvents(C.MOTIFS[0], 1, 2);
check('motifEvents 返回事件', Array.isArray(evs) && evs.length>0);
check('motifEvents 事件含 t/d/dur/vel', evs.every(e => 't' in e && 'd' in e && 'dur' in e && 'vel' in e));
check('repeat=2 时事件翻倍', evs.length === C.motifEvents(C.MOTIFS[0],1,1).length * 2);

// —— MIDI 构建 ——
const bytes = global.GZS.midi.buildMidi({
  bpm: 90, beatsPerBar: 4, name: 'test',
  tracks: [{ name: 'A', events: [{ t: 0, dur: 1, midi: 62, vel: 70 }] }]
});
check('MIDI 以 RIfF 头开头', bytes[0]===0x4D && bytes[1]===0x54 && bytes[2]===0x68 && bytes[3]===0x64);
check('MIDI 数据存在 NoteOn 0x90', Array.from(bytes).indexOf(0x90) > -1);

// —— 输出 ——
let fail = 0;
for (const r of results) {
  console.log((r.pass ? 'PASS' : 'FAIL') + '  ' + r.name + (r.extra ? '  [' + r.extra + ']' : ''));
  if (!r.pass) fail++;
}
console.log('\n' + results.length + ' 项，失败 ' + fail);
process.exit(fail ? 1 : 0);
