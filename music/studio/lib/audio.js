/* ============================================================
 * audio.js — 浏览器音频引擎（原生 Web Audio 图 + Tone.js 仅用于 Transport）
 *  - 实录采样声部（CC0 A3 变调扩展）
 *  - 合成古筝声部（Karplus-Strong 拨弦）
 *  - 每声部独立增益/声像、全局混响+压缩、素材试听、录音导出 WAV
 * ============================================================ */
(function (G) {
  'use strict';

  var SAMPLE_MIDI = 57;              // 采样基准音 A3
  var SAMPLE_URL = 'audio/guzheng-a3.wav';

  var Tone = window.Tone;
  var ctx = null;
  var master = null, dryBus = null, wetBus = null, conv = null, comp = null;
  var sampleBuffer = null;            // AudioBuffer
  var voiceChains = {};               // voiceId -> {gain, panner}
  var started = false;
  var loadState = 'waiting';          // waiting | loading | ready | error
  var listeners = [];
  var rec = null;                     // 录音句柄

  function notify() {
    for (var i = 0; i < listeners.length; i++) listeners[i](loadState);
  }
  function onChange(fn) { listeners.push(fn); }

  function makeImpulse(ac, seconds, decay) {
    var rate = ac.sampleRate;
    var len = Math.floor(rate * seconds);
    var buf = ac.createBuffer(2, len, rate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch);
      for (var i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  function ensureContext() {
    if (!Tone) throw new Error('Tone.js 未加载');
    if (ctx) return ctx;
    Tone.start();
    ctx = Tone.getContext().rawContext || Tone.getContext();
    if (!ctx.createStereoPanner) ctx = Tone.context.rawContext || ctx;
    master = ctx.createGain(); master.gain.value = 0.8;
    dryBus = ctx.createGain(); dryBus.gain.value = 1;
    wetBus = ctx.createGain(); wetBus.gain.value = 0.25;
    conv = ctx.createConvolver(); conv.buffer = makeImpulse(ctx, 2.6, 2.4); conv.normalize = true;
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.006; comp.release.value = 0.25;
    master.connect(dryBus);
    master.connect(conv); conv.connect(wetBus);
    dryBus.connect(comp); wetBus.connect(comp);
    comp.connect(ctx.destination);
    loadSample().catch(function () { /* 采样失败不阻塞；合成古筝仍可用 */ });
    return ctx;
  }

  /** 用户手势中调用，解锁 AudioContext */
  function resume() {
    if (!Tone) return false;
    try { Tone.start(); started = true; } catch (e) {}
    if (ctx && ctx.state === 'suspended' && ctx.resume) { try { ctx.resume(); } catch (e) {} }
    return started;
  }

  function loadSample() {
    if (loadState === 'loading' || loadState === 'ready') return Promise.resolve(loadState);
    loadState = 'loading'; notify();
    return fetch(SAMPLE_URL)
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
      .then(function (buf) {
        var ac = ensureContext();
        return new Promise(function (resolve, reject) {
          ac.decodeAudioData(buf, function (ab) {
            sampleBuffer = ab; loadState = 'ready'; notify(); resolve('ready');
          }, function (e) { loadState = 'error'; notify(); reject(e); });
        });
      })
      .catch(function (e) { loadState = 'error'; notify(); throw e; });
  }

  /** 每声部链：gain -> panner -> master */
  function voiceChain(voiceId, volume, pan) {
    var c = voiceChains[voiceId];
    if (!c) {
      var ac = ensureContext();
      var gain = ac.createGain(), panner = ac.createStereoPanner();
      gain.connect(panner); panner.connect(master);
      c = { gain: gain, panner: panner };
      voiceChains[voiceId] = c;
    }
    if (volume != null && ac) c.gain.gain.value = volume;
    if (pan != null) c.panner.pan.value = pan;
    return c;
  }
  function setChainParams(voiceId, volume, pan) {
    var c = voiceChains[voiceId];
    if (!c) return;
    if (volume != null) c.gain.gain.setTargetAtTime(volume, ctx.currentTime, 0.04);
    if (pan != null) c.panner.pan.setTargetAtTime(pan, ctx.currentTime, 0.04);
  }

  function velGain(vel) { return 0.12 + (vel / 100) * 0.75; }

  /* ---------------- 单音符触发 ---------------- */
  /**
   * trigger(voiceId, volume, pan, opts, midi, whenSec, vel, durSec)
   * opts: {timbre:'sample'|'pluck', ring: 延音系数 0.5-2}
   */
  function trigger(voiceId, volume, pan, opts, midi, whenSec, vel, durSec) {
    var ac = ensureContext();
    var now = whenSec || ac.currentTime;
    var chain = voiceChain(voiceId, volume, pan);
    var sustain = opts.ring != null ? opts.ring : 1;
    var vg = velGain(vel);

    if (opts.timbre === 'sample') {
      if (!sampleBuffer) return;               // 采样未就绪 → 静音（不会报错）
      var t0 = now + 0.004;
      var src = ac.createBufferSource();
      src.buffer = sampleBuffer;
      var rate = Math.pow(2, (midi - SAMPLE_MIDI) / 12);
      src.playbackRate.value = Math.max(0.35, Math.min(2.6, rate));
      var g = ac.createGain();
      var peak = Math.min(vg * 0.95, 0.92);
      var ringSec = sampleBuffer.duration / src.playbackRate.value;
      var hold = Math.min(durSec * sustain * 1.15, ringSec - 0.05);
      hold = Math.max(hold, 0.12);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + 0.007);
      g.gain.setValueAtTime(peak, t0 + Math.min(hold, ringSec * 0.75));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + hold + 0.24);
      src.connect(g); g.connect(chain.gain);
      src.start(t0);
      src.stop(Math.min(t0 + hold + 0.32, now + ringSec + 0.02));
      return;
    }

    if (opts.timbre === 'pluck') {
      // Karplus-Strong 拨弦合成
      var freq = 440 * Math.pow(2, (midi - 69) / 12);
      var sr = ac.sampleRate;
      var period = Math.max(2, Math.round(sr / freq));
      var t = now + 0.004;
      var noise = ac.createBuffer(1, period, sr);
      var nd = noise.getChannelData(0);
      for (var i = 0; i < period; i++) nd[i] = (Math.random() * 2 - 1) * 0.85;
      var srcn = ac.createBufferSource();
      srcn.buffer = noise;
      var bp = ac.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = freq * 2.1; bp.Q.value = 0.85;
      var delay = ac.createDelay(1.2);
      delay.delayTime.value = period / sr;
      var lp = ac.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = Math.min(freq * 3.2, sr / 2 - 50); lp.Q.value = 0.4;
      var fb = ac.createGain();
      fb.gain.value = 0.982;
      srcn.connect(bp); bp.connect(delay);
      delay.connect(lp); lp.connect(fb); fb.connect(delay);
      var out = ac.createGain();
      var hold = Math.min(Math.max(durSec * sustain * 1.15, 0.16), 4.6);
      var peak = Math.min(vg * 0.82, 0.9);
      out.gain.setValueAtTime(0.0001, t);
      out.gain.exponentialRampToValueAtTime(peak, t + 0.006);
      out.gain.setValueAtTime(peak, t + hold * 0.45);
      out.gain.exponentialRampToValueAtTime(0.0001, t + hold + 0.34);
      delay.connect(out); out.connect(chain.gain);
      srcn.start(t); srcn.stop(t + period / sr + 0.02);
      return;
    }
  }

  /* ---------------- 全局 ---------------- */
  function setReverb(v) {
    if (!wetBus) return;
    wetBus.gain.setTargetAtTime(Math.max(0, Math.min(0.9, v)), ctx.currentTime, 0.1);
  }
  function setMasterVolume(v) {
    if (master) master.gain.setTargetAtTime(Math.max(0, Math.min(1.4, v)), ctx.currentTime, 0.05);
  }

  /* ---------------- 素材试听 ---------------- */
  function preview(notes, bpm, timbre) {
    ensureContext(); resume();
    var t0 = ctx.currentTime + 0.07;
    var beatSec = 60 / (bpm || 90);
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      trigger('__preview__', 0.85, 0, { timbre: timbre || 'sample', ring: 0.8 },
        n.midi, t0 + n.t * beatSec, n.vel, Math.max(n.dur * beatSec * 0.85, 0.22));
    }
  }

  /* ---------------- 录音 → WAV ---------------- */
  function beginRecord() {
    ensureContext(); resume();
    if (rec) return false;
    var dest = ctx.createMediaStreamDestination();
    master.connect(dest);
    var chunks = [];
    rec = {
      chunks: chunks,
      mr: new MediaRecorder(dest.stream),
      dest: dest
    };
    rec.mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    rec.mr.start();
    return true;
  }
  function endRecord() {
    return new Promise(function (resolve, reject) {
      if (!rec) return reject(new Error('未在录音'));
      var r = rec; rec = null;
      r.mr.onstop = function () {
        var blob = new Blob(r.chunks, { type: r.mr.mimeType || 'audio/webm' });
        blob.arrayBuffer().then(function (buf) {
          return new Promise(function (res, rej) {
            ctx.decodeAudioData(buf, function (ab) { res(wavFromBuffer(ab)); }, rej);
          });
        }).then(resolve).catch(function () {
          resolve({ blob: blob, ext: 'webm', mime: r.mr.mimeType });
        });
      };
      try { r.mr.stop(); } catch (e) { reject(e); }
    });
  }
  function wavFromBuffer(buffer) {
    var numCh = Math.min(2, buffer.numberOfChannels);
    var sr = buffer.sampleRate;
    var len = buffer.length;
    var bytes = 44 + len * numCh * 2;
    var ab = new ArrayBuffer(bytes);
    var dv = new DataView(ab);
    function wstr(o, s) { for (var i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); }
    wstr(0, 'RIFF'); dv.setUint32(4, bytes - 8, true); wstr(8, 'WAVE');
    wstr(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
    dv.setUint16(22, numCh, true); dv.setUint32(24, sr, true);
    dv.setUint32(28, sr * numCh * 2, true); dv.setUint16(32, numCh * 2, true); dv.setUint16(34, 16, true);
    wstr(36, 'data'); dv.setUint32(40, len * numCh * 2, true);
    var chans = [], i, ch;
    for (ch = 0; ch < numCh; ch++) chans.push(buffer.getChannelData(ch));
    var off = 44;
    for (i = 0; i < len; i++) {
      for (ch = 0; ch < numCh; ch++) {
        var s = Math.max(-1, Math.min(1, chans[ch][i]));
        dv.setInt16(off, s < 0 ? s * 32768 : s * 32767, true);
        off += 2;
      }
    }
    var dur = len / sr;
    return { blob: new Blob([ab], { type: 'audio/wav' }), ext: 'wav', mime: 'audio/wav', duration: dur };
  }

  G.audio = {
    onChange: onChange, resume: resume, ensureContext: ensureContext,
    loadSample: loadSample, loadState: function () { return loadState; },
    getStarted: function () { return started; },
    hasSample: function () { return !!sampleBuffer; },
    voiceChain: voiceChain, setChainParams: setChainParams,
    trigger: trigger,
    setReverb: setReverb, setMasterVolume: setMasterVolume,
    preview: preview,
    beginRecord: beginRecord, endRecord: endRecord, wavFromBuffer: wavFromBuffer
  };
})(window.GZS = window.GZS || {});