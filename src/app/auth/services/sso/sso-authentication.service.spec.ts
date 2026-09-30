import { TestBed } from '@angular/core/testing';
import { SSOAuthenticationService, authCodeFlowConfig } from './sso-authentication.service';
import { OAuthService } from 'angular-oauth2-oidc';
import { ConfigService, OidcProvider } from '@Ordering/api';
import { LoadingSpinnerService } from '@Ordering/shared/services/loading-spinner.service';
import { ClientAuthenticationService } from '../client-authentication.service';
import { Observable, of, Subscription } from 'rxjs';
import { HttpEvent } from '@angular/common/http';
import { TranslationsService } from '@Ordering/core/services/translations.service';

describe('SsoAuthenticationService', () => {
  let service: SSOAuthenticationService;
  let oauthServiceMock: jest.Mocked<OAuthService>;
  let configServiceMock: jest.Mocked<ConfigService>;
  let loadingSpinnerServiceMock: jest.Mocked<LoadingSpinnerService>;
  let clientAuthenticationServiceMock: jest.Mocked<ClientAuthenticationService>;
  let subscriptions: Subscription[] = [];

  beforeEach(() => {
    const translationsServiceMock = {
      translate: jest.fn(),
      deriveDefaultLanguageFromBrowserSettings: jest.fn().mockReturnValue('e'),
    };

    oauthServiceMock = {
      configure: jest.fn(),
      loadDiscoveryDocumentAndTryLogin: jest.fn().mockResolvedValue(true),
      loadDiscoveryDocument: jest.fn().mockResolvedValue(true),
      initCodeFlow: jest.fn(),
      tryLoginCodeFlow: jest.fn().mockResolvedValue(true),
      hasValidIdToken: jest.fn(),
      getIdToken: jest.fn().mockReturnValue('mockToken'),
    } as unknown as jest.Mocked<OAuthService>;

    configServiceMock = {
      getSSOConfig: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    loadingSpinnerServiceMock = {
      showSpinner: jest.fn(),
      hideSpinner: jest.fn(),
    } as unknown as jest.Mocked<LoadingSpinnerService>;

    clientAuthenticationServiceMock = {
      onSubmitStepOne: jest.fn(),
    } as unknown as jest.Mocked<ClientAuthenticationService>;

    TestBed.configureTestingModule({
      providers: [
        SSOAuthenticationService,
        { provide: OAuthService, useValue: oauthServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
        { provide: LoadingSpinnerService, useValue: loadingSpinnerServiceMock },
        { provide: ClientAuthenticationService, useValue: clientAuthenticationServiceMock },
        { provide: TranslationsService, useValue: translationsServiceMock },
      ],
    });

    service = TestBed.inject(SSOAuthenticationService);
    localStorage.clear();
  });

  afterEach(() => {
    // Unsubscribe from all subscriptions
    subscriptions.forEach(sub => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
    subscriptions = [];

    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('getSsoAuthenticationConfig', () => {
    it('should load config from localStorage if available and not isSsoAuthCallback', done => {
      const mockConfig = { issuer: 'https://issuer', clientId: 'client-id' };
      localStorage.setItem('ssoAuthConfig', JSON.stringify(mockConfig));
      const paramsWithCallback = new URLSearchParams('code=testCode&state=testState');
      service.isSsoAuthCallback = paramsWithCallback;

      const configSub1 = service.getSsoAuthenticationConfig().subscribe(result => {
        expect(result).toEqual(mockConfig);
        expect(oauthServiceMock.configure).toHaveBeenCalledWith({ ...authCodeFlowConfig, ...mockConfig });
        expect(configServiceMock.getSSOConfig).not.toHaveBeenCalled();
        done();
      });
      subscriptions.push(configSub1);
    });

    it('should fetch config from configService if localStorage empty', done => {
      const mockConfig = { issuer: 'https://issuer-fetch', clientId: 'client-id-fetch' };
      configServiceMock.getSSOConfig.mockReturnValue(of(mockConfig) as unknown as Observable<HttpEvent<OidcProvider>>);

      const configSub = service.getSsoAuthenticationConfig().subscribe(result => {
        expect(result).toEqual(mockConfig);
        expect(localStorage.getItem('ssoAuthConfig')).toEqual(JSON.stringify(mockConfig));
        expect(oauthServiceMock.configure).toHaveBeenCalledWith({ ...authCodeFlowConfig, ...mockConfig });
        expect(loadingSpinnerServiceMock.showSpinner).toHaveBeenCalled();
        done();
      });
      subscriptions.push(configSub);
    });
  });

  describe('login', () => {
    it('should call loadDiscoveryDocument and initCodeFlow', async () => {
      await service.ssoLogin();

      expect(loadingSpinnerServiceMock.showSpinner).toHaveBeenCalled();
      expect(oauthServiceMock.loadDiscoveryDocument).toHaveBeenCalled();
      expect(oauthServiceMock.initCodeFlow).toHaveBeenCalled();
    });
  });

  describe('idToken', () => {
    it('should return oauthService.hasValidIdToken', () => {
      oauthServiceMock.hasValidIdToken.mockReturnValue(true);
      expect(service.hasValidIdToken).toBe(true);

      oauthServiceMock.hasValidIdToken.mockReturnValue(false);
      expect(service.hasValidIdToken).toBe(false);
    });
  });

  describe('isSsoAuthCallback', () => {
    it('should set and get isSsoAuthCallback correctly', () => {
      const paramsWithCallback = new URLSearchParams('code=testCode&state=testState');
      const paramsWithoutCallback = new URLSearchParams('random=value');

      service.isSsoAuthCallback = paramsWithCallback;
      expect(service.isSsoAuthCallback()).toBe(true);

      service.isSsoAuthCallback = paramsWithoutCallback;
      expect(service.isSsoAuthCallback()).toBe(false);
    });
  });

  describe('handleRedirect', () => {
    it('should handle redirect and authenticate internally', async () => {
      await service.handleRedirect();

      expect(loadingSpinnerServiceMock.showSpinner).toHaveBeenCalled();
      expect(oauthServiceMock.loadDiscoveryDocumentAndTryLogin).toHaveBeenCalled();
      expect(oauthServiceMock.getIdToken).toHaveBeenCalled();
      expect(clientAuthenticationServiceMock.onSubmitStepOne).toHaveBeenCalledWith({
        token: 'mockToken',
        language: 'e',
      });
    });
  });
});
