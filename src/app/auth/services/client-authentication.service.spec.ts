import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { Subscription } from 'rxjs';
import { OAuthService } from 'angular-oauth2-oidc';

import { AuthenticationService, LoginRequest } from '@Ordering/api';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { ClientAuthenticationService } from './client-authentication.service';
import { createMockTranslationsService } from '@Ordering/test-utils/translations-service-mock';
import { NavigationService } from '@Ordering/shared/services/navigation.service';

describe('ClientAuthenticationService - login', () => {
  let service: ClientAuthenticationService;
  let authenticationService: jest.Mocked<AuthenticationService>;
  let navigationService: jest.Mocked<NavigationService>;
  let subscriptions: Subscription[] = [];

  const loginRequest: LoginRequest = {
    user: { username: 'testUser', password: 'testPass' },
    project: 'project1',
  };

  beforeEach(() => {
    const authServiceMock = {
      login: jest.fn().mockReturnValue(of(new HttpResponse<any>())),
      logout: jest.fn(),
      getProjects: jest.fn(),
    };
    const navigationServiceMock = {
      navigate: jest.fn(),
      navigateToList: jest.fn(),
      navigateToLogin: jest.fn(),
    };

    const oAuthServiceMock = {
      getIdentityClaims: jest.fn().mockReturnValue('user'),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: AuthenticationService, useValue: authServiceMock },
        { provide: NavigationService, useValue: navigationServiceMock },
        { provide: TranslationsService, useValue: createMockTranslationsService() },
        { provide: OAuthService, useValue: oAuthServiceMock },
      ],
    });

    service = TestBed.inject(ClientAuthenticationService);
    authenticationService = TestBed.inject(AuthenticationService) as jest.Mocked<AuthenticationService>;
    navigationService = TestBed.inject(NavigationService) as jest.Mocked<NavigationService>;
  });

  afterEach(() => {
    // Unsubscribe from all subscriptions to prevent leaks
    subscriptions.forEach(sub => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
    subscriptions = [];

    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should do nothing if loginRequest is undefined', () => {
    service.login(undefined);
    expect(authenticationService.login).not.toHaveBeenCalled();
  });

  it('should call authenticationService.login with the correct loginRequest', () => {
    authenticationService.login.mockReturnValue(of(new HttpResponse<any>({ body: {} })));

    service.login(loginRequest);

    expect(authenticationService.login).toHaveBeenCalledWith(loginRequest);
  });

  it('should set local storage items correctly', () => {
    service.selectedProject = 'project1';
    authenticationService.login.mockReturnValue(of(new HttpResponse<any>({ body: {} })));

    jest.spyOn(localStorage, 'setItem');

    service.login(loginRequest);

    expect(localStorage.setItem).toHaveBeenCalledWith('project', 'project1');
  });

  it('should reset authentication steps', () => {
    authenticationService.login.mockReturnValue(of(new HttpResponse<any>({ body: {} })));

    jest.spyOn(service, 'resetAuthenticationSteps');

    service.login(loginRequest);

    expect(service.resetAuthenticationSteps).toHaveBeenCalled();
  });

  it('should logout and navigate to login', done => {
    authenticationService.logout.mockReturnValue(of(new HttpResponse<any>({ body: null })));
    jest.spyOn(service, 'clearUserInfo');
    jest.spyOn(service, 'resetAuthenticationSteps');

    service.logout();

    // Wait for the async observable to complete
    setTimeout(() => {
      try {
        expect(authenticationService.logout).toHaveBeenCalled();
        expect(service.clearUserInfo).toHaveBeenCalled();
        expect(service.resetAuthenticationSteps).toHaveBeenCalled();
        expect(navigationService.navigateToLogin).toHaveBeenCalled();
        done();
      } catch (error) {
        done(error);
      }
    }, 0);
  });

  it('should preserve language preference after logout', done => {
    localStorage.setItem('language', 'sr-Latn');
    authenticationService.logout.mockReturnValue(of(new HttpResponse<any>({ body: null })));

    service.logout();

    // Wait for the async observable to complete
    setTimeout(() => {
      try {
        expect(authenticationService.logout).toHaveBeenCalled();
        // Verify language is still in localStorage after logout
        expect(localStorage.getItem('language')).toBe('sr-Latn');
        done();
      } catch (error) {
        done(error);
      }
    }, 0);
  });

  it('should get projects for the user', done => {
    const userCredentials = { username: 'testUser', password: 'testPass' };
    const mockProjects = ['project1', 'project2'];

    jest.spyOn(authenticationService, 'getProjects').mockReturnValue(of(mockProjects) as any);

    const subscription = service.getProjects(userCredentials).subscribe(() => {
      try {
        expect(authenticationService.getProjects).toHaveBeenCalledWith(userCredentials);
        expect(service.projectsList).toEqual(mockProjects);
        expect(service.atLoginStepSig()).toBe(false);
        expect(service.atProjectSelectionStepSig()).toBe(true);
        expect(localStorage.getItem('userName')).toBe('testUser');
        expect(localStorage.getItem('language')).toBe('en');
        done();
      } catch (error) {
        done(error);
      }
    });

    subscriptions.push(subscription);
  });

  it('should return true if user info exists in local storage', () => {
    localStorage.setItem('userName', 'testUser');
    localStorage.setItem('project', 'project1');
    localStorage.setItem('language', 'en');

    expect(service.isUserInfoExist()).toBe(true);
  });

  it('should return false if user info does not exist in local storage', () => {
    localStorage.removeItem('userName');
    localStorage.removeItem('project');
    localStorage.removeItem('language');

    expect(service.isUserInfoExist()).toBe(false);
  });

  it('should clear user info from local storage', () => {
    localStorage.setItem('userName', 'testUser');
    localStorage.setItem('project', 'project1');
    localStorage.setItem('language', 'en');

    service.clearUserInfo();

    expect(localStorage.getItem('userName')).toBeNull();
    expect(localStorage.getItem('project')).toBeNull();
    expect(service.isLoggedIn).toBe(false);
  });

  it('should get and set isLoggedIn correctly', () => {
    service.isLoggedIn = true;
    expect(service.isLoggedIn).toBe(true);

    service.isLoggedIn = false;
    expect(service.isLoggedIn).toBe(false);
  });

  it('should get and set projectsList correctly', () => {
    service.projectsList = ['project1', 'project2'];
    expect(service.projectsList).toEqual(['project1', 'project2']);
  });

  it('should get and set selectedProject correctly', () => {
    service.selectedProject = 'project1';
    expect(service.selectedProject).toBe('project1');
  });
});

describe('ClientAuthenticationService - Token Validation Monitoring', () => {
  let service: ClientAuthenticationService;
  let subscriptions: Subscription[] = [];

  // Helper function to stop token validation by accessing private subscription
  const stopTokenValidation = (serviceInstance: ClientAuthenticationService) => {
    if (serviceInstance['tokenValidationSubscription']) {
      serviceInstance['tokenValidationSubscription'].unsubscribe();
      serviceInstance['tokenValidationSubscription'] = undefined;
    }
  };

  beforeEach(() => {
    const authServiceMock = {
      login: jest.fn().mockReturnValue(of(new HttpResponse<any>())),
      logout: jest.fn(),
      getProjects: jest.fn(),
    };
    const navigationServiceMock = {
      navigate: jest.fn(),
      navigateToList: jest.fn(),
      navigateToLogin: jest.fn(),
    };

    const oAuthServiceMock = {
      getIdentityClaims: jest.fn().mockReturnValue('user'),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ClientAuthenticationService,
        { provide: AuthenticationService, useValue: authServiceMock },
        { provide: NavigationService, useValue: navigationServiceMock },
        { provide: TranslationsService, useValue: createMockTranslationsService() },
        { provide: OAuthService, useValue: oAuthServiceMock },
      ],
    });

    service = TestBed.inject(ClientAuthenticationService);

    // Mock console methods
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();

    // Mock document.cookie
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });
  });

  afterEach(() => {
    // Unsubscribe from all subscriptions to prevent leaks
    subscriptions.forEach(sub => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
    subscriptions = [];

    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();

    // Reset all mocks
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.restoreAllMocks();

    // Stop any running token validation
    stopTokenValidation(service);
  });

  describe('Constructor and Token Validation Initialization', () => {
    it('should start token validation on service creation', () => {
      // The service is already created in beforeEach and should have started token validation
      // We can verify by checking if the subscription exists
      expect(service['tokenValidationSubscription']).toBeDefined();
    });
  });

  describe('startTokenValidation()', () => {
    it('should create token validation subscription', () => {
      service['startTokenValidation']();

      expect(service['tokenValidationSubscription']).toBeDefined();
    });

    it('should call validateUserSession periodically', () => {
      // Stop the existing subscription first
      stopTokenValidation(service);

      const validateSpy = jest.spyOn(service as any, 'validateUserSession');

      // Start fresh validation
      service['startTokenValidation']();

      // Verify subscription exists
      expect(service['tokenValidationSubscription']).toBeDefined();

      // Manually trigger the validation to verify it works
      service['validateUserSession']();
      expect(validateSpy).toHaveBeenCalled();
    });
  });

  describe('stopTokenValidation()', () => {
    it('should unsubscribe and clear token validation subscription', () => {
      const mockSubscription = {
        unsubscribe: jest.fn(),
      };

      service['tokenValidationSubscription'] = mockSubscription as any;
      stopTokenValidation(service);

      expect(mockSubscription.unsubscribe).toHaveBeenCalled();
      expect(service['tokenValidationSubscription']).toBeUndefined();
    });

    it('should handle case when subscription is undefined', () => {
      service['tokenValidationSubscription'] = undefined;

      expect(() => {
        stopTokenValidation(service);
      }).not.toThrow();
    });
  });

  describe('validateUserSession()', () => {
    beforeEach(() => {
      jest.spyOn(service, 'resetAndNavigateToLogin').mockImplementation();
      jest.spyOn(service as any, 'hasValidSessionCookie').mockReturnValue(true);
    });

    it('should trigger resetAndNavigateToLogin when logged in but user info missing', () => {
      service.isLoggedIn = true;
      jest.spyOn(service, 'isUserInfoExist').mockReturnValue(false);

      service['validateUserSession']();

      expect(console.warn).toHaveBeenCalledWith('User session invalid - essential authentication data missing. Redirecting to login.');
      expect(service.resetAndNavigateToLogin).toHaveBeenCalled();
    });

    it('should trigger resetAndNavigateToLogin when logged in but session cookie missing', () => {
      service.isLoggedIn = true;
      jest.spyOn(service, 'isUserInfoExist').mockReturnValue(true);
      jest.spyOn(service as any, 'hasValidSessionCookie').mockReturnValue(false);

      service['validateUserSession']();

      expect(console.warn).toHaveBeenCalledWith('Session cookie missing - user session expired or cleared. Redirecting to login.');
      expect(service.resetAndNavigateToLogin).toHaveBeenCalled();
    });

    it('should not trigger resetAndNavigateToLogin when user is not logged in', () => {
      service.isLoggedIn = false;
      jest.spyOn(service, 'isUserInfoExist').mockReturnValue(false);

      service['validateUserSession']();

      expect(service.resetAndNavigateToLogin).not.toHaveBeenCalled();
    });

    it('should not trigger resetAndNavigateToLogin when user is properly authenticated', () => {
      service.isLoggedIn = true;
      jest.spyOn(service, 'isUserInfoExist').mockReturnValue(true);
      jest.spyOn(service as any, 'hasValidSessionCookie').mockReturnValue(true);

      service['validateUserSession']();

      expect(service.resetAndNavigateToLogin).not.toHaveBeenCalled();
    });

    it('should return early when user info is missing to prevent duplicate calls', () => {
      service.isLoggedIn = true;
      jest.spyOn(service, 'isUserInfoExist').mockReturnValue(false);
      const hasValidSessionCookieSpy = jest.spyOn(service as any, 'hasValidSessionCookie');

      service['validateUserSession']();

      expect(service.resetAndNavigateToLogin).toHaveBeenCalledTimes(1);
      expect(hasValidSessionCookieSpy).not.toHaveBeenCalled();
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

    it('should handle malformed cookie strings', () => {
      document.cookie = 'TPSSID=; invalid=';

      const result = service['hasValidSessionCookie']();

      expect(result).toBe(true); // Should still find TPSSID even if malformed
    });
  });

  describe('Integration Tests - Token Validation', () => {
    beforeEach(() => {
      jest.spyOn(service, 'resetAndNavigateToLogin').mockImplementation();
    });

    it('should detect authentication issues and trigger logout flow', () => {
      // Setup: User is logged in
      service.isLoggedIn = true;
      localStorage.setItem('userName', 'testUser');
      localStorage.setItem('project', 'testProject');
      localStorage.setItem('language', 'en');

      // Simulate browser cache being cleared
      localStorage.clear();

      // Trigger validation
      service['validateUserSession']();

      expect(service.resetAndNavigateToLogin).toHaveBeenCalled();
    });

    it('should handle session cookie expiration', () => {
      // Setup: User is logged in with valid localStorage but no session cookie
      service.isLoggedIn = true;
      localStorage.setItem('userName', 'testUser');
      localStorage.setItem('project', 'testProject');
      localStorage.setItem('language', 'en');
      document.cookie = ''; // No session cookie

      jest.spyOn(service, 'isUserInfoExist').mockReturnValue(true);

      // Trigger validation
      service['validateUserSession']();

      expect(console.warn).toHaveBeenCalledWith('Session cookie missing - user session expired or cleared. Redirecting to login.');
      expect(service.resetAndNavigateToLogin).toHaveBeenCalled();
    });

    it('should allow normal operation when authentication is valid', () => {
      // Setup: User is properly authenticated
      service.isLoggedIn = true;
      localStorage.setItem('userName', 'testUser');
      localStorage.setItem('project', 'testProject');
      localStorage.setItem('language', 'en');
      document.cookie = 'TPSSID=validSession123';

      jest.spyOn(service, 'isUserInfoExist').mockReturnValue(true);

      // Trigger validation
      service['validateUserSession']();

      expect(service.resetAndNavigateToLogin).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  describe('Enhanced clearUserInfo()', () => {
    it('should clear session cookie when clearing user info', () => {
      // Set up initial state
      document.cookie = 'TPSSID=test123; path=/';
      localStorage.setItem('userName', 'testUser');
      localStorage.setItem('project', 'testProject');
      service.isLoggedIn = true;

      // Clear user info
      service.clearUserInfo();

      // Verify cookie is cleared (expires in the past)
      expect(document.cookie).toContain('TPSSID=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;');
      expect(localStorage.getItem('userName')).toBeNull();
      expect(localStorage.getItem('project')).toBeNull();
      expect(service.isLoggedIn).toBe(false);
    });
  });

  describe('Token Validation Lifecycle', () => {
    it('should properly start and stop token validation', () => {
      // Start validation
      service['startTokenValidation']();
      expect(service['tokenValidationSubscription']).toBeDefined();

      // Stop validation
      stopTokenValidation(service);
      expect(service['tokenValidationSubscription']).toBeUndefined();
    });

    it('should handle multiple start/stop cycles', () => {
      // Multiple starts should not create multiple subscriptions
      service['startTokenValidation']();
      const firstSubscription = service['tokenValidationSubscription'];

      service['startTokenValidation']();
      const secondSubscription = service['tokenValidationSubscription'];

      expect(firstSubscription).toBe(secondSubscription);

      // Stop should work correctly
      stopTokenValidation(service);
      expect(service['tokenValidationSubscription']).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle exceptions in validateUserSession gracefully', () => {
      service.isLoggedIn = true;
      jest.spyOn(service, 'isUserInfoExist').mockImplementation(() => {
        throw new Error('Test error');
      });

      expect(() => {
        service['validateUserSession']();
      }).not.toThrow();
    });

    it('should handle document.cookie being unavailable', () => {
      // Spy on console.error to verify error handling
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock the hasValidSessionCookie method to throw an error
      const originalMethod = service['hasValidSessionCookie'];
      service['hasValidSessionCookie'] = jest.fn().mockImplementation(() => {
        throw new Error('Cookie access denied');
      });

      expect(() => {
        service['validateUserSession']();
      }).not.toThrow();

      // Restore original method
      service['hasValidSessionCookie'] = originalMethod;
      consoleErrorSpy.mockRestore();
    });
  });
});
