import { ref, shallowRef, readonly } from "vue";

const NOTE = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99,
};

// Cada faixa é uma progressão de passos. Um passo pode ser uma nota (number)
// ou um acorde (array de notas). `type` define o timbre do oscilador.
const TRACKS = [
  {
    name: "Ambient Pad",
    type: "triangle",
    bpm: 70,
    steps: [
      [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5],
      [NOTE.A3, NOTE.C4, NOTE.E4, NOTE.A4],
      [NOTE.F3, NOTE.A3, NOTE.C4, NOTE.F4],
      [NOTE.G3, NOTE.B3, NOTE.D4, NOTE.G4],
    ],
    duration: 1.6,
    attack: 0.4,
    release: 1.2,
  },
  {
    name: "Arpeggio Pulse",
    type: "sine",
    bpm: 120,
    steps: [
      NOTE.C5, NOTE.E4, NOTE.G4, NOTE.C5,
      NOTE.A4, NOTE.E4, NOTE.A4, NOTE.C5,
      NOTE.F4, NOTE.A4, NOTE.C5, NOTE.F4,
      NOTE.G4, NOTE.B4, NOTE.D5, NOTE.G5,
    ],
    duration: 0.25,
    attack: 0.01,
    release: 0.18,
  },
  {
    name: "Bass Groove",
    type: "triangle",
    bpm: 96,
    steps: [
      NOTE.C3, NOTE.C3, NOTE.G3, NOTE.C3,
      NOTE.A3, NOTE.A3, NOTE.E3, NOTE.A3,
      NOTE.F3, NOTE.F3, NOTE.C4, NOTE.F3,
      NOTE.G3, NOTE.G3, NOTE.D4, NOTE.G3,
    ],
    duration: 0.35,
    attack: 0.02,
    release: 0.25,
  },
];

const FFT_SIZE = 256;

export function useSynth() {
  const isPlaying = ref(false);
  const isMuted = ref(false);
  const volume = ref(0.7);
  const currentTrack = ref(0);
  const tracks = TRACKS.map((t) => ({ name: t.name }));

  const ctx = shallowRef(null);
  const master = shallowRef(null);
  const analyser = shallowRef(null);
  const fileSource = shallowRef(null);

  let schedulerId = null;
  let nextStepTime = 0;
  let stepIndex = 0;
  let activeVoices = new Set();

  function ensureContext() {
    if (ctx.value) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    const audio = new AC();
    const gain = audio.createGain();
    gain.gain.value = isMuted.value ? 0 : volume.value;
    const an = audio.createAnalyser();
    an.fftSize = FFT_SIZE;
    an.smoothingTimeConstant = 0.78;
    gain.connect(an);
    an.connect(audio.destination);
    ctx.value = audio;
    master.value = gain;
    analyser.value = an;
  }

  function playNote(freq, when, dur, type, attack, release) {
    const audio = ctx.value;
    const osc = audio.createOscillator();
    const env = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(0.9, when + attack);
    const end = when + dur;
    env.gain.setValueAtTime(0.9, Math.max(when + attack, end - release));
    env.gain.linearRampToValueAtTime(0, end + release);
    osc.connect(env);
    env.connect(master.value);
    osc.start(when);
    const stopAt = end + release + 0.05;
    osc.stop(stopAt);
    activeVoices.add(osc);
    osc.onended = () => activeVoices.delete(osc);
  }

  function scheduleStep() {
    const audio = ctx.value;
    const track = TRACKS[currentTrack.value];
    const stepDur = track.duration;
    while (nextStepTime < audio.currentTime + 0.12) {
      const step = track.steps[stepIndex % track.steps.length];
      if (Array.isArray(step)) {
        for (const f of step) playNote(f, nextStepTime, stepDur, track.type, track.attack, track.release);
      } else {
        playNote(step, nextStepTime, stepDur, track.type, track.attack, track.release);
      }
      nextStepTime += stepDur;
      stepIndex++;
    }
  }

  function startScheduler() {
    nextStepTime = ctx.value.currentTime + 0.05;
    stepIndex = 0;
    schedulerId = window.setInterval(scheduleStep, 25);
  }

  function stopScheduler() {
    if (schedulerId !== null) {
      clearInterval(schedulerId);
      schedulerId = null;
    }
    for (const osc of activeVoices) {
      try { osc.stop(); } catch (e) { /* already stopped */ }
    }
    activeVoices.clear();
  }

  async function play() {
    ensureContext();
    if (ctx.value.state === "suspended") await ctx.value.resume();
    if (fileSource.value) {
      fileSource.value.start();
      isPlaying.value = true;
      return;
    }
    startScheduler();
    isPlaying.value = true;
  }

  function pause() {
    if (schedulerId !== null) stopScheduler();
    if (fileSource.value) {
      try { fileSource.value.stop(); } catch (e) { /* noop */ }
      fileSource.value = null;
    }
    isPlaying.value = false;
  }

  function togglePlay() {
    return isPlaying.value ? pause() : play();
  }

  function setVolume(v) {
    volume.value = v;
    if (master.value) master.value.gain.value = isMuted.value ? 0 : v;
  }

  function toggleMute() {
    isMuted.value = !isMuted.value;
    if (master.value) master.value.gain.value = isMuted.value ? 0 : volume.value;
  }

  function selectTrack(i) {
    const wasPlaying = isPlaying.value;
    if (wasPlaying) stopScheduler();
    if (fileSource.value) {
      try { fileSource.value.stop(); } catch (e) { /* noop */ }
      fileSource.value = null;
    }
    currentTrack.value = i;
    if (wasPlaying) startScheduler();
  }

  async function loadFile(file) {
    ensureContext();
    if (ctx.value.state === "suspended") await ctx.value.resume();
    if (fileSource.value) {
      try { fileSource.value.stop(); } catch (e) { /* noop */ }
      fileSource.value = null;
    }
    if (schedulerId !== null) stopScheduler();
    const buf = await file.arrayBuffer();
    const decoded = await ctx.value.decodeAudioData(buf);
    const src = ctx.value.createBufferSource();
    src.buffer = decoded;
    src.loop = true;
    src.connect(master.value);
    src.start();
    fileSource.value = src;
    isPlaying.value = true;
    currentTrack.value = -1;
  }

  function getFrequencyData(target) {
    if (!analyser.value) {
      target.fill(0);
      return;
    }
    analyser.value.getByteFrequencyData(target);
  }

  return {
    isPlaying: readonly(isPlaying),
    isMuted: readonly(isMuted),
    volume: readonly(volume),
    currentTrack: readonly(currentTrack),
    tracks,
    analyser,
    fftSize: FFT_SIZE,
    play,
    pause,
    togglePlay,
    setVolume,
    toggleMute,
    selectTrack,
    loadFile,
    getFrequencyData,
  };
}
