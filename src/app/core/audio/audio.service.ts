import { Injectable } from '@angular/core';

export type SoundName =
  | 'click'
  | 'gateGood'
  | 'gateBad'
  | 'coin'
  | 'hit'
  | 'shield'
  | 'power'
  | 'combo'
  | 'battle'
  | 'win'
  | 'lose';

type Ctor = typeof AudioContext;

/**
 * Tiny procedural sound engine. No audio assets are required, so the game
 * ships with feedback out of the box while keeping a single seam for real
 * audio files later (see `play`).
 */
@Injectable({ providedIn: 'root' })
export class AudioService {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private enabled = true;
  private musicEnabled = true;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private musicStep = 0;

  constructor() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.stopMusic();
      } else if (this.musicEnabled) {
        this.startMusic();
      }
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.master) {
      this.master.gain.value = enabled ? 0.55 : 0;
    }
  }

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (!enabled) this.stopMusic();
    else this.startMusic();
  }

  unlock(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume().then(() => this.startMusic());
    } else {
      this.startMusic();
    }
  }

  startMusic(): void {
    if (!this.musicEnabled || this.musicTimer) return;
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running') return;
    this.musicStep = 0;
    this.musicTimer = setInterval(() => this.scheduleMusicStep(), 460);
  }

  stopMusic(): void {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private scheduleMusicStep(): void {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running') {
      this.stopMusic();
      return;
    }
    const step = this.musicStep++;
    const chords = [
      [261.63, 329.63, 392.0],
      [220.0, 261.63, 329.63],
      [174.61, 220.0, 261.63],
      [196.0, 246.94, 293.66],
    ];
    const chord = chords[Math.floor(step / 4) % chords.length];
    const note = chord[step % chord.length];
    this.musicNote(note * 2, 0.4, 0.035);
    if (step % 4 === 0) this.musicNote(chord[0] / 2, 1.1, 0.045);
    if (step % 8 === 6) this.musicNote(note * 3, 0.3, 0.02);
  }

  private musicNote(frequency: number, duration: number, gain: number): void {
    const ctx = this.context;
    if (!ctx) return;
    if (!this.musicGain) {
      this.musicGain = ctx.createGain();
      this.musicGain.gain.value = 0.5;
      this.musicGain.connect(ctx.destination);
    }
    const osc = ctx.createOscillator();
    const envelope = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = frequency;
    const start = ctx.currentTime;
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.03);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(envelope);
    envelope.connect(this.musicGain);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  play(name: SoundName): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running') return;

    switch (name) {
      case 'click':
        this.tone(560, 0.06, 'triangle', 0.25, 0, 760);
        break;
      case 'gateGood':
        this.tone(520, 0.09, 'triangle', 0.3, 0, 780);
        this.tone(780, 0.14, 'triangle', 0.22, 0.07, 1040);
        break;
      case 'gateBad':
        this.tone(300, 0.16, 'sawtooth', 0.16, 0, 150);
        this.tone(190, 0.2, 'sine', 0.24, 0.05, 110);
        break;
      case 'coin':
        this.tone(1180, 0.05, 'square', 0.1);
        this.tone(1580, 0.08, 'square', 0.08, 0.05);
        break;
      case 'hit':
        this.tone(160, 0.16, 'square', 0.2, 0, 70);
        this.noise(0.12, 0.18);
        break;
      case 'shield':
        this.tone(420, 0.18, 'sine', 0.2, 0, 900);
        break;
      case 'power':
        [520, 660, 880].forEach((f, index) =>
          this.tone(f, 0.1, 'triangle', 0.22, index * 0.06),
        );
        break;
      case 'combo':
        [740, 988, 1318].forEach((f, index) =>
          this.tone(f, 0.09, 'square', 0.12, index * 0.045),
        );
        break;
      case 'battle':
        this.tone(120, 0.3, 'sawtooth', 0.14, 0, 90);
        this.noise(0.25, 0.1);
        break;
      case 'win':
        [523, 659, 784, 1046].forEach((f, index) =>
          this.tone(f, 0.22, 'triangle', 0.26, index * 0.11),
        );
        break;
      case 'lose':
        [440, 370, 294, 220].forEach((f, index) =>
          this.tone(f, 0.2, 'sine', 0.22, index * 0.12),
        );
        break;
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context;
    try {
      const Ctx: Ctor | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext;
      if (!Ctx) return null;
      this.context = new Ctx();
      this.master = this.context.createGain();
      this.master.gain.value = this.enabled ? 0.55 : 0;
      this.master.connect(this.context.destination);
      return this.context;
    } catch {
      return null;
    }
  }

  private tone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    gain: number,
    delay = 0,
    endFrequency?: number,
  ): void {
    const ctx = this.context;
    if (!ctx || !this.master) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const envelope = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    if (endFrequency) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFrequency), start + duration);
    }
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(envelope);
    envelope.connect(this.master);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  }

  private noise(duration: number, gain: number): void {
    const ctx = this.context;
    if (!ctx || !this.master) return;
    const frames = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 2;
    }
    const source = ctx.createBufferSource();
    const envelope = ctx.createGain();
    envelope.gain.value = gain;
    source.buffer = buffer;
    source.connect(envelope);
    envelope.connect(this.master);
    source.start();
  }
}
