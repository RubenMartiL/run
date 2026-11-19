import { Injectable, signal } from '@angular/core';

export interface JuiceParticle {
  left: number;
  delay: number;
  color: string;
  size: number;
  drift: number;
  spin: number;
  round: boolean;
}

export interface JuiceBurst {
  id: number;
  particles: JuiceParticle[];
  label: string;
  color: string;
}

const COLORS = ['#ffd447', '#ff7a6b', '#8be9ff', '#b6ff6b', '#c9a7ff', '#ff8ad8', '#ffffff'];

/** Screen-space celebration layer used by menus, rewards, shop and upgrades. */
@Injectable({ providedIn: 'root' })
export class JuiceService {
  readonly bursts = signal<JuiceBurst[]>([]);
  private nextId = 1;

  celebrate(label: string, color = '#ffd447'): void {
    const burst: JuiceBurst = {
      id: this.nextId++,
      label,
      color,
      particles: Array.from({ length: 26 }, (_, index) => ({
        left: (index * 41 + 7) % 100,
        delay: (index % 10) * 55,
        color: COLORS[index % COLORS.length],
        size: 5 + (index % 4) * 3,
        drift: ((index * 37) % 160) - 80,
        spin: 180 + ((index * 97) % 540),
        round: index % 3 === 0,
      })),
    };
    this.bursts.update((current) => [...current.slice(-3), burst]);
    setTimeout(() => {
      this.bursts.update((current) => current.filter((entry) => entry.id !== burst.id));
    }, 1900);
  }
}
