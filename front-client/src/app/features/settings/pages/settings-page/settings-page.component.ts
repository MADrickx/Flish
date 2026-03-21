import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { SettingsStore } from '../../store/settings.store';

@Component({
  selector: 'app-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DatePipe],
  styleUrl: './settings-page.component.css',
  templateUrl: './settings-page.component.html',
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
