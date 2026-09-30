import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { ClientAuthenticationService } from '@Ordering/auth/services/client-authentication.service';

export const AuthenticationGuard: CanActivateFn = () => {
  const clientAuthService = inject(ClientAuthenticationService);

  try {
    // Enhanced authentication check - verify both login status and essential data
    const isLoggedIn = clientAuthService.isLoggedIn;

    // If user is not logged in, trigger logout process and redirect
    if (!isLoggedIn) {
      clientAuthService.resetAndNavigateToLogin();
      return false;
    }

    // Only check user info if user is logged in
    const hasUserInfo = clientAuthService.isUserInfoExist();

    // If user is marked as logged in but essential authentication data is missing
    if (!hasUserInfo) {
      console.warn('Authentication guard: User info missing - redirecting to login');
      clientAuthService.resetAndNavigateToLogin();
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in authentication guard:', error);
    // On error, redirect to login for safety
    clientAuthService.resetAndNavigateToLogin();
    return false;
  }
};
