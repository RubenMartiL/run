import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { RunResult } from '../../game/engine/session';
import { IconComponent } from '../../shared/icon';

@Component({
  selector: 'app-result-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './result-overlay.component.html',
  styleUrl: './result-overlay.component.css',
})
export class ResultOverlayComponent implements OnDestroy {
  readonly result = input.required<RunResult>();
  readonly levelLabel = input.required<string>();
  readonly worldName = input.required<string>();
  readonly hasNext = input(false);
  readonly canRevive = input(false);
  readonly canDouble = input(false);
  readonly doubled = input(false);
  readonly bonusCoins = input(0);
  readonly worldClear = input(false);

  readonly retry = output<void>();
  readonly next = output<void>();
  readonly map = output<void>();
  readonly revive = output<void>();
  readonly doubleCoins = output<void>();

  protected readonly displayCoins = signal(0);
  private raf = 0;

  constructor() {
    effect(() => {
      const target = this.result().coins + this.bonusCoins();
      this.animateCoins(target);
    });
  }

  ngOnDestroy(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
  }

  private animateCoins(target: number): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    const start = performance.now();
    const from = this.displayCoins();
    const duration = 720;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      this.displayCoins.set(Math.round(from + (target - from) * eased));
      if (t < 1) this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  protected readonly isCampaign = computed(() => this.result().mode === 'campaign');
  protected readonly isTimed = computed(
    () => this.result().mode === 'timeAttack' || this.result().mode === 'daily',
  );

  protected readonly title = computed(() => {
    const result = this.result();
    if (result.mode === 'campaign') return result.won ? 'VICTORY!' : 'DEFEAT';
    if (result.mode === 'timeAttack' || result.mode === 'daily') {
      return result.won ? 'FINISH!' : 'TIME UP';
    }
    if (result.mode === 'coinRush') return result.won ? 'TARGET HIT!' : 'TIME UP';
    if (result.mode === 'survival') return 'RUN OVER';
    if (result.mode === 'bossRush') return result.won ? 'RUSH CLEAR!' : 'RUSH OVER';
    return 'RUN OVER';
  });

  protected readonly kicker = computed(() => {
    const result = this.result();
    if (result.boss && result.won) return 'BOSS DEFEATED';
    if (result.mode === 'campaign') return result.won ? 'LEVEL CLEAR' : 'RUN OVER';
    if (result.mode === 'daily') return 'DAILY CHALLENGE';
    if (result.mode === 'timeAttack') return 'TIME ATTACK';
    if (result.mode === 'coinRush') return 'COIN RUSH';
    if (result.mode === 'survival') return 'SURVIVAL';
    if (result.mode === 'bossRush') return `BOSS RUSH · ${result.bosses} DOWN`;
    return 'ENDLESS';
  });

  protected readonly primaryValue = computed(() => {
    const result = this.result();
    if (result.mode === 'endless' || result.mode === 'survival') {
      return result.distance >= 1000
        ? `${(result.distance / 1000).toFixed(2)}k m`
        : `${result.distance} m`;
    }
    if (result.mode === 'timeAttack' || result.mode === 'daily') {
      return `${result.elapsed.toFixed(1)}s`;
    }
    if (result.mode === 'coinRush') return `${result.coinTarget}`;
    if (result.mode === 'bossRush') return `${result.bosses} / 3`;
    return `${result.crowdAtFinish}`;
  });

  protected readonly primaryLabel = computed(() => {
    const result = this.result();
    if (result.mode === 'endless' || result.mode === 'survival') return 'DISTANCE';
    if (result.mode === 'timeAttack' || result.mode === 'daily') return 'TIME';
    if (result.mode === 'coinRush') return 'TARGET';
    if (result.mode === 'bossRush') return 'BOSSES';
    return 'CROWD AT FINISH';
  });

  protected readonly medalLabel = computed(() => {
    const medal = this.result().medal;
    return medal ? medal.toUpperCase() : 'NO MEDAL';
  });

  protected readonly confetti = Array.from({ length: 30 }, (_, index) => ({
    left: (index * 37 + 8) % 100,
    color: ['#ffd447', '#ff7a6b', '#8be9ff', '#b6ff6b', '#c9a7ff', '#ffffff'][index % 6],
    delay: (index % 9) * 90,
    rotate: (index * 47) % 360,
  }));
}
