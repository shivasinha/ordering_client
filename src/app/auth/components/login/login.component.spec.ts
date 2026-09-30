import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { LoginComponent } from './login.component'; // Adjust the path as necessary
import { LoadingSpinnerService } from '@Ordering/shared/services/loading-spinner.service';
import { ClientAuthenticationService } from '@Ordering/auth/services/client-authentication.service';
import { SSOAuthenticationService } from '@Ordering/auth/services/sso/sso-authentication.service';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { of } from 'rxjs';
import { BrowserAnimationsModule, NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  // Create mocks for services
  const mockClientAuthService = {
    onSubmitStepOne: jest.fn(),
    onSubmitStepTwo: jest.fn(),
    onLanguageChange: jest.fn(),
    atProjectSelectionStepSig: jest.fn(),
  };

  const mockSSOAuthenticationService = {
    get isSsoAuthCallback() {
      return signal(false); // or true, depending on your test case
    },

    getSsoAuthenticationConfig: jest.fn().mockReturnValue(of('')),
    ssoLogin: jest.fn(),
    idToken: 'mockIdToken', // Mock token for SSO login
  };

  const mockLoadingSpinnerService = {
    isSpinnerActive: jest.fn().mockReturnValue(false), // Default to spinner inactive
  };

  const mockTranslationsService = {
    translate: jest.fn((key: string) => key),
    deriveDefaultLanguageFromBrowserSettings: jest.fn().mockReturnValue('e'),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, LoginComponent, BrowserAnimationsModule, NoopAnimationsModule],
      providers: [
        { provide: LoadingSpinnerService, useValue: mockLoadingSpinnerService },
        { provide: ClientAuthenticationService, useValue: mockClientAuthService },
        { provide: SSOAuthenticationService, useValue: mockSSOAuthenticationService },
        { provide: TranslationsService, useValue: mockTranslationsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Initial detection
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clear mocks after each test
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize default language', () => {
    expect(component['defaultLanguage']).toBeDefined();
  });

  it('should call getSsoAuthenticationConfig on ngOnInit', () => {
    const mockConfig = { clientId: 'testClient', issuer: 'testIssuer' };
    mockSSOAuthenticationService.getSsoAuthenticationConfig.mockReturnValue(of(mockConfig));

    component.ngOnInit();

    expect(mockSSOAuthenticationService.getSsoAuthenticationConfig).toHaveBeenCalled();
  });

  it('should determine if login card can be shown', () => {
    mockSSOAuthenticationService.isSsoAuthCallback.set(false); // No SSO callback
    (component as any).ssoConfig.set({}); // Set a mock SSO config
    expect((component as any).showLoginCard).toBe(true); // Should show login card

    // Now simulate spinner being active
    mockSSOAuthenticationService.isSsoAuthCallback.set(true); // No SSO callback
    mockLoadingSpinnerService.isSpinnerActive.mockReturnValue(true);
    expect((component as any).showLoginCard).toBe(true); // Should not show login card during spinner active state
  });

  it('should initiate SSO login', () => {
    mockSSOAuthenticationService.isSsoAuthCallback.set(true); // No SSO callback
    (component as any).ssoLogin();
    expect(mockSSOAuthenticationService.ssoLogin).toHaveBeenCalled();
  });

  it('should submit step one of the login process', () => {
    const loginFormValues = { username: 'testUser', password: 'testPwd', language: 'en-US' };
    (component as any).loginForm.setValue(loginFormValues); // Set form values

    (component as any).onSubmitStepOne();
    expect(mockClientAuthService.onSubmitStepOne).toHaveBeenCalledWith(loginFormValues);
  });

  it('should handle language change', () => {
    (component as any).onLanguageChange();
    expect(mockClientAuthService.onLanguageChange).toHaveBeenCalledWith((component as any).loginForm.value);
  });

  it('should complete subscriptions on destroy', () => {
    const destroy$Spy = jest.spyOn(component['destroy$'], 'next');
    jest.spyOn(component['destroy$'], 'complete');

    component.ngOnDestroy();

    expect(destroy$Spy).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});
