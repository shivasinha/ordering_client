import { Injectable, inject } from '@angular/core';
import { NavigationExtras, Router } from '@angular/router';
import { ActionBarService } from '@Ordering/shared/services/action-bar.service';
import { SOURCE_TAB_PARAM } from '@Ordering/shared/services/breadcrumb.service';
import { TabsTypesEnum } from '@Ordering/data/custom/enum/tabTypes';
import { ITabInstanceData } from '@Ordering/data/custom/ITabInstanceData';

/** Options accepted by {@link NavigationService.navigate}. */
export interface NavigateOptions {
  /** Standard Angular {@link NavigationExtras} (queryParams, replaceUrl, etc.). */
  extras?: NavigationExtras;
  /**
   * When `true`, the `activeTab` query param is NOT appended to the URL.
   * Use this for routes that have no tab context (e.g. `/login`).
   */
  skipTabParam?: boolean;
}

/**
 * Centralized navigation service that automatically manages the 'activeTab' query param.
 *
 * All app navigation should go through this service so that
 * the active tab context is always preserved in the URL without each caller
 * having to remember to add it manually.
 */
@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  private router = inject(Router);
  private actionBarService = inject(ActionBarService);

  /**
   * Navigates to the given route commands, automatically appending the current
   * `activeTab` query param unless the caller explicitly provides one or opts out via `skipTabParam`.
   *
   * @param {any[]} commands - Angular Router commands array (e.g. ['/orders', id]).
   * @param {NavigateOptions} options - Optional settings: `extras` for Angular NavigationExtras,
   *                                    `skipTabParam` to suppress the automatic `activeTab` query param.
   * @returns {Promise<boolean>} The Promise returned by `Router.navigate`.
   */
  public navigate(commands: any[], options?: NavigateOptions): Promise<boolean> {
    const { extras, skipTabParam } = options ?? {};

    if (skipTabParam) {
      return this.router.navigate(commands, extras);
    }

    const currentTab = extras?.queryParams?.[SOURCE_TAB_PARAM] ?? this.actionBarService.selectedTab?.name ?? TabsTypesEnum.CURRENT_ORDERS;

    const mergedQueryParams = {
      ...extras?.queryParams,
      [SOURCE_TAB_PARAM]: currentTab,
    };

    // Sync ActionBarService so it stays in line with the URL
    if (this.actionBarService.selectedTab?.name !== currentTab) {
      this.actionBarService.selectedTab = { name: currentTab } as ITabInstanceData;
    }

    return this.router.navigate(commands, {
      ...extras,
      queryParams: mergedQueryParams,
    });
  }

  /**
   * Convenience shortcut: navigate to the list page, preserving tab context.
   *
   * @param {NavigateOptions} options - Optional navigation options to pass through.
   * @returns {Promise<boolean>}
   */
  public navigateToList(options?: NavigateOptions): Promise<boolean> {
    return this.navigate(['/list'], options);
  }

  /**
   * Navigates to the login page. Does NOT append the 'activeTab' query param
   * since the login route has no tab context.
   *
   * @returns {Promise<boolean>}
   */
  public navigateToLogin(): Promise<boolean> {
    return this.navigate(['/login'], { skipTabParam: true });
  }
}
