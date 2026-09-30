import { TestBed } from '@angular/core/testing';
import { CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ClientAuthenticationService } from '../services/client-authentication.service';
import { AuthenticationGuard } from './authentication.guard';

describe('AuthenticationGuard', () => {
  let mockClientAuthService: jest.Mocked<ClientAuthenticationService>;
  let mockRoute: ActivatedRouteSnapshot;
  let mockState: RouterStateSnapshot;

  const executeGuard: CanActivateFn = (...guardParameters) => TestBed.runInInjectionContext(() => AuthenticationGuard(...guardParameters));

  beforeEach(() => {
    mockClientAuthService = {
      isLoggedIn: false,
      isUserInfoExist: jest.fn(),
      resetAndNavigateToLogin: jest.fn(),
    } as any;

    mockRoute = {} as ActivatedRouteSnapshot;
    mockState = { url: '/test' } as RouterStateSnapshot;

    TestBed.configureTestingModule({
      providers: [{ provide: ClientAuthenticationService, useValue: mockClientAuthService }],
    });

    // Mock console methods
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });

  describe('Enhanced Authentication Guard Logic', () => {
    it('should allow access when user is logged in and has valid user info', () => {
      mockClientAuthService.isLoggedIn = true;
      mockClientAuthService.isUserInfoExist.mockReturnValue(true);

      const result = executeGuard(mockRoute, mockState);

      expect(result).toBe(true);
      expect(mockClientAuthService.resetAndNavigateToLogin).not.toHaveBeenCalled();
    });

    it('should deny access and redirect when user is not logged in', () => {
      mockClientAuthService.isLoggedIn = false;
      mockClientAuthService.isUserInfoExist.mockReturnValue(false);

      const result = executeGuard(mockRoute, mockState);

      expect(result).toBe(false);
      expect(mockClientAuthService.resetAndNavigateToLogin).toHaveBeenCalled();
    });

    it('should deny access when user is logged in but user info is missing', () => {
      mockClientAuthService.isLoggedIn = true;
      mockClientAuthService.isUserInfoExist.mockReturnValue(false);

      const result = executeGuard(mockRoute, mockState);

      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith('Authentication guard: User info missing - redirecting to login');
      expect(mockClientAuthService.resetAndNavigateToLogin).toHaveBeenCalled();
    });

    it('should deny access when user info exists but user is not logged in', () => {
      mockClientAuthService.isLoggedIn = false;
      mockClientAuthService.isUserInfoExist.mockReturnValue(true);

      const result = executeGuard(mockRoute, mockState);

      expect(result).toBe(false);
      expect(mockClientAuthService.resetAndNavigateToLogin).toHaveBeenCalled();
    });

    it('should handle authentication state inconsistencies', () => {
      // Simulate the case where browser cache was cleared
      mockClientAuthService.isLoggedIn = true; // Service thinks user is logged in
      mockClientAuthService.isUserInfoExist.mockReturnValue(false); // But localStorage is empty

      const result = executeGuard(mockRoute, mockState);

      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith('Authentication guard: User info missing - redirecting to login');
      expect(mockClientAuthService.resetAndNavigateToLogin).toHaveBeenCalled();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle rapid successive calls correctly', () => {
      mockClientAuthService.isLoggedIn = true;
      mockClientAuthService.isUserInfoExist.mockReturnValue(true);

      const result1 = executeGuard(mockRoute, mockState);
      const result2 = executeGuard(mockRoute, mockState);
      const result3 = executeGuard(mockRoute, mockState);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);
      expect(mockClientAuthService.resetAndNavigateToLogin).not.toHaveBeenCalled();
    });

    it('should handle service method exceptions gracefully', () => {
      // Mock console.error to prevent Jest setup from throwing
      const originalConsoleError = console.error;
      console.error = jest.fn();

      mockClientAuthService.isLoggedIn = true;
      mockClientAuthService.isUserInfoExist.mockImplementation(() => {
        throw new Error('Test error');
      });

      expect(() => {
        const result = executeGuard(mockRoute, mockState);
        expect(result).toBe(false);
      }).not.toThrow();

      expect(mockClientAuthService.resetAndNavigateToLogin).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith('Error in authentication guard:', expect.any(Error));

      // Restore original console.error
      console.error = originalConsoleError;
    });
  });

  describe('Guard Performance', () => {
    it('should not call resetAndNavigateToLogin multiple times for single call', () => {
      mockClientAuthService.isLoggedIn = false;
      mockClientAuthService.isUserInfoExist.mockReturnValue(false);

      executeGuard(mockRoute, mockState);

      expect(mockClientAuthService.resetAndNavigateToLogin).toHaveBeenCalledTimes(1);
    });

    it('should check user info only when user is logged in', () => {
      mockClientAuthService.isLoggedIn = false;

      executeGuard(mockRoute, mockState);

      expect(mockClientAuthService.isUserInfoExist).not.toHaveBeenCalled();
    });
  });
});
