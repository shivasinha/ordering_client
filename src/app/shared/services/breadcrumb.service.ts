import { Injectable, inject, computed, signal, WritableSignal } from '@angular/core';
import { NavigationEnd, Router, Data } from '@angular/router';
import { filter } from 'rxjs';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { TabsTypesEnum, TAB_LABELS, TabTranslationKey } from '@Ordering/data/custom/enum/tabTypes';

export type BreadcrumbLabelFn = (tr: TranslationsService, data: Data, params: Record<string, string>) => string;

export interface BreadcrumbConfig {
  label?: string | BreadcrumbLabelFn;
  url?: string | ((params: Record<string, string>) => string);
  parent?: BreadcrumbConfig; // Recursive parent structure for unlimited nesting
}

export interface Breadcrumb {
  label: string;
  url: string;
  queryParams?: { [key: string]: string };
}

export const SOURCE_TAB_PARAM = 'activeTab';

/** Key used in route `data` to store breadcrumb config. */
export const BREADCRUMB_KEY = 'breadcrumb' as const;

/** Type-safe helper to define breadcrumb config in route data. */
export function breadcrumb(config: BreadcrumbConfig): { [BREADCRUMB_KEY]: BreadcrumbConfig } {
  return { [BREADCRUMB_KEY]: config };
}

/** Breadcrumb label formatters — used in route config, resolved by BreadcrumbService */

export const formatOrderLabel: BreadcrumbLabelFn = (tr, data, params) => {
  const orderId = data['order']?.externalId || params['order-id'];
  return orderId ? `${tr.translate('lblOrder')} ${orderId}` : tr.translate('lblOrder');
};

export const formatOrderItemLabel: BreadcrumbLabelFn = (tr, data) => {
  const orderItemExternalId = data['orderItem']?.externalId;
  return orderItemExternalId ? `${tr.translate('lblOrderItem')} ${orderItemExternalId}` : tr.translate('lblOrderItem');
};

export const formatTrainRunLabel: BreadcrumbLabelFn = (tr, data) => {
  const trainNumber = data['trainRun']?.trainNumber;
  return trainNumber ? `${tr.translate('lblTrainRun')} ${trainNumber}` : tr.translate('lblTrainRun');
};

export const formatOfferItemLabel: BreadcrumbLabelFn = (tr, data) => {
  const offerItemExternalId = data['offerItem']?.externalId;
  return offerItemExternalId ? `${tr.translate('lblOfferItem')} ${offerItemExternalId}` : tr.translate('lblOfferItem');
};

export const formatNewOrderLabel: BreadcrumbLabelFn = tr => {
  return tr.translate('lblNewOrder');
};

export const formatNewOrderItemLabel: BreadcrumbLabelFn = tr => {
  return tr.translate('lblNewOrderItem');
};

/** Service for managing breadcrumb navigation. */
@Injectable({
  providedIn: 'root',
})
export class BreadcrumbService {
  private router = inject(Router);
  private tr = inject(TranslationsService);

  private breadcrumbsSig: WritableSignal<Breadcrumb[]> = signal([]);

  public readonly showBreadcrumbs = computed(() => this.breadcrumbsSig().length > 0);
  public readonly breadcrumbs = computed(() => this.breadcrumbsSig());

  constructor() {
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
      this.updateBreadcrumbs();
    });
  }

  private resolveLabel(label: string | BreadcrumbLabelFn | undefined, data: Data, params: Record<string, string>): string | undefined {
    if (!label) return undefined;
    return typeof label === 'function' ? label(this.tr, data, params) : label;
  }

  /** Builds parent breadcrumbs by walking up the parent chain, returned root-first. */
  private buildParentBreadcrumbs(
    config: BreadcrumbConfig | undefined,
    data: Data,
    params: Record<string, string>,
    queryParams: { [key: string]: string },
  ): Breadcrumb[] {
    const breadcrumbs: Breadcrumb[] = [];

    for (let parent = config; parent; parent = parent.parent) {
      const label = this.resolveLabel(parent.label, data, params);
      const url = typeof parent.url === 'function' ? parent.url(params) : parent.url;
      if (label && url) {
        breadcrumbs.unshift({ label, url, queryParams });
      }
    }

    return breadcrumbs;
  }

  private updateBreadcrumbs(): void {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) route = route.firstChild;

    const breadCrumbConfig: BreadcrumbConfig | undefined = route.data[BREADCRUMB_KEY];
    if (!breadCrumbConfig) {
      this.breadcrumbsSig.set([]);
      return;
    }

    const sourceTab = route.queryParams[SOURCE_TAB_PARAM] || TabsTypesEnum.CURRENT_ORDERS;
    const queryParams = { [SOURCE_TAB_PARAM]: sourceTab };

    // Current URL (path only, without query params)
    const currentUrl = this.router.url.split('?')[0];

    // Build breadcrumb hierarchy: Home → Parents (recursive) → Current
    const breadcrumbs: Breadcrumb[] = [];

    // Level 1: Home breadcrumb (from query param)
    if (sourceTab && TAB_LABELS[sourceTab]) {
      breadcrumbs.push({
        label: this.tr.translate(TAB_LABELS[sourceTab] as TabTranslationKey),
        url: '/list',
        queryParams,
      });
    }

    // Level 2+: Parent breadcrumbs (recursively built from nested config)
    const parentBreadcrumbs = this.buildParentBreadcrumbs(breadCrumbConfig.parent, route.data, route.params, queryParams);
    breadcrumbs.push(...parentBreadcrumbs);

    // Final level: Current breadcrumb (from config - e.g., "Train Run 123")
    const label = this.resolveLabel(breadCrumbConfig.label, route.data, route.params);
    if (label) breadcrumbs.push({ label, url: currentUrl, queryParams });

    this.breadcrumbsSig.set(breadcrumbs);
  }
}
