import { Injectable, computed, signal } from '@angular/core';

const USERNAME_KEY = 'flish.username';
const ACCESS_TOKEN_KEY = 'flish.accessToken';
const REFRESH_TOKEN_KEY = 'flish.refreshToken';

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly usernameState = signal<string>(sessionStorage.getItem(USERNAME_KEY) ?? '');
  private readonly accessTokenState = signal<string>(sessionStorage.getItem(ACCESS_TOKEN_KEY) ?? '');
  private readonly refreshTokenState = signal<string>(sessionStorage.getItem(REFRESH_TOKEN_KEY) ?? '');

  readonly username = computed(() => this.usernameState());
  readonly accessToken = computed(() => this.accessTokenState());
  readonly isAuthenticated = computed(() => this.usernameState() !== '' && this.accessTokenState() !== '');

  setSession(username: string, accessToken: string, refreshToken: string): void {
    this.usernameState.set(username);
    this.accessTokenState.set(accessToken);
    this.refreshTokenState.set(refreshToken);
    sessionStorage.setItem(USERNAME_KEY, username);
    sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  updateTokens(accessToken: string, refreshToken: string): void {
    this.accessTokenState.set(accessToken);
    this.refreshTokenState.set(refreshToken);
    sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  clear(): void {
    this.usernameState.set('');
    this.accessTokenState.set('');
    this.refreshTokenState.set('');
    sessionStorage.removeItem(USERNAME_KEY);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  getBearerHeader(): string | null {
    const token = this.accessTokenState();
    if (token === '') {
      return null;
    }
    return `Bearer ${token}`;
  }

  getRefreshToken(): string {
    return this.refreshTokenState();
  }
}
