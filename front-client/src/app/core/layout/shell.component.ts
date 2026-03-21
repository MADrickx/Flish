import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthStateService } from '../auth/auth-state.service';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  styleUrl: './shell.component.css',
  template: `
    <nav class="sidebar">
      <div class="brand">Flish</div>

      <ul class="nav-links">
        @for (link of navLinks; track link.path) {
          <li>
            <a [routerLink]="link.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: link.exact }">
              <span class="icon" aria-hidden="true">{{ link.icon }}</span>
              {{ link.label }}
            </a>
          </li>
        }
      </ul>

      <div class="sidebar-footer">
        <button class="theme-toggle" type="button" (click)="theme.toggle()" [title]="theme.current() === 'dark' ? 'Switch to light' : 'Switch to dark'">
          {{ theme.current() === 'dark' ? '☀' : '🌙' }}
        </button>
        <span class="user-badge">{{ auth.username() }}</span>
        <button class="btn-logout" type="button" (click)="logout()">Logout</button>
      </div>
    </nav>

    <main class="content">
      <router-outlet />
    </main>
  `,
})
export class ShellComponent {
  protected readonly auth = inject(AuthStateService);
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  protected readonly navLinks = [
    { path: '/files', label: 'Files', icon: '📁', exact: true },
    { path: '/video', label: 'Video', icon: '🎬', exact: false },
    { path: '/audio', label: 'Audio', icon: '🎵', exact: false },
    { path: '/photos', label: 'Photos', icon: '📷', exact: false },
    { path: '/settings', label: 'Settings', icon: '⚙', exact: false },
  ];

  protected logout(): void {
    this.auth.clear();
    void this.router.navigateByUrl('/login');
  }
}
