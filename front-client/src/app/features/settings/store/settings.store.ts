import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { IndexStatus, SettingsApiService } from '../services/settings-api.service';

type SettingsState = {
  indexStatus: IndexStatus | null;
  loading: boolean;
  rebuilding: boolean;
  passwordMessage: string;
  passwordError: string;
};

const initialState: SettingsState = {
  indexStatus: null,
  loading: false,
  rebuilding: false,
  passwordMessage: '',
  passwordError: '',
};

export const SettingsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withMethods((store, api = inject(SettingsApiService)) => ({
    async loadStatus() {
      patchState(store, { loading: true });
      try {
        const status = await firstValueFrom(api.getIndexStatus());
        patchState(store, { indexStatus: status, loading: false });
      } catch {
        patchState(store, { loading: false });
      }
    },

    async rebuild() {
      patchState(store, { rebuilding: true });
      try {
        await firstValueFrom(api.rebuildIndex());
        const status = await firstValueFrom(api.getIndexStatus());
        patchState(store, { indexStatus: status, rebuilding: false });
      } catch {
        patchState(store, { rebuilding: false });
      }
    },

    async changePassword(currentPassword: string, newPassword: string) {
      patchState(store, { passwordMessage: '', passwordError: '' });
      try {
        const res = await firstValueFrom(api.changePassword(currentPassword, newPassword));
        patchState(store, { passwordMessage: res.message });
      } catch (e: unknown) {
        const msg = (e as { error?: { error?: string } })?.error?.error ?? 'Failed to change password';
        patchState(store, { passwordError: msg });
      }
    },

    clearPasswordMessages() {
      patchState(store, { passwordMessage: '', passwordError: '' });
    },
  })),
);
