/* ============================================================
 * app.js — 古筝工坊主程序
 *  - 数据模型：Projects {bpm,key,mode,meter,reverb,volume,tracks[],blocks[]}
 *  - 时间轴：pointer 拖拽（移动/缩放/删/复制），循环标记
 *  - Transport：Tone.Transport + 预调度
 *  - Inspector：选中块参数；声部控制；URL hash / localStorage 持久化
 * ============================================================ */
(function (G) {
  'use strict';

  var $ = function (s, root) { var r = typeof root === 'string' ? document.querySelector(root) : (root || document); return r.querySelector(s); };
  var $$ = function (s, root) { var r = typeof root === 'string' ? document.querySelector(root) : (root || document); return Array.prototype.slice.call(r.querySelectorAll(s)); };

  var theory = G.theory, content = G.content, audio = G.audio, midi = G.midi;
  var Tone = window.Tone;

  var KEY_MIDI = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

  /* ================= 默认工程 ================= */
  function defaultProject() {
    return {
      version: 1,
      name: '我的古筝小品',
      bpm: 76, key: 'D', mode: 'gong', beatsPerBar: 4, totalBars: 32,
      reverb: 0.28, volume: 0.8, loopBars: 16,
      voices: [
        { id: 'v0', name: '主旋律', timbre: 'sample', volume: 0.9, pan: 0, mute: false, solo: false },
        { id: 'v1', name: '和声', timbre: 'sample', volume: 0.72, pan: -0.18, mute: false, solo: false },
        { id: 'v2', name: '低音', timbre: 'sample', volume: 0.8, pan: 0.16, mute: false, solo: false },
        { id: 'v3', name: '装饰', timbre: 'pluck', volume: 0.6, pan: 0.22, mute: false, solo: false }
      ],
      blocks: [
        { id: uid(), type: 'motif', ref: 'run-down', voiceId: 'v0', startBar: 0, bars: 1, octave: 0, repeat: 1, density: 1 },
        { id: uid(), type: 'motif', ref: 'climb', voiceId: 'v0', startBar: 2, bars: 1, octave: 0, repeat: 1, density: 1 },
        { id: uid(), type: 'progression', ref: 'night-cycle', voiceId: 'v1', startBar: 0, bars: 4, octave: 0, style: 'arp', density: 1 },
        { id: uid(), type: 'progression', ref: 'zhi-circle', voiceId: 'v2', startBar: 4, bars: 4, octave: -1, style: 'bass', density: 1 },
        { id: uid(), type: 'motif', ref: 'call-resp', voiceId: 'v3', startBar: 4, bars: 2, octave: 1, repeat: 1, density: 0.8 }
      ]
    };
  }

  function uid() { return 'b' + Math.random().toString(36).slice(2, 9); }

  /* ================= 全局状态 ================= */
  var project = null;
  var selectedId = null;
  var tuning = {};
  var isPlaying = false;
  var transportStop = 0;
  var recording = false;

  var state = { dirty: false, playheadBar: 0 };

  var $fn = {}; // 由 UI 设置的回调（渲染）

  /* ================= 事件展开 ================= */
  /** 把 blocks 全部展开成 {bar, beats, midi, vel, dur, art, voiceId} 事件（以拍为单位的时间） */
  function expand(proj) {
    proj = proj || project;
    var out = [];
    var tonic = KEY_MIDI[proj.key] || 0;
    var mode = proj.mode;
    for (var i = 0; i < proj.blocks.length; i++) {
      var blk = proj.blocks[i];
      var voice = voiceOf(proj, blk.voiceId);
      if (!voice) continue;
      if (blk.type === 'motif') {
        var mot = content.motif(blk.ref);
        if (!mot) continue;
        var evs = content.motifEvents(mot, blk.density, blk.repeat);
        var blockBeats = blk.bars * proj.beatsPerBar;
        for (var e = 0; e < evs.length; e++) {
          var ev = evs[e];
          var midi = theory.degreeToMidi(mode, tonic, ev.d) + 12 * (blk.octave || 0);
          out.push({
            bar: blk.startBar + ev.t / proj.beatsPerBar,
            t: blk.startBar * proj.beatsPerBar + ev.t,
            midi: midi, vel: ev.vel, dur: ev.dur * (blk.density > 0 ? 1 + (blk.density - 1) * 0 : 1),
            art: ev.art, voiceId: blk.voiceId
          });
        }
      } else if (blk.type === 'progression') {
        var prog = content.progression(blk.ref);
        if (!prog) continue;
        var chords = prog.semis ? prog.semis : prog.chords;
        var style = blk.style || 'arp';
        var bb = proj.beatsPerBar;
        var barPerChord = blk.bars / chords.length;
        var oct = blk.octave || 0;
        // 取和弦全部音的 MIDI（含根音）
        function chordTones(ch) {
          if (prog.semis) {
            var arr = [];
            arr.push(tonic + ch.root + 12 * oct);
            for (var t = 0; t < ch.tones.length; t++) arr.push(tonic + ch.root + ch.tones[t] + 12 * oct);
            return arr;
          }
          // 五声音级：根音+tones
          var degs = [ch.root].concat(ch.tones);
          var out2 = [];
          for (var i2 = 0; i2 < degs.length; i2++) out2.push(theory.degreeToMidi(mode, tonic, degs[i2]) + 12 * oct);
          return out2;
        }
        for (var cI = 0; cI < chords.length; cI++) {
          var chord = chords[cI];
          var cb = blk.startBar + cI * barPerChord;
          var tones = chordTones(chord);
          tones.sort(function (a, b) { return a - b; });
          var rootM = tones[0];
          var fifthM = tones.length > 1 ? tones[tones.length > 2 ? 2 : 1] : tones[0];
          var sub = Math.max(1, Math.round(barPerChord));
          if (style === 'bass' || style === 'bassarp') {
            out.push(makeNote(cb, 0, proj, rootM, 0.85, blk, voice));
            if (style === 'bassarp') {
              out.push(makeNote(cb + barPerChord * 0.55, 0, proj, fifthM, 0.45, blk, voice));
            }
          } else if (style === 'block') {
            var chordM = tones;
            for (var n2 = 0; n2 < chordM.length; n2++) {
              out.push(makeNote(cb, 0, proj, chordM[n2], 0.5, blk, voice));
            }
          } else { // arp
            var step = Math.max(barPerChord / Math.max(tones.length, 1), 0.4) * (blk.density > 0 ? blk.density : 1);
            for (var a = 0; a < tones.length; a++) {
              out.push(makeNote(cb + a * step, 0, proj, tones[a], 0.55, blk, voice));
            }
          }
        }
      }
    }
    return out;
  }

  /** 构造一个和声音符：bar 为绝对小节（可为小数），mb 为该小节内偏移拍 */
  function makeNote(bar, mb, proj, midi, vel, blk, voice) {
    return { bar: bar + mb / proj.beatsPerBar, t: 0, midi: midi, vel: vel, dur: 1, art: null, voiceId: blk.voiceId };
  }

  function voiceOf(proj, id) {
    for (var i = 0; i < proj.voices.length; i++) if (proj.voices[i].id === id) return proj.voices[i];
    return null;
  }
  function blockById(id) {
    for (var i = 0; i < project.blocks.length; i++) if (project.blocks[i].id === id) return project.blocks[i];
    return null;
  }

  /* ================= 播放 / 预调度 ================= */
  // 用 Tone.Loop 每循环周期回调一次，把该周期内所有事件预调度为一次性定时器。

  // fireEventAt(e, when)：在可闻时间 when 触发某音符
  function fireEventAt(e, when) {
    var voice = voiceOf(project, e.voiceId);
    if (!voice) return;
    if (voice.mute) return;
    var anySolo = project.voices.some(function (v) { return v.solo; });
    if (anySolo && !voice.solo) return;
    var vg = voice.volume * project.volume;
    var durSec = e.durBeat * (60 / project.bpm);
    audio.trigger(voice.id, vg * (e.voiceId === 'v2' ? 1.1 : 1), voice.pan,
      { timbre: voice.timbre, ring: 1 }, e.midi, when, e.vel, durSec);
  }

  // 基于 Tone.Transport + Tone.Loop 的循环调度
  var toneScheduled = null;
  function buildToneSchedule() {
    if (toneScheduled) {
      try { toneScheduled.dispose(); } catch (e) {}
      toneScheduled = null;
    }
    var secPerBeat = 60 / project.bpm;
    var loopBeats = project.loopBars * project.beatsPerBar;
    var evs = expand();
    var cols = {};
    evs.forEach(function (e) {
      var local = (((e.bar % project.loopBars) + project.loopBars) % project.loopBars);
      cols[local + '|' + e.midi + '|' + e.dur + '|' + e.vel + '|' + e.voiceId] = {
        bar: local, midi: e.midi, vel: e.vel, dur: e.dur, voiceId: e.voiceId, sec: local * project.beatsPerBar * secPerBeat
      };
    });
    var notes = Object.keys(cols).map(function (k) { return cols[k]; });
    var loopLenSec = loopBeats * secPerBeat;
    var loop = new Tone.Loop(function (time) {
      for (var i = 0; i < notes.length; i++) {
        var n = notes[i];
        var abs = time + n.sec;
        scheduleTrigger(n, abs);
      }
    }, loopLenSec).start(0);
    toneScheduled = loop;
    Tone.Transport.loop = true;
    Tone.Transport.loopStart = 0;
    Tone.Transport.loopEnd = loopBeats * secPerBeat; // seconds
    return notes;
  }

  var pendingTimers = [];
  function scheduleTrigger(n, absTransSec) {
    // absTransSec 是 Tone.Transport 的歌内时间（从 0 起的歌曲秒）。
    // 换算成浏览器音频时钟（ctx.currentTime）的绝对触发时刻：
    var ac = audio.ensureContext();
    var nowTrans = Tone.Transport.seconds;
    var rel = absTransSec - nowTrans; // 相对当前 transport 位置（秒）
    if (rel < 0) rel = 0;
    var target = ac.currentTime + rel; // ctx 绝对触发时刻
    var delayMs = rel * 1000;
    var to = setTimeout(function () {
      if (!isPlaying) return;
      fireEventAt(n, target);
    }, delayMs);
    pendingTimers.push(to);
    if (pendingTimers.length > 600) pendingTimers.shift();
  }

  function startPlayback(fromBar) {
    if (!audio.getStarted()) audio.resume();
    if (audio.loadState() === 'waiting') audio.loadSample();
    isPlaying = true;
    if (state.dirty) computePlan();
    var bpb = project.beatsPerBar;
    var secPerBeat = 60 / project.bpm;
    var startSec = (fromBar || 0) * bpb * secPerBeat;
    // 先停掉旧状态
    if (Tone.Transport.state === 'started') Tone.Transport.stop();
    Tone.Transport.bpm.value = project.bpm;
    Tone.Transport.loop = true;
    Tone.Transport.loopStart = 0;
    Tone.Transport.loopEnd = project.loopBars * bpb * secPerBeat;
    buildToneSchedule();
    Tone.Transport.position = [0, 0, 0];
    transportStop = fromBar != null ? fromBar : 0;
    Tone.Transport.start(undefined, startSec);
    render();
    startTicker();
  }

  // start 后由 Tone.Loop 的首周期回调自动覆盖 0..loop 的事件，无需额外补齐。

  function stopPlayback() {
    isPlaying = false;
    if (Tone.Transport.state === 'started') Tone.Transport.stop();
    stopTicker();
    // 清掉待触发计时器
    while (pendingTimers.length) clearTimeout(pendingTimers.pop());
    render();
  }

  var ticker = null;
  function startTicker() {
    stopTicker();
    ticker = setInterval(function () {
      if (!isPlaying) return;
      var secPerBeat = 60 / project.bpm;
      var loopSec = project.loopBars * project.beatsPerBar * secPerBeat;
      var s = ((Tone.Transport.seconds % loopSec) + loopSec) % loopSec;
      state.playheadBar = s / project.beatsPerBar / secPerBeat;
      $fn.onPlayhead && $fn.onPlayhead(state.playheadBar);
    }, 50);
  }
  function stopTicker() {
    if (ticker) { clearInterval(ticker); ticker = null; }
  }


  /* ================= UI 渲染 ================= */
  function render() {
    renderPalette();
    renderVoices();
    renderTimeline();
    renderPlayhead();
    renderInspector();
    renderTransport();
    renderHeader();
    updateHash();
  }

  function renderHeader() {
    $('#title-input').value = project.name;
    $('#stat-bars').textContent = project.totalBars + ' 小节 · ' + project.beatsPerBar + '/4';
    $('#stat-voices').textContent = project.voices.length + ' 声部';
    var mode = theory.MODES[project.mode];
    $('#stat-mode').textContent = project.key + ' · ' + mode.name + '调';
  }

  /* ---------- 素材面板 ---------- */
  var previewActive = null;
  function renderPalette() {
    var motWrap = $('#motif-palette');
    motWrap.innerHTML = '';
    // 每个动机卡片：可点击试听；拖动到声部可添加
    content.MOTIFS.forEach(function (m) {
      var card = mkCard(m, 'motif');
      motWrap.appendChild(card);
    });
    var progWrap = $('#prog-palette');
    progWrap.innerHTML = '';
    content.PROGRESSIONS.forEach(function (p) {
      var card = mkCard(p, 'progression');
      progWrap.appendChild(card);
    });
  }

  function mkCard(item, type) {
    var div = document.createElement('div');
    div.className = 'pal-card ' + (type === 'progression' ? 'pal-card--prog' : 'pal-card--motif');
    div.setAttribute('draggable', 'true');
    div.dataset.type = type;
    div.dataset.ref = item.id;
    var badge = type === 'motif' ? '动机' : '和声';
    var tag = item.tag || '';
    div.innerHTML =
      '<div class="pal-card-head"><span class="pal-card-type">' + badge + '</span><span class="pal-card-tag">' + tag + '</span></div>' +
      '<div class="pal-card-name">' + item.name + '</div>' +
      '<div class="pal-card-desc">' + (item.desc || '') + '</div>' +
      '<div class="pal-card-foot"><span class="pal-card-bars">' + item.bars + ' 小节</span>' +
      '<button class="pal-card-preview" title="试听">▶ 试听</button></div>';
    // 试听
    $('.pal-card-preview', div).addEventListener('click', function (ev) {
      ev.stopPropagation();
      previewItem(item, type);
    });
    // HTML5 DnD 起点（桌面）：dragstart 存数据
    div.addEventListener('dragstart', function (e) {
      e.dataTransfer.setData('text/plain', type + ':' + item.id);
      e.dataTransfer.effectAllowed = 'copy';
    });
    return div;
  }

  function previewItem(item, type) {
    var tonic = KEY_MIDI[project.key] || 0;
    var mode = project.mode;
    if (type === 'motif') {
      var evs = content.motifEvents(item, 1, 1);
      var notes = evs.map(function (ev) {
        return { t: Math.max(0, ev.t), midi: theory.degreeToMidi(mode, tonic, ev.d) + 0 * 0, vel: ev.vel, dur: ev.dur };
      });
      audio.preview(notes, project.bpm, 'sample');
    } else {
      var prog = content.progression(item.id);
      var bpb = project.beatsPerBar;
      var notes = [];
      var chords = prog.semis ? prog.semis : prog.chords;
      for (var c = 0; c < chords.length; c++) {
        var chord = chords[c];
        var midis;
        if (prog.semis) midis = [tonic + chord.root].concat(chord.tones.map(function (x) { return tonic + x; }));
        else midis = theory.chordMidis(mode, tonic, chord, 0);
        var barIdx = c * (item.bars / chords.length);
        for (var n = 0; n < midis.length; n++) {
          notes.push({ t: barIdx * bpb + n * 0.28, midi: midis[n], vel: 62, dur: 1.2 });
        }
      }
      audio.preview(notes, project.bpm, 'sample');
    }
  }

  var DND = { active: null, mode: 'move', grabX: 0, grabBar: 0, orig: null, hoverVoice: null, previewEl: null };

  function pxToBar(clientX) {
    var tl = $('#timeline');
    var rect = tl.getBoundingClientRect();
    var pxPerBar = timelinePxPerBar();
    var x = clientX - rect.left;
    return (x / pxPerBar) | 0;
  }

  function timelinePxPerBar() {
    var tl = $('#timeline');
    var w = Math.max(tl.clientWidth - 8, 220);
    return w / project.totalBars;
  }

  function pointToVoice(x, y) {
    var el = document.elementFromPoint(x, y);
    var track = el && el.closest ? el.closest('.voice-track') : null;
    return track ? track.dataset.voiceId : null;
  }

  /* ---------- 声部 ---------- */
  function renderVoices() {
    var wrap = $('#voice-heads');
    wrap.innerHTML = '';
    project.voices.forEach(function (v, idx) {
      var el = document.createElement('div');
      el.className = 'voice-head';
      el.dataset.voiceId = v.id;
      var timbreName = (content.TIMBRES[v.timbre] || {}).name || v.timbre;
      var muted = v.mute ? ' is-mute' : '';
      var solod = v.solo ? ' is-solo' : '';
      el.innerHTML =
        '<input class="voice-name" value="' + v.name + '" maxlength="8" />' +
        '<span class="voice-meta">' + timbreName + '</span>' +
        '<div class="voice-controls">' +
        '<button class="vbtn vbtn--mute' + muted + '" title="静音">M</button>' +
        '<button class="vbtn vbtn--solo' + solod + '" title="独奏">S</button>' +
        '<input type="range" class="vbtn--vol" min="0" max="1.2" step="0.02" value="' + v.volume + '" title="音量" />' +
        '</div><span class="voice-idx">' + (idx + 1) + '</span>';
      $('.voice-name', el).addEventListener('input', function () { v.name = this.value; state.dirty = true; renderHeader(); });
      $('.vbtn--mute', el).addEventListener('click', function () { v.mute = !v.mute; state.dirty = true; renderVoices(); renderTimeline(); });
      $('.vbtn--solo', el).addEventListener('click', function () { v.solo = !v.solo; state.dirty = true; renderVoices(); renderTimeline(); });
      $('.vbtn--vol', el).addEventListener('input', function () {
        v.volume = parseFloat(this.value);
        audio.setChainParams(v.id, v.volume * project.volume, v.pan);
        state.dirty = true;
      });
      wrap.appendChild(el);
    });
  }

  /* ---------- 时间轴 ---------- */
  function renderTimeline() {
    var tl = $('#timeline');
    tl.innerHTML = '';
    // 标尺
    var ruler = document.createElement('div');
    ruler.className = 'tl-ruler';
    for (var b = 0; b <= project.totalBars; b++) {
      var sp = document.createElement('span');
      sp.className = 'tl-ruler-tick' + (b % 4 === 0 ? ' tl-ruler--beat' : '');
      sp.style.left = (b * timelinePxPerBar()) + 'px';
      if (b % 4 === 0) sp.innerHTML = '<span class="tl-ruler-num">' + (b + 1) + '</span>';
      ruler.appendChild(sp);
    }
    // 循环标记
    var loop = document.createElement('div');
    loop.className = 'tl-loop';
    loop.style.left = (0) + 'px';
    loop.style.width = (project.loopBars * timelinePxPerBar()) + 'px';
    ruler.appendChild(loop);
    tl.appendChild(ruler);

    // 每声部一条 lane
    project.voices.forEach(function (voice) {
      var lane = document.createElement('div');
      lane.className = 'voice-track';
      lane.dataset.voiceId = voice.id;
      // —— 块 ——
      project.blocks.forEach(function (blk) {
        if (blk.voiceId !== voice.id) return;
        var bEl = document.createElement('div');
        bEl.className = 'tl-block' + (blk.type === 'progression' ? ' tl-block--prog' : ' tl-block--motif') + (blk.id === selectedId ? ' is-selected' : '');
        bEl.dataset.blockId = blk.id;
        var x = blk.startBar * timelinePxPerBar();
        var w = blk.bars * timelinePxPerBar();
        bEl.style.left = x + 'px';
        bEl.style.width = Math.max(w, 14) + 'px';
        var refObj = blk.type === 'motif' ? content.motif(blk.ref) : content.progression(blk.ref);
        var nm = refObj ? refObj.name : blk.ref;
        var octText = blk.octave ? (blk.octave > 0 ? '+' + blk.octave : '' + blk.octave) : '';
        var extra = blk.type === 'motif'
          ? (', ×' + (blk.repeat || 1) + (octText ? ' ' + octText : ''))
          : (', ' + ((content.STYLES[blk.style] || {}).name || blk.style) + (octText ? ' ' + octText : ''));
        bEl.innerHTML =
          '<span class="tl-block-name">' + nm + '</span>' +
          '<span class="tl-block-meta">' + blk.bars + '小节' + extra + '</span>' +
          '<span class="tl-block-handle tl-block-handle--l"></span>' +
          '<span class="tl-block-handle tl-block-handle--r"></span>' +
          '<span class="tl-block-tools"><button class="tl-block-del" title="删除">×</button><button class="tl-block-dup" title="复制">⇄</button></span>';
        // 交互
        bEl.addEventListener('mousedown', function (e) { blockMouseDown(e, bEl, blk); });
        bEl.addEventListener('touchstart', function (e) { blockTouchStart(e, bEl, blk); }, { passive: false });
        $('.tl-block-del', bEl).addEventListener('click', function (e) { e.stopPropagation(); deleteBlock(blk.id); });
        $('.tl-block-dup', bEl).addEventListener('click', function (e) { e.stopPropagation(); duplicateBlock(blk.id); });
        lane.appendChild(bEl);
      });
      // —— 空态提示 / lane 点按创建 ——
      var dropRegion = document.createElement('div');
      dropRegion.className = 'voice-drop';
      dropRegion.textContent = project.blocks.some(function (blk) { return blk.voiceId === voice.id; }) ? '' : '拖入动机或和声';
      lane.appendChild(dropRegion);
      // lane 背景点击：取消选中
      lane.addEventListener('pointerdown', function (e) {
        if (e.target === lane || e.target === dropRegion) { selectedId = null; renderInspector(); renderTimeline(); }
      });
      tl.appendChild(lane);
    });
  }

  function renderPlayhead() {
    var bar = isPlaying ? state.playheadBar : transportStop;
    var ph = $('#playhead');
    if (!ph) return;
    ph.style.left = (bar * timelinePxPerBar()) + 'px';
    $('#playhead-bar').textContent = bar.toFixed(1);
  }

  /* ---------- 块交互（Pointer / Touch 统一走 mousedown+touchstart） ---------- */
  function blockMouseDown(e, el, blk) {
    if (e.button !== 0) return;
    // handle 判定
    var t = e.target;
    var handle = t.classList.contains('tl-block-handle--r') ? 'resize-r'
      : t.classList.contains('tl-block-handle--l') ? 'resize-l' : 'move';
    beginDrag(e.clientX, e.clientY, blk, handle, el);
    e.preventDefault();
  }
  function blockTouchStart(e, el, blk) {
    var t = e.target;
    var handle = t.classList.contains('tl-block-handle--r') ? 'resize-r'
      : t.classList.contains('tl-block-handle--l') ? 'resize-l' : 'move';
    var pt = e.touches[0];
    beginDrag(pt.clientX, pt.clientY, blk, handle, el);
    if (e.cancelable) e.preventDefault();
  }
  function beginDrag(x, y, blk, mode, el) {
    DND.active = blk;
    DND.mode = mode;
    DND.grabX = x;
    DND.grabBar = blk.startBar;
    DND.orig = { startBar: blk.startBar, bars: blk.bars };
    DND.el = el;
    window.addEventListener('mousemove', moveDrag);
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchmove', moveDragTouch, { passive: false });
    window.addEventListener('touchend', endDragTouch);
    el.classList.add('is-dragging');
    selectedId = blk.id;
    renderInspector();
  }
  function moveDrag(e) { doDrag(e.clientX, e.clientY); }
  function moveDragTouch(e) { var p = e.touches[0]; doDrag(p.clientX, p.clientY); if (e.cancelable) e.preventDefault(); }
  function endDrag() {
    window.removeEventListener('mousemove', moveDrag);
    window.removeEventListener('mouseup', endDrag);
    window.removeEventListener('touchmove', moveDragTouch);
    window.removeEventListener('touchend', endDragTouch);
    if (DND.el) DND.el.classList.remove('is-dragging');
    if (DND.active) {
      var blk = DND.active;
      if (blk.startBar < 0) blk.startBar = 0;
      if (blk.startBar + blk.bars > project.totalBars) { blk.startBar = project.totalBars - blk.bars; if (blk.startBar < 0) { blk.startBar = 0; blk.bars = project.totalBars; } }
      // snapping
      blk.startBar = Math.round(blk.startBar);
      if (blk.bars < 1) blk.bars = 1;
      blk.bars = Math.round(blk.bars);
      state.dirty = true;
      computePlan();
      renderTimeline();
      renderInspector();
    }
    DND.active = null;
  }
  function endDragTouch(e) { endDrag(); }
  function doDrag(x, y) {
    if (!DND.active) return;
    var blk = DND.active;
    var deltaBar = (x - DND.grabX) / timelinePxPerBar();
    if (DND.mode === 'move') {
      blk.startBar = DND.orig.startBar + deltaBar;
    } else if (DND.mode === 'resize-r') {
      blk.bars = DND.orig.bars + deltaBar;
      if (blk.bars < 1) blk.bars = 1;
    } else if (DND.mode === 'resize-l') {
      var left = DND.orig.startBar + deltaBar;
      var newRight = blk.startBar + blk.bars;
      if (left > newRight) left = newRight;
      blk.startBar = Math.max(0, left);
      blk.bars = (blk.startBar + DND.orig.bars + (DND.orig.startBar - blk.startBar)) - blk.startBar;
    }
    // 渲染（轻量：仅位置）
    if (blk.id === selectedId) renderTimeline();
  }

  /* ---------- HTML5 拖放（从面板拖块到声部 lane） ---------- */
  function setupDropZones() {
    var tl = $('#timeline');
    tl.addEventListener('dragover', function (e) {
      var payload = e.dataTransfer && e.dataTransfer.types.indexOf('text/plain') !== -1;
      if (payload) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }
    });
    tl.addEventListener('drop', function (e) {
      var data = e.dataTransfer && e.dataTransfer.getData('text/plain');
      if (!data || data.indexOf(':') === -1) return;
      var parts = data.split(':');
      var type = parts[0], ref = parts[1];
      if (type !== 'motif' && type !== 'progression') return;
      e.preventDefault();
      var voiceId = pointToVoice(e.clientX, e.clientY);
      if (!voiceId) return;
      var bar = pxToBar(e.clientX);
      addBlock(type, ref, voiceId, Math.max(0, bar));
    });
  }

  function addBlock(type, ref, voiceId, bar) {
    var refObj = type === 'motif' ? content.motif(ref) : content.progression(ref);
    if (!refObj) return;
    var blk = {
      id: uid(), type: type, ref: ref, voiceId: voiceId,
      startBar: bar,
      bars: refObj.bars,
      octave: type === 'progression' ? 0 : 0,
      repeat: 1, density: 1,
      style: type === 'progression' ? 'arp' : undefined
    };
    if (refObj.chromOnly && project.mode !== 'chrom') {
      // 需要自由调式：提示并把项目切到自由
      if (!confirm('该和声进行需要在"自由十二音"调式下使用。是否切换？')) return;
      project.mode = 'chrom';
      state.dirty = true;
    }
    project.blocks.push(blk);
    selectedId = blk.id;
    state.dirty = true;
    computePlan();
    render();
    return blk;
  }

  function deleteBlock(id) {
    project.blocks = project.blocks.filter(function (b) { return b.id !== id; });
    if (selectedId === id) selectedId = null;
    state.dirty = true;
    computePlan();
    render();
  }
  function duplicateBlock(id) {
    var blk = blockById(id);
    if (!blk) return;
    var copy = JSON.parse(JSON.stringify(blk));
    copy.id = uid();
    copy.startBar += copy.bars;
    if (copy.startBar + copy.bars > project.totalBars) copy.startBar = Math.max(0, project.totalBars - copy.bars);
    project.blocks.push(copy);
    selectedId = copy.id;
    state.dirty = true;
    computePlan();
    render();
  }

  /* ---------- Inspector ---------- */
  function renderInspector() {
    var insp = $('#inspector');
    var blk = selectedId ? blockById(selectedId) : null;
    if (!blk) {
      insp.innerHTML = '<p class="insp-empty">选中一个块（点击时间轴上的色块）以编辑。</p>';
      return;
    }
    var refObj = blk.type === 'motif' ? content.motif(blk.ref) : content.progression(blk.ref);
    var name = refObj ? refObj.name : blk.ref;
    var voiceSel = project.voices.map(function (v) { return '<option value="' + v.id + '"' + (v.id === blk.voiceId ? ' selected' : '') + '>' + v.name + '</option>'; }).join('');
    var typeName = blk.type === 'motif' ? '动机' : '和声';

    var html = '<div class="insp-head"><span class="insp-type">' + typeName + '</span><span class="insp-ref">' + (refObj.id || '') + '</span>' +
      '<h3>' + name + '</h3></div>';
    html += '<label class="insp-row">声部 <select class="insp-select" data-f="voiceId">' + voiceSel + '</select></label>';
    html += '<label class="insp-row">起始小节 <input type="number" class="insp-num" data-f="startBar" min="0" max="128" value="' + blk.startBar + '"></label>';
    html += '<label class="insp-row">长度 <input type="number" class="insp-num" data-f="bars" min="1" max="32" value="' + blk.bars + '" step="1"></label>';
    var octMin = blk.type === 'progression' ? -2 : -1, octMax = blk.type === 'progression' ? 1 : 2;
    html += '<label class="insp-row">八度 <input type="number" class="insp-num" data-f="octave" min="' + octMin + '" max="' + octMax + '" value="' + blk.octave + '"></label>';

    if (blk.type === 'motif') {
      html += '<label class="insp-row">重复 <input type="number" class="insp-num" data-f="repeat" min="1" max="8" value="' + (blk.repeat || 1) + '"></label>';
      html += '<label class="insp-row">密度 ' + (blk.density || 1).toFixed(2) +
        ' <input type="range" class="insp-range" data-f="density" min="0.5" max="1.5" step="0.05" value="' + (blk.density || 1) + '"></label>';
    } else {
      var styles = Object.keys(content.STYLES).map(function (k) { return '<option value="' + k + '"' + (blk.style === k ? ' selected' : '') + '>' + content.STYLES[k].name + '</option>'; }).join('');
      html += '<label class="insp-row">织体 <select class="insp-select" data-f="style">' + styles + '</select></label>';
      html += '<label class="insp-row">密度 ' + (blk.density || 1).toFixed(2) +
        ' <input type="range" class="insp-range" data-f="density" min="0.5" max="1.5" step="0.05" value="' + (blk.density || 1) + '"></label>';
    }
    html += '<div class="insp-actions"><button class="btn-insp" data-f="dup">复制</button><button class="btn-insp btn-insp--del" data-f="del">删除</button></div>';
    insp.innerHTML = html;

    $$('select,input[data-f]', insp).forEach(function (inEl) {
      var f = inEl.dataset.f;
      var evt = 'input';
      if (inEl.tagName === 'SELECT') evt = 'change';
      inEl.addEventListener(evt, function () {
        var val;
        if (inEl.tagName === 'SELECT') val = inEl.value;
        else if (inEl.type === 'range') val = parseFloat(inEl.value);
        else val = inEl.type === 'number' ? parseInt(inEl.value, 10) : inEl.value;
        if (isNaN(val)) val = 0;
        if (f === 'voiceId') {
          // 移动到另一声部
          blk.voiceId = val;
        } else {
          blk[f] = val;
        }
        if (f === 'bars' && blk.bars < 1) blk.bars = 1;
        state.dirty = true;
        computePlan();
        renderTimeline();
        renderInspector();
      });
    });
    $$('.btn-insp', insp).forEach(function (b) {
      b.addEventListener('click', function () {
        var act = b.dataset.f;
        if (act === 'del') deleteBlock(blk.id);
        else if (act === 'dup') duplicateBlock(blk.id);
      });
    });
  }

  /* ---------- Transport ---------- */
  function renderTransport() {
    var btn = $('#play-btn');
    btn.textContent = isPlaying ? '⏸ 停止' : '▶ 播放';
    btn.classList.toggle('is-playing', isPlaying);
    $('#bpm-input').value = project.bpm;
    $('#key-select').value = project.key;
    $('#mode-select').value = project.mode;
    $('#reverb-input').value = Math.round(project.reverb * 100);
    $('#vol-input').value = Math.round(project.volume * 100);
    $('#loop-input').value = project.loopBars;
    $('#bars-input').value = project.totalBars;
    var recBtn = $('#rec-btn');
    recBtn.classList.toggle('is-rec', recording);
    recBtn.textContent = recording ? '■ 停止录制' : '● 录制 WAV';
    var rev = $('#reverb-val');
    if (rev) rev.textContent = Math.round(project.reverb * 100);
    var vol = $('#vol-val');
    if (vol) vol.textContent = Math.round(project.volume * 100);
    var mode = theory.MODES[project.mode];
    $('#mode-hint').textContent = project.key + ' ' + mode.name + '调（' + mode.desc + '）';
  }

  /* ---------- 持久化 ---------- */
  var HASH_PREFIX = '#proj=';

  function toHash() {
    var json = localStorage.getItem(HASH_PREFIX) || '';
    return HASH_PREFIX + encodeURIComponent(JSON.stringify(project));
  }
  function updateHash() {
    try {
      var h = HASH_PREFIX + encodeURIComponent(JSON.stringify(project));
      if (history.replaceState) history.replaceState(null, '', h);
      try { localStorage.setItem('gzs-project', JSON.stringify({ t: Date.now(), project: project })); } catch (e) {}
    } catch (e) { /* hash 太长可能超限，忽略 */ }
    state.dirty = false;
  }

  function loadFromHash() {
    try {
      var m = location.hash.match(/proj=([\w\W]+)/);
      if (m) {
        var obj = JSON.parse(decodeURIComponent(m[1]));
        if (obj && obj.blocks && obj.voices) return normalize(obj);
      }
    } catch (e) {}
    try {
      var saved = localStorage.getItem('gzs-project');
      if (saved) {
        var o = JSON.parse(saved).project;
        if (o && o.blocks) return normalize(o);
      }
    } catch (e) {}
    return null;
  }

  function normalize(p) {
    // 深补默认
    var d = defaultProject();
    var out = {
      version: 1, name: p.name || d.name,
      bpm: p.bpm || d.bpm, key: p.key || d.key, mode: p.mode || d.mode,
      beatsPerBar: p.beatsPerBar || d.beatsPerBar,
      totalBars: p.totalBars || d.totalBars, reverb: p.reverb != null ? p.reverb : d.reverb,
      volume: p.volume != null ? p.volume : d.volume, loopBars: p.loopBars || d.loopBars,
      voices: p.voices || d.voices, blocks: p.blocks || []
    };
    out.blocks = out.blocks.map(function (blk) {
      return {
        id: blk.id || uid(), type: blk.type, ref: blk.ref, voiceId: blk.voiceId,
        startBar: blk.startBar || 0, bars: blk.bars || 1, octave: blk.octave || 0,
        repeat: blk.repeat || 1, density: blk.density != null ? blk.density : 1,
        style: blk.style || (blk.type === 'progression' ? 'arp' : undefined)
      };
    });
    return out;
  }

  /* ---------- 导出 ---------- */
  function exportMidi() {
    var evs = expand();
    var bpb = project.beatsPerBar;
    var secPerBeat = 60 / project.bpm;
    var tracks = [];
    project.voices.forEach(function (v) {
      var vev = evs.filter(function (e) { return e.voiceId === v.id; })
        .map(function (e) {
          return { t: ((e.bar % project.loopBars) * bpb + e.t % bpb) / bpb, dur: e.dur, midi: e.midi, vel: e.vel };
        });
      // 统一到 loop 区域
      vev = vev.map(function (e) { return { t: e.t, dur: e.dur, midi: e.midi, vel: e.vel }; });
      // 去重、落回循环起点
      tracks.push({ name: v.name, events: vev });
    });
    // 限制在 loopBars 内
    var bytes = midi.buildMidi({ name: project.name, bpm: project.bpm, beatsPerBar: project.beatsPerBar, totalBars: project.loopBars, tracks: tracks });
    midi.download(bytes, (project.name || 'guzheng') + '.mid');
  }

  /* ---------- 初始化 ---------- */
  function initEngineBindings() {
    // 传输控制
    $('#play-btn').addEventListener('click', function () {
      audio.resume();
      if (isPlaying) stopPlayback();
      else startPlayback(transportStop);
    });
    $('#rec-btn').addEventListener('click', function () {
      var s = audio.getStarted();
      if (!recording) {
        if (!audio.beginRecord()) { alert('浏览器不支持录制'); return; }
        recording = true;
        if (!isPlaying) startPlayback(0);
        renderTransport();
      } else {
        audio.endRecord().then(function (res) {
          recording = false;
          midi.downloadBlob(res, (project.name || 'guzheng') + '-rec');
          renderTransport();
        }).catch(function () { recording = false; renderTransport(); });
      }
    });
    $('#download-midi').addEventListener('click', exportMidi);

    $('#bpm-input').addEventListener('input', function () {
      project.bpm = clamp(parseInt(this.value, 10), 40, 200);
      if (Tone.Transport) Tone.Transport.bpm.value = project.bpm;
      state.dirty = true;
      renderTransport();
    });
    $('#key-select').addEventListener('change', function () { project.key = this.value; state.dirty = true; computePlan(); render(); });
    $('#mode-select').addEventListener('change', function () { project.mode = this.value; state.dirty = true; swapChromaticBlocks(); computePlan(); render(); });
    $('#reverb-input').addEventListener('input', function () {
      project.reverb = clamp(parseInt(this.value, 10) / 100, 0, 0.9);
      audio.setReverb(project.reverb);
      state.dirty = true;
      renderTransport();
    });
    $('#vol-input').addEventListener('input', function () {
      project.volume = clamp(parseInt(this.value, 10) / 100, 0, 1.3);
      audio.setMasterVolume(project.volume);
      state.dirty = true;
      renderTransport();
    });
    $('#loop-input').addEventListener('input', function () {
      var v = parseInt(this.value, 10);
      if (v >= 1) setLoopRegion(v);
    });
    $('#bars-input').addEventListener('input', function () {
      var v = parseInt(this.value, 10);
      if (v >= 4 && v <= 128) { project.totalBars = v; if (project.loopBars > v) project.loopBars = v; state.dirty = true; render(); }
    });
    $('#title-input').addEventListener('input', function () { project.name = this.value || '我的古筝小品'; state.dirty = true; });

    // 新建 / 载入演示
    $('#btn-new').addEventListener('click', function () {
      if (!confirm('清空当前工程？')) return;
      project = defaultProject(); selectedId = null; state.dirty = true; computePlan(); render(); updateHash();
    });
    $('#btn-demo').addEventListener('click', function () {
      loadDemo();
    });

    // 播放头拖拽
    var phArea = $('#playhead'); // 占位

    // 键盘：空格 播放/停
    document.addEventListener('keydown', function (e) {
      if (e.code === 'Space' && !e.target.matches('input,textarea,select')) {
        e.preventDefault();
        $('#play-btn') && $('#play-btn').click();
      }
    });

    // 区块拖放
    setupDropZones();

    // 全局 mousemove 记录

    // 快捷键：选中块删除
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !e.target.matches('input,textarea,select')) {
        e.preventDefault();
        deleteBlock(selectedId);
      }
    });

    $fn.onPlayhead = function (bar) { renderPlayhead(); };

    // 首次进入遮罩：点击解锁音频
    var gate = $('#gate'), gateBtn = $('#gate-btn');
    if (gate) gate.setAttribute('aria-hidden', 'false');
    if (gateBtn) {
      gateBtn.addEventListener('click', function () {
        audio.ensureContext();
        audio.resume();
        audio.setReverb(project.reverb);
        audio.setMasterVolume(project.volume);
        if (gate) gate.setAttribute('aria-hidden', 'true');
        $('.gz-help') && state.dirty;
      });
    }
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /** 非阻塞提示条 */
  function toast(msg, ms) {
    var t = document.createElement('div');
    t.className = 'gz-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('is-out'); }, (ms || 2400));
    setTimeout(function () { t.remove(); }, (ms || 2400) + 400);
  }

  /** 切调式时：清掉 chromOnly 和声，避免不和谐 */
  function swapChromaticBlocks() {
    if (project.mode === 'chrom') return;
    var removed = [];
    project.blocks = project.blocks.filter(function (b) {
      if (b.type === 'progression') {
        var p = content.progression(b.ref);
        if (p && p.chromOnly) { removed.push(p.name); return false; }
      }
      return true;
    });
    if (removed.length) toast('已移除只适用于自由十二音的和声：' + removed.join('、'));
  }

  function loadDemo() {
    if (!confirm('载入内置演示曲《秋山行》并替换当前工程？')) return;
    project = {
      version: 1, name: '秋山行', bpm: 72, key: 'D', mode: 'yu', beatsPerBar: 4, totalBars: 16,
      reverb: 0.32, volume: 0.82, loopBars: 16,
      voices: [
        { id: 'v0', name: '主旋律', timbre: 'sample', volume: 0.92, pan: 0, mute: false, solo: false },
        { id: 'v1', name: '和声', timbre: 'sample', volume: 0.7, pan: -0.2, mute: false, solo: false },
        { id: 'v2', name: '低音', timbre: 'sample', volume: 0.82, pan: 0.15, mute: false, solo: false },
        { id: 'v3', name: '装饰', timbre: 'pluck', volume: 0.58, pan: 0.24, mute: false, solo: false }
      ],
      blocks: [
        { id: uid(), type: 'motif', ref: 'call-resp', voiceId: 'v0', startBar: 0, bars: 2, octave: 0, repeat: 2, density: 1 },
        { id: uid(), type: 'motif', ref: 'arp-out', voiceId: 'v0', startBar: 8, bars: 1, octave: 1, repeat: 2, density: 1 },
        { id: uid(), type: 'motif', ref: 'run-down', voiceId: 'v0', startBar: 12, bars: 1, octave: 1, repeat: 2, density: 1 },
        { id: uid(), type: 'progression', ref: 'yu-valley', voiceId: 'v1', startBar: 0, bars: 4, octave: 0, style: 'arp', density: 1 },
        { id: uid(), type: 'progression', ref: 'yu-valley', voiceId: 'v2', startBar: 0, bars: 4, octave: -1, style: 'bass', density: 1 },
        { id: uid(), type: 'progression', ref: 'zhi-circle', voiceId: 'v1', startBar: 8, bars: 4, octave: 0, style: 'block', density: 1 },
        { id: uid(), type: 'progression', ref: 'zhi-circle', voiceId: 'v2', startBar: 8, bars: 4, octave: -1, style: 'bassarp', density: 1 },
        { id: uid(), type: 'progression', ref: 'night-cycle', voiceId: 'v1', startBar: 12, bars: 4, octave: 0, style: 'arp', density: 1 },
        { id: uid(), type: 'progression', ref: 'night-cycle', voiceId: 'v2', startBar: 12, bars: 4, octave: -1, style: 'bass', density: 1 },
        { id: uid(), type: 'motif', ref: 'grace-orn', voiceId: 'v3', startBar: 6, bars: 2, octave: 1, repeat: 1, density: 0.8 },
        { id: uid(), type: 'motif', ref: 'gliss-up', voiceId: 'v3', startBar: 14, bars: 1, octave: 1, repeat: 1, density: 1 }
      ]
    };
    selectedId = null; state.dirty = true; computePlan(); render(); updateHash();
  }

  // computePlan 已由 buildToneSchedule（每次播放时构建）取代；
  // 保留此名作为"内容已变更，下次播放需重建调度"的信号。
  function computePlan() { state.dirty = true; }

  /* ================= 启动 ================= */
  function boot() {
    var loaded = loadFromHash();
    project = loaded || defaultProject();
    initEngineBindings();
    render();
    audio.onChange(function () { renderTransport(); });
  }

  document.addEventListener('DOMContentLoaded', boot);
  // 暴露给测试
  G.app = {
    project: function () { return project; },
    expand: expand, computePlan: computePlan,
    startPlayback: startPlayback, stopPlayback: stopPlayback,
    addBlock: addBlock, deleteBlock: deleteBlock, duplicateBlock: duplicateBlock,
    getState: function () { return state; },
    loadDemo: loadDemo,
    _theory: theory, _content: content
  };
})(window.GZS = window.GZS || {});