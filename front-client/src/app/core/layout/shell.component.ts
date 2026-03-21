import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthStateService } from '../auth/auth-state.service';

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
        <span class="user-badge">{{ auth.username() }}</span>
        <button class="btn ghost" type="button" (click)="logout()">Logout</button>
      </div>
    </nav>

    <main class="content">
      <router-outlet />
    </main>
  `,
})
export class ShellComponent {
  protected readonly auth = inject(AuthStateService);
  private readonly router = inject(Router);

  protected readonly navLinks = [
    { path: '/files', label: 'Files', icon: '📁', exact: true },
    { path: '/video', label: 'Video', icon: '🎬', exact: false },
    { path: '/audio', label: 'Audio', icon: '🎵', exact: false },
    { path: '/photos', label: 'Photos', icon: '📷', exact: false },
  ];

  protected logout(): void {
    this.auth.clear();
    void this.router.navigateByUrl('/login');
  }
}
