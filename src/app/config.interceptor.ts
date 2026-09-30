import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from 'src/environments/environment';

/**
 * HTTP interceptor that transforms '/config' endpoint requests to use the environment base URI.
 */
export const configInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.url.includes('/config')) {
    const modifiedRequest = request.clone({
      url: `${environment.restBaseURI}/config`,
    });

    return next(modifiedRequest);
  }

  return next(request);
};
