import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthStateService } from '../../auth/auth-state.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css',
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
