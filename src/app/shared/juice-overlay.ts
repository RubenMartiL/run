import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { JuiceService } from './juice.service';

@Component({
  selector: 'app-juice-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="juice-layer" aria-hidden="true">
      @for (burst of juice.bursts(); track burst.id) {
        <div class="juice-burst">
          @for (particle of burst.particles; track $index) {
            <span
              class="jp"
              [class.round]="particle.round"
              [style.left.%]="particle.left"
              [style.width.px]="particle.size"
              [style.height.px]="particle.round ? particle.size : particle.size * 1.6"
              [style.background]="particle.color"
              [style.animation-delay.ms]="particle.delay"
              [style.--drift]="particle.drift + 'px'"
              [style.--spin]="particle.spin + 'deg'"
            ></span>
          }
          @if (burst.label) {
            <span class="juice-label" [style.color]="burst.color">{{ burst.label }}</span>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .juice-layer {
      position: fixed;
      inset: 0;
      z-index: 90;
      pointer-events: none;
      overflow: hidden;
    }

    .juice-burst {
      position: absolute;
      inset: 0;
    }

    .jp {
      position: absolute;
      top: -24px;
      border-radius: 2px;
      opacity: 0;
      animation: juice-fall 1.55s cubic-bezier(0.2, 0.7, 0.35, 1) forwards;
      box-shadow: 0 0 10px -2px rgba(255, 255, 255, 0.4);
    }

    .jp.round {
      border-radius: 9999px;
    }

    @keyframes juice-fall {
      0% {
        transform: translate3d(0, -20px, 0) rotate(0deg) scale(0.6);
        opacity: 1;
      }
      55% {
        opacity: 1;
      }
      100% {
        transform: translate3d(var(--drift), 105dvh, 0) rotate(var(--spin)) scale(1);
        opacity: 0;
      }
    }

    .juice-label {
      position: absolute;
      left: 50%;
      top: 38%;
      transform: translateX(-50%);
      font-family: var(--font-display);
      font-size: 1.45rem;
      font-weight: 800;
      letter-spacing: 0.02em;
      white-space: nowrap;
      text-shadow:
        0 3px 0 rgba(8, 14, 26, 0.8),
        0 0 28px currentColor;
      animation: juice-label 1.5s cubic-bezier(0.2, 1.2, 0.3, 1) forwards;
    }

    @keyframes juice-label {
      0% {
        opacity: 0;
        transform: translateX(-50%) scale(0.5) translateY(20px);
      }
      22% {
        opacity: 1;
        transform: translateX(-50%) scale(1.1) translateY(0);
      }
      70% {
        opacity: 1;
        transform: translateX(-50%) scale(1) translateY(-10px);
      }
      100% {
        opacity: 0;
        transform: translateX(-50%) scale(0.96) translateY(-46px);
      }
    }
  `,
})
export class JuiceOverlayComponent {
  protected readonly juice = inject(JuiceService);
}
