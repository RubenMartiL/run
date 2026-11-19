import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AudioService } from '../../core/audio/audio.service';
import { HapticsService } from '../../core/haptics/haptics.service';
import { SaveService } from '../../core/save/save.service';
import { MonetizationService } from '../../core/monetization/monetization.service';
import { MissionsService } from '../../core/retention/missions.service';
import { ProgressionService } from '../../core/progression/progression.service';
import { CampaignService } from '../../game/campaign.service';
import { getNextLevel } from '../../game/data/levels';
import { WorldTheme, getWorldTheme } from '../../game/data/worlds';
import { buildModeLevel, bossRushTotal } from '../../game/data/modes';
import { GameSession, HudSnapshot, RunResult } from '../../game/engine/session';
import { LevelScript } from '../../game/types';
import { IconComponent } from '../../shared/icon';
import { PauseOverlayComponent } from './pause-overlay.component';
import { ResultOverlayComponent } from './result-overlay.component';

const INITIAL_SNAPSHOT: HudSnapshot = {
  phase: 'running',
  mode: 'campaign',
  crowd: 0,
  coins: 0,
  progress: 0,
  shield: 0,
  magnet: 0,
  turbo: 0,
  time: 0,
  timer: 0,
  timeLimit: 0,
  coinTarget: 0,
  distance: 0,
  bossIndex: 0,
  bossTotal: 0,
  combo: 0,
  comboTimer: 0,
  coinEvent: 0,
  battle: null,
};

const MODE_IDS = new Set(['endless', 'timeAttack', 'coinRush', 'survival', 'bossRush', 'daily']);

@Component({
  selector: 'app-gameplay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, PauseOverlayComponent, ResultOverlayComponent],
  templateUrl: './gameplay.page.html',
  styleUrl: './gameplay.page.css',
})
export class GameplayPage implements OnInit, AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly save = inject(SaveService);
  private readonly campaign = inject(CampaignService);
  private readonly progression = inject(ProgressionService);
  private readonly missions = inject(MissionsService);
  private readonly ads = inject(MonetizationService);
  private readonly audio = inject(AudioService);
  private readonly haptics = inject(HapticsService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  protected readonly level = signal<LevelScript | null>(null);
  protected readonly theme = signal<WorldTheme | null>(null);
  protected readonly snapshot = signal<HudSnapshot>({ ...INITIAL_SNAPSHOT });
  protected readonly result = signal<RunResult | null>(null);
  protected readonly showPause = signal(false);
  protected readonly introVisible = signal(false);
  protected readonly hintVisible = signal(false);
  protected readonly bossTransition = signal(false);
  protected readonly revived = signal(false);
  protected readonly doubled = signal(false);
  protected readonly bonusCoins = signal(0);
  protected readonly coinPulse = signal(false);
  protected readonly crowdPulse = signal(false);
  protected readonly coinFlies = signal<{ id: number; left: number; delay: number }[]>([]);

  protected readonly modeId = signal<string | null>(null);
  protected readonly levelLabel = computed(() => {
    const level = this.level();
    if (!level) return '';
    if (level.mode === 'bossRush') {
      return `Boss ${(level.rules?.bossIndex ?? 0) + 1} / ${level.rules?.bossTotal ?? bossRushTotal()}`;
    }
    if (level.mode !== 'campaign') return level.name;
    return `Level ${level.index + 1}`;
  });
  protected readonly worldName = computed(() => this.theme()?.name ?? '');
  protected readonly hasNext = computed(() => {
    const level = this.level();
    return level?.mode === 'campaign' && level ? Boolean(getNextLevel(level)) : false;
  });
  protected readonly showProgress = computed(() => this.snapshot().mode !== 'endless' && this.snapshot().mode !== 'survival');
  protected readonly canRevive = computed(() => {
    const result = this.result();
    if (!result || result.won || this.revived() || this.doubled()) return false;
    return result.mode !== 'bossRush' && result.mode !== 'timeAttack' && result.mode !== 'daily';
  });
  protected readonly canDouble = computed(() => {
    const result = this.result();
    if (!result || this.doubled()) return false;
    return result.won || result.mode === 'endless' || result.mode === 'survival';
  });

  protected readonly worldClear = signal(false);

  private session: GameSession | null = null;
  private viewReady = false;
  private recorded = false;
  private banked = false;
  private bossRushIndex = 0;
  private carryCrowd = 0;
  private carryCoins = 0;
  private introTimer: ReturnType<typeof setTimeout> | null = null;
  private hintTimer: ReturnType<typeof setTimeout> | null = null;
  private bossTimer: ReturnType<typeof setTimeout> | null = null;
  private coinPulseTimer: ReturnType<typeof setTimeout> | null = null;
  private crowdPulseTimer: ReturnType<typeof setTimeout> | null = null;
  private lastCoinEvent = 0;
  private lastCrowd = 0;
  private coinFlyId = 1;

  ngOnInit(): void {
    this.audio.setEnabled(this.save.data().settings.sound);
    this.audio.setMusicEnabled(this.save.data().settings.music);
    this.haptics.setEnabled(this.save.data().settings.haptics);
    this.missions.ensureDaily();

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const modeId = params.get('modeId');
      if (modeId) {
        if (!MODE_IDS.has(modeId)) {
          void this.router.navigate(['/modes'], { replaceUrl: true });
          return;
        }
        this.modeId.set(modeId);
        this.bossRushIndex = 0;
        this.carryCrowd = 0;
        this.carryCoins = 0;
        this.prepareModeLevel();
        return;
      }

      const worldId = params.get('worldId') ?? '';
      const levelNumber = Number(params.get('level'));
      const theme = getWorldTheme(worldId);
      const level = this.campaign.getLevel(worldId, levelNumber);

      if (!theme || !level) {
        void this.router.navigate(['/campaign'], { replaceUrl: true });
        return;
      }

      this.modeId.set(null);
      this.level.set(level);
      this.theme.set(theme);
      if (this.viewReady) this.startRun();
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    if (this.level()) {
      if (this.modeId()) this.prepareModeLevel();
      else this.startRun();
    }
  }

  ngOnDestroy(): void {
    this.clearTimers();
    this.session?.destroy();
    this.session = null;
  }

  protected startRun(): void {
    const level = this.level();
    const theme = this.theme();
    if (!level || !theme) return;

    this.clearTimers();
    this.session?.destroy();
    this.recorded = false;
    this.banked = false;
    this.result.set(null);
    this.showPause.set(false);
    this.doubled.set(false);
    this.bonusCoins.set(0);
    this.worldClear.set(false);
    this.bossTransition.set(false);
    this.snapshot.set({ ...INITIAL_SNAPSHOT, mode: level.mode, crowd: level.startingCrowd });
    this.lastCoinEvent = 0;
    this.lastCrowd = level.startingCrowd;
    this.introVisible.set(true);
    this.hintVisible.set(true);

    const options = this.progression.runOptions(level);
    if (level.mode === 'bossRush') {
      if (this.carryCrowd > 0) options.startingCrowdOverride = this.carryCrowd;
      options.carryCoins = this.carryCoins;
    }

    const canvas = this.canvasRef().nativeElement;
    this.audio.unlock();
    this.session = new GameSession(
      canvas,
      level,
      theme,
      this.audio,
      this.haptics,
      {
        onSnapshot: (snapshot) => this.pushSnapshot(snapshot),
        onEnd: (result) => this.handleEnd(result),
        onAutoPause: () => this.showPause.set(true),
      },
      options,
    );

    this.introTimer = setTimeout(() => this.introVisible.set(false), 1700);
    this.hintTimer = setTimeout(() => this.hintVisible.set(false), 3000);
  }

  protected pause(): void {
    if (this.result()) return;
    this.audio.play('click');
    this.showPause.set(true);
    this.session?.pause();
  }

  protected resume(): void {
    this.audio.play('click');
    this.showPause.set(false);
    this.session?.resume();
  }

  protected restart(): void {
    this.audio.play('click');
    this.bankPending();
    this.resetRevive();
    if (this.modeId()) this.prepareModeLevel(true);
    else this.startRun();
  }

  protected quit(): void {
    this.audio.play('click');
    this.bankPending();
    void this.router.navigate([this.modeId() ? '/modes' : '/campaign']);
  }

  protected retry(): void {
    this.audio.play('click');
    this.bankPending();
    this.resetRevive();
    if (this.modeId()) this.prepareModeLevel(true);
    else this.startRun();
  }

  protected async nextLevel(): Promise<void> {
    const level = this.level();
    if (!level) return;
    this.bankPending();
    const next = getNextLevel(level);
    if (!next) {
      await this.goToMap();
      return;
    }
    this.audio.play('click');
    await this.ads.maybeShowInterstitial();
    void this.router.navigate(['/play', next.worldId, next.index + 1]);
  }

  protected async goToMap(): Promise<void> {
    this.audio.play('click');
    this.bankPending();
    await this.ads.maybeShowInterstitial();
    void this.router.navigate([this.modeId() ? '/modes' : '/campaign']);
  }

  protected async revive(): Promise<void> {
    const result = this.result();
    if (!result || !this.canRevive()) return;
    const granted = await this.ads.showRewarded('continue');
    if (!granted || !this.session) return;
    if (this.session.revive(28)) {
      this.revived.set(true);
      this.recorded = false;
      this.banked = false;
      this.result.set(null);
      this.audio.play('power');
      void this.haptics.impact('medium');
    }
  }

  protected async doubleCoins(): Promise<void> {
    const result = this.result();
    if (!result || !this.canDouble()) return;
    const granted = await this.ads.showRewarded('doubleCoins');
    if (!granted) return;
    if (!result.won) this.bankPending();
    this.save.addCoins(result.coins);
    this.doubled.set(true);
    this.bonusCoins.set(result.coins);
    this.audio.play('coin');
  }

  protected seconds(value: number): string {
    return Math.max(0, Math.ceil(value)).toString();
  }

  protected timerLabel(): string {
    const snap = this.snapshot();
    if (snap.timeLimit > 0) {
      const remaining = Math.max(0, snap.timeLimit - snap.timer);
      return `${Math.ceil(remaining)}s`;
    }
    return `${Math.floor(snap.timer)}s`;
  }

  protected formatCount(value: number): string {
    if (value < 1000) return value.toString();
    if (value < 1_000_000) return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)}k`;
    return `${(value / 1_000_000).toFixed(1)}m`;
  }

  protected formatDistance(value: number): string {
    return value >= 1000 ? `${(value / 1000).toFixed(2)} km` : `${value} m`;
  }

  private prepareModeLevel(fresh = false): void {
    const modeId = this.modeId();
    if (!modeId) return;
    if (fresh) {
      this.bossRushIndex = 0;
      this.carryCrowd = 0;
      this.carryCoins = 0;
    }
    const level = buildModeLevel(
      modeId as 'endless' | 'timeAttack' | 'coinRush' | 'survival' | 'bossRush' | 'daily',
      {
        bossIndex: modeId === 'bossRush' ? this.bossRushIndex : 0,
        startingCrowd: this.carryCrowd || undefined,
      },
    );
    this.level.set(level);
    this.theme.set(getWorldTheme(level.worldId) ?? this.theme());
    if (this.viewReady) this.startRun();
  }

  private handleEnd(result: RunResult): void {
    if (this.recorded) return;
    this.recorded = true;
    this.hintVisible.set(false);
    this.introVisible.set(false);

    if (
      result.mode === 'bossRush' &&
      result.won &&
      this.bossRushIndex < bossRushTotal() - 1
    ) {
      this.carryCrowd = Math.max(10, result.crowd);
      this.carryCoins = result.coins;
      this.recorded = false;
      this.bossTransition.set(true);
      this.audio.play('power');
      this.bossTimer = setTimeout(() => {
        this.bossRushIndex++;
        this.bossTransition.set(false);
        this.prepareModeLevel();
      }, 1100);
      return;
    }

    const level = this.level();
    const firstWorldClear =
      result.mode === 'campaign' &&
      result.won &&
      level?.index === 19 &&
      this.save.getStars(result.levelId) === 0;
    if (firstWorldClear) {
      this.worldClear.set(true);
      this.save.addGems(5);
      this.result.set({ ...result, coins: result.coins + 300 });
    } else {
      this.result.set(result);
    }
    if (result.won) {
      this.bankPending();
      this.session?.destroy();
    }
  }

  /** Persists the pending result exactly once. */
  private bankPending(): void {
    const result = this.result();
    if (!result || this.banked) return;
    this.banked = true;

    if (result.mode === 'campaign') {
      this.save.recordLevelResult({
        levelId: result.levelId,
        stars: result.stars,
        crowd: result.crowdAtFinish,
        won: result.won,
        coins: result.coins,
        distance: result.distance,
        bosses: result.bosses,
      });
    } else {
      this.save.recordModeResult({
        mode: result.mode,
        won: result.won,
        coins: result.coins,
        crowd: result.crowdAtFinish,
        distance: result.distance,
        elapsed: result.elapsed,
        bosses: result.bosses,
        medal: result.medal,
      });
    }

    this.missions.recordRun({
      coins: result.coins,
      crowd: result.crowdAtFinish,
      won: result.won,
      distance: result.distance,
      bosses: result.bosses,
    });
    this.ads.trackRunCompleted();
  }

  private resetRevive(): void {
    this.revived.set(false);
    this.result.set(null);
  }

  private pushSnapshot(snapshot: HudSnapshot): void {
    if (snapshot.coinEvent !== this.lastCoinEvent) {
      const spawn = Math.min(3, Math.max(1, snapshot.coinEvent - this.lastCoinEvent));
      this.lastCoinEvent = snapshot.coinEvent;
      this.coinPulse.set(false);
      this.coinPulse.set(true);
      if (this.coinPulseTimer) clearTimeout(this.coinPulseTimer);
      this.coinPulseTimer = setTimeout(() => this.coinPulse.set(false), 190);
      const flies = [...this.coinFlies()];
      for (let i = 0; i < spawn; i++) {
        const id = this.coinFlyId++;
        flies.push({ id, left: 42 + Math.random() * 18, delay: i * 55 });
        setTimeout(() => {
          this.coinFlies.update((current) => current.filter((fly) => fly.id !== id));
        }, 950 + i * 55);
      }
      this.coinFlies.set(flies.slice(-9));
    }
    if (snapshot.crowd > this.lastCrowd) {
      this.crowdPulse.set(false);
      this.crowdPulse.set(true);
      if (this.crowdPulseTimer) clearTimeout(this.crowdPulseTimer);
      this.crowdPulseTimer = setTimeout(() => this.crowdPulse.set(false), 210);
    }
    this.lastCrowd = snapshot.crowd;
    this.snapshot.set(snapshot);
  }

  private clearTimers(): void {
    if (this.introTimer) clearTimeout(this.introTimer);
    if (this.hintTimer) clearTimeout(this.hintTimer);
    if (this.bossTimer) clearTimeout(this.bossTimer);
    if (this.coinPulseTimer) clearTimeout(this.coinPulseTimer);
    if (this.crowdPulseTimer) clearTimeout(this.crowdPulseTimer);
    this.introTimer = null;
    this.hintTimer = null;
    this.bossTimer = null;
    this.coinPulseTimer = null;
    this.crowdPulseTimer = null;
  }
}
