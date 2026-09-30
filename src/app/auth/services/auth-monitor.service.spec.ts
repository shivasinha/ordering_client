import { TestBed } from '@angular/core/testing';
import { Router, NavigationEnd, NavigationStart } from '@angular/router';
import { Subject } from 'rxjs';
import { AuthMonitorService } from './auth-monitor.service';
import { ClientAuthenticationService } from './client-authentication.service';

describe('AuthMonitorService', () => {
  let service: AuthMonitorService;
  let mockRouter: jest.Mocked<Router>;
  let mockClientAuthService: jest.Mocked<ClientAuthenticationService>;
  let routerEventsSubject: Subject<any>;

  beforeEach(() => {
    // Mock router events subject
    routerEventsSubject = new Subject();

    // Create mock router
    mockRouter = {
      events: routerEventsSubject.asObservable(),
    } as any;

    // Create mock client auth service
    mockClientAuthService = {
      isLoggedIn: false,
      isUserInfoExist: jest.fn(),
      resetAndNavigateToLogin: jest.fn(),
    } as any;

    TestBed.configureTestingModule({
      providers: [
        AuthMonitorService,
        { provide: Router, useValue: mockRouter },
        { provide: ClientAuthenticationService, useValue: mockClientAuthService },
      ],
    });

    service = TestBed.inject(AuthMonitorService);

    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();

    // Mock document.cookie
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });

    // Mock setTimeout
    jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
      callback();
      return 1 as any;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should not be monitoring initially', () => {
      expect(service['isMonitoring']).toBe(false);
    });
  });

  describe('startMonitoring()', () => {
    it('should start monitoring when not already monitoring', () => {
      const startPeriodicSpy = jest.spyOn(service as any, 'startPeriodicAuthCheck');
      const startRouteSpy = jest.spyOn(service as any, 'startRouteMonitoring');

      service.startMonitoring();

      expect(service['isMonitoring']).toBe(true);
      expect(startPeriodicSpy).toHaveBeenCalled();
      expect(startRouteSpy).toHaveBeenCalled();
    });

    it('should not start monitoring if already monitoring', () => {
      const startPeriodicSpy = jest.spyOn(service as any, 'startPeriodicAuthCheck');
      const startRouteSpy = jest.spyOn(service as any, 'startRouteMonitoring');

      service['isMonitoring'] = true;
      service.startMonitoring();

      expect(startPeriodicSpy).not.toHaveBeenCalled();
      expect(startRouteSpy).not.toHaveBeenCalled();
    });
  });

  describe('stopMonitoring()', () => {
    it('should stop monitoring and clean up subscriptions', () => {
      // Add some mock subscriptions
      const mockSubscription1 = { unsubscribe: jest.fn(), closed: false };
      const mockSubscription2 = { unsubscribe: jest.fn(), closed: false };
      service['subscriptions'] = [mockSubscription1, mockSubscription2] as any;

      service['isMonitoring'] = true;
      service.stopMonitoring();

      expect(service['isMonitoring']).toBe(false);
      expect(mockSubscription1.unsubscribe).toHaveBeenCalled();
      expect(mockSubscription2.unsubscribe).toHaveBeenCalled();
      expect(service['subscriptions']).toEqual([]);
    });

    it('should handle undefined subscriptions gracefully', () => {
      service['subscriptions'] = [undefined, null] as any;
      service['isMonitoring'] = true;

      expect(() => {
        service.stopMonitoring();
      }).not.toThrow();

      expect(service['isMonitoring']).toBe(false);
      expect(service['subscriptions']).toEqual([]);
    });

    it('should handle already closed subscriptions', () => {
      const mockSubscription = { unsubscribe: jest.fn(), closed: true };
      service['subscriptions'] = [mockSubscription] as any;

      service.stopMonitoring();

      expect(mockSubscription.unsubscribe).not.toHaveBeenCalled();
      expect(service['subscriptions']).toEqual([]);
    });
  });

  describe('ngOnDestroy()', () => {
    it('should call stopMonitoring', () => {
      const stopSpy = jest.spyOn(service, 'stopMonitoring');

      service.ngOnDestroy();

      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('startPeriodicAuthCheck()', () => {
    it('should add subscription to subscriptions array', () => {
      const initialLength = service['subscriptions'].length;

      service['startPeriodicAuthCheck']();

      expect(service['subscriptions'].length).toBe(initialLength + 1);
      expect(service['subscriptions'][service['subscriptions'].length - 1]).toBeDefined();
    });

    it('should call validateAuthenticationState periodically', () => {
      jest.useFakeTimers();
      const validateSpy = jest.spyOn(service as any, 'validateAuthenticationState');

      service['startPeriodicAuthCheck']();

      // Fast-forward time to trigger interval
      jest.advanceTimersByTime(2100); // Slightly more than the 2000ms interval

      expect(validateSpy).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('startRouteMonitoring()', () => {
    it('should add router subscription to subscriptions array', () => {
      const initialLength = service['subscriptions'].length;

      service['startRouteMonitoring']();

      expect(service['subscriptions'].length).toBe(initialLength + 1);
      expect(service['subscriptions'][service['subscriptions'].length - 1]).toBeDefined();
    });

    it('should call validateRouteAccess on NavigationEnd events', () => {
      const validateSpy = jest.spyOn(service as any, 'validateRouteAccess');
      const mockNavigationEnd = new NavigationEnd(1, '/test-url', '/test-url');

      service['startRouteMonitoring']();
      routerEventsSubject.next(mockNavigationEnd);

      expect(validateSpy).toHaveBeenCalledWith('/test-url');
    });

    it('should ignore non-NavigationEnd events', () => {
      const validateSpy = jest.spyOn(service as any, 'validateRouteAccess');
      const mockNavigationStart = new NavigationStart(1, '/test-url');

      service['startRouteMonitoring']();
      routerEventsSubject.next(mockNavigationStart);

      expect(validateSpy).not.toHaveBeenCalled();
    });
  });

  describe('validateAuthenticationState()', () => {
    beforeEach(() => {
      jest.spyOn(service as any, 'hasValidSessionCookie').mockReturnValue(true);
      jest.spyOn(service as any, 'handleAuthenticationFailure').mockImplementation();
    });

    it('should handle missing user info when logged in', () => {
      mockClientAuthService.isLoggedIn = true;
      mockClientAuthService.isUserInfoExist.mockReturnValue(false);

      service['validateAuthenticationState']();

      expect(console.warn).toHaveBeenCalledWith(
        'Auth Monitor: Critical authentication data missing. Browser cache may have been cleared. Redirecting to login.',
      );
      expect(service['handleAuthenticationFailure']).toHaveBeenCalledWith('missing-user-info');
    });

    it('should handle missing session cookie when logged in', () => {
      mockClientAuthService.isLoggedIn = true;
      mockClientAuthService.isUserInfoExist.mockReturnValue(true);
      jest.spyOn(service as any, 'hasValidSessionCookie').mockReturnValue(false);

      service['validateAuthenticationState']();

      expect(console.warn).toHaveBeenCalledWith(
        'Auth Monitor: Session cookie missing. User session may have expired. Redirecting to login.',
      );
      expect(service['handleAuthenticationFailure']).toHaveBeenCalledWith('missing-session-cookie');
    });

    it('should not trigger authentication failure when user is not logged in', () => {
      mockClientAuthService.isLoggedIn = false;
      mockClientAuthService.isUserInfoExist.mockReturnValue(false);

      service['validateAuthenticationState']();

      expect(service['handleAuthenticationFailure']).not.toHaveBeenCalled();
    });

    it('should not trigger authentication failure when user is properly authenticated', () => {
      mockClientAuthService.isLoggedIn = true;
      mockClientAuthService.isUserInfoExist.mockReturnValue(true);
      jest.spyOn(service as any, 'hasValidSessionCookie').mockReturnValue(true);

      service['validateAuthenticationState']();

      expect(service['handleAuthenticationFailure']).not.toHaveBeenCalled();
    });
  });

  describe('validateRouteAccess()', () => {
    beforeEach(() => {
      jest.spyOn(service as any, 'isProtectedRoute');
      jest.spyOn(service as any, 'handleAuthenticationFailure').mockImplementation();
    });

    it('should trigger authentication failure for protected route without user info', () => {
      jest.spyOn(service as any, 'isProtectedRoute').mockReturnValue(true);
      mockClientAuthService.isUserInfoExist.mockReturnValue(false);

      service['validateRouteAccess']('/list/orders');

      expect(console.warn).toHaveBeenCalledWith(
        'Auth Monitor: Attempted access to protected route /list/orders without valid authentication. Redirecting to login.',
      );
      expect(service['handleAuthenticationFailure']).toHaveBeenCalledWith('protected-route-access');
    });

    it('should not trigger authentication failure for public routes', () => {
      jest.spyOn(service as any, 'isProtectedRoute').mockReturnValue(false);
      mockClientAuthService.isUserInfoExist.mockReturnValue(false);

      service['validateRouteAccess']('/login');

      expect(service['handleAuthenticationFailure']).not.toHaveBeenCalled();
    });

    it('should not trigger authentication failure for protected routes with valid user info', () => {
      jest.spyOn(service as any, 'isProtectedRoute').mockReturnValue(true);
      mockClientAuthService.isUserInfoExist.mockReturnValue(true);

      service['validateRouteAccess']('/list/orders');

      expect(service['handleAuthenticationFailure']).not.toHaveBeenCalled();
    });
  });

  describe('hasValidSessionCookie()', () => {
    it('should return true when TPSSID cookie exists', () => {
      document.cookie = 'TPSSID=abc123; path=/';

      const result = service['hasValidSessionCookie']();

      expect(result).toBe(true);
    });

    it('should return true when TPSSID cookie exists among other cookies', () => {
      document.cookie = 'other=value; TPSSID=abc123; another=test';

      const result = service['hasValidSessionCookie']();

      expect(result).toBe(true);
    });

    it('should return false when TPSSID cookie does not exist', () => {
      document.cookie = 'other=value; another=test';

      const result = service['hasValidSessionCookie']();

      expect(result).toBe(false);
    });

    it('should return false when no cookies exist', () => {
      document.cookie = '';

      const result = service['hasValidSessionCookie']();

      expect(result).toBe(false);
    });
  });

  describe('isProtectedRoute()', () => {
    it('should return true for /list routes', () => {
      expect(service['isProtectedRoute']('/list')).toBe(true);
      expect(service['isProtectedRoute']('/list/orders')).toBe(true);
      expect(service['isProtectedRoute']('/list/something')).toBe(true);
    });

    it('should return true for /orders routes', () => {
      expect(service['isProtectedRoute']('/orders')).toBe(true);
      expect(service['isProtectedRoute']('/orders/123')).toBe(true);
      expect(service['isProtectedRoute']('/orders/add')).toBe(true);
    });

    it('should return true for /train-run routes', () => {
      expect(service['isProtectedRoute']('/train-run')).toBe(true);
      expect(service['isProtectedRoute']('/train-run/123')).toBe(true);
    });

    it('should return false for public routes', () => {
      expect(service['isProtectedRoute']('/login')).toBe(false);
      expect(service['isProtectedRoute']('/public')).toBe(false);
      expect(service['isProtectedRoute']('/about')).toBe(false);
      expect(service['isProtectedRoute']('/')).toBe(false);
    });
  });

  describe('handleAuthenticationFailure()', () => {
    beforeEach(() => {
      jest.spyOn(service, 'stopMonitoring').mockImplementation();
      jest.spyOn(service, 'startMonitoring').mockImplementation();
    });

    it('should log error and stop monitoring', () => {
      service['handleAuthenticationFailure']('test-reason');

      expect(console.error).toHaveBeenCalledWith(
        'Authentication failure detected: test-reason. Clearing session and redirecting to login.',
      );
      expect(service.stopMonitoring).toHaveBeenCalled();
    });

    it('should call resetAndNavigateToLogin', () => {
      service['handleAuthenticationFailure']('test-reason');

      expect(mockClientAuthService.resetAndNavigateToLogin).toHaveBeenCalled();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete monitoring lifecycle', () => {
      // Start monitoring
      service.startMonitoring();
      expect(service['isMonitoring']).toBe(true);

      // Simulate authentication failure
      mockClientAuthService.isLoggedIn = true;
      mockClientAuthService.isUserInfoExist.mockReturnValue(false);

      service['validateAuthenticationState']();

      expect(mockClientAuthService.resetAndNavigateToLogin).toHaveBeenCalled();
    });

    it('should handle route navigation with authentication failure', () => {
      service.startMonitoring();
      mockClientAuthService.isUserInfoExist.mockReturnValue(false);

      // Simulate navigation to protected route
      const mockNavigationEnd = new NavigationEnd(1, '/list/orders', '/list/orders');
      routerEventsSubject.next(mockNavigationEnd);

      expect(mockClientAuthService.resetAndNavigateToLogin).toHaveBeenCalled();
    });
  });
});
