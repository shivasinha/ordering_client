import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { SSOAuthenticationService } from '@Ordering/auth/services/sso/sso-authentication.service';
import { map } from 'rxjs';

// [TODO]: This resolver should be used while fetching SSO config and should be implemented on login route
// Currently it is not being utilized/consumed
export const SsoAuthorizationConfigResolver: ResolveFn<any> = () => {
  return inject(SSOAuthenticationService)
    .getSsoAuthenticationConfig()
    .pipe(map(response => response));
};
