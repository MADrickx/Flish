import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthStateService } from '../../../../core/auth/auth-state.service';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './login-page.component.css',
  templateUrl: './login-page.component.html',
})
export class LoginPageComponent {
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  protected username = '';
  protected password = '';
  protected loading = signal(false);
  protected error = signal('');

  protected login(): void {
    this.loading.set(true);
    this.error.set('');

    this.authState.setCredentials(this.username.trim(), this.password);
    this.http.post('/api/auth/login', {}).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigateByUrl('/');
      },
      error: () => {
        this.authState.clear();
        this.loading.set(false);
        this.error.set('Invalid credentials.');
      }
    });
  }
}
