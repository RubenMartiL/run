import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { AudioService } from './core/audio/audio.service';
import { HapticsService } from './core/haptics/haptics.service';
import { MissionsService } from './core/retention/missions.service';
import { SaveService } from './core/save/save.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Load the profile before the first screen so deep links never run
    // against a default save, then hydrate audio/haptics/mission state.
    // Services are resolved synchronously before the first await so the
    // injection context is still valid.
    provideAppInitializer(() => {
      const save = inject(SaveService);
      const audio = inject(AudioService);
      const haptics = inject(HapticsService);
      const missions = inject(MissionsService);
      return save.init().then(() => {
        const settings = save.data().settings;
        audio.setEnabled(settings.sound);
        audio.setMusicEnabled(settings.music);
        haptics.setEnabled(settings.haptics);
        missions.ensureDaily();
      });
    }),
  ],
};
