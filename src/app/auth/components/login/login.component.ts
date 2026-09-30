import { Component, inject, signal, WritableSignal, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { Subject, takeUntil } from 'rxjs';

import { OidcProvider, UserCredentials } from '@Ordering/api';

import { ClientAuthenticationService } from '@Ordering/auth/services/client-authentication.service';
import { SSOAuthenticationService } from '@Ordering/auth/services/sso/sso-authentication.service';

import { TranslationsService } from '@Ordering/core/services/translations.service';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { LoadingSpinnerService } from '@Ordering/shared/services/loading-spinner.service';
import { BrandingService } from '@Ordering/customer-core/services/branding.service';
import { CustomerName } from '@Ordering/customer-core/enums/customer-name.enum';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    TranslatePipe,
    NgTemplateOutlet,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})

// [TODO:]: These methods/properties(updateSsoAuthCallback, showLoginCard) in the `LoginComponent` are
// trailing call to handle isSsoAuthCallback which should be removed after resolving/refactoring login
// routing issue as resolver is not returning the proper value currently hence we need this handling for
// hiding cards in background while SSO login flow is in progress.
export class LoginComponent implements OnInit, OnDestroy {
  private destroy$: Subject<void> = new Subject<void>();
  private loadingSpinnerService: LoadingSpinnerService = inject(LoadingSpinnerService);
  private readonly branding: BrandingService = inject(BrandingService);
  protected readonly ssoConfig: WritableSignal<OidcProvider | undefined> = signal<OidcProvider | undefined>(undefined);
  protected tr: TranslationsService = inject(TranslationsService);
  protected clientAuthService: ClientAuthenticationService = inject(ClientAuthenticationService);
  protected readonly ssoAuthenticationService: SSOAuthenticationService = inject(SSOAuthenticationService);
  private readonly defaultLanguage = localStorage.getItem('language') || this.tr.deriveDefaultLanguageFromBrowserSettings();

  // Branding properties to avoid direct method calls in template
  protected readonly logoPath: string;
  protected readonly loginBackgroundPath: string;
  protected readonly customerName: CustomerName | '';
  protected CustomerName = CustomerName;
  protected languageOptions: Array<{ value: string; label: string }> = [];

  constructor() {
    this.logoPath = this.branding.getLogoPath();
    this.loginBackgroundPath = this.branding.getLoginBackground() || '';
    this.customerName = this.branding.getCustomerName();
    this.languageOptions = this.branding.getLanguageOptions(this.customerName);
  }

  /**
   * Updates the internal state indicating if the current navigation originated from an SSO authentication callback.
   *
   * Checks if the current navigation is from an SSO callback using URL parameters (`code` and `state`).
   * If so, extracts the query parameters from the URL and sets the corresponding state
   * in the SSO Authentication Service.
   *
   * @returns {void}
   */
  private updateSsoAuthCallback() {
    if (this.ssoAuthenticationService.isSsoAuthCallback()) {
      const queryParams: URLSearchParams = new URLSearchParams(window.location.search);
      this.ssoAuthenticationService.isSsoAuthCallback = queryParams;
    }
  }

  ngOnInit(): void {
    // [TODO]: SHOULD BE MODIFIED TO BE CALLED VIA RESOLVER
    this.ssoAuthenticationService
      .getSsoAuthenticationConfig()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: OidcProvider) => {
        this.ssoConfig.set(data);
      });
  }

  /**
   * Determines whether the login card should be displayed to the user.
   *
   * Evaluates the state based on whether the current navigation originated from an
   * SSO callback. If coming from SSO callback, it returns the inverse of the loading
   * spinner state, indicating loading completion. Otherwise, it returns true if the SSO
   * configuration is available, indicating readiness for login.
   *
   * @returns {boolean | undefined} True if login card can be shown; false if loading is active;
   *                                undefined otherwise.
   */
  protected get showLoginCard(): boolean | undefined {
    const isSsoAuthCallback: boolean = this.ssoAuthenticationService.isSsoAuthCallback();
    return isSsoAuthCallback ? !this.loadingSpinnerService.isSpinnerActive() : !!this.ssoConfig();
  }

  /**
   * Initiates the Single Sign-On (SSO) login process.
   *
   * Delegates the login initiation process to the SSO Authentication Service, causing
   * the OAuth authentication flow to start.
   *
   * @returns {void}
   */
  protected ssoLogin(): void {
    this.ssoAuthenticationService.ssoLogin();
  }

  protected loginForm = new FormGroup({
    username: new FormControl('', { nonNullable: true }),
    password: new FormControl('', { nonNullable: true }),
    language: new FormControl(this.defaultLanguage, { nonNullable: true }),
  });

  protected projectSelectionForm = new FormGroup({
    project: new FormControl('', { nonNullable: true }),
  });

  /**
   * Perform the first step of form submission for the two step authentication.
   * This step will autheticate the user and show the list of available project
   *
   * @returns {void}
   */
  protected onSubmitStepOne(): void {
    this.clientAuthService.onSubmitStepOne(this.loginForm.value as UserCredentials & { language: string });
  }

  /**
   * Handles the second step of the authentication flow.
   * Depending on the presence of SSO configuration, it either submits an SSO token
   * or a username/password combination to the client authentication service.
   *
   * @protected
   * @returns {void}
   */
  protected onSubmitStepTwo(): void {
    const userCredentials: UserCredentials =
      !!this.ssoConfig()?.clientId && !!this.ssoConfig()?.issuer
        ? { token: this.ssoAuthenticationService.idToken }
        : { username: this.loginForm.value.username as string, password: btoa(this.loginForm.value.password as string) };

    this.clientAuthService.onSubmitStepTwo(userCredentials, this.projectSelectionForm.value.project);
  }

  /**
   * Change the language of the application.
   * If the language is changed, the application will reload to apply the new language.
   * If the language is changed without a username and password, the language will be changed without reloading.
   * @returns {void}
   */
  protected onLanguageChange(): void {
    this.clientAuthService.onLanguageChange(this.loginForm.value);
  }

  /**
   * Lifecycle hook that is called when the component is destroyed.
   *
   * This method emits a value on the `destroy$` subject to signal
   * any active subscriptions to complete, preventing memory leaks.
   * It then completes the `destroy$` subject itself.
   *
   * @returns {void}
   */

  ngOnDestroy(): void {
    this.updateSsoAuthCallback();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
