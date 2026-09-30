import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_DIALOG_DEFAULT_OPTIONS } from '@angular/material/dialog';
import { registerLocaleData } from '@angular/common';
import localeDa from '@angular/common/locales/da';
import localeEnGb from '@angular/common/locales/en-GB';
import localeSl from '@angular/common/locales/sl';
import localeSrLatn from '@angular/common/locales/sr-Latn';
import { Configuration } from '@Ordering/api';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { authInterceptor } from './auth.interceptor';
import { errorInterceptor } from './error.interceptor';
import { configInterceptor } from './config.interceptor';
import { routes } from './app.routes';
import { provideOAuthClient } from 'angular-oauth2-oidc';
import { ConfigDataService } from './shared/services/config-data.service';
import { ClientAuthenticationService } from './auth/services/client-authentication.service';
import { CustomDateAdapter } from '@Ordering/utils/custom-date-adapter';
import { createCustomDateFormats } from '@Ordering/utils/custom-date-formats';
import { getEnvironmentLocale } from '@Ordering/utils/dayjs-config';
import { customMatDialogConfigFactory } from './utils/dialog-config.factory';

// Register all supported locales upfront
registerLocaleData(localeDa);
registerLocaleData(localeEnGb);
registerLocaleData(localeSl);
registerLocaleData(localeSrLatn);

/**
 * Formatting locale read from the runtime environment.js file.
 * Controls date/number format structure, first day of week, etc.
 * UI language (for translations and display names) is managed separately by TranslationsService.setLanguage().
 * Falls back to 'en-GB' if not specified.
 */
export const FORMATTING_LOCALE = getEnvironmentLocale();

/**
 * Factory function to create an application initializer.
 *
 * This initializer is designed to run during the application's startup phase (e.g., using Angular's `APP_INITIALIZER` token).
 * It conditionally fetches critical application configuration data based on the user's authentication status.
 *
 * @param {ConfigDataService} configDataService - The service responsible for fetching application-wide configuration data.
 * @param {ClientAuthenticationService} clientAuthService - The service responsible for managing client authentication
 *                                                        state, checking user login status, and handling redirects.
 * @returns {() => Promise<void>} A function that, when executed, returns a Promise. This Promise
 *                                  resolves once the initialization logic (config loading or skipping) is complete.
 *                                  It resolves to `void` and is intended to block application startup until resolved.
 *
 * @remarks
 * - **Authentication Check:** The initializer first checks `clientAuthService.isUserInfoExist()`.
 *   If `true`, it means a user is logged in, and configuration fetching proceeds.
 * - **Configuration Fetching:** If authenticated, it calls `configDataService.fetchConfigData()`.
 *   The Observable returned by `fetchConfigData()` is converted to a Promise using `.toPromise()`
 *   to align with the `APP_INITIALIZER` mechanism's expectation of a Promise.
 * - **Error Handling:** If `fetchConfigData()` fails (e.g., due to network issues or API errors),
 *   an error is logged to the console. Subsequently, `clientAuthService.resetAndNavigateToLogin()`
 *   is called to clear any invalid session data and redirect the user to the login page.
 *   The Promise then resolves to allow the application to proceed with the redirect flow.
 * - **Skipping Config:** If `clientAuthService.isUserInfoExist()` returns `false` (no user logged in),
 *   configuration loading is skipped, a message is logged, and the Promise resolves immediately.
 * - **Overall Purpose:** This pattern ensures that essential configuration is loaded or that appropriate
 *   pre-application actions (like redirection for unauthenticated users or error handling) are taken
 *   before the main application components are rendered, providing a more robust startup experience.
 */
export function initializeApp(configDataService: ConfigDataService, clientAuthService: ClientAuthenticationService): () => Promise<void> {
  return async () => {
    // Using async/await for cleaner Promise handling
    if (clientAuthService.isUserInfoExist()) {
      try {
        // Await the configuration data. The .toPromise() converts the Observable to a Promise.
        // For modern RxJS (v7+), `lastValueFrom(configDataService.fetchConfigData())` is often preferred.
        await configDataService.fetchConfigData().toPromise();
        console.log('Application configuration loaded successfully.');
      } catch (error) {
        console.error('API call failed during application configuration load:', error);
        // If config loading fails, reset authentication and redirect to login.
        clientAuthService.resetAndNavigateToLogin();
        // It's important to resolve the promise here so that APP_INITIALIZER doesn't
        // block the application indefinitely, especially if a redirect is happening.
        return Promise.resolve();
      }
    } else {
      console.log('User not logged in, skipping application configuration load.');
    }

    // Always resolve the promise. This ensures the APP_INITIALIZER completes,
    // allowing the application to proceed with its startup sequence,
    // whether config was loaded, skipped, or failed (and redirected).
    return Promise.resolve();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideOAuthClient(),
    provideAppInitializer(() => {
      const initializerFn = initializeApp(inject(ConfigDataService), inject(ClientAuthenticationService));
      return initializerFn();
    }),
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor, configInterceptor])),
    { provide: LOCALE_ID, useValue: FORMATTING_LOCALE },
    { provide: MAT_DATE_LOCALE, useValue: FORMATTING_LOCALE },
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useFactory: createCustomDateFormats },
    { provide: MAT_DIALOG_DEFAULT_OPTIONS, useFactory: customMatDialogConfigFactory },
    TranslationsService,
    Configuration,
  ],
};
