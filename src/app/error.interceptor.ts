import { HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export const errorInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error('HTTP Error:', error);
      return throwError(() => error || 'An unexpected error occurred.');
    }),
  );
};
