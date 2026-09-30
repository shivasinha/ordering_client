// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { TestBed } from '@angular/core/testing';
import { Router, NavigationEnd, ActivatedRouteSnapshot } from '@angular/router';
import { Subject } from 'rxjs';
import {
  BreadcrumbService,
  BreadcrumbConfig,
  SOURCE_TAB_PARAM,
  formatOrderLabel,
  formatOrderItemLabel,
  formatTrainRunLabel,
  formatOfferItemLabel,
  formatNewOrderLabel,
  formatNewOrderItemLabel,
} from './breadcrumb.service';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { TabsTypesEnum } from '@Ordering/data/custom/enum/tabTypes';

describe('BreadcrumbService', () => {
  let service: BreadcrumbService;
  let routerEvents$: Subject<any>;
  let mockRouter: any;
  let mockTranslationsService: any;

  /** Helper to build a minimal route snapshot chain. */
  function buildRouteSnapshot(
    data: Record<string, any>,
    queryParams: Record<string, string> = {},
    urlSegments: { path: string }[][] = [[{ path: 'test' }]],
    params: Record<string, string> = {},
  ): ActivatedRouteSnapshot {
    // Build a chain: root -> child (leaf)
    const root = {
      url: [],
      data: {},
      params: {},
      queryParams: {},
      firstChild: null,
      pathFromRoot: [],
    } as unknown as ActivatedRouteSnapshot;

    const leaf = {
      url: urlSegments[urlSegments.length - 1] || [],
      data,
      params,
      queryParams,
      firstChild: null,
      pathFromRoot: urlSegments.map(segments => ({
        url: segments,
      })),
    } as unknown as ActivatedRouteSnapshot;

    // Set up pathFromRoot to include the root then each segment
    leaf.pathFromRoot = [{ url: [] } as any, ...urlSegments.map(segs => ({ url: segs }) as any)];

    root.firstChild = leaf as any;

    return root;
  }

  beforeEach(() => {
    routerEvents$ = new Subject();

    mockRouter = {
      events: routerEvents$.asObservable(),
      url: '/test',
      routerState: {
        snapshot: {
          root: buildRouteSnapshot({}, {}),
        },
      },
    };

    mockTranslationsService = {
      translate: jest.fn((key: string) => `[${key}]`),
    };

    TestBed.configureTestingModule({
      providers: [
        BreadcrumbService,
        { provide: Router, useValue: mockRouter },
        { provide: TranslationsService, useValue: mockTranslationsService },
      ],
    });

    service = TestBed.inject(BreadcrumbService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have no breadcrumbs initially', () => {
    expect(service.breadcrumbs()).toEqual([]);
    expect(service.showBreadcrumbs()).toBe(false);
  });

  describe('updateBreadcrumbs on NavigationEnd', () => {
    it('should clear breadcrumbs when route has no breadcrumb config', () => {
      mockRouter.routerState.snapshot.root = buildRouteSnapshot({}, {});
      routerEvents$.next(new NavigationEnd(1, '/test', '/test'));

      expect(service.breadcrumbs()).toEqual([]);
      expect(service.showBreadcrumbs()).toBe(false);
    });

    it('should build breadcrumbs with a simple string label', () => {
      const config: BreadcrumbConfig = { label: 'Details' };
      mockRouter.routerState.snapshot.root = buildRouteSnapshot(
        { breadcrumb: config },
        { [SOURCE_TAB_PARAM]: TabsTypesEnum.CURRENT_ORDERS },
        [[{ path: 'details' }]],
      );
      mockRouter.url = '/details';
      routerEvents$.next(new NavigationEnd(1, '/details', '/details'));

      const crumbs = service.breadcrumbs();
      expect(crumbs.length).toBe(2);
      // Home breadcrumb
      expect(crumbs[0].label).toBe('[lblCurrentOrders]');
      expect(crumbs[0].url).toBe('/list');
      // Current breadcrumb
      expect(crumbs[1].label).toBe('Details');
      expect(crumbs[1].url).toBe('/details');
      expect(service.showBreadcrumbs()).toBe(true);
    });

    it('should build breadcrumbs with a function label', () => {
      const config: BreadcrumbConfig = {
        label: tr => tr.translate('lblOrder') + ' 42',
      };
      mockRouter.routerState.snapshot.root = buildRouteSnapshot(
        { breadcrumb: config },
        { [SOURCE_TAB_PARAM]: TabsTypesEnum.CURRENT_ORDERS },
        [[{ path: 'order' }, { path: '42' }]],
      );
      mockRouter.url = '/order/42';
      routerEvents$.next(new NavigationEnd(1, '/order/42', '/order/42'));

      const crumbs = service.breadcrumbs();
      expect(crumbs[crumbs.length - 1].label).toBe('[lblOrder] 42');
    });

    it('should build parent breadcrumbs in the correct order', () => {
      const config: BreadcrumbConfig = {
        label: 'Train Run 7',
        parent: {
          label: 'Order 42',
          url: '/order/42',
          parent: undefined,
        },
      };
      mockRouter.routerState.snapshot.root = buildRouteSnapshot(
        { breadcrumb: config },
        { [SOURCE_TAB_PARAM]: TabsTypesEnum.CURRENT_ORDERS },
        [[{ path: 'order' }, { path: '42' }, { path: 'train' }, { path: '7' }]],
      );
      mockRouter.url = '/order/42/train/7';
      routerEvents$.next(new NavigationEnd(1, '/order/42/train/7', '/order/42/train/7'));

      const crumbs = service.breadcrumbs();
      expect(crumbs.length).toBe(3);
      expect(crumbs[0].label).toBe('[lblCurrentOrders]');
      expect(crumbs[1].label).toBe('Order 42');
      expect(crumbs[1].url).toBe('/order/42');
      expect(crumbs[2].label).toBe('Train Run 7');
    });

    it('should handle deeply nested parent configs', () => {
      const config: BreadcrumbConfig = {
        label: 'Leaf',
        parent: {
          label: 'Level 2',
          url: '/l2',
          parent: {
            label: 'Level 1',
            url: '/l1',
          },
        },
      };
      mockRouter.routerState.snapshot.root = buildRouteSnapshot({ breadcrumb: config }, { [SOURCE_TAB_PARAM]: TabsTypesEnum.TRAIN_RUNS }, [
        [{ path: 'l1' }, { path: 'l2' }, { path: 'leaf' }],
      ]);
      mockRouter.url = '/l1/l2/leaf';
      routerEvents$.next(new NavigationEnd(1, '/l1/l2/leaf', '/l1/l2/leaf'));

      const crumbs = service.breadcrumbs();
      expect(crumbs.length).toBe(4);
      expect(crumbs[0].label).toBe('[lblTrainsList]');
      expect(crumbs[1].label).toBe('Level 1');
      expect(crumbs[2].label).toBe('Level 2');
      expect(crumbs[3].label).toBe('Leaf');
    });

    it('should default to CURRENT_ORDERS tab when no tab query param is present', () => {
      const config: BreadcrumbConfig = { label: 'Page' };
      mockRouter.routerState.snapshot.root = buildRouteSnapshot(
        { breadcrumb: config },
        {}, // no tab query param
        [[{ path: 'page' }]],
      );
      mockRouter.url = '/page';
      routerEvents$.next(new NavigationEnd(1, '/page', '/page'));

      const crumbs = service.breadcrumbs();
      expect(crumbs[0].label).toBe('[lblCurrentOrders]');
      expect(crumbs[0].queryParams).toEqual({ [SOURCE_TAB_PARAM]: TabsTypesEnum.CURRENT_ORDERS });
    });

    it('should use ARCHIVE_ORDERS tab label when specified in query params', () => {
      const config: BreadcrumbConfig = { label: 'Page' };
      mockRouter.routerState.snapshot.root = buildRouteSnapshot(
        { breadcrumb: config },
        { [SOURCE_TAB_PARAM]: TabsTypesEnum.ARCHIVE_ORDERS },
        [[{ path: 'page' }]],
      );
      mockRouter.url = '/page';
      routerEvents$.next(new NavigationEnd(1, '/page', '/page'));

      const crumbs = service.breadcrumbs();
      expect(crumbs[0].label).toBe('[lblArchivedOrders]');
    });

    it('should use SPARE_CAPACITY tab label when specified in query params', () => {
      const config: BreadcrumbConfig = { label: 'Page' };
      mockRouter.routerState.snapshot.root = buildRouteSnapshot(
        { breadcrumb: config },
        { [SOURCE_TAB_PARAM]: TabsTypesEnum.SPARE_CAPACITY },
        [[{ path: 'page' }]],
      );
      mockRouter.url = '/page';
      routerEvents$.next(new NavigationEnd(1, '/page', '/page'));

      const crumbs = service.breadcrumbs();
      expect(crumbs[0].label).toBe('[lblSpareCapacity]');
    });

    it('should skip home breadcrumb when tab type has no matching label', () => {
      const config: BreadcrumbConfig = { label: 'Page' };
      mockRouter.routerState.snapshot.root = buildRouteSnapshot({ breadcrumb: config }, { [SOURCE_TAB_PARAM]: 'UNKNOWN_TAB' }, [
        [{ path: 'page' }],
      ]);
      mockRouter.url = '/page';
      routerEvents$.next(new NavigationEnd(1, '/page', '/page'));

      const crumbs = service.breadcrumbs();
      // Only the current breadcrumb, no home
      expect(crumbs.length).toBe(1);
      expect(crumbs[0].label).toBe('Page');
    });

    it('should handle parent with function URL', () => {
      const config: BreadcrumbConfig = {
        label: 'Train Run',
        parent: {
          label: 'Order',
          url: params => `/order/${params['order-id']}`,
        },
      };
      mockRouter.routerState.snapshot.root = buildRouteSnapshot(
        { breadcrumb: config },
        { [SOURCE_TAB_PARAM]: TabsTypesEnum.CURRENT_ORDERS },
        [[{ path: 'order' }, { path: '55' }, { path: 'train' }, { path: '3' }]],
        { 'order-id': '55' },
      );
      mockRouter.url = '/order/55/train/3';
      routerEvents$.next(new NavigationEnd(1, '/order/55/train/3', '/order/55/train/3'));

      const crumbs = service.breadcrumbs();
      expect(crumbs[1].url).toBe('/order/55');
    });

    it('should skip breadcrumb levels with undefined labels', () => {
      const config: BreadcrumbConfig = {
        label: 'Current Page',
        parent: {
          label: undefined, // no label – should be skipped
          url: '/skipped',
        },
      };
      mockRouter.routerState.snapshot.root = buildRouteSnapshot(
        { breadcrumb: config },
        { [SOURCE_TAB_PARAM]: TabsTypesEnum.CURRENT_ORDERS },
        [[{ path: 'page' }]],
      );
      mockRouter.url = '/page';
      routerEvents$.next(new NavigationEnd(1, '/page', '/page'));

      const crumbs = service.breadcrumbs();
      // Home + Current (parent skipped because label is undefined)
      expect(crumbs.length).toBe(2);
      expect(crumbs[0].label).toBe('[lblCurrentOrders]');
      expect(crumbs[1].label).toBe('Current Page');
    });

    it('should propagate queryParams to all breadcrumbs', () => {
      const config: BreadcrumbConfig = {
        label: 'Leaf',
        parent: { label: 'Parent', url: '/parent' },
      };
      mockRouter.routerState.snapshot.root = buildRouteSnapshot({ breadcrumb: config }, { [SOURCE_TAB_PARAM]: TabsTypesEnum.TRAIN_RUNS }, [
        [{ path: 'parent' }, { path: 'leaf' }],
      ]);
      mockRouter.url = '/parent/leaf';
      routerEvents$.next(new NavigationEnd(1, '/parent/leaf', '/parent/leaf'));

      const crumbs = service.breadcrumbs();
      for (const crumb of crumbs) {
        expect(crumb.queryParams).toEqual({ [SOURCE_TAB_PARAM]: TabsTypesEnum.TRAIN_RUNS });
      }
    });
  });

  describe('label formatter functions', () => {
    it('formatOrderLabel should return order label with externalId from data', () => {
      const data = { order: { externalId: 'ORD-100' } };
      const result = formatOrderLabel(mockTranslationsService, data, {});
      expect(result).toBe('[lblOrder] ORD-100');
    });

    it('formatOrderLabel should fall back to order-id param', () => {
      const result = formatOrderLabel(mockTranslationsService, {}, { 'order-id': '77' });
      expect(result).toBe('[lblOrder] 77');
    });

    it('formatOrderLabel should return just label when no order info exists', () => {
      const result = formatOrderLabel(mockTranslationsService, {}, {});
      expect(result).toBe('[lblOrder]');
    });

    it('formatOrderItemLabel should return order item label with externalId', () => {
      const data = { orderItem: { externalId: 'TR-5' } };
      const result = formatOrderItemLabel(mockTranslationsService, data);
      expect(result).toBe('[lblOrderItem] TR-5');
    });

    it('formatTrainRunLabel should fall back to trainRun data', () => {
      const data = { trainRun: { trainNumber: 'TR-9' } };
      const result = formatTrainRunLabel(mockTranslationsService, data);
      expect(result).toBe('[lblTrainRun] TR-9');
    });

    it('formatTrainRunLabel should return just label when no train number exists', () => {
      const result = formatTrainRunLabel(mockTranslationsService, {});
      expect(result).toBe('[lblTrainRun]');
    });

    it('formatOfferItemLabel should return offer item label with externalId', () => {
      const data = { offerItem: { externalId: 'OI-3' } };
      const result = formatOfferItemLabel(mockTranslationsService, data);
      expect(result).toBe('[lblOfferItem] OI-3');
    });

    it('formatOfferItemLabel should return just label when no train number exists', () => {
      const result = formatOfferItemLabel(mockTranslationsService, {});
      expect(result).toBe('[lblOfferItem]');
    });

    it('formatNewOrderLabel should return translated new order label', () => {
      const result = formatNewOrderLabel(mockTranslationsService);
      expect(result).toBe('[lblNewOrder]');
    });

    it('formatNewOrderItemLabel should return translated new order item label', () => {
      const result = formatNewOrderItemLabel(mockTranslationsService);
      expect(result).toBe('[lblNewOrderItem]');
    });
  });
});
