import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type IconName =
  | 'star'
  | 'lock'
  | 'settings'
  | 'coin'
  | 'play'
  | 'pause'
  | 'back'
  | 'next'
  | 'check'
  | 'close'
  | 'flag'
  | 'bolt'
  | 'shield'
  | 'magnet'
  | 'trophy'
  | 'crown'
  | 'target'
  | 'sound'
  | 'vibrate';

const ICONS: Record<IconName, string[]> = {
  star: ['M12 2.2l2.9 6.1 6.7.9-4.9 4.6 1.3 6.7L12 17.4 5.9 20.5l1.3-6.7L2.3 9.2l6.8-.9z'],
  lock: [
    'M7 10V7a5 5 0 0110 0v3h1a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8a2 2 0 012-2h1zm2 0h6V7a3 3 0 10-6 0v3z',
  ],
  settings: [
    'M3 6h11v2H3zM17 6h4v2h-4zM3 16h5v2H3zM11 16h10v2H11zM14 4h2v6h-2zM6 14h2v6H6z',
  ],
  coin: [
    'M12 2a10 10 0 100 20 10 10 0 000-20zm0 2.4a7.6 7.6 0 110 15.2 7.6 7.6 0 010-15.2z',
    'M12 9.4a2.6 2.6 0 100 5.2 2.6 2.6 0 000-5.2z',
  ],
  play: ['M8 5.2v13.6l11-6.8z'],
  pause: ['M7 5h4v14H7zM13 5h4v14h-4z'],
  back: ['M15.4 4.6 8 12l7.4 7.4-1.4 1.4L5.2 12 14 3.2z'],
  next: ['M8.6 4.6 17.4 12l-8.8 7.4-1.4-1.4L13.8 12 7.2 6z'],
  check: ['M9.5 17.6 4 12l1.4-1.4 4.1 4.1L18.6 5.6 20 7z'],
  close: [
    'M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4z',
  ],
  flag: ['M6 3h2v18H6zM9 5h9.6l-2.2 4 2.2 4H9z'],
  bolt: ['M13 2 4 14h6l-1 8 9-12h-6z'],
  shield: ['M12 2l8 3v7c0 5-3.5 8.6-8 10-4.5-1.4-8-5-8-10V5z'],
  magnet: ['M6 3v9a6 6 0 0012 0V3h-4v9a2 2 0 01-4 0V3z'],
  trophy: [
    'M7 4h10v3a5 5 0 01-4 4.9V15h3v2H8v-2h3v-3.1A5 5 0 017 7zM4 5h2v2a3 3 0 003 3v2a5 5 0 01-5-5zM20 5h-2v2a3 3 0 01-3 3v2a5 5 0 005-5zM6 19h12v2H6z',
  ],
  crown: ['M3 7l4 4 5-7 5 7 4-4-2 12H5z'],
  target: [
    'M12 2a10 10 0 100 20 10 10 0 000-20zm0 2.6a7.4 7.4 0 110 14.8 7.4 7.4 0 010-14.8zm0 3.4a4 4 0 110 8 4 4 0 010-8zm0 2.4a1.6 1.6 0 100 3.2 1.6 1.6 0 000-3.2z',
  ],
  sound: ['M4 9h4l5-4v14l-5-4H4zM16 8a5 5 0 010 8v-2a3 3 0 000-4z'],
  vibrate: ['M8 3h8v18H8zM10 6v12h4V6zM3 9h2v6H3zM19 9h2v6h-2z'],
};

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="currentColor"
      fill-rule="evenodd"
      aria-hidden="true"
      style="display:block"
    >
      @for (path of paths(); track $index) {
        <path [attr.d]="path" />
      }
    </svg>
  `,
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input(20);

  protected readonly paths = computed(() => ICONS[this.name()] ?? []);
}
