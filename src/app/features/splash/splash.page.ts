import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SplashScreen } from '@capacitor/splash-screen';
import { AudioService } from '../../core/audio/audio.service';
import { HapticsService } from '../../core/haptics/haptics.service';
import { SaveService } from '../../core/save/save.service';

@Component({
  selector: 'app-splash',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './splash.page.html',
  styleUrl: './splash.page.css',
})
export class SplashPage implements OnInit, OnDestroy {
  private readonly save = inject(SaveService);
  private readonly audio = inject(AudioService);
  private readonly haptics = inject(HapticsService);
  private readonly router = inject(Router);

  private timer: ReturnType<typeof setTimeout> | null = null;

  protected readonly progress = signal(18);
  protected readonly ready = signal(false);

  async ngOnInit(): Promise<void> {
    const started = performance.now();
    try {
      await this.save.init();
    } catch {
      // SaveService already falls back to a safe default profile.
    }
    this.audio.setEnabled(this.save.data().settings.sound);
    this.haptics.setEnabled(this.save.data().settings.haptics);
    this.progress.set(78);

    const elapsed = performance.now() - started;
    const wait = Math.max(0, 1000 - elapsed);
    this.timer = setTimeout(() => {
      this.progress.set(100);
      this.ready.set(true);
      this.timer = setTimeout(() => {
        void this.router.navigate(['/menu'], { replaceUrl: true });
      }, 260);
    }, wait);

    try {
      await SplashScreen.hide();
    } catch {
      // Splash plugin only exists on native builds.
    }
  }

  ngOnDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
  }
}
