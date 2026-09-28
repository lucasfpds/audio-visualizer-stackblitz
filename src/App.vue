<script setup>
import { onMounted, onBeforeUnmount, ref } from "vue";
import { useSynth } from "./composables/useSynth.js";

const {
  isPlaying,
  isMuted,
  volume,
  currentTrack,
  tracks,
  fftSize,
  togglePlay,
  setVolume,
  toggleMute,
  selectTrack,
  loadFile,
  getFrequencyData,
} = useSynth();

const canvas = ref(null);
const fileInput = ref(null);
const fileName = ref("");
const rafId = { current: null };
const peaks = ref([]);
const bars = ref([]);
const binCount = fftSize / 2;
const BAR_GROUPS = 48;

for (let i = 0; i < BAR_GROUPS; i++) {
  bars.value.push(0);
  peaks.value.push(0);
}

function resizeCanvas() {
  const c = canvas.value;
  if (!c) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = c.getBoundingClientRect();
  c.width = Math.max(1, Math.floor(rect.width * dpr));
  c.height = Math.max(1, Math.floor(rect.height * dpr));
  const ctx = c.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function draw() {
  const c = canvas.value;
  if (!c) return;
  const ctx = c.getContext("2d");
  const rect = c.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;

  ctx.clearRect(0, 0, w, h);

  const data = new Uint8Array(binCount);
  getFrequencyData(data);

  const binsPerBar = Math.floor(binCount / BAR_GROUPS) || 1;
  const gap = 3;
  const barWidth = (w - gap * (BAR_GROUPS - 1)) / BAR_GROUPS;

  for (let i = 0; i < BAR_GROUPS; i++) {
    let sum = 0;
    for (let j = 0; j < binsPerBar; j++) sum += data[i * binsPerBar + j] || 0;
    const avg = sum / binsPerBar / 255;

    const target = isPlaying.value ? avg : 0;
    bars.value[i] += (target - bars.value[i]) * 0.35;
    if (bars.value[i] < 0.001) bars.value[i] = 0;

    if (bars.value[i] > peaks.value[i]) peaks.value[i] = bars.value[i];
    else peaks.value[i] *= 0.95;

    const barH = Math.max(2, bars.value[i] * h);
    const x = i * (barWidth + gap);
    const y = h - barH;

    const grad = ctx.createLinearGradient(0, h, 0, 0);
    grad.addColorStop(0, "#7c3aed");
    grad.addColorStop(0.55, "#ec4899");
    grad.addColorStop(1, "#fbbf24");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, barWidth, barH);

    const peakY = h - Math.max(2, peaks.value[i] * h) - 2;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillRect(x, peakY, barWidth, 2);
  }

  rafId.current = requestAnimationFrame(draw);
}

function onVolumeInput(e) {
  setVolume(Number(e.target.value) / 100);
}

function onFileChange(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  fileName.value = file.name;
  loadFile(file);
}

onMounted(() => {
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  rafId.current = requestAnimationFrame(draw);
});

onBeforeUnmount(() => {
  if (rafId.current) cancelAnimationFrame(rafId.current);
  window.removeEventListener("resize", resizeCanvas);
});

const volumePct = () => Math.round(volume.value * 100);
const trackTitle = () =>
  currentTrack.value < 0 ? fileName.value || "Arquivo local" : tracks[currentTrack.value].name;
</script>

<template>
  <main class="player">
    <header class="player__head">
      <h1>Controle de Áudio com Visualizador</h1>
      <p>Synth procedural · Web Audio API · zero arquivos</p>
    </header>

    <section class="visualizer">
      <canvas
        ref="canvas"
        class="visualizer__canvas"
        role="img"
        aria-label="Visualizador de espectro de áudio"
      ></canvas>
    </section>

    <section class="now-playing">
      <span class="now-playing__label">Tocando agora</span>
      <span class="now-playing__title">{{ trackTitle() }}</span>
    </section>

    <section class="controls">
      <button
        class="btn btn--primary"
        :aria-pressed="isPlaying"
        :title="isPlaying ? 'Pausar' : 'Reproduzir'"
        @click="togglePlay"
      >
        {{ isPlaying ? "❚❚" : "►" }}
      </button>

      <button
        class="btn"
        :aria-pressed="isMuted"
        :title="isMuted ? 'Ativar som' : 'Silenciar'"
        @click="toggleMute"
      >
        {{ isMuted ? "🔇" : "🔊" }}
      </button>

      <div class="volume">
        <input
          id="volume"
          type="range"
          min="0"
          max="100"
          :value="volumePct()"
          class="volume__slider"
          :style="{ '--pct': volumePct() + '%' }"
          aria-label="Volume"
          @input="onVolumeInput"
        />
        <span class="volume__value">{{ volumePct() }}%</span>
      </div>
    </section>

    <section class="tracks">
      <button
        v-for="(t, i) in tracks"
        :key="t.name"
        class="track"
        :class="{ 'track--active': currentTrack === i }"
        :aria-pressed="currentTrack === i"
        @click="selectTrack(i)"
      >
        {{ t.name }}
      </button>
    </section>

    <section class="file">
      <label for="audio-file" class="file__label">Carregar arquivo local</label>
      <input
        id="audio-file"
        ref="fileInput"
        type="file"
        accept="audio/*"
        class="file__input"
        @change="onFileChange"
      />
      <p v-if="fileName" class="file__name">{{ fileName }}</p>
    </section>
  </main>
</template>
