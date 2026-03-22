import { HttpClient, HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError, Observable, EMPTY, Subject, filter, take } from 'rxjs';
import { AuthStateService } from '../auth/auth-state.service';

type RefreshResponse = {
  username: string;
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
};

let refreshInProgress = false;
const refreshResult$ = new Subject<boolean>();

const AUTH_URLS = ['/api/auth/login', '/api/auth/refresh'];

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthStateService);
  const router = inject(Router);
  const http = inject(HttpClient);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || AUTH_URLS.some((url) => req.url.includes(url))) {
        return throwError(() => error);
      }

      if (refreshInProgress) {
        return refreshResult$.pipe(
          filter((success) => success !== undefined),
          take(1),
          switchMap((success) => {
            if (!success) {
              return throwError(() => error);
            }
            return next(req.clone({ setHeaders: { Authorization: auth.getBearerHeader()! } }));
          }),
        );
      }

      const storedRefreshToken = auth.getRefreshToken();
      if (!storedRefreshToken) {
        auth.clear();
        void router.navigateByUrl('/login');
        return EMPTY;
      }

      refreshInProgress = true;

      return http.post<RefreshResponse>('/api/auth/refresh', { refreshToken: storedRefreshToken }).pipe(
        switchMap((response) => {
          auth.updateTokens(response.accessToken, response.refreshToken);
          refreshInProgress = false;
          refreshResult$.next(true);
          return next(req.clone({ setHeaders: { Authorization: `Bearer ${response.accessToken}` } }));
        }),
        catchError((refreshError: HttpErrorResponse) => {
          refreshInProgress = false;
          refreshResult$.next(false);
          auth.clear();
          void router.navigateByUrl('/login');
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
