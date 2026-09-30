// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NavigationService } from './navigation.service';
import { ActionBarService } from '@Ordering/shared/services/action-bar.service';
import { TabsTypesEnum } from '@Ordering/data/custom/enum/tabTypes';
import { SOURCE_TAB_PARAM } from '@Ordering/shared/services/breadcrumb.service';

describe('NavigationService', () => {
  let service: NavigationService;
  let mockRouter: any;
  let mockActionBarService: any;

  beforeEach(() => {
    mockRouter = {
      navigate: jest.fn().mockResolvedValue(true),
    };

    mockActionBarService = {
      selectedTab: { name: TabsTypesEnum.CURRENT_ORDERS },
    };

    TestBed.configureTestingModule({
      providers: [
        NavigationService,
        { provide: Router, useValue: mockRouter },
        { provide: ActionBarService, useValue: mockActionBarService },
      ],
    });

    service = TestBed.inject(NavigationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('navigate', () => {
    it('should add tab query param from ActionBarService selected tab', () => {
      service.navigate(['/orders', '123']);

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/orders', '123'], {
        queryParams: { [SOURCE_TAB_PARAM]: TabsTypesEnum.CURRENT_ORDERS },
      });
    });

    it('should use explicitly provided tab query param over ActionBarService', () => {
      service.navigate(['/orders', '123'], {
        extras: { queryParams: { [SOURCE_TAB_PARAM]: TabsTypesEnum.ARCHIVE_ORDERS } },
      });

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/orders', '123'], {
        queryParams: { [SOURCE_TAB_PARAM]: TabsTypesEnum.ARCHIVE_ORDERS },
      });
    });

    it('should fallback to CURRENT_ORDERS when ActionBarService has no selected tab', () => {
      mockActionBarService.selectedTab = undefined;

      service.navigate(['/list']);

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/list'], {
        queryParams: { [SOURCE_TAB_PARAM]: TabsTypesEnum.CURRENT_ORDERS },
      });
    });

    it('should preserve other NavigationExtras like replaceUrl', () => {
      service.navigate(['/orders', '456'], { extras: { replaceUrl: true } });

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/orders', '456'], {
        replaceUrl: true,
        queryParams: { [SOURCE_TAB_PARAM]: TabsTypesEnum.CURRENT_ORDERS },
      });
    });

    it('should merge additional query params with the tab param', () => {
      service.navigate(['/orders'], {
        extras: { queryParams: { filter: 'active' } },
      });

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/orders'], {
        queryParams: { filter: 'active', [SOURCE_TAB_PARAM]: TabsTypesEnum.CURRENT_ORDERS },
      });
    });

    it('should preserve relativeTo and queryParamsHandling extras', () => {
      const mockRoute = {} as any;
      service.navigate([], {
        extras: { relativeTo: mockRoute, queryParamsHandling: 'merge' },
      });

      expect(mockRouter.navigate).toHaveBeenCalledWith([], {
        relativeTo: mockRoute,
        queryParamsHandling: 'merge',
        queryParams: { [SOURCE_TAB_PARAM]: TabsTypesEnum.CURRENT_ORDERS },
      });
    });

    it('should sync ActionBarService when provided tab differs from selected tab', () => {
      mockActionBarService.selectedTab = { name: TabsTypesEnum.CURRENT_ORDERS };

      service.navigate(['/list'], {
        extras: { queryParams: { [SOURCE_TAB_PARAM]: TabsTypesEnum.TRAIN_RUNS } },
      });

      expect(mockActionBarService.selectedTab.name).toBe(TabsTypesEnum.TRAIN_RUNS);
    });

    it('should not update ActionBarService when tab matches the selected tab', () => {
      const originalTab = { name: TabsTypesEnum.CURRENT_ORDERS };
      mockActionBarService.selectedTab = originalTab;

      service.navigate(['/orders', '123']);

      // selectedTab should remain the same object reference (no unnecessary set)
      expect(mockActionBarService.selectedTab).toBe(originalTab);
    });
  });

  describe('navigateToList', () => {
    it('should navigate to /list with tab param', () => {
      service.navigateToList();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/list'], {
        queryParams: { [SOURCE_TAB_PARAM]: TabsTypesEnum.CURRENT_ORDERS },
      });
    });

    it('should pass extras to navigate', () => {
      service.navigateToList({ extras: { replaceUrl: true } });

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/list'], {
        replaceUrl: true,
        queryParams: { [SOURCE_TAB_PARAM]: TabsTypesEnum.CURRENT_ORDERS },
      });
    });

    it('should use TRAIN_RUNS tab when ActionBarService has TRAIN_RUNS selected', () => {
      mockActionBarService.selectedTab = { name: TabsTypesEnum.TRAIN_RUNS };

      service.navigateToList();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/list'], {
        queryParams: { [SOURCE_TAB_PARAM]: TabsTypesEnum.TRAIN_RUNS },
      });
    });
  });

  describe('navigateToLogin', () => {
    it('should navigate to /login without tab param', () => {
      service.navigateToLogin();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login'], undefined);
    });

    it('should not include any query params', () => {
      service.navigateToLogin();

      const callArgs = mockRouter.navigate.mock.calls[0];
      expect(callArgs[1]).toBeUndefined();
    });
  });
});
