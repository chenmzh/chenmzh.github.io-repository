/* ============================================================
 * engine.js — 纯逻辑引擎（无 DOM 依赖，可被 node 直接单元测试）
 *  - expand(project)：把全部块展开为音符事件（拍为时间单位）
 *  - notesForLoop(project)：循环区内、按可闻秒的调度音符列表
 * 所有音高经 theory 映射，天然受"调内安全"约束（非 chrom 模式）。
 * ============================================================ */
(function (G) {
  'use strict';

  var theory = G.theory, content = G.content;

  function voiceOf(proj, id) {
    for (var i = 0; i < proj.voices.length; i++) if (proj.voices[i].id === id) return proj.voices[i];
    return null;
  }

  var KEY_MIDI = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

  /** 块占多少小节（动机：bars 即长度；和声：bars 即长度） */
  function blockBars(blk) { return Math.max(1, Math.round(blk.bars || 1)); }

  /** 把一端工程展开为事件列表 */
  function expand(proj) {
    var out = [];
    proj = normalize(proj);
    // 主音固定在中音区（C4=60，D4=62）：音符落在可听音区（D4≈62），各声部用 octave 微调
    var tonic = (KEY_MIDI[proj.key] != null ? KEY_MIDI[proj.key] : 0) + 60;
    var mode = proj.mode || 'gong';

    for (var i = 0; i < proj.blocks.length; i++) {
      var blk = proj.blocks[i];
      var voice = voiceOf(proj, blk.voiceId);
      if (!voice) continue;
      if (blk.type === 'motif') {
        var mot = content.motif(blk.ref);
        if (!mot) continue;
        var bb = proj.beatsPerBar || 4;
        var evs = content.motifEvents(mot, blk.density, null, bb, blockBars(blk));
        var trans = blk.transpose || 0, oct = blk.octave || 0;
        for (var e = 0; e < evs.length; e++) {
          var ev = evs[e];
          var midi = theory.degreeToMidi(mode, tonic, ev.d + trans) + 12 * oct;
          out.push({
            bar: blk.startBar + ev.t / bb,
            t: blk.startBar * bb + ev.t,
            midi: midi, vel: ev.vel, dur: ev.dur,
            art: ev.art, voiceId: blk.voiceId
          });
        }
      } else if (blk.type === 'progression') {
        var prog = content.progression(blk.ref);
        if (!prog) continue;
        // chromOnly 且当前不是自由调式 → 跳过（不应出现在调度里）
        if (prog.chromOnly && mode !== 'chrom') continue;
        var chords = prog.semis ? prog.semis : prog.chords;
        var style = blk.style || 'arp';
        var bpb = proj.beatsPerBar || 4;
        var barPerChord = blockBars(blk) / chords.length;
        var oct2 = blk.octave || 0, trans2 = blk.transpose || 0;

        function chordTones(ch) {
          var a = [];
          if (prog.semis) {
            a.push(tonic + ch.root + 12 * oct2);
            for (var t = 0; t < ch.tones.length; t++) a.push(tonic + ch.root + ch.tones[t] + 12 * oct2);
          } else {
            var degs = [ch.root].concat(ch.tones);
            for (var i2 = 0; i2 < degs.length; i2++) a.push(theory.degreeToMidi(mode, tonic, degs[i2] + trans2) + 12 * oct2);
          }
          // 去重（数据里 root 与 tones[0] 可能重复）
          var seen = {}, out = [];
          for (var k2 = 0; k2 < a.length; k2++) { if (!seen[a[k2]]) { seen[a[k2]] = 1; out.push(a[k2]); } }
          return out.sort(function (x, y) { return x - y; });
        }

        for (var cI = 0; cI < chords.length; cI++) {
          var chord = chords[cI];
          var cb = blk.startBar + cI * barPerChord;
          var tones = chordTones(chord).sort(function (a, b) { return a - b; });
          var rootM = tones[0];
          var fifthM = tones.length > 1 ? tones[tones.length > 2 ? 2 : 1] : tones[0];
          if (style === 'bass' || style === 'bassarp') {
            out.push(note(cb, 0, proj, rootM, 0.85, blk, voice));
            if (style === 'bassarp') out.push(note(cb + barPerChord * 0.55, 0, proj, fifthM, 0.45, blk, voice));
          } else if (style === 'block') {
            for (var n2 = 0; n2 < tones.length; n2++) out.push(note(cb, 0, proj, tones[n2], 0.5, blk, voice));
          } else { // arp
            var step = Math.max(barPerChord / Math.max(tones.length, 1), 0.4) * (blk.density > 0 ? blk.density : 1);
            for (var a = 0; a < tones.length; a++) out.push(note(cb + a * step, 0, proj, tones[a], 0.55, blk, voice));
          }
        }
      }
    }
    return out;
  }

  function note(bar, mb, proj, midi, vel, blk, voice) {
    var bpb = proj.beatsPerBar || 4;
    return { bar: bar + mb / bpb, t: 0, midi: midi, vel: vel, dur: 1, art: null, voiceId: blk.voiceId };
  }

  /** 循环区内的调度音符（可闻秒），去重+排序；返回 [{sec,midi,vel,dur,voiceId}] */
  function notesForLoop(proj) {
    proj = normalize(proj);
    var evs = expand(proj);
    var bpb = proj.beatsPerBar || 4;
    var secPerBeat = 60 / (proj.bpm || 90);
    var loopBars = Math.max(1, proj.loopBars || proj.totalBars || 16);
    var loopSec = loopBars * bpb * secPerBeat;
    var cols = {};
    evs.forEach(function (e) {
      var local = (((e.bar % loopBars) + loopBars) % loopBars);
      var sec = local * bpb * secPerBeat;
      if (sec < 0 || sec >= loopSec - 0.005) return;
      var key = sec.toFixed(4) + '|' + e.midi + '|' + e.voiceId;
      if (!(key in cols) || e.vel > cols[key].vel) {
        cols[key] = { sec: sec, midi: e.midi, vel: e.vel, dur: e.dur, voiceId: e.voiceId };
      }
    });
    return Object.keys(cols).map(function (k) { return cols[k]; }).sort(function (a, b) { return a.sec - b.sec; });
  }

  /** 事件是否会被播放（mute/solo 判定，与 fireEventAt 一致，便于测试） */
  function isAudible(proj, voiceId) {
    var voice = voiceOf(proj, voiceId);
    if (!voice || voice.mute) return false;
    var anySolo = false;
    for (var i = 0; i < proj.voices.length; i++) if (proj.voices[i].solo) anySolo = true;
    if (anySolo && !voice.solo) return false;
    return true;
  }

  function normalize(p) {
    var out = {
      version: 1, name: p.name || '',
      bpm: p.bpm || 76, key: p.key || 'D', mode: p.mode || 'gong',
      beatsPerBar: p.beatsPerBar || 4, totalBars: p.totalBars || 32,
      reverb: p.reverb != null ? p.reverb : 0.28, volume: p.volume != null ? p.volume : 0.8,
      loopBars: Math.max(1, Math.min(p.loopBars || p.totalBars || 32, p.totalBars || 32)),
      voices: p.voices || [], blocks: p.blocks || []
    };
    if (!out.blocks.length && out.voices.length) {
      // 允许完全空工程
    }
    return out;
  }

  G.engine = {
    expand: expand,
    notesForLoop: notesForLoop,
    isAudible: isAudible,
    voiceOf: voiceOf,
    blockBars: blockBars,
    normalize: normalize
  };
})(window.GZS = window.GZS || {});