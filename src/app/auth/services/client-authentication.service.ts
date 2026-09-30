import { Injectable, WritableSignal, inject, signal } from '@angular/core';
import { finalize, tap, Observable, of, concatMap, defer, forkJoin, interval, Subscription, catchError } from 'rxjs';

import { AuthenticationService, LoginRequest, UserCredentials } from '@Ordering/api';

import { TranslationsService } from '@Ordering/core/services/translations.service';
import { NotificationService } from '@Ordering/shared/services/notification.service';
import { LoadingSpinnerService } from '@Ordering/shared/services/loading-spinner.service';
import { SNACKBARCONFIG_ERROR } from '@Ordering/utils/snackbar';
import { ConfigDataService } from '@Ordering/shared/services/config-data.service';
import { MasterDataHandlingService } from '@Ordering/shared/services/master-data-handling.service';
import { OrderingApiName } from '@Ordering/data/custom/enum/ordering-api-names.enum';
import { ErrorHandlingService } from '@Ordering/shared/services/error-handling.service';
import { OAuthService } from 'angular-oauth2-oidc';
import { NavigationService } from '@Ordering/shared/services/navigation.service';

@Injectable({
  providedIn: 'root',
})
export class ClientAuthenticationService {
  private tr = inject(TranslationsService);
  private isAuthenticatedSig = signal<boolean>(false);
  private projectsListSig = signal<Array<string>>([]);
  private selectedProjectSig = signal<string | undefined>(localStorage.getItem('project') || undefined);
  private notificationService = inject(NotificationService);
  private loadingSpinnerService = inject(LoadingSpinnerService);
  private authenticationService = inject(AuthenticationService);
  private configDataService = inject(ConfigDataService);
  private masterDataHandlingService = inject(MasterDataHandlingService);
  private errorHandlingService = inject(ErrorHandlingService);
  private navigationService = inject(NavigationService);
  private tokenValidationSubscription: Subscription | undefined;
  private oauthService: OAuthService = inject(OAuthService);

  public atProjectSelectionStepSig: WritableSignal<boolean> = signal<boolean>(false);
  public atLoginStepSig: WritableSignal<boolean> = signal<boolean>(true);

  constructor() {
    // Start periodic token validation for authenticated users
    this.startTokenValidation();

    // Listen for unauthorized events from ErrorHandlingService to avoid circular dependency
    this.errorHandlingService.unauthorized$.subscribe(() => {
      this.resetAndNavigateToLogin();
    });
  }

  /**
   * Start periodic token validation to detect when authentication is lost
   * This runs every 2 seconds to check if the user's session is still valid
   * @returns {void}
   */
  private startTokenValidation(): void {
    // Prevent multiple subscriptions
    if (this.tokenValidationSubscription) {
      return;
    }

    this.tokenValidationSubscription = interval(2000).subscribe(() => {
      this.validateUserSession();
    });
  }

  /**
   * Validate if the current user session is still valid
   * If localStorage is cleared or session is invalid, immediately redirect to login
   * @returns {void}
   */
  private validateUserSession(): void {
    try {
      // If user is marked as logged in but essential data is missing from localStorage
      if (this.isLoggedIn && !this.isUserInfoExist()) {
        console.warn('User session invalid - essential authentication data missing. Redirecting to login.');
        this.resetAndNavigateToLogin();
        return;
      }

      // Additional validation: Check if session cookie exists when user is supposed to be logged in
      if (this.isLoggedIn && !this.hasValidSessionCookie()) {
        console.warn('Session cookie missing - user session expired or cleared. Redirecting to login.');
        this.resetAndNavigateToLogin();
      }
    } catch (error) {
      console.error('Error during session validation:', error);
      // Continue silently, don't let validation errors break the app
    }
  }

  /**
   * Check if the session cookie (TPSSID) exists
   * @returns {boolean} True if session cookie exists, false otherwise
   */
  private hasValidSessionCookie(): boolean {
    try {
      return document.cookie.split(';').some(cookie => cookie.trim().startsWith('TPSSID='));
    } catch (error) {
      console.error('Error accessing document.cookie:', error);
      return false; // Assume no valid session if we can't access cookies
    }
  }

  /**
   * Reset the signal values for two step authenticaion process.
   *
   * @returns {void}
   */
  public resetAuthenticationSteps(): void {
    this.atLoginStepSig.set(true);
    this.atProjectSelectionStepSig.set(false);
  }

  /**
   * Logout the user from the client.
   *
   * @returns {void}
   */
  public logout(): void {
    this.loadingSpinnerService.showSpinner();
    this.authenticationService
      .logout()
      .pipe(
        finalize(() => {
          this.loadingSpinnerService.hideSpinner();
        }),
      )
      .subscribe({
        next: () => {
          this.clearSsoAuthConfig();
          this.resetAndNavigateToLogin();
        },
        error: () => {
          this.notificationService.pushNotification(this.tr.translate('msgErrorLogout'), SNACKBARCONFIG_ERROR);
        },
      });
  }

  /**
   * Reset the user prefrences and navigate to login page.
   * @returns {void}
   */
  public resetAndNavigateToLogin(): void {
    this.clearUserInfo();
    this.resetAuthenticationSteps();
    this.navigationService.navigateToLogin();
  }

  /**
   * Get the list of the projects which are accessible to logged in user.
   * The function will not return the list but will update the list.
   * @param {UserCredentials | undefined} userCredentials
   * @returns {Observable<string[]>}
   */
  public getProjects(userCredentials: UserCredentials | undefined): Observable<string[]> {
    if (!userCredentials) {
      return new Observable<string[]>();
    }
    return this.authenticationService.getProjects(userCredentials).pipe(
      tap((projects: Array<string>) => {
        this.projectsList = projects;
        this.atLoginStepSig.set(false);
        this.atProjectSelectionStepSig.set(true);
        if ('username' in userCredentials) {
          localStorage.setItem('userName', userCredentials.username || '');
        } else {
          localStorage.setItem('userName', this.oauthService.getIdentityClaims()?.['preferred_username']);
        }
        localStorage.setItem('language', this.tr.guiLanguage);
      }),
    );
  }

  /**
   * Login to the client after selecting the project.
   *
   * @param {LoginRequest | undefined} loginRequest
   * @returns {void}
   */

  public login(loginRequest: LoginRequest | undefined): void {
    if (!loginRequest) {
      return;
    }

    this.loadingSpinnerService.showSpinner();
    this.authenticationService
      .login(loginRequest)
      .pipe(
        tap(() => {
          // Reset the signal values to default
          this.resetAuthenticationSteps();
          localStorage.setItem('project', this.selectedProject || '');
          this.isLoggedIn = this.isUserInfoExist();
        }),
        concatMap(() => {
          if (!this.isLoggedIn) {
            return of(null);
          }

          // Ensure configData is lazily subscribed to avoid early cancellation
          const configData$ = defer(() => this.configDataService.fetchConfigData());
          const masterData$ = defer(() => of(this.masterDataHandlingService.fetchAllMasterData()));

          return forkJoin([configData$, masterData$]);
        }),
        finalize(() => {
          this.navigationService.navigateToList();
          this.loadingSpinnerService.hideSpinner();
        }),
      )
      .subscribe({
        error: error => {
          this.loadingSpinnerService.hideSpinner();
          this.errorHandlingService.handleError(error, OrderingApiName.Login);
        },
      });
  }

  /**
   * Check if all of the required user prefrences are saved in localtorage. i.e. userName, project, and language
   *
   * @returns {boolean}
   */
  public isUserInfoExist(): boolean {
    return !!localStorage.getItem('userName') && !!localStorage.getItem('project') && !!localStorage.getItem('language');
  }

  /**
   * Perform the first step of form submission for the two step authentication.
   * This step will autheticate the user and show the list of available project
   *
   * @returns {void}
   */
  public onSubmitStepOne(user: UserCredentials & { language: string }): void {
    if (!this.isValidUser(user)) return;

    this.loadingSpinnerService.showSpinner();
    const defaultLanguage: string = localStorage.getItem('language') || this.tr.deriveDefaultLanguageFromBrowserSettings();

    this.tr.setLanguage(user.language || defaultLanguage);

    const userCredentials: UserCredentials =
      'username' in user ? { username: user.username, password: btoa(user.password as string) } : { token: user.token };

    this.getProjects(userCredentials)
      .pipe(
        tap(projects => {
          this.projectsList = projects;
          if (this.projectsList.length === 1) {
            this.onSubmitStepTwo(userCredentials, this.projectsList[0]);
          } else {
            this.loadingSpinnerService.hideSpinner();
          }
        }),
        catchError(() => {
          this.notificationService.pushNotification(this.tr.translate('msgErrorLogin'), SNACKBARCONFIG_ERROR);
          this.loadingSpinnerService.hideSpinner();
          // Avoid re-throwing errors to prevent retrying the observable chain
          return []; // Emit an empty result to gracefully complete the observable
        }),
      )
      .subscribe();
  }

  /**
   * Validates the provided user credentials or token.
   *
   * Checks if the user object contains either a username/password pair or an authentication token.
   * - If username and password are provided, validation succeeds when both are non-empty.
   * - If a token is provided instead, validation succeeds when the token is non-empty.
   *
   * @param {UserCredentials} user - User object containing credentials or token.
   * @returns {boolean} True if the provided user object has valid credentials or a valid token; otherwise false.
   */
  private isValidUser(user: UserCredentials): boolean {
    if ('username' in user) {
      return !!user.username && !!user.password;
    } else {
      return !!user.token;
    }
  }

  /**
   * Perform the second step of form submission for the two step authentication.
   * This step will select the project at redirect the user to the list view.
   *
   * @returns {void}
   */
  public onSubmitStepTwo(user: UserCredentials, project: string | undefined): void {
    if (!user || !project) {
      return;
    }

    this.selectedProject = project;

    this.login({ user, project });
  }

  /**
   * Change the language of the application.
   * If the language is changed, the application will reload to apply the new language.
   * If the language is changed without a username and password, the language will be changed without reloading.
   * @returns {void}
   */
  public onLanguageChange({
    language,
  }: Partial<{
    username: string;
    password: string;
    language: string;
  }>): void {
    if (language) {
      this.tr.setLanguage(language);
      localStorage.setItem('language', language);
      location.reload();
    }
  }

  /**
   * Retrieves the username from the local storage.
   *
   * @returns {string} The username stored in local storage, or an empty string if not found.
   */
  public getUserName(): string {
    return localStorage.getItem('userName') || '';
  }

  /**
   * Clear the user prefrences from the localstorage and reset the login status.
   *
   * @returns {void}
   */
  public clearUserInfo(): void {
    localStorage.removeItem('userName');
    localStorage.removeItem('project');
    localStorage.removeItem('LISTS_STATES');
    document.cookie = 'TPSSID=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    this.isLoggedIn = false;
  }

  /**
   * Clears the SSO Auth Config from local storage.
   * This method removes the 'ssoAuthConfig' item from the local storage.
   * @returns {void}
   */
  public clearSsoAuthConfig(): void {
    localStorage.removeItem('ssoAuthConfig');
  }

  /**
   * Get the value of user's authentication state.
   *
   * @returns {boolean}
   */
  public get isLoggedIn(): boolean {
    return this.isAuthenticatedSig();
  }

  /**
   * Set the value of user's authentication state.
   *
   * @param {boolean} value
   */
  public set isLoggedIn(state: boolean) {
    this.isAuthenticatedSig.set(state);
  }

  /**
   * Get the projects list.
   *
   * @returns {Array<string>}
   */
  public get projectsList(): Array<string> {
    return this.projectsListSig();
  }

  /**
   * Set the projects list.
   *
   * @param {Array<string>} list
   */
  public set projectsList(list: Array<string>) {
    this.projectsListSig.set(list);
  }

  /**
   * Get the selected project.
   *
   * @returns {Array<string>}
   */
  public get selectedProject(): string | undefined | null {
    return this.selectedProjectSig();
  }

  /**
   * Set the selected project.
   *
   * @param {Array<string>} project
   */
  public set selectedProject(project: string | undefined) {
    this.selectedProjectSig.set(project);
  }
}
