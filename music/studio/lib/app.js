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

  var theory = G.theory, content = G.content, audio = G.audio, midi = G.midi, engine = G.engine;
  var Tone = window.Tone;

  var KEY_MIDI = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

  /* ================= 默认工程 ================= */
  function defaultProject() {
    return {
      version: 1,
      name: '我的古筝小品',
      bpm: 76, key: 'D', mode: 'gong', beatsPerBar: 4, totalBars: 32,
      reverb: 0.28, volume: 0.8, loopBars: 32,
      voices: [
        { id: 'v0', name: '主旋律', timbre: 'sample', volume: 0.9, pan: 0, mute: false, solo: false, sustain: 'ring' },
        { id: 'v1', name: '和声', timbre: 'sample', volume: 0.72, pan: -0.18, mute: false, solo: false, sustain: 'mid' },
        { id: 'v2', name: '低音', timbre: 'sample', volume: 0.8, pan: 0.16, mute: false, solo: false, sustain: 'ring' },
        { id: 'v3', name: '装饰', timbre: 'pluck', volume: 0.6, pan: 0.22, mute: false, solo: false, sustain: 'short' }
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

  /* ================= 事件展开（逻辑在 engine.js，便于纯逻辑测试） ================= */
  function expand(proj) { return engine.expand(proj || project); }

  function voiceOf(proj, id) { return engine.voiceOf(proj, id); }
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
    if (!engine.isAudible(project, e.voiceId)) return;
    var vg = voice.volume * project.volume;
    var durSec = Math.max(0.12, (e.dur || e.durBeat || 1) * (60 / project.bpm));
    var ring = voice.sustain === 'short' ? 0.55 : (voice.sustain === 'ring' ? 1.9 : 1);
    audio.trigger(voice.id, vg, voice.pan,
      { timbre: voice.timbre, ring: ring }, e.midi, when, e.vel, durSec);
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
    var notes = engine.notesForLoop(project);
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
    // 补调度当前部分循环（startSec → loopEnd）的事件，Tone.Loop 覆盖后续循环
    prepatchPartialLoop(startSec);
    render();
    startTicker();
  }

  /** 启动后立即注册 [startSec, loopEnd) 内事件（否则 seek/中途启动要等循环边界才响） */
  function prepatchPartialLoop(startSec) {
    var notes = engine.notesForLoop(project);
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.sec >= startSec) scheduleTrigger(n, n.sec);
    }
  }

  /** 跳转播放头（点击/拖拽 ruler 触发） */
  function seekToBar(bar) {
    bar = clamp(bar, 0, Math.max(0, project.totalBars - 0.25));
    var bpb = project.beatsPerBar, spb = 60 / project.bpm;
    var sec = bar * bpb * spb;
    if (isPlaying) {
      if (Tone.Transport.state === 'started') Tone.Transport.stop();
      Tone.Transport.bpm.value = project.bpm;
      Tone.Transport.loop = true;
      Tone.Transport.loopStart = 0;
      Tone.Transport.loopEnd = project.loopBars * bpb * spb;
      Tone.Transport.position = [0, 0, 0];
      Tone.Transport.start(undefined, sec);
      prepatchPartialLoop(sec);
    }
    transportStop = bar;
    state.playheadBar = bar;
    renderPlayhead();
    renderTransport();
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
    syncPreviewButtons();
  }

  function mkCard(item, type) {
    var div = document.createElement('div');
    div.className = 'pal-card ' + (type === 'progression' ? 'pal-card--prog' : 'pal-card--motif');
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
    // 试听：第一次播放，第二次停止
    $('.pal-card-preview', div).addEventListener('click', function (ev) {
      ev.stopPropagation();
      togglePreview(item, type);
    });
    return div;
  }

  var previewState = { ref: null, type: null, card: null };

  function syncPreviewButtons() {
    var cards = $$('.pal-card');
    for (var i = 0; i < cards.length; i++) {
      var btn = $('.pal-card-preview', cards[i]);
      if (!btn) continue;
      var active = previewState.card === cards[i];
      btn.textContent = active ? '■ 停止' : '▶ 试听';
      btn.classList.toggle('is-previewing', active);
    }
  }

  function togglePreview(item, type) {
    // 同一素材正在试听 → 停止
    if (previewState.ref === item.id && previewState.type === type) {
      audio.stopPreview();
      previewState = { ref: null, type: null, card: null };
      syncPreviewButtons();
      return;
    }
    // 其它素材/新试听 → 先停旧（audio.preview 内部也会停），再播
    previewItem(item, type);
    previewState = { ref: item.id, type: type, card: previewState.card };
    syncPreviewButtons();
    // 找到卡片（palette 重建过时，ref 定位）
    var cards = $$('.pal-card');
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].dataset.ref === item.id && cards[i].dataset.type === type) {
        previewState.card = cards[i];
      }
    }
    syncPreviewButtons();
  }

  function previewItem(item, type) {
    var tonic = (KEY_MIDI[project.key] != null ? KEY_MIDI[project.key] : 0) + 60;
    var mode = project.mode;
    if (type === 'motif') {
      var evs = content.motifEvents(item, 1, 1);
      var notes = evs.map(function (ev) {
        return { t: Math.max(0, ev.t), midi: theory.degreeToMidi(mode, tonic, ev.d), vel: ev.vel, dur: ev.dur };
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
    return Math.max(40, w / project.totalBars);   // 保证块内文字可读，过窄则横向滚动
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
    if (!project.voices.length) {
      // 空状态：自动补一条
      addVoice();
    }
    project.voices.forEach(function (v, idx) {
      var el = document.createElement('div');
      el.className = 'voice-head';
      el.dataset.voiceId = v.id;
      var muted = v.mute ? ' is-mute' : '';
      var solod = v.solo ? ' is-solo' : '';
      var timbreOpts = Object.keys(content.TIMBRES).map(function (k) {
        var t = content.TIMBRES[k];
        return '<option value="' + k + '"' + (v.timbre === k ? ' selected' : '') + '>' + t.name + '</option>';
      }).join('');
      var sustainOpts = [
        { id: 'short', name: '短' }, { id: 'mid', name: '中' }, { id: 'ring', name: '延' }
      ].map(function (s) {
        return '<option value="' + s.id + '"' + ((v.sustain || 'mid') === s.id ? ' selected' : '') + '>' + s.name + '</option>';
      }).join('');
      el.innerHTML =
        '<div class="voice-head-top">' +
        '<input class="voice-name" value="' + v.name + '" maxlength="8" />' +
        '<span class="voice-idx">' + (idx + 1) + '</span>' +
        (project.voices.length > 1 ? '<button class="vbtn vbtn--del" title="删除声部">✕</button>' : '') +
        '</div>' +
        '<div class="voice-selects">' +
        '<select class="voice-timbre" title="音色">' + timbreOpts + '</select>' +
        '<select class="voice-sustain" title="延音">' + sustainOpts + '</select>' +
        '</div>' +
        '<div class="voice-controls">' +
        '<button class="vbtn vbtn--mute' + muted + '" title="静音">M</button>' +
        '<button class="vbtn vbtn--solo' + solod + '" title="独奏">S</button>' +
        '<input type="range" class="vbtn--vol" min="0" max="1.2" step="0.02" value="' + v.volume + '" title="音量" />' +
        '</div>';
      $('.voice-name', el).addEventListener('input', function () { v.name = this.value; state.dirty = true; renderHeader(); });
      $('.vbtn--mute', el).addEventListener('click', function () { v.mute = !v.mute; state.dirty = true; renderVoices(); });
      $('.vbtn--solo', el).addEventListener('click', function () { v.solo = !v.solo; state.dirty = true; renderVoices(); });
      $('.vbtn--del', el).addEventListener('click', function () { removeVoice(v.id); });
      $('.vbtn--vol', el).addEventListener('input', function () {
        v.volume = parseFloat(this.value);
        audio.setChainParams(v.id, v.volume * project.volume, v.pan);
        state.dirty = true;
      });
      $('.voice-timbre', el).addEventListener('change', function () {
        v.timbre = this.value;
        state.dirty = true;
        renderVoices();
      });
      $('.voice-sustain', el).addEventListener('change', function () {
        v.sustain = this.value;
        state.dirty = true;
      });
      wrap.appendChild(el);
    });
    var plus = document.createElement('div');
    plus.className = 'voice-add-row';
    plus.innerHTML = '<button id="voice-add-btn" class="vbtn vbtn--add">＋ 声部</button>';
    plus.querySelector('#voice-add-btn').addEventListener('click', function () { addVoice(); });
    wrap.appendChild(plus);
  }

  function addVoice() {
    var id = 'v' + (project.voices.length);
    while (engine.voiceOf(project, id)) id = 'v' + (Math.random() * 1000 | 0);
    project.voices.push({
      id: id, name: '声部' + (project.voices.length + 1),
      timbre: 'sample', volume: 0.75, pan: 0, mute: false, solo: false, sustain: 'mid'
    });
    state.dirty = true;
    render();
  }

  function removeVoice(id) {
    var proxy = project.voices.find(function (v) { return v.id !== id; });
    // 把该声部上的块移到代理声部
    project.blocks.forEach(function (b) { if (b.voiceId === id && proxy) b.voiceId = proxy.id; });
    project.voices = project.voices.filter(function (v) { return v.id !== id; });
    state.dirty = true;
    render();
  }

  /* ---------- 时间轴 ---------- */
  function renderTimeline() {
    var tl = $('#timeline');
    tl.innerHTML = '';
    // 播放头（先重建，避免被清空）
    var ph = document.createElement('div');
    ph.id = 'playhead';
    ph.className = 'gz-playhead';
    ph.setAttribute('aria-hidden', 'true');
    tl.appendChild(ph);
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

    // ruler seek 交互（点击/拖拽进度条）
    var seekStrip = document.createElement('div');
    seekStrip.className = 'tl-seek';
    seekStrip.style.left = '0px';
    seekStrip.style.width = (project.totalBars * timelinePxPerBar()) + 'px';
    ruler.appendChild(seekStrip);
    bindSeekStrip(seekStrip);

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
        if (Math.max(w, 14) < 96) bEl.classList.add('tl-block--narrow');
        var outOfWindow = blk.startBar >= project.loopBars;
        if (outOfWindow) bEl.classList.add('tl-block--muted');
        var refObj = blk.type === 'motif' ? content.motif(blk.ref) : content.progression(blk.ref);
        var nm = refObj ? refObj.name : blk.ref;
        var octText = blk.octave ? (blk.octave > 0 ? '+' + blk.octave : '' + blk.octave) : '';
        var trText = blk.transpose ? (blk.transpose > 0 ? '+' + blk.transpose : '' + blk.transpose) + '级' : '';
        var extra = blk.type === 'motif'
          ? (octText ? ' ' + octText : '') + (trText ? ' ' + trText : '')
          : (', ' + ((content.STYLES[blk.style] || {}).name || blk.style) + (octText ? ' ' + octText : '') + (trText ? ' ' + trText : ''));
        bEl.title = nm + ' · ' + blk.bars + ' 小节' + ((blk.startBar >= project.loopBars) ? '（超出播放窗口，静音）' : '');
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

  /* ---------- ruler seek：点击/拖拽进度条 ---------- */
  var seekDrag = null;
  function bindSeekStrip(strip) {
    strip.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      seekToBar(pxToBar(e.clientX));
      seekDrag = { pointerId: e.pointerId };
      try { strip.setPointerCapture(e.pointerId); } catch (err) {}
    });
    strip.addEventListener('pointermove', function (e) {
      if (!seekDrag || e.pointerId !== seekDrag.pointerId) return;
      seekToBar(pxToBar(e.clientX));
    });
    function done(e) {
      if (seekDrag && e.pointerId === seekDrag.pointerId) {
        seekToBar(pxToBar(e.clientX));
        seekDrag = null;
      }
    }
    strip.addEventListener('pointerup', done);
    strip.addEventListener('pointercancel', function () { seekDrag = null; });
  }

  /* ---------- 素材卡 pointer 拖拽（鼠标 + 触摸通用） ---------- */
  // 事件代理：palette 容器上监听 pointerdown，卡片本身 不设 draggable
  var palDrag = null; // {type, ref, card, ghost, moved, pointerId, lastX, lastY, startX, startY}
  function initPaletteDrag() {
    var tl = $('#timeline');
    var palette = $('#motif-palette').parentElement;

    [tl, palette].forEach(function (root) {
      root.addEventListener('pointerdown', function (e) {
        var card = e.target.closest ? e.target.closest('.pal-card') : null;
        if (!card) return;
        // 不拦截试听按钮
        if (e.target.closest('.pal-card-preview')) return;
        e.preventDefault();
        var type = card.dataset.type, ref = card.dataset.ref;
        if (type !== 'motif' && type !== 'progression') return;
        palDrag = {
          type: type, ref: ref, card: card, pointerId: e.pointerId,
          startX: e.clientX, startY: e.clientY, moved: false, ghost: null
        };
        try { card.setPointerCapture(e.pointerId); } catch (err) {}
      });
    });

    // 全局移动/抬起
    document.addEventListener('pointermove', function (e) {
      if (!palDrag || e.pointerId !== palDrag.pointerId) return;
      var dx = e.clientX - palDrag.startX, dy = e.clientY - palDrag.startY;
      if (!palDrag.moved && Math.abs(dx) + Math.abs(dy) < 8) return;
      palDrag.moved = true;
      if (!palDrag.ghost) {
        palDrag.ghost = document.createElement('div');
        palDrag.ghost.className = 'pal-ghost ' + (palDrag.type === 'progression' ? 'pal-ghost--prog' : 'pal-ghost--motif');
        palDrag.ghost.textContent = palDrag.card.querySelector('.pal-card-name').textContent;
        document.body.appendChild(palDrag.ghost);
        palDrag.card.classList.add('is-dragging');
      }
      palDrag.ghost.style.left = (e.clientX + 10) + 'px';
      palDrag.ghost.style.top = (e.clientY + 12) + 'px';
      // 高亮悬停 lane
      var el = document.elementFromPoint(e.clientX, e.clientY);
      var track = el && el.closest ? el.closest('.voice-track') : null;
      var lanes = $$('.voice-track');
      for (var i = 0; i < lanes.length; i++) lanes[i].classList.toggle('is-hover', lanes[i] === track);
    });

    document.addEventListener('pointerup', function (e) {
      if (!palDrag || e.pointerId !== palDrag.pointerId) return;
      if (palDrag.moved) {
        var el = document.elementFromPoint(e.clientX, e.clientY);
        var track = el && el.closest ? el.closest('.voice-track') : null;
        if (track) {
          var voiceId = track.dataset.voiceId;
          var bar = pxToBar(e.clientX);
          addBlock(palDrag.type, palDrag.ref, voiceId, Math.max(0, Math.min(bar, project.totalBars - 1)));
        } else {
          toast('拖到某一声部轨道上放置');
        }
      }
      if (palDrag.ghost) { palDrag.ghost.remove(); palDrag.card.classList.remove('is-dragging'); }
      var lanes = $$('.voice-track');
      for (var j = 0; j < lanes.length; j++) lanes[j].classList.remove('is-hover');
      palDrag = null;
    });

    // 触摸：pointercancel 兜底
    document.addEventListener('pointercancel', function () {
      if (palDrag && palDrag.ghost) { palDrag.ghost.remove(); palDrag.card.classList.remove('is-dragging'); }
      palDrag = null;
    });
  }

  function addBlock(type, ref, voiceId, bar) {
    var refObj = type === 'motif' ? content.motif(ref) : content.progression(ref);
    if (!refObj) return;
    var blk = {
      id: uid(), type: type, ref: ref, voiceId: voiceId,
      startBar: bar,
      bars: refObj.bars,
      octave: 0, transpose: 0,
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
    html += '<label class="insp-row">长度 <input type="number" class="insp-num" data-f="bars" min="1" max="32" value="' + blk.bars + '" step="1">小节</label>';
    var octMin = blk.type === 'progression' ? -2 : -1, octMax = blk.type === 'progression' ? 1 : 2;
    html += '<label class="insp-row">八度 <input type="number" class="insp-num" data-f="octave" min="' + octMin + '" max="' + octMax + '" value="' + blk.octave + '"></label>';
    html += '<label class="insp-row">移调 <input type="number" class="insp-num" data-f="transpose" min="-4" max="4" step="1" value="' + (blk.transpose || 0) + '">音级</label>';

    if (blk.type === 'motif') {
      html += '<p class="insp-hint">长度 = 动机原始长度 × 重复次数（改长度即改重复）。</p>';
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
    var meterSel = $('#meter-select');
    if (meterSel) meterSel.value = String(project.beatsPerBar || 4);
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
      voices: (p.voices || []).map(function (v) {
        return {
          id: v.id, name: v.name || '声部',
          timbre: content.TIMBRES[v.timbre] ? v.timbre : 'sample',
          volume: v.volume != null ? v.volume : 0.75, pan: v.pan != null ? v.pan : 0,
          mute: !!v.mute, solo: !!v.solo,
          sustain: v.sustain || 'mid'
        };
      }),
      blocks: p.blocks || []
    };
    out.blocks = out.blocks.map(function (blk) {
      return {
        id: blk.id || uid(), type: blk.type, ref: blk.ref, voiceId: blk.voiceId,
        startBar: blk.startBar || 0, bars: blk.bars || 1, octave: blk.octave || 0,
        transpose: blk.transpose || 0,
        repeat: blk.repeat || 1, density: blk.density != null ? blk.density : 1,
        style: blk.style || (blk.type === 'progression' ? 'arp' : undefined)
      };
    });
    if (!out.voices.length) out.voices = d.voices.map(function () { return null; }).filter(Boolean);
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
      updateHash();
      renderTransport();
    });
    // 调式/主音/拍号：播放中实时重建调度
    function rebuildOnPlay() { if (isPlaying) buildToneSchedule(); }
    $('#key-select').addEventListener('change', function () { project.key = this.value; state.dirty = true; computePlan(); rebuildOnPlay(); updateHash(); render(); });
    $('#mode-select').addEventListener('change', function () { project.mode = this.value; state.dirty = true; swapChromaticBlocks(); computePlan(); rebuildOnPlay(); updateHash(); render(); });
    var meterSel = $('#meter-select');
    if (meterSel) meterSel.addEventListener('change', function () {
      project.beatsPerBar = parseInt(this.value, 10) === 3 ? 3 : 4;
      state.dirty = true; computePlan(); rebuildOnPlay(); updateHash(); render();
    });
    $('#reverb-input').addEventListener('input', function () {
      project.reverb = clamp(parseInt(this.value, 10) / 100, 0, 0.9);
      audio.setReverb(project.reverb);
      state.dirty = true;
      updateHash();
      renderTransport();
    });
    $('#vol-input').addEventListener('input', function () {
      project.volume = clamp(parseInt(this.value, 10) / 100, 0, 1.3);
      audio.setMasterVolume(project.volume);
      state.dirty = true;
      updateHash();
      renderTransport();
    });
    $('#loop-input').addEventListener('input', function () {
      var v = parseInt(this.value, 10);
      if (v >= 1) setLoopRegion(v);
    });
    $('#bars-input').addEventListener('input', function () {
      var v = parseInt(this.value, 10);
      if (v >= 4 && v <= 128) { project.totalBars = v; if (project.loopBars > v) project.loopBars = v; state.dirty = true; updateHash(); render(); }
    });
    $('#title-input').addEventListener('input', function () { project.name = this.value || '我的古筝小品'; state.dirty = true; updateHash(); });

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

    // 素材卡拖拽（pointer 统一）
    initPaletteDrag();

    // 试听自动结束后复位按钮态
    setInterval(function () {
      if (previewState.ref && !audio.isPreviewing()) {
        previewState = { ref: null, type: null, card: null };
        syncPreviewButtons();
      }
    }, 350);

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
    render: function () { render(); },
    _notes: function () { return engine.notesForLoop(project); },
    _fireNote: function (n, when) { fireEventAt(n, when); },
    _buildSchedule: function () { return buildToneSchedule(); },
    _schedulerRunning: function () { return !!toneScheduled; },
    seekToBar: seekToBar,
    _transportStop: function () { return transportStop; },
    _pxPerBar: function () { return timelinePxPerBar(); },
    _theory: theory, _content: content, _engine: engine
  };
})(window.GZS = window.GZS || {});