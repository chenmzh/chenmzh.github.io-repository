(function attachCloudArcadeMusic(root, factory) {
  "use strict";

  const api = factory(root);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.CloudArcadeMusic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createCloudArcadeMusicApi(root) {
  "use strict";

  const TRACKS = Object.freeze({
    platformer: Object.freeze({
      bpm: 132,
      leadType: "square",
      bassType: "triangle",
      melody: Object.freeze([72, 76, 79, 84, 79, 76, 74, 77, 81, 86, 81, 77, 76, 79, 83, 88]),
      bass: Object.freeze([48, 48, 53, 53, 50, 50, 55, 55]),
    }),
    tetris: Object.freeze({
      bpm: 106,
      leadType: "triangle",
      bassType: "square",
      melody: Object.freeze([69, 72, 76, 72, 67, 71, 74, 79, 65, 69, 72, 76, 64, 67, 71, 74]),
      bass: Object.freeze([45, 52, 43, 50, 41, 48, 40, 47]),
    }),
    shooter: Object.freeze({
      bpm: 154,
      leadType: "sawtooth",
      bassType: "square",
      melody: Object.freeze([76, 79, 83, 88, 86, 83, 79, 74, 78, 81, 85, 90, 88, 85, 81, 76]),
      bass: Object.freeze([40, 40, 43, 43, 38, 38, 45, 47]),
    }),
  });

  function midiToFrequency(note) {
    if (!Number.isFinite(note)) throw new Error("音符编号必须是有限数值");
    return 440 * (2 ** ((note - 69) / 12));
  }

  function createPlayer(options = {}) {
    const setTimer = options.setTimer || root?.setTimeout?.bind(root) || setTimeout;
    const clearTimer = options.clearTimer || root?.clearTimeout?.bind(root) || clearTimeout;
    const getContext = options.getContext || (() => {
      const AudioContextClass = root?.AudioContext || root?.webkitAudioContext;
      if (!AudioContextClass) throw new Error("当前浏览器不支持 Web Audio 配乐");
      return new AudioContextClass();
    });

    let context = null;
    let masterGain = null;
    let loopTimer = null;
    let currentTrack = null;
    let generation = 0;
    const voices = new Set();

    function scheduleVoice(note, startAt, duration, type, volume) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const stopAt = startAt + duration;
      oscillator.type = type;
      if (typeof oscillator.frequency.setValueAtTime === "function") {
        oscillator.frequency.setValueAtTime(midiToFrequency(note), startAt);
      } else {
        oscillator.frequency.value = midiToFrequency(note);
      }
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.linearRampToValueAtTime(volume, startAt + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
      oscillator.connect(gain);
      gain.connect(masterGain);
      const voice = { oscillator, gain };
      voices.add(voice);
      oscillator.onended = () => {
        voices.delete(voice);
        gain.disconnect();
      };
      oscillator.start(startAt);
      oscillator.stop(stopAt + 0.02);
    }

    function scheduleLoop(trackName, token) {
      if (token !== generation || currentTrack !== trackName || !masterGain) return;
      const track = TRACKS[trackName];
      const beatSeconds = 60 / track.bpm;
      const stepSeconds = beatSeconds / 2;
      const startsAt = context.currentTime + 0.045;
      track.melody.forEach((note, index) => {
        scheduleVoice(note, startsAt + index * stepSeconds, stepSeconds * 0.78, track.leadType, 0.105);
      });
      track.bass.forEach((note, index) => {
        scheduleVoice(note, startsAt + index * beatSeconds, beatSeconds * 0.82, track.bassType, 0.075);
      });
      const loopDurationMs = track.melody.length * stepSeconds * 1_000;
      loopTimer = setTimer(() => scheduleLoop(trackName, token), Math.max(50, loopDurationMs - 90));
    }

    function stop() {
      generation += 1;
      if (loopTimer !== null) clearTimer(loopTimer);
      loopTimer = null;
      currentTrack = null;
      const stopAt = context?.currentTime || 0;
      for (const voice of voices) {
        try { voice.oscillator.stop(stopAt); } catch (_error) { /* voice already ended */ }
        try { voice.gain.disconnect(); } catch (_error) { /* gain already disconnected */ }
      }
      voices.clear();
      if (masterGain) {
        try { masterGain.disconnect(); } catch (_error) { /* master already disconnected */ }
      }
      masterGain = null;
    }

    function start(trackName) {
      if (!TRACKS[trackName]) throw new Error(`街机配乐 ${trackName} 不存在`);
      stop();
      context = getContext();
      if (!context || typeof context.createOscillator !== "function" || typeof context.createGain !== "function") {
        throw new Error("Web Audio 上下文不可用");
      }
      if (context.state === "suspended" && typeof context.resume === "function") {
        context.resume().catch((error) => console.warn("配乐音频上下文无法恢复：", error));
      }
      masterGain = context.createGain();
      masterGain.gain.setValueAtTime(0.052, context.currentTime);
      masterGain.connect(context.destination);
      currentTrack = trackName;
      const token = generation;
      scheduleLoop(trackName, token);
    }

    return Object.freeze({
      start,
      stop,
      isPlaying: () => currentTrack !== null,
      getCurrentTrack: () => currentTrack,
    });
  }

  return Object.freeze({ TRACKS, midiToFrequency, createPlayer });
});
