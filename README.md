# Controle de Áudio com Visualizador

> Player de áudio que exibe visualização de espectro em <canvas>, com controles customizados de volume.

## Tecnologias

- **Vue 3** com `<script setup>` (JavaScript)
- **Vite** como bundler
- **Web Audio API** (AudioContext, OscillatorNode, GainNode, AnalyserNode)
- **Canvas 2D API** para visualização de espectro
- **CSS puro** com slider de volume customizado (gradient dinâmico via `--pct`)
- Zero arquivos de áudio — o som é gerado proceduralmente

## Requisitos

- Node.js 18+

## Como executar

```bash
npm install
npm run dev
```

Abra http://localhost:5173 no navegador.

## Scripts

| Script | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento (Vite) |
| `npm run build` | Build de produção |
| `npm run preview` | Serve o build de produção |

## Estrutura

```
src/
  main.js              entry: cria o app e importa o CSS
  App.vue              player, canvas, controles, troca de faixa, arquivo local
  composables/
    useSynth.js        AudioContext, sequenciador, analyser, volume/mute
  styles.css           player, visualizador, controles, slider, tracks
```

### Funcionalidades

- Sintetizador procedural: 3 faixas com progressões diferentes (Ambient Pad, Arpeggio Pulse, Bass Groove)
- Cadeia de áudio: instrumentos → GainNode (volume) → AnalyserNode (fftSize 256) → destination
- AudioContext só inicia no clique do play (política de autoplay dos browsers)
- Sequenciador com lookahead scheduler (`setInterval(25ms)`, agenda 120ms à frente)
- Envelope ADSR simplificado (attack + release) por nota
- Visualizador: `getByteFrequencyData()` por frame, 48 barras agrupadas, gradiente de cor por altura
- Decaimento suave dos picos (as barras "caem" com naturalidade)
- Pausado: barras decaem até zero
- Play/pause, mute, slider de volume custom (trilho preenchido até o thumb via `--pct`), % exibida
- Troca de faixa com título da faixa atual
- Bônus: carregar arquivo local (`input type="file"` → `decodeAudioData` → mesma cadeia de análise)


## Rodando no StackBlitz

Basta importar o repositório e rodar normalmente:

```
https://stackblitz.com/github/lucasfpds/audio-visualizer-stackblitz
```

O projeto não depende de binários nativos — Vite é JavaScript puro, então
sobe sem bindings nativos no WebContainer do StackBlitz.
