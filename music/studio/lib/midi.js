/* ============================================================
 * midi.js — MIDI 文件（Format 1）与下载工具
 * ============================================================ */
(function (G) {
  'use strict';

  var PPQ = 480;

  function varlen(n) {
    var bytes = [n & 0x7f];
    n >>= 7;
    while (n > 0) { bytes.unshift((n & 0x7f) | 0x80); n >>= 7; }
    return bytes;
  }

  function toBytes(arr) {
    var out = new Uint8Array(arr.length);
    for (var i = 0; i < arr.length; i++) out[i] = arr[i];
    return out;
  }

  /**
   * buildMidi({ bpm, beatsPerBar, totalBars, tracks: [{name, events:[{t,dur,midi,vel}]}] })
   * 返回 Uint8Array
   */
  function buildMidi(cfg) {
    var bpm = cfg.bpm || 90,
        bpb = cfg.beatsPerBar || 4,
        ticksPerBeat = PPQ,
        trackEvents = [[], []], // [[tempo track], [track0...]] — 先按 track 累积
        meta = [];

    // —— Track 0：速度 + 拍号 ——
    var tmp = 0;
    function push(e, arr) { arr.push(e); }
    // 速度 meta：FF 51 03 tt tt tt
    var usPerBeat = Math.round(60000000 / bpm);
    meta.push(0x00, 0xFF, 0x51, 0x03, (usPerBeat >> 16) & 0xff, (usPerBeat >> 8) & 0xff, usPerBeat & 0xff);
    // 拍号：FF 58 04 nn dd cc bb
    var dd = 2; // 分母 2^dd（4 = 2^2）
    while (Math.pow(2, dd) < bpb) dd++;
    if (dd > 5) dd = 5;
    meta.push(0x00, 0xFF, 0x58, 0x04, bpb || 4, dd, 24, 8);
    // 曲名
    var name = (cfg.name || 'Guzheng Studio').split('').map(function (c) { return c.charCodeAt(0) & 0xff; });
    meta.push(0x00, 0xFF, 0x03, name.length);
    meta = meta.concat(name);
    meta.push(0x00, 0xFF, 0x2F, 0x00);
    trackEvents[0] = meta;

    // —— 各声部轨道 ——
    var tracks = cfg.tracks || [];
    for (var t = 0; t < tracks.length; t++) {
      var tr = tracks[t];
      var evs = tr.events || [];
      var sorted = evs.slice().sort(function (a, b) { return a.t - b.t || a.midi - b.midi; });
      var bytes = [];
      // 轨道名
      var nm = (tr.name || 'voice').split('').map(function (c) { return c.charCodeAt(0) & 0xff; });
      bytes.push(0x00, 0xFF, 0x03, nm.length); bytes = bytes.concat(nm);
      var ch = Math.min(15, t);
      var lastT = 0;
      // 拆成 on/off 事件流
      var evtList = [];
      for (var i = 0; i < sorted.length; i++) {
        var e = sorted[i];
        evtList.push({ ts: Math.round(e.t * ticksPerBeat), kind: 'on', midi: e.midi, vel: e.vel, ch: ch });
        evtList.push({ ts: Math.round((e.t + e.dur) * ticksPerBeat), kind: 'off', midi: e.midi, ch: ch });
      }
      evtList.sort(function (a, b) { return a.ts - b.ts || (a.kind === 'off' ? -1 : 1); });
      for (var j = 0; j < evtList.length; j++) {
        var ev = evtList[j];
        var d = ev.ts - lastT;
        if (d < 0) d = 0;
        lastT = ev.ts;
        bytes = bytes.concat(varlen(d));
        if (ev.kind === 'on') bytes = bytes.concat([0x90 | ev.ch, ev.midi, Math.max(1, Math.min(127, ev.vel || 64))]);
        else bytes = bytes.concat([0x80 | ev.ch, ev.midi, 0]);
      }
      bytes.push(0x00, 0xFF, 0x2F, 0x00);
      trackEvents[t + 1] = bytes;
    }

    // —— 组装文件 ——
    var ntrk = trackEvents.length;
    var header = [0x4D, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x01, (ntrk >> 8) & 0xff, ntrk & 0xff, (PPQ >> 8) & 0xff, PPQ & 0xff];
    var total = header.length;
    for (var k = 0; k < ntrk; k++) total += 8 + trackEvents[k].length;
    var out = new Uint8Array(total);
    var off = 0;
    for (var h = 0; h < header.length; h++) out[off++] = header[h];
    for (var m = 0; m < ntrk; m++) {
      var len = trackEvents[m].length;
      out[off++] = 0x4D; out[off++] = 0x54; out[off++] = 0x72; out[off++] = 0x6B; // "MTrk"
      out[off++] = (len >> 24) & 0xff; out[off++] = (len >> 16) & 0xff; out[off++] = (len >> 8) & 0xff; out[off++] = len & 0xff;
      for (var b2 = 0; b2 < len; b2++) out[off++] = trackEvents[m][b2];
    }
    return out;
  }

  function download(bytes, filename) {
    var blob = new Blob([bytes], { type: 'application/octet-stream' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }

  function downloadBlob(result, filename) {
    var blob = result.blob;
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (filename || 'guzheng') + '.' + result.ext;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }

  G.midi = { buildMidi: buildMidi, download: download, downloadBlob: downloadBlob };
})(window.GZS = window.GZS || {});