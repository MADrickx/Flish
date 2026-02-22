import { Injectable, computed, signal } from '@angular/core';

const USERNAME_KEY = 'flish.username';
const PASSWORD_KEY = 'flish.password';

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly usernameState = signal<string>(sessionStorage.getItem(USERNAME_KEY) ?? '');
  private readonly passwordState = signal<string>(sessionStorage.getItem(PASSWORD_KEY) ?? '');

  readonly username = computed(() => this.usernameState());
  readonly isAuthenticated = computed(() => this.usernameState() !== '' && this.passwordState() !== '');

  setCredentials(username: string, password: string): void {
    this.usernameState.set(username);
    this.passwordState.set(password);
    sessionStorage.setItem(USERNAME_KEY, username);
    sessionStorage.setItem(PASSWORD_KEY, password);
  }

  clear(): void {
    this.usernameState.set('');
    this.passwordState.set('');
    sessionStorage.removeItem(USERNAME_KEY);
    sessionStorage.removeItem(PASSWORD_KEY);
  }

  getBasicAuthHeader(): string | null {
    const username = this.usernameState();
    const password = this.passwordState();
    if (username === '' || password === '') {
      return null;
    }

    return `Basic ${btoa(`${username}:${password}`)}`;
  }
}

