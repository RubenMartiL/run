import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MonetizationService } from '../core/monetization/monetization.service';
import { IconComponent } from './icon';

@Component({
  selector: 'app-ad-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    @if (ads.overlay(); as overlay) {
      <div class="ad-overlay">
        <div class="ad-card">
          <span class="ad-badge">{{ overlay.kind === 'purchase' ? 'STORE' : 'AD' }}</span>
          <h2 class="display">{{ overlay.title }}</h2>
          <p>{{ overlay.subtitle }}</p>
          <div class="spinner">
            <span></span><span></span><span></span>
          </div>
          <div class="ad-foot">
            <app-icon name="coin" [size]="14" />
            Mock {{ overlay.kind === 'purchase' ? 'purchase' : 'ad' }} — native SDK plugs in here
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .ad-overlay {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      background: rgba(3, 6, 12, 0.82);
      backdrop-filter: blur(8px);
    }

    .ad-card {
      width: 100%;
      max-width: 320px;
      border-radius: 1.6rem;
      padding: 1.4rem 1.2rem 1rem;
      text-align: center;
      background: linear-gradient(180deg, #1c2945, #101828);
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.9);
    }

    .ad-badge {
      display: inline-block;
      font-family: var(--font-display);
      font-size: 0.58rem;
      font-weight: 800;
      letter-spacing: 0.24em;
      color: #0d1730;
      background: #ffd447;
      border-radius: 9999px;
      padding: 0.2rem 0.6rem;
      margin-bottom: 0.6rem;
    }

    h2 {
      margin: 0;
      font-size: 1.35rem;
      letter-spacing: 0.03em;
    }

    p {
      margin: 0.3rem 0 1rem;
      font-size: 0.78rem;
      font-weight: 700;
      color: rgba(190, 208, 238, 0.65);
    }

    .spinner {
      display: flex;
      justify-content: center;
      gap: 0.35rem;
      margin-bottom: 1.1rem;
    }

    .spinner span {
      width: 9px;
      height: 9px;
      border-radius: 9999px;
      background: #8cf03a;
      animation: bounce 900ms ease-in-out infinite;
    }

    .spinner span:nth-child(2) {
      animation-delay: 120ms;
      background: #5b8cff;
    }

    .spinner span:nth-child(3) {
      animation-delay: 240ms;
      background: #ffd447;
    }

    @keyframes bounce {
      0%,
      100% {
        transform: translateY(0);
        opacity: 0.4;
      }
      50% {
        transform: translateY(-7px);
        opacity: 1;
      }
    }

    .ad-foot {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.3rem;
      font-size: 0.6rem;
      color: rgba(160, 180, 215, 0.45);
      border-top: 1px solid rgba(255, 255, 255, 0.07);
      padding-top: 0.6rem;
    }
  `,
})
export class AdOverlayComponent {
  protected readonly ads = inject(MonetizationService);
}
