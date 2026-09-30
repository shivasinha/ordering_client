import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ClientAuthenticationService } from '@Ordering/auth/services/client-authentication.service';

export const LoginGuard: CanActivateFn = () => {
  const clientAuthService: ClientAuthenticationService = inject(ClientAuthenticationService);
  const router: Router = inject(Router);

  if (clientAuthService.isLoggedIn) {
    router.navigate(['/list']);
    return false;
  }
  return true;
};
