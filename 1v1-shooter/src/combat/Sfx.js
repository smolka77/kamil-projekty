/** Proceduralne dźwięki (Web Audio) — bez plików audio. */
export class Sfx {
  init() {
    if (this.ctx) {
      this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.45;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  env(node, t, peak, decay) {
    node.gain.setValueAtTime(0.0001, t);
    node.gain.exponentialRampToValueAtTime(peak, t + 0.004);
    node.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  }

  shot() {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(6000, t);
    f.frequency.exponentialRampToValueAtTime(500, t + 0.14);
    const g = ctx.createGain();
    this.env(g, t, 0.75, 0.17);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random() * 0.6);
    src.stop(t + 0.2);

    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
    const og = ctx.createGain();
    this.env(og, t, 0.7, 0.13);
    o.connect(og).connect(this.master);
    o.start(t);
    o.stop(t + 0.15);
  }

  hit(head) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    const o = ctx.createOscillator();
    o.type = head ? 'triangle' : 'square';
    o.frequency.setValueAtTime(head ? 1650 : 950, t);
    if (head) o.frequency.exponentialRampToValueAtTime(2200, t + 0.06);
    const g = ctx.createGain();
    this.env(g, t, head ? 0.22 : 0.08, head ? 0.16 : 0.06);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.2);
  }

  click(freq = 600, vol = 0.12) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq * 3;
    f.Q.value = 3;
    const g = ctx.createGain();
    this.env(g, t, vol * 2.5, 0.06);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + 0.08);
  }

  elim() {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + 0.05;
    [880, 1320, 1760].forEach((fr, i) => {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = fr;
      const g = ctx.createGain();
      this.env(g, t + i * 0.08, 0.15, 0.3);
      o.connect(g).connect(this.master);
      o.start(t + i * 0.08);
      o.stop(t + i * 0.08 + 0.32);
    });
  }

  empty() {
    this.click(1400, 0.06);
  }
}
