import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStateService } from './auth-state.service';

export const basicAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthStateService);
  const header = auth.getBasicAuthHeader();
  if (header === null) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: header }
    })
  );
};

