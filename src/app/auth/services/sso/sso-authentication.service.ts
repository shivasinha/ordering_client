import { inject, Injectable, Signal, signal, WritableSignal } from '@angular/core';
import { ConfigService, OidcProvider } from '@Ordering/api';
import { catchError, finalize, Observable, of, tap } from 'rxjs';

import { AuthConfig, OAuthService } from 'angular-oauth2-oidc';

import { LoadingSpinnerService } from '@Ordering/shared/services/loading-spinner.service';
import { ClientAuthenticationService } from '../client-authentication.service';
import { SNACKBARCONFIG_ERROR } from '@Ordering/utils/snackbar';
import { NotificationService } from '@Ordering/shared/services/notification.service';
import { TranslationsService } from '@Ordering/core/services/translations.service';

export const authCodeFlowConfig: AuthConfig = {
  // Url of the Identity Provider
  issuer: '',

  // URL of the SPA to redirect the user to after login
  redirectUri: window.location.origin + '/login',

  // The SPA's id. The SPA is registerd with this id at the auth-server
  // clientId: 'server.code',
  clientId: '',

  // Just needed if your auth server demands a secret. In general, this
  // is a sign that the auth server is not configured with SPAs in mind
  // and it might not enforce further best practices vital for security
  // such applications.
  // dummyClientSecret: 'secret',

  responseType: 'code',

  // set the scope for the permissions the client should request
  // The first four are defined by OIDC.
  // Important: Request offline_access to get a refresh token
  // The api scope is a usecase specific one
  // scope: 'openid profile email api',

  showDebugInformation: true,
};

@Injectable({
  providedIn: 'root',
})
export class SSOAuthenticationService {
  private authCodeFlowConfig: Signal<AuthConfig> = signal<AuthConfig>(authCodeFlowConfig);

  private readonly configService: ConfigService = inject(ConfigService);

  private readonly oauthService: OAuthService = inject(OAuthService);

  private loadingSpinnerService: LoadingSpinnerService = inject(LoadingSpinnerService);

  private readonly clientAuthenticationService: ClientAuthenticationService = inject(ClientAuthenticationService);

  private readonly isFromSsoCallback: WritableSignal<boolean> = signal<boolean>(false);

  private notificationService: NotificationService = inject(NotificationService);

  private tr: TranslationsService = inject(TranslationsService);

  /**
   * Retrieves the Single Sign-On (SSO) authentication configuration.
   *
   * Checks local storage for existing SSO config. If present and valid,
   * configures and returns the stored issuer and clientId immediately.
   * Otherwise, fetches the configuration from a remote config service,
   * saves it to local storage, configures SSO, and handles loading spinners
   * and possible errors gracefully.
   *
   * @returns {Observable<OidcProvider>} An Observable emitting the object containing:
   *  - issuer: The URL of the OIDC authentication provider.
   *  - clientId: The Client ID used for authenticating with the OIDC provider.
   */
  public getSsoAuthenticationConfig(): Observable<OidcProvider> {
    const storedSsoAuthConfig: string | null = localStorage.getItem('ssoAuthConfig');

    if (!!storedSsoAuthConfig && this.isSsoAuthCallback()) {
      const { issuer, clientId }: OidcProvider = JSON.parse(storedSsoAuthConfig);
      if (issuer && clientId) {
        this.configureSso({ issuer, clientId });
      }
      return of({ issuer, clientId });
    }
    this.loadingSpinnerService.showSpinner();
    return this.configService.getSSOConfig().pipe(
      tap(({ issuer, clientId }: OidcProvider) => {
        if (issuer && clientId) {
          localStorage.setItem('ssoAuthConfig', JSON.stringify({ issuer, clientId }));
          this.configureSso({ issuer, clientId });
        }
      }),
      catchError(() => of({ clientId: '', issuer: '' })),
      finalize(() => this.loadingSpinnerService.hideSpinner()),
    );
  }

  /**
   * Configure the SSO authentication configuration by OIDC provider and initiates Oauth2 oidc.
   *
   * @returns {void}
   */
  private configureSso({ issuer, clientId }: OidcProvider): void {
    this.oauthService.configure({ ...this.authCodeFlowConfig(), issuer, clientId });
  }

  /**
   * Initiates the login process using OAuth authentication flow.
   *
   * Starts by displaying a loading spinner, loads the discovery document from the OAuth provider,
   * and attempts automatic login. After this process completes, initiates the authorization code flow
   * for user authentication.
   *
   * @returns {void}
   */
  public ssoLogin(): void {
    this.loadingSpinnerService.showSpinner();
    this.oauthService
      .loadDiscoveryDocument()
      .then(() => {
        this.oauthService.initCodeFlow();
      })
      .catch(() => {
        this.notificationService.pushNotification(this.tr.translate('msgErrorStatusDefault'), SNACKBARCONFIG_ERROR);
        this.clientAuthenticationService.resetAndNavigateToLogin();
        this.loadingSpinnerService.hideSpinner();
      });
  }

  /**
   * Checks if there is a valid OAuth id token.
   *
   * @returns {boolean} True if a valid id token exists; otherwise false.
   */
  public get hasValidIdToken(): boolean {
    return this.oauthService.hasValidIdToken();
  }

  /**
   * Checks if there is a valid OAuth id token.
   *
   * @returns {boolean} True if a valid id token exists; otherwise false.
   */
  public get idToken(): string {
    return this.oauthService.getIdToken();
  }

  /**
   * Determines whether the current route parameters indicate
   * a return from an SSO authentication flow.
   *
   * Sets internal state based on the presence of 'code' and 'state' params.
   *
   * @param {URLSearchParams} queryParams - URL query parameters to check.
   */
  public set isSsoAuthCallback(queryParams: URLSearchParams) {
    this.isFromSsoCallback.set(queryParams.has('code') && queryParams.has('state'));
  }

  /**
   * Provides a readonly reactive signal indicating if the current
   * navigation originated from an SSO callback.
   *
   * @returns {Signal<boolean>} A readonly signal reflecting SSO callback status.
   */
  public get isSsoAuthCallback(): Signal<boolean> {
    return this.isFromSsoCallback.asReadonly();
  }

  /**
   * Handles OAuth redirect logic after the authentication flow.
   *
   * Displays a loading spinner, then loads the OAuth discovery document
   * and attempts automatic login using OAuth parameters received from redirection.
   * After successful completion of the OAuth code flow, triggers internal authentication
   * using the retrieved OAuth id token.
   *
   * @returns {void}
   */
  public handleRedirect(): void {
    const storedSsoAuthConfig: string | null = localStorage.getItem('ssoAuthConfig');
    if (!!storedSsoAuthConfig) {
      const { issuer, clientId }: OidcProvider = JSON.parse(storedSsoAuthConfig);
      if (issuer && clientId) {
        this.configureSso({ issuer, clientId });
      }
    }
    this.loadingSpinnerService.showSpinner();
    const language: string = localStorage.getItem('language') || this.tr.deriveDefaultLanguageFromBrowserSettings();
    this.oauthService
      .loadDiscoveryDocumentAndTryLogin()
      .then(() => {
        this.clientAuthenticationService.onSubmitStepOne({
          token: this.oauthService.getIdToken(),
          language,
        });
      })
      .catch(() => {
        this.notificationService.pushNotification(this.tr.translate('msgErrorStatusDefault'), SNACKBARCONFIG_ERROR);
        this.clientAuthenticationService.resetAndNavigateToLogin();
        this.loadingSpinnerService.hideSpinner();
      });
  }
}
