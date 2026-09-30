import { AfterViewInit, Component, inject, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatTabChangeEvent, MatTabGroup } from '@angular/material/tabs';
import { Subscription } from 'rxjs';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { ActionBarService } from '@Ordering/shared/services/action-bar.service';
import { TabsTypesEnum } from '@Ordering/data/custom/enum/tabTypes';
import { MatTabsModule } from '@angular/material/tabs';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { ITabInstanceData } from '@Ordering/data/custom/ITabInstanceData';
import { UserPermissionService } from '@Ordering/core/services/user-permission.service';
import { HasPermissionDirective } from '@Ordering/core/directives/has-permission.directive';
import { UserPermissionsEnum } from '@Ordering/data/custom/enum/user-permissions.enum';
import { SOURCE_TAB_PARAM } from '@Ordering/shared/services/breadcrumb.service';
import { NavigationService } from '@Ordering/shared/services/navigation.service';

@Component({
  selector: 'app-action-bar',
  imports: [TranslatePipe, CommonModule, MatTabsModule, MatButtonModule, HasPermissionDirective],
  templateUrl: './action-bar.component.html',
  styleUrl: './action-bar.component.scss',
})
export class ActionBarComponent implements AfterViewInit, OnDestroy {
  @ViewChild('tpsTabs') public tpsTabs: MatTabGroup | undefined;

  private tr = inject(TranslationsService);
  private route = inject(ActivatedRoute);
  private navigationService = inject(NavigationService);
  protected actionBarService = inject(ActionBarService);
  private readonly userPermissionService: UserPermissionService = inject(UserPermissionService);
  protected readonly userPermissionsEnum = UserPermissionsEnum;
  private queryParamsSub?: Subscription;
  public tabs: ITabInstanceData[] = [
    { id: 0, name: TabsTypesEnum.CURRENT_ORDERS, label: this.tr.translate('lblCurrentOrders'), abbreviation: 'CO', static: true },
    { id: 1, name: TabsTypesEnum.ARCHIVE_ORDERS, label: this.tr.translate('lblArchivedOrders'), abbreviation: 'AO', static: true },
    { id: 2, name: TabsTypesEnum.TRAIN_RUNS, label: this.tr.translate('lblTrainsList'), abbreviation: 'AO', static: true },
    { id: 3, name: TabsTypesEnum.SPARE_CAPACITY, label: this.tr.translate('lblSpareCapacity'), abbreviation: 'SC', static: true },
  ];

  ngAfterViewInit(): void {
    this.handleTabVisibility();

    // React to query param changes so that tab switches even when already on /list
    this.queryParamsSub = this.route.queryParams.subscribe(queryParams => {
      this.syncTabFromQueryParams(queryParams[SOURCE_TAB_PARAM]);
    });
  }

  ngOnDestroy(): void {
    this.queryParamsSub?.unsubscribe();
  }

  /**
   * Syncs the selected tab based on the 'activeTab' query parameter.
   * Falls back to the previously selected tab or the first tab.
   *
   * @param {string} fromTab - The value of the 'activeTab' query parameter.
   * @returns {void}
   */
  private syncTabFromQueryParams(fromTab?: string): void {
    const tabToShow = fromTab ? this.tabs.find(tab => tab.name === fromTab) : undefined;

    if (this.tpsTabs) {
      // If 'activeTab' query param exists and matches a tab, use it; otherwise use the previously selected tab or default to first tab
      const selectedTab = tabToShow || this.tabs[this.actionBarService.selectedTab?.id || 0];
      this.actionBarService.selectedTab = selectedTab;
      this.tpsTabs.selectedIndex = selectedTab?.id ?? 0;
    }
  }

  /**
   * Filters tabs based on user permissions to control visibility.
   * Removes order-related tabs if user can't view orders, and train tabs if user can't view trains.
   *
   * @private
   * @returns {void}
   */
  private handleTabVisibility(): void {
    if (!this.userPermissionService.checkPermissions(UserPermissionsEnum.CAN_VIEW_ORDER_LIST)) {
      this.tabs = this.tabs.filter(
        (tab: ITabInstanceData) => tab.name !== TabsTypesEnum.CURRENT_ORDERS && tab.name !== TabsTypesEnum.ARCHIVE_ORDERS,
      );
    }
    if (!this.userPermissionService.checkPermissions(UserPermissionsEnum.CAN_VIEW_TRAIN_LIST)) {
      this.tabs = this.tabs.filter((tab: ITabInstanceData) => tab.name !== TabsTypesEnum.TRAIN_RUNS);
    }
    if (!this.userPermissionService.checkPermissions(UserPermissionsEnum.CAN_VIEW_SPARE_CAPACITY_LIST)) {
      this.tabs = this.tabs.filter((tab: ITabInstanceData) => tab.name !== TabsTypesEnum.SPARE_CAPACITY);
    }
  }

  /**
   * Set the clicked tab active and update query parameters.
   * @param {$event} - The tab instance data.
   * @returns {void}
   */
  protected tabClicked($event: MatTabChangeEvent): void {
    const selectedTab = this.tabs[$event.index];
    this.actionBarService.selectedTab = selectedTab;

    // Update the URL query parameter to reflect the current tab
    this.navigationService.navigate([], {
      extras: { relativeTo: this.route, queryParamsHandling: 'merge' },
    });
  }

  /**
   * To navigate to the new order page.
   * Always uses CURRENT_ORDERS as source for breadcrumb navigation.
   * @returns {void}
   */
  public newOrder(): void {
    this.navigationService.navigate(['orders', 'add'], {
      extras: { queryParams: { [SOURCE_TAB_PARAM]: TabsTypesEnum.CURRENT_ORDERS } },
    });
  }
}
