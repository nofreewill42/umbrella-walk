// ============================================================================
// Sound: the audio sprite (the guide music and every effect clip), the preview
// mix rebuilt in the browser from those clips, and the spectrum (STFT) editor.
// ============================================================================
const Snd = (() => {
  let ac = null, master = null, sprite = null, loading = null;
  const clip = new Map();          // sound id -> AudioBuffer (original)
  const edited = new Map();        // sound id -> {key, buf} (spectrum-edited)
  const uploads = new Map();       // change id -> AudioBuffer
  let playing = [];
  let music = null;

  function ctx() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ac = new AC();
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -3; comp.ratio.value = 12; comp.attack.value = .003; comp.release.value = .12;
      master = ac.createGain(); master.connect(comp); comp.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function load() {
    if (loading) return loading;
    ctx();
    loading = (async () => {
      const b64 = document.getElementById('studio-audio').textContent.trim();
      const bin = atob(b64), u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      sprite = await ac.decodeAudioData(u8.buffer);
      music = slice(SD.sprite.music[0], SD.sprite.music[1]);
      for (const s of SD.sounds) clip.set(s.id, slice(s.at, s.dur));
      return true;
    })().catch(e => { console.error(e); toast('This browser could not decode the sound (Opus). Try Chrome, Edge or Firefox.'); return false; });
    return loading;
  }
  function slice(at, dur) {
    const sr = sprite.sampleRate, a = Math.round(at * sr), n = Math.max(1, Math.round(dur * sr));
    const b = ac.createBuffer(2, n, sr);
    for (let c = 0; c < 2; c++) b.getChannelData(c).set(sprite.getChannelData(Math.min(c, sprite.numberOfChannels - 1)).subarray(a, a + n));
    return b;
  }
  const ready = () => !!sprite;

  // ---- the preview mix ----
  function stop() { playing.forEach(s => { try { s.stop(); } catch (e) { } }); playing = []; }
  async function play(t0, items, withMusic = true) {
    stop();
    if (!(await load())) return null;
    const c0 = ac.currentTime + .06;
    if (withMusic && music && t0 < music.duration) {
      const s = ac.createBufferSource(); s.buffer = music; s.connect(master); s.start(c0, t0); playing.push(s);
    }
    for (const it of items) {
      const buf = it.buf; if (!buf) continue;
      if (it.t + buf.duration <= t0) continue;
      const s = ac.createBufferSource(); s.buffer = buf;
      let node = s;
      if (it.gain) { const g = ac.createGain(); g.gain.value = Math.pow(10, it.gain / 20); node.connect(g); node = g; }
      if (it.pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, it.pan)); node.connect(p); node = p; }
      node.connect(master);
      if (it.t >= t0) s.start(c0 + (it.t - t0)); else s.start(c0, t0 - it.t);
      playing.push(s);
    }
    return c0;
  }
  async function preview(buf, gain = 0) {
    if (!(await load()) || !buf) return;
    stop();
    const s = ac.createBufferSource(); s.buffer = buf;
    const g = ac.createGain(); g.gain.value = Math.pow(10, gain / 20); s.connect(g); g.connect(master); s.start(); playing.push(s);
  }
  const now = () => ac ? ac.currentTime : performance.now() / 1000;
  async function decodeUpload(id, dataUrl) {
    if (uploads.has(id)) return uploads.get(id);
    if (!dataUrl) return null;
    ctx();
    try { const ab = await (await fetch(dataUrl)).arrayBuffer(); const b = await ac.decodeAudioData(ab); uploads.set(id, b); return b; } catch (e) { return null; }
  }

  // ---- FFT / STFT ----
  const N = 1024, HOP = 256, BINS = N / 2 + 1;
  const WIN = new Float32Array(N).map((_, i) => .5 - .5 * Math.cos(2 * Math.PI * i / N));
  const REV = (() => { const r = new Uint32Array(N), b = Math.log2(N); for (let i = 0; i < N; i++) { let x = i, y = 0; for (let k = 0; k < b; k++) { y = (y << 1) | (x & 1); x >>= 1; } r[i] = y; } return r; })();
  function fft(re, im, inv) {
    for (let i = 0; i < N; i++) { const j = REV[i]; if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (let size = 2; size <= N; size <<= 1) {
      const h = size >> 1, a = (inv ? 2 : -2) * Math.PI / size;
      for (let i = 0; i < N; i += size) for (let k = 0; k < h; k++) {
        const c = Math.cos(a * k), s = Math.sin(a * k), p = i + k, q = p + h;
        const tr = re[q] * c - im[q] * s, ti = re[q] * s + im[q] * c;
        re[q] = re[p] - tr; im[q] = im[p] - ti; re[p] += tr; im[p] += ti;
      }
    }
    if (inv) for (let i = 0; i < N; i++) { re[i] /= N; im[i] /= N; }
  }
  function stft(x) {
    const frames = Math.ceil(x.length / HOP) + 1, R = new Float32Array(frames * BINS), I = new Float32Array(frames * BINS);
    const re = new Float32Array(N), im = new Float32Array(N);
    for (let f = 0; f < frames; f++) {
      const o = f * HOP - N / 2;
      for (let i = 0; i < N; i++) { const j = o + i; re[i] = (j >= 0 && j < x.length ? x[j] : 0) * WIN[i]; im[i] = 0; }
      fft(re, im, false);
      R.set(re.subarray(0, BINS), f * BINS); I.set(im.subarray(0, BINS), f * BINS);
    }
    return { R, I, frames };
  }
  function istft(R, I, frames, len) {
    const y = new Float32Array(len), w = new Float32Array(len), re = new Float32Array(N), im = new Float32Array(N);
    for (let f = 0; f < frames; f++) {
      for (let b = 0; b < BINS; b++) { re[b] = R[f * BINS + b]; im[b] = I[f * BINS + b]; }
      for (let b = 1; b < N / 2; b++) { re[N - b] = re[b]; im[N - b] = -im[b]; }
      fft(re, im, true);
      const o = f * HOP - N / 2;
      for (let i = 0; i < N; i++) { const j = o + i; if (j >= 0 && j < len) { y[j] += re[i] * WIN[i]; w[j] += WIN[i] * WIN[i]; } }
    }
    for (let i = 0; i < len; i++) if (w[i] > 1e-6) y[i] /= w[i];
    return y;
  }

  // ---- the edit mask: a grid of time cells x log-frequency bands ----
  const MW = 64, MH = 40, FLO = 40, FHI = 20000;
  const bandOf = (hz) => Math.max(0, Math.min(MH - 1, Math.floor(Math.log(Math.max(hz, FLO) / FLO) / Math.log(FHI / FLO) * MH)));
  const hzOfBand = (j) => FLO * Math.pow(FHI / FLO, (j + .5) / MH);
  function newMask() { return { w: MW, h: MH, g: new Array(MW * MH).fill(0), a: new Array(MW * MH).fill(0) }; }
  const maskEmpty = m => !m || (m.g.every(v => !v) && m.a.every(v => !v));
  function applyMask(buf, m) {
    const sr = buf.sampleRate, out = ac.createBuffer(buf.numberOfChannels, buf.length, sr);
    const rnd = (() => { let s = 1234567; return () => (s = (s * 1103515245 + 12345) >>> 0) / 4294967296; })();
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const x = buf.getChannelData(c), { R, I, frames } = stft(x);
      let ref = 0; for (let i = 0; i < R.length; i++) ref = Math.max(ref, Math.hypot(R[i], I[i]));
      for (let f = 0; f < frames; f++) {
        const ci = Math.min(MW - 1, Math.floor(f / frames * MW));
        for (let b = 0; b < BINS; b++) {
          const j = bandOf(b * sr / N), k = j * MW + ci, idx = f * BINS + b;
          const g = Math.pow(10, (m.g[k] || 0) / 20);
          R[idx] *= g; I[idx] *= g;
          if (m.a[k]) { const amp = ref * .25 * (m.a[k] / 255), ph = rnd() * 6.2832; R[idx] += amp * Math.cos(ph); I[idx] += amp * Math.sin(ph); }
        }
      }
      out.getChannelData(c).set(istft(R, I, frames, x.length));
    }
    return out;
  }
  function editedBuf(id, m) {
    const key = JSON.stringify([m.g, m.a]);
    const e = edited.get(id);
    if (e && e.key === key) return e.buf;
    const b = clip.get(id); if (!b) return null;
    const buf = applyMask(b, m); edited.set(id, { key, buf }); return buf;
  }
  // spectrogram image of a buffer, on a log-frequency axis
  function spectrogram(buf, width, height) {
    const sr = buf.sampleRate, x = new Float32Array(buf.length);
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) x[i] += d[i] / buf.numberOfChannels; }
    const { R, I, frames } = stft(x);
    const img = new ImageData(width, height), mag = new Float32Array(frames * BINS);
    let mx = 1e-9;
    for (let i = 0; i < mag.length; i++) { mag[i] = Math.hypot(R[i], I[i]); if (mag[i] > mx) mx = mag[i]; }
    const binOfRow = new Float32Array(height);
    for (let r = 0; r < height; r++) { const hz = FLO * Math.pow(FHI / FLO, 1 - (r + .5) / height); binOfRow[r] = Math.min(BINS - 1, hz * N / sr); }
    for (let px = 0; px < width; px++) {
      const f = Math.min(frames - 1, Math.floor(px / width * frames));
      for (let r = 0; r < height; r++) {
        const b = binOfRow[r], b0 = Math.floor(b), v = mag[f * BINS + b0] * (1 - (b - b0)) + (mag[f * BINS + Math.min(BINS - 1, b0 + 1)] || 0) * (b - b0);
        const db = 20 * Math.log10(v / mx + 1e-9), u = Math.max(0, Math.min(1, (db + 72) / 72));
        const [cr, cg, cb] = ramp(u), o = (r * width + px) * 4;
        img.data[o] = cr; img.data[o + 1] = cg; img.data[o + 2] = cb; img.data[o + 3] = 255;
      }
    }
    return img;
  }
  function ramp(u) {                                   // night slate -> rain blue -> coffee -> paper
    const st = [[0, [11, 12, 16]], [.35, [27, 58, 84]], [.6, [80, 150, 190]], [.8, [214, 160, 100]], [1, [250, 242, 226]]];
    for (let i = 1; i < st.length; i++) if (u <= st[i][0]) { const [u0, c0] = st[i - 1], [u1, c1] = st[i], k = (u - u0) / (u1 - u0); return c0.map((v, j) => v + (c1[j] - v) * k); }
    return st[st.length - 1][1];
  }
  return { ctx, load, ready, play, stop, preview, now, clip, editedBuf, spectrogram, newMask, maskEmpty, decodeUpload, uploads, MW, MH, FLO, FHI, hzOfBand, bandOf, get music() { return music; } };
})();
