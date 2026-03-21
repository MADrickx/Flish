import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthStateService } from '../auth/auth-state.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthStateService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        auth.clear();
        router.navigateByUrl('/login');
      }
      return throwError(() => error);
    }),
  );
};
