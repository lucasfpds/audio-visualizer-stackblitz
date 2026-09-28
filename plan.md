# Controle de Áudio com Visualizador

> Player de áudio que exibe visualização de espectro em `<canvas>`, com controles customizados de volume.

> **Fonte do áudio:** sintetizador procedural com Web Audio API (nativo, zero assets) — o demo toca direto no StackBlitz sem nenhum arquivo de áudio.

## Stack

- Vite + Vue 3 (`<script setup>`, JavaScript) — sem TypeScript, sem lint/test, zero libs extras
- CSS puro em `src/styles.css`
- Arquivos: `index.html`, `package.json` (deps: `vue`), `vite.config.js`, `.stackblitzrc`, `src/main.js`, `src/App.vue`, `src/composables/useSynth.js`, `src/styles.css`

## Implementação

### 1. Fonte de áudio (`src/composables/useSynth.js`)

- `AudioContext` + sequenciador: loop de acordes/notas com osciladores (triangle/sine) + envelope de ganho por nota (attack/release) — 3 "faixas" com progressões diferentes
- Cadeia: instrumentos → `GainNode` (volume) → `AnalyserNode` (`fftSize: 256`) → destination
- O `AudioContext` só inicia no clique do play (política de autoplay dos browsers)

### 2. Visualizador

- `<canvas>` full-width: por frame, `analyser.getByteFrequencyData()` → barras (bins agrupados, altura normalizada), cor em gradiente pela altura
- Decaimento suave dos picos para as barras "caírem" com naturalidade
- Pausado: barras decaem até zero

### 3. Controles customizados

- Play/pause (`suspend`/`resume` do contexto + parar/retomar o sequenciador) e mute
- **Slider de volume custom**: `input range` estilizado 100% por CSS — trilho preenchido até o thumb com cor de destaque (gradient dinâmico via `background-size`) + % exibida
- Troca de faixa (3 padrões) com título da faixa atual

### 4. Bônus barato

- Carregar arquivo local (`input type="file"` → `decodeAudioData` → mesma cadeia de análise) — transforma o demo em player real sem quebrar o "zero assets"

## Checklist — 100% da descrição

- [ ] Player funcional (play/pause, troca de faixa)
- [ ] Espectro em `<canvas>` sincronizado com o áudio
- [ ] Controles customizados de volume (slider estilizado + mute + %)
