import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { SettingsStore } from '../store/settings.store';

@Component({
  selector: 'app-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DatePipe],
  styleUrl: './settings-page.component.css',
  template: `
    <section class="container">
      <h1>Settings</h1>

      <div class="card">
        <h2>Index Status</h2>
        @if (store.loading()) {
          <p class="state">Loading...</p>
        } @else if (store.indexStatus(); as status) {
          <dl class="status-grid">
            <dt>Running</dt>
            <dd>{{ status.isRunning ? 'Yes' : 'No' }}</dd>
            <dt>Last completed</dt>
            <dd>{{ status.lastCompletedAtUtc ? (status.lastCompletedAtUtc | date: 'medium') : 'Never' }}</dd>
            <dt>Files seen</dt>
            <dd>{{ status.lastSeenFiles }}</dd>
            <dt>Files indexed</dt>
            <dd>{{ status.lastUpsertedFiles }}</dd>
            <dt>Files removed</dt>
            <dd>{{ status.lastSoftDeletedFiles }}</dd>
            @if (status.lastError) {
              <dt>Error</dt>
              <dd class="error">{{ status.lastError }}</dd>
            }
          </dl>
        } @else {
          <p class="state">No status available.</p>
        }
        <button class="btn primary" type="button" (click)="store.rebuild()" [disabled]="store.rebuilding()">
          {{ store.rebuilding() ? 'Rebuilding...' : 'Rebuild Index' }}
        </button>
      </div>

      <div class="card">
        <h2>Change Password</h2>
        <form class="password-form" (ngSubmit)="onChangePassword()">
          <label>
            Current password
            <input type="password" name="current" [(ngModel)]="currentPassword" required />
          </label>
          <label>
            New password (min 8 characters)
            <input type="password" name="newPwd" [(ngModel)]="newPassword" required minlength="8" />
          </label>
          <button class="btn primary" type="submit">Change Password</button>
        </form>
        @if (store.passwordMessage()) {
          <p class="success">{{ store.passwordMessage() }}</p>
        }
        @if (store.passwordError()) {
          <p class="error">{{ store.passwordError() }}</p>
        }
      </div>
    </section>
  `,
})
export class SettingsPageComponent {
  protected readonly store = inject(SettingsStore);
  protected currentPassword = '';
  protected newPassword = '';

  constructor() {
    this.store.loadStatus();
  }

  protected onChangePassword(): void {
    this.store.changePassword(this.currentPassword, this.newPassword);
    this.currentPassword = '';
    this.newPassword = '';
  }
}
