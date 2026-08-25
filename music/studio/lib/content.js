/* ============================================================
 * content.js — 素材库：动机、和声进行、织体、声部预设
 * 全部以音级（scale degree）编码，随调式/主音实时转调。
 * ============================================================ */
(function (G) {
  'use strict';

  /* ---------- 动机（motif）----------
   * beats: [{t: 拍内起始拍(0起), d: 音级, dur: 拍, vel: 力度 40-100, art?: 'gliss'|'grace'|'trem'}]
   * bars: 动机长度（小节）
   */
  var MOTIFS = [
    {
      id: 'run-down', name: '流水下滩', en: 'Cascade Run', bars: 1,
      tag: '刮奏 · 下行', desc: '六音级连下扑向宫音，古筝最经典的流水句。',
      beats: [
        { t: 0.00, d: 4, dur: 0.45, vel: 82 },
        { t: 0.50, d: 3, dur: 0.22, vel: 72 },
        { t: 0.75, d: 2, dur: 0.22, vel: 66 },
        { t: 1.00, d: 3, dur: 0.22, vel: 62 },
        { t: 1.25, d: 2, dur: 0.22, vel: 60 },
        { t: 1.50, d: 1, dur: 0.45, vel: 66 },
        { t: 2.00, d: 2, dur: 0.22, vel: 60 },
        { t: 2.25, d: 1, dur: 0.22, vel: 58 },
        { t: 2.50, d: 0, dur: 1.20, vel: 74 }
      ]
    },
    {
      id: 'climb', name: '拾级登高', en: 'Stepping Up', bars: 1,
      tag: '旋律 · 级进', desc: '逐级而上，末音越过一个八度登高。',
      beats: [
        { t: 0.00, d: 0, dur: 0.50, vel: 70 },
        { t: 0.50, d: 1, dur: 0.22, vel: 66 },
        { t: 0.75, d: 2, dur: 0.22, vel: 66 },
        { t: 1.00, d: 2, dur: 0.22, vel: 68 },
        { t: 1.25, d: 3, dur: 0.22, vel: 68 },
        { t: 1.50, d: 4, dur: 0.50, vel: 74 },
        { t: 2.00, d: 3, dur: 0.22, vel: 64 },
        { t: 2.25, d: 4, dur: 0.22, vel: 66 },
        { t: 2.50, d: 5, dur: 1.10, vel: 88 }
      ]
    },
    {
      id: 'gliss-up', name: '刮奏上行', en: 'Gliss Up', bars: 1,
      tag: '刮奏', desc: '八连音一气刮上，如指尖扫过琴码。',
      beats: [
        { t: 0.00, d: 2, dur: 0.14, vel: 62, art: 'gliss' },
        { t: 0.25, d: 3, dur: 0.14, vel: 64, art: 'gliss' },
        { t: 0.50, d: 4, dur: 0.14, vel: 66, art: 'gliss' },
        { t: 0.75, d: 5, dur: 0.14, vel: 68, art: 'gliss' },
        { t: 1.00, d: 6, dur: 0.14, vel: 70, art: 'gliss' },
        { t: 1.25, d: 7, dur: 0.14, vel: 72, art: 'gliss' },
        { t: 1.50, d: 8, dur: 0.14, vel: 74, art: 'gliss' },
        { t: 1.75, d: 9, dur: 0.20, vel: 76, art: 'gliss' },
        { t: 2.00, d: 10, dur: 0.18, vel: 72, art: 'gliss' },
        { t: 2.25, d: 9, dur: 0.18, vel: 68, art: 'gliss' },
        { t: 2.50, d: 8, dur: 0.60, vel: 70 }
      ]
    },
    {
      id: 'gliss-down', name: '刮奏下行', en: 'Gliss Down', bars: 1,
      tag: '刮奏', desc: '高音区向下扫落，尾音按住宫音。',
      beats: [
        { t: 0.00, d: 9, dur: 0.14, vel: 76, art: 'gliss' },
        { t: 0.25, d: 8, dur: 0.14, vel: 74, art: 'gliss' },
        { t: 0.50, d: 7, dur: 0.14, vel: 72, art: 'gliss' },
        { t: 0.75, d: 6, dur: 0.14, vel: 70, art: 'gliss' },
        { t: 1.00, d: 5, dur: 0.14, vel: 68, art: 'gliss' },
        { t: 1.25, d: 4, dur: 0.14, vel: 66, art: 'gliss' },
        { t: 1.50, d: 3, dur: 0.14, vel: 64, art: 'gliss' },
        { t: 1.75, d: 2, dur: 0.14, vel: 62, art: 'gliss' },
        { t: 2.00, d: 1, dur: 0.14, vel: 60, art: 'gliss' },
        { t: 2.25, d: 0, dur: 0.20, vel: 58, art: 'gliss' },
        { t: 2.50, d: 0, dur: 1.10, vel: 68 }
      ]
    },
    {
      id: 'arp-out', name: '琶音骨架', en: 'Arp Outline', bars: 1,
      tag: '琶音', desc: '宫-角-徵-羽拱桥，如拨弦琶音点描。',
      beats: [
        { t: 0.00, d: 0, dur: 0.50, vel: 70 },
        { t: 0.50, d: 2, dur: 0.28, vel: 68 },
        { t: 1.00, d: 3, dur: 0.28, vel: 70 },
        { t: 1.50, d: 4, dur: 0.28, vel: 74 },
        { t: 2.00, d: 3, dur: 0.28, vel: 72 },
        { t: 2.50, d: 2, dur: 0.28, vel: 66 },
        { t: 3.00, d: 1, dur: 0.28, vel: 62 },
        { t: 3.50, d: 0, dur: 0.50, vel: 66 }
      ]
    },
    {
      id: 'call-resp', name: '问答呼应', en: 'Call & Answer', bars: 2,
      tag: '旋律 · 结构', desc: '上句停在徵音悬而未决，下句落回宫音作答。',
      beats: [
        { t: 0.00, d: 2, dur: 0.55, vel: 74 },
        { t: 0.50, d: 1, dur: 0.22, vel: 64 },
        { t: 0.75, d: 2, dur: 0.22, vel: 66 },
        { t: 1.00, d: 3, dur: 0.22, vel: 72 },
        { t: 1.25, d: 2, dur: 0.22, vel: 64 },
        { t: 1.50, d: 1, dur: 0.22, vel: 62 },
        { t: 1.75, d: 0, dur: 0.22, vel: 60 },
        { t: 2.00, d: 2, dur: 0.60, vel: 66 },
        { t: 3.00, d: 3, dur: 0.22, vel: 70 },
        { t: 3.25, d: 2, dur: 0.22, vel: 66 },
        { t: 3.50, d: 3, dur: 0.22, vel: 68 },
        { t: 3.75, d: 2, dur: 0.22, vel: 66 },
        { t: 4.00, d: 1, dur: 0.22, vel: 64 },
        { t: 4.25, d: 2, dur: 0.22, vel: 66 },
        { t: 4.50, d: 1, dur: 0.50, vel: 68 },
        { t: 5.00, d: 3, dur: 0.22, vel: 66 },
        { t: 5.25, d: 2, dur: 0.22, vel: 64 },
        { t: 5.50, d: 1, dur: 0.22, vel: 62 },
        { t: 5.75, d: 0, dur: 0.22, vel: 60 },
        { t: 6.00, d: 0, dur: 1.40, vel: 70 }
      ]
    },
    {
      id: 'syncop', name: '切分推进', en: 'Syncopated Push', bars: 1,
      tag: '节奏', desc: '反拍点子向前推进，让乐句带上律动。',
      beats: [
        { t: 0.75, d: 3, dur: 0.22, vel: 80 },
        { t: 1.00, d: 0, dur: 0.22, vel: 64 },
        { t: 1.25, d: 1, dur: 0.22, vel: 62 },
        { t: 1.50, d: 2, dur: 0.22, vel: 64 },
        { t: 1.75, d: 3, dur: 0.22, vel: 66 },
        { t: 2.00, d: 4, dur: 0.22, vel: 84 },
        { t: 2.50, d: 3, dur: 0.22, vel: 66 },
        { t: 3.00, d: 2, dur: 0.55, vel: 70 }
      ]
    },
    {
      id: 'tremolo', name: '摇指同音', en: 'Tremolo', bars: 1,
      tag: '节奏 · 点描', desc: '同音快速往复如摇指，末尾滑落收住。',
      beats: [
        { t: 0.00, d: 4, dur: 0.16, vel: 68, art: 'trem' },
        { t: 0.25, d: 4, dur: 0.16, vel: 74, art: 'trem' },
        { t: 0.50, d: 4, dur: 0.16, vel: 78, art: 'trem' },
        { t: 0.75, d: 3, dur: 0.16, vel: 72, art: 'trem' },
        { t: 1.00, d: 4, dur: 0.16, vel: 80, art: 'trem' },
        { t: 1.25, d: 4, dur: 0.16, vel: 82, art: 'trem' },
        { t: 1.50, d: 4, dur: 0.16, vel: 84, art: 'trem' },
        { t: 1.75, d: 3, dur: 0.16, vel: 76, art: 'trem' },
        { t: 2.00, d: 4, dur: 0.16, vel: 80, art: 'trem' },
        { t: 2.25, d: 4, dur: 0.16, vel: 78, art: 'trem' },
        { t: 2.50, d: 4, dur: 0.16, vel: 74, art: 'trem' },
        { t: 2.75, d: 3, dur: 0.16, vel: 68, art: 'trem' },
        { t: 3.00, d: 2, dur: 0.55, vel: 72 }
      ]
    },
    {
      id: 'leap-drop', name: '跳进回落', en: 'Leap & Fall', bars: 1,
      tag: '旋律 · 跳进', desc: '大跳至高音后沿五声音阶一路落回。',
      beats: [
        { t: 0.00, d: 0, dur: 0.50, vel: 68 },
        { t: 1.00, d: 7, dur: 0.55, vel: 90 },
        { t: 1.50, d: 6, dur: 0.22, vel: 70 },
        { t: 1.75, d: 5, dur: 0.22, vel: 68 },
        { t: 2.00, d: 4, dur: 0.22, vel: 66 },
        { t: 2.25, d: 3, dur: 0.22, vel: 64 },
        { t: 2.50, d: 2, dur: 0.22, vel: 62 },
        { t: 2.75, d: 1, dur: 0.22, vel: 60 },
        { t: 3.00, d: 0, dur: 0.80, vel: 72 }
      ]
    },
    {
      id: 'grace-orn', name: '倚音描花', en: 'Grace Ornament', bars: 2,
      tag: '装饰', desc: '倚音缀在主音前，如弦上点水。',
      beats: [
        { t: -0.12, d: 3, dur: 0.08, vel: 60, art: 'grace' },
        { t: 0.00, d: 2, dur: 0.80, vel: 74 },
        { t: 1.00, d: 1, dur: 0.22, vel: 62 },
        { t: 1.25, d: 2, dur: 0.22, vel: 64 },
        { t: 1.50, d: 3, dur: 0.22, vel: 70 },
        { t: 1.75, d: 2, dur: 0.22, vel: 64 },
        { t: 2.00, d: 1, dur: 0.22, vel: 62 },
        { t: 2.25, d: 0, dur: 0.55, vel: 66 },
        { t: 3.00, d: 2, dur: 0.22, vel: 68 },
        { t: 3.25, d: 3, dur: 0.22, vel: 70 },
        { t: 3.50, d: 4, dur: 0.22, vel: 72 },
        { t: 3.75, d: 3, dur: 0.22, vel: 68 },
        { t: 4.00, d: 2, dur: 0.22, vel: 66 },
        { t: 4.25, d: 1, dur: 0.22, vel: 62 },
        { t: 4.50, d: 0, dur: 0.50, vel: 70 },
        { t: 5.00, d: 3, dur: 0.08, vel: 56, art: 'grace' },
        { t: 5.12, d: 0, dur: 0.22, vel: 64 },
        { t: 5.40, d: 3, dur: 0.22, vel: 66 },
        { t: 5.70, d: 0, dur: 1.20, vel: 72 }
      ]
    }
  ];

  /* ---------- 和声进行（progression） ----------
   * chords: 每小节一个和弦 {root: 根音音级, tones: 和弦音级}；
   * chromOnly: true 时仅自由调式可用（和弦以半音给出 semis）。
   * semis: 半音和弦（相对主音），用于自由调式。
   */
  var PROGRESSIONS = [
    {
      id: 'night-cycle', name: '静夜回环', en: 'Night Cycle',
      bars: 4, tag: '宫 · 五声',
      desc: '宫与徵的空五度交替，安静而稳定。',
      chords: [
        { root: 0, tones: [0, 2, 4] }, { root: 3, tones: [3, 5, 7] },
        { root: 0, tones: [0, 2, 4] }, { root: 3, tones: [3, 5, 7] }
      ]
    },
    {
      id: 'zhi-circle', name: '徵·大回环', en: 'Zhi Circle',
      bars: 4, tag: '徵 · 五声',
      desc: '徵起宫承商回，徵调的双句大循环。',
      chords: [
        { root: 3, tones: [3, 5, 7] }, { root: 0, tones: [0, 2, 4] },
        { root: 1, tones: [1, 3, 5] }, { root: 3, tones: [3, 5, 7] }
      ]
    },
    {
      id: 'yu-valley', name: '羽·空谷', en: 'Yu Valley',
      bars: 4, tag: '羽 · 五声',
      desc: '羽宫之间小调色彩，明暗的山谷气息。',
      chords: [
        { root: 4, tones: [4, 6, 8] }, { root: 3, tones: [3, 5, 7] },
        { root: 0, tones: [0, 2, 4] }, { root: 4, tones: [4, 6, 8] }
      ]
    },
    {
      id: 'shang-boat', name: '商·行舟', en: 'Shang Boat',
      bars: 4, tag: '商 · 五声',
      desc: '商调起锚，徵助澜，归宫靠岸。',
      chords: [
        { root: 1, tones: [1, 3, 5] }, { root: 3, tones: [3, 5, 7] },
        { root: 0, tones: [0, 2, 4] }, { root: 1, tones: [1, 3, 5] }
      ]
    },
    {
      id: 'jue-hill', name: '角·山色', en: 'Jue Hill',
      bars: 4, tag: '角 · 五声',
      desc: '角音空泛起笔，经宫徵回望山色。',
      chords: [
        { root: 2, tones: [2, 4, 6] }, { root: 0, tones: [0, 2, 4] },
        { root: 3, tones: [3, 5, 7] }, { root: 2, tones: [2, 4, 6] }
      ]
    },
    {
      id: 'gong-wander', name: '宫·五音漫步', en: 'Gong Wander',
      bars: 4, tag: '宫 · 五声',
      desc: '宫商徵羽渐次铺展，五声全览。',
      chords: [
        { root: 0, tones: [0, 2, 4] }, { root: 1, tones: [1, 3, 5] },
        { root: 3, tones: [3, 5, 7] }, { root: 4, tones: [4, 6, 8] }
      ]
    },
    {
      id: 'pop-1645', name: '流行 I–V–vi–IV', en: 'Pop 1-5-6-4',
      bars: 4, tag: '自由 · 流行', chromOnly: true,
      desc: '华语流行四小节循环，需自由调式。',
      semis: [
        { root: 0, tones: [0, 4, 7] }, { root: 7, tones: [7, 11, 14] },
        { root: 9, tones: [9, 12, 16] }, { root: 5, tones: [5, 9, 12] }
      ]
    },
    {
      id: 'canon', name: '卡农进行', en: 'Canon',
      bars: 8, tag: '自由 · 流行', chromOnly: true,
      desc: 'I–V–vi–iii–IV–I–IV–V 八小节卡农循环。',
      semis: [
        { root: 0, tones: [0, 4, 7] }, { root: 7, tones: [7, 11, 14] },
        { root: 9, tones: [9, 12, 16] }, { root: 4, tones: [4, 7, 11] },
        { root: 5, tones: [5, 9, 12] }, { root: 0, tones: [0, 4, 7] },
        { root: 5, tones: [5, 9, 12] }, { root: 7, tones: [7, 11, 14] }
      ]
    }
  ];

  /* ---------- 织体（progression 声部的演奏风格） ---------- */
  var STYLES = {
    block:   { id: 'block', name: '柱式和弦', desc: '每小节整块按下的持续和弦' },
    arp:     { id: 'arp', name: '分解琶音', desc: '和弦音由低到高滚动拨出' },
    bass:    { id: 'bass', name: '低音根音', desc: '只弹根音与五音，支撑低声部' },
    bassarp: { id: 'bassarp', name: '根音+琶音', desc: '根音垫底，上方轻声琶音' }
  };

  /* ---------- 音色 ---------- */
  var TIMBRES = {
    sample: { id: 'sample', name: '实录古筝', desc: 'CC0 采样 A3 变调扩展（默认）' },
    pluck:  { id: 'pluck', name: '合成古筝', desc: 'Karplus-Strong 拨弦合成（无采样依赖）' }
  };

  /* ---------- 音色抽象：未来可扩展琵琶/二胡等 ---------- */
  var INSTRUMENTS = { guzheng: { name: '古筝', timbres: ['sample', 'pluck'] } };

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function motif(id) { return byId(MOTIFS, id); }
  function progression(id) { return byId(PROGRESSIONS, id); }

  /* ---------- 每个素材自带的试听事件展开（不依赖 project） ---------- */
  /**
   * motifEvents(m, density, repeat, bpb, bars)
   *  - density: 疏密（>1 更密，<1 更疏）
   *  - repeat:  重复次数（缺省时由 bars 推导）
   *  - bpb:     每小节拍数（4/4→4，3/4→3）
   *  - bars:    块长度（小节）；有效长度 = bars，音符按此重排/重复
   */
  function motifEvents(m, density, repeat, bpb, bars) {
    var beatsPerBar = bpb || 4;
    var effectiveBars = bars || (m.bars * (repeat || 1));
    var reps = Math.max(1, Math.round(effectiveBars / m.bars));
    var evs = [];
    var maxT = 0, i;
    for (i = 0; i < m.beats.length; i++) maxT = Math.max(maxT, m.beats[i].t + m.beats[i].dur);
    var blockBeats = effectiveBars * beatsPerBar;
    var stretch = density ? 1 / Math.max(0.6, Math.min(1.5, density)) : 1;
    var scale = Math.min(stretch, blockBeats / maxT);
    for (var r = 0; r < reps; r++) {
      for (i = 0; i < m.beats.length; i++) {
        var b = m.beats[i];
        evs.push({ t: r * m.bars * beatsPerBar + b.t * scale, d: b.d, dur: Math.max(0.08, b.dur * scale), vel: b.vel, art: b.art });
      }
    }
    return evs;
  }

  G.content = {
    MOTIFS: MOTIFS,
    PROGRESSIONS: PROGRESSIONS,
    STYLES: STYLES,
    TIMBRES: TIMBRES,
    INSTRUMENTS: INSTRUMENTS,
    motif: motif,
    progression: progression,
    motifEvents: motifEvents
  };
})(window.GZS = window.GZS || {});