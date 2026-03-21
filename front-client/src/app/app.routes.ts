import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { ShellComponent } from './core/layout/shell.component';

export const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },
  {
    path: '',
    canActivate: [authGuard],
    component: ShellComponent,
    children: [
      {
        path: 'files',
        loadChildren: () => import('./features/files/files.routes').then((m) => m.filesRoutes),
      },
      {
        path: 'video',
        loadChildren: () => import('./features/video/video.routes').then((m) => m.videoRoutes),
      },
      {
        path: 'audio',
        loadChildren: () => import('./features/audio/audio.routes').then((m) => m.audioRoutes),
      },
      {
        path: 'photos',
        loadChildren: () => import('./features/photos/photos.routes').then((m) => m.photosRoutes),
      },
      {
        path: 'settings',
        loadChildren: () => import('./features/settings/settings.routes').then((m) => m.settingsRoutes),
      },
      {
        path: '',
        redirectTo: 'files',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
