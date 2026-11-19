import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AdOverlayComponent } from './shared/ad-overlay';
import { JuiceOverlayComponent } from './shared/juice-overlay';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, AdOverlayComponent, JuiceOverlayComponent],
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {}
