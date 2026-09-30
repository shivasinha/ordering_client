import { Injectable, inject, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ClientAuthenticationService } from './client-authentication.service';

@Injectable({
  providedIn: 'root',
})
export class AuthMonitorService implements OnDestroy {
  private router = inject(Router);
  private clientAuthService = inject(ClientAuthenticationService);
  private subscriptions: Subscription[] = [];
  private isMonitoring = false;

  /**
   * Start comprehensive authentication monitoring
   * This includes periodic checks and route-based validation
   * @returns {void}
   */
  public startMonitoring(): void {
    if (this.isMonitoring) {
      return; // Already monitoring
    }

    this.isMonitoring = true;
    this.startPeriodicAuthCheck();
    this.startRouteMonitoring();
  }

  /**
   * Stop all authentication monitoring
   * @returns {void}
   */
  public stopMonitoring(): void {
    this.isMonitoring = false;

    // Unsubscribe from all subscriptions
    this.subscriptions.forEach(subscription => {
      if (subscription && !subscription.closed) {
        subscription.unsubscribe();
      }
    });

    // Clear the subscriptions array
    this.subscriptions = [];
  }

  ngOnDestroy(): void {
    this.stopMonitoring();
  }

  /**
   * Start periodic authentication validation
   * Checks every 2 seconds if user is still properly authenticated
   * @returns {void}
   */
  private startPeriodicAuthCheck(): void {
    const authCheckSubscription = interval(2000).subscribe(() => {
      this.validateAuthenticationState();
    });

    this.subscriptions.push(authCheckSubscription);
  }

  /**
   * Start monitoring route changes for authentication validation
   * @returns {void}
   */
  private startRouteMonitoring(): void {
    const routerSubscription = this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(event => {
      this.validateRouteAccess((event as NavigationEnd).url);
    });

    this.subscriptions.push(routerSubscription);
  }

  /**
   * Validate current authentication state
   * Checks for missing localStorage data or invalid session
   * @returns {void}
   */
  private validateAuthenticationState(): void {
    const isLoggedIn = this.clientAuthService.isLoggedIn;
    const hasUserInfo = this.clientAuthService.isUserInfoExist();
    const hasSessionCookie = this.hasValidSessionCookie();

    // Critical: User is marked as logged in but essential data is missing
    if (isLoggedIn && !hasUserInfo) {
      console.warn('Auth Monitor: Critical authentication data missing. Browser cache may have been cleared. Redirecting to login.');
      this.handleAuthenticationFailure('missing-user-info');
      return;
    }

    // Critical: User is logged in but session cookie is missing
    if (isLoggedIn && !hasSessionCookie) {
      console.warn('Auth Monitor: Session cookie missing. User session may have expired. Redirecting to login.');
      this.handleAuthenticationFailure('missing-session-cookie');
      return;
    }
  }

  /**
   * Validate if user can access the current route
   * @param {string} url - The current route URL
   * @returns {void}
   */
  private validateRouteAccess(url: string): void {
    // If on a protected route but authentication data is missing
    if (this.isProtectedRoute(url) && !this.clientAuthService.isUserInfoExist()) {
      console.warn(`Auth Monitor: Attempted access to protected route ${url} without valid authentication. Redirecting to login.`);
      this.handleAuthenticationFailure('protected-route-access');
    }
  }

  /**
   * Check if the session cookie (TPSSID) exists
   * @returns {boolean} True if session cookie exists, false otherwise
   */
  private hasValidSessionCookie(): boolean {
    return document.cookie.split(';').some(cookie => cookie.trim().startsWith('TPSSID='));
  }

  /**
   * Check if the current route is a protected route that requires authentication
   * @param {string} url - The current route URL
   * @returns {boolean} True if the route requires authentication
   */
  private isProtectedRoute(url: string): boolean {
    const protectedRoutes = ['/list', '/orders', '/train-run'];
    return protectedRoutes.some(route => url.startsWith(route));
  }

  /**
   * Handle authentication failure by logging user out and redirecting to login
   * @param {string} reason - The reason for authentication failure
   * @returns {void}
   */
  private handleAuthenticationFailure(reason: string): void {
    console.error(`Authentication failure detected: ${reason}. Clearing session and redirecting to login.`);

    // Stop monitoring to prevent multiple redirects
    this.stopMonitoring();

    // Clear all authentication data and redirect to login
    this.clientAuthService.resetAndNavigateToLogin();
  }
}
