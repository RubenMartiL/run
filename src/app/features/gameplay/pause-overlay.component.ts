import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '../../shared/icon';

@Component({
  selector: 'app-pause-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="pause-overlay">
      <section class="panel pause-card animate-pop-in">
        <span class="eyebrow">PAUSED</span>
        <h2 class="display text-3xl">TAKE A BREATH</h2>
        <p class="sub">{{ worldName() }} · {{ levelLabel() }}</p>

        <button type="button" class="btn btn-primary w-full py-3.5 text-lg" (click)="resume.emit()">
          <app-icon name="play" [size]="19" />
          RESUME
        </button>

        <div class="row">
          <button type="button" class="btn btn-secondary flex-1 py-3 text-sm" (click)="restart.emit()">
            RESTART
          </button>
          <button type="button" class="btn btn-ghost flex-1 py-3 text-sm" (click)="quit.emit()">
            QUIT RUN
          </button>
        </div>

        <p class="hint">Drag left and right to steer your crowd.</p>
      </section>
    </div>
  `,
  styles: `
    .pause-overlay {
      position: absolute;
      inset: 0;
      z-index: 45;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.4rem;
      background: rgba(4, 8, 16, 0.7);
      backdrop-filter: blur(7px);
    }

    .pause-card {
      width: 100%;
      max-width: 330px;
      padding: 1.4rem 1.15rem 1.1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.7rem;
      text-align: center;
    }

    .eyebrow {
      font-family: var(--font-display);
      font-size: 0.6rem;
      font-weight: 800;
      letter-spacing: 0.24em;
      color: rgba(166, 192, 232, 0.6);
    }

    h2 {
      margin: 0;
      font-size: 1.9rem;
    }

    .sub {
      margin: 0 0 0.3rem;
      font-size: 0.78rem;
      font-weight: 700;
      color: rgba(190, 208, 238, 0.6);
    }

    .row {
      display: flex;
      gap: 0.55rem;
      width: 100%;
    }

    .hint {
      margin: 0.25rem 0 0;
      font-size: 0.68rem;
      color: rgba(180, 198, 228, 0.45);
    }
  `,
})
export class PauseOverlayComponent {
  readonly levelLabel = input.required<string>();
  readonly worldName = input.required<string>();

  readonly resume = output<void>();
  readonly restart = output<void>();
  readonly quit = output<void>();
}
