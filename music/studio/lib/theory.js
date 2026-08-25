/* ============================================================
 * theory.js — 五声调式音高模型（宫商角徵羽 + 自由十二音）
 * 所有动机/和声均用"音级"（scale degree）编码，与具体主音解耦。
 * degree 0 = 当前调式的宫音（mode center）。
 * ============================================================ */
(function (G) {
  'use strict';

  // 五种五声调式 — 以调式中心音为 0 的半音偏移
  var MODES = {
    gong: { name: '宫', nameEn: 'Gong', desc: '宫商角徵羽 · 大调五声', semis: [0, 2, 4, 7, 9] },
    shang: { name: '商', nameEn: 'Shang', desc: '商角徵羽宫 · 商调五声', semis: [0, 2, 5, 7, 10] },
    jue: { name: '角', nameEn: 'Jue', desc: '角徵羽宫商 · 角调五声', semis: [0, 3, 5, 8, 10] },
    zhi: { name: '徵', nameEn: 'Zhi', desc: '徵羽宫商角 · 徵调五声', semis: [0, 2, 5, 7, 9] },
    yu: { name: '羽', nameEn: 'Yu', desc: '羽宫商角徵 · 小调五声', semis: [0, 3, 5, 7, 10] },
    chrom: { name: '自由', nameEn: 'Chromatic', desc: '十二音自由调式', semis: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }
  };

  var DEG_NAMES = ['宫', '商', '角', '徵', '羽'];

  function mod5(n) {
    return ((n % 5) + 5) % 5;
  }

  /**
   * 音级 → 半音偏移（0 = 调式中心）。
   * degree 可为负；每 +5 升高一个八度。
   */
  function degreeToSemitone(modeId, degree) {
    var s = MODES[modeId].semis;
    if (modeId === 'chrom') {
      return ((degree % 12) + 12) % 12 + 12 * Math.floor(degree / 12);
    }
    var oct = Math.floor(degree / 5);
    return s[mod5(degree)] + 12 * oct;
  }

  /** 音级 → MIDI 音高 */
  function degreeToMidi(modeId, tonicMidi, degree) {
    return tonicMidi + degreeToSemitone(modeId, degree);
  }

  /** 音级显示名（宫商角徵羽 + 八度角标） */
  function degreeName(degree) {
    var oct = Math.floor(degree / 5);
    var c = DEG_NAMES[mod5(degree)];
    return oct === 0 ? c : c + '<sub>' + (oct > 0 ? '+' + oct : oct) + '</sub>';
  }

  /** MIDI → 音名（用于状态栏显示） */
  var NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  function midiName(midi) {
    return NOTE_NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
  }

  /** 和弦音级集合 → 该和弦的 MIDI 音（含根音、按音高排序，octaveShift 为附加八度） */
  function chordMidis(modeId, tonicMidi, chord, octaveShift) {
    var root = chord.root, tones = chord.tones;
    var seen = {}, out = [];
    function push(d) {
      var m = degreeToMidi(modeId, tonicMidi, d) + 12 * (octaveShift || 0);
      var key = m;
      if (!seen[key]) { seen[key] = 1; out.push(m); }
    }
    push(root);
    for (var i = 0; i < tones.length; i++) push(tones[i]);
    out.sort(function (a, b) { return a - b; });
    return out;
  }

  /** 最近的调内音级（用于把随意数字吸附进当前调式） */
  function snapDegree(modeId, degree) {
    if (modeId === 'chrom') return degree;
    var s = MODES[modeId].semis;
    // 把 degree 的绝对半音映射到五声里最近的音级
    var semi = degreeToSemitone(modeId, degree);
    var best = 0, bestD = 1e9;
    for (var d = -6; d <= 6; d++) {
      var dd = Math.abs(degreeToSemitone(modeId, d) - semi);
      if (dd < bestD) { bestD = dd; best = d; }
    }
    return best;
  }

  /** 拍号显示名 */
  function meterName(beatsPerBar) { return beatsPerBar + '/4'; }

  G.theory = {
    MODES: MODES,
    DEG_NAMES: DEG_NAMES,
    degreeToSemitone: degreeToSemitone,
    degreeToMidi: degreeToMidi,
    degreeName: degreeName,
    midiName: midiName,
    chordMidis: chordMidis,
    snapDegree: snapDegree,
    meterName: meterName
  };
})(window.GZS = window.GZS || {});