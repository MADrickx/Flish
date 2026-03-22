import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStateService } from './auth-state.service';

export const bearerAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthStateService);
  const header = auth.getBearerHeader();
  if (header === null) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: header },
    }),
  );
};
