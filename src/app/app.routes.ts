import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Gate Runner',
    loadComponent: () => import('./features/splash/splash.page').then((m) => m.SplashPage),
  },
  {
    path: 'menu',
    title: 'Gate Runner',
    loadComponent: () => import('./features/menu/menu.page').then((m) => m.MenuPage),
  },
  {
    path: 'campaign',
    title: 'Worlds - Gate Runner',
    loadComponent: () =>
      import('./features/campaign/campaign.page').then((m) => m.CampaignPage),
  },
  {
    path: 'modes',
    title: 'Modes - Gate Runner',
    loadComponent: () => import('./features/modes/modes.page').then((m) => m.ModesPage),
  },
  {
    path: 'shop',
    title: 'Shop - Gate Runner',
    loadComponent: () => import('./features/shop/shop.page').then((m) => m.ShopPage),
  },
  {
    path: 'upgrades',
    title: 'Upgrades - Gate Runner',
    loadComponent: () =>
      import('./features/upgrades/upgrades.page').then((m) => m.UpgradesPage),
  },
  {
    path: 'missions',
    title: 'Missions - Gate Runner',
    loadComponent: () =>
      import('./features/missions/missions.page').then((m) => m.MissionsPage),
  },
  {
    path: 'play/:worldId/:level',
    title: 'Run - Gate Runner',
    loadComponent: () =>
      import('./features/gameplay/gameplay.page').then((m) => m.GameplayPage),
  },
  {
    path: 'mode/:modeId',
    title: 'Run - Gate Runner',
    loadComponent: () =>
      import('./features/gameplay/gameplay.page').then((m) => m.GameplayPage),
  },
  { path: '**', redirectTo: '' },
];
