import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadChildren: () => import('./features/files/files.routes').then((m) => m.filesRoutes)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
