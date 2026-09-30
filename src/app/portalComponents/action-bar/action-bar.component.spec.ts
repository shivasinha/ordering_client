// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule, NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { ActionBarService } from '@Ordering/shared/services/action-bar.service';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { ActionBarComponent } from '@Ordering/portalComponents/action-bar/action-bar.component';
import { MatTabGroup } from '@angular/material/tabs';
import { TabsTypesEnum } from '@Ordering/data/custom/enum/tabTypes';
import { UserPermissionService } from '@Ordering/core/services/user-permission.service';
import { NavigationService } from '@Ordering/shared/services/navigation.service';
import { SOURCE_TAB_PARAM } from '@Ordering/shared/services/breadcrumb.service';
import { of } from 'rxjs';

class ResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

describe('ActionBarComponent', () => {
  let component: ActionBarComponent;
  let fixture: ComponentFixture<ActionBarComponent>;
  let mockNavigationService: jest.Mocked<NavigationService>;
  let mockActionBarService: jest.Mocked<ActionBarService>;
  let mockUserPermissionService: jest.Mocked<UserPermissionService>;

  beforeEach(async () => {
    const mockTranslationsService = {
      translate: jest.fn().mockImplementation((key: string) => key),
      guiLanguage: 'en',
    };
    mockNavigationService = {
      navigate: jest.fn(),
      navigateToList: jest.fn(),
      navigateToLogin: jest.fn(),
    } as jest.Mocked<NavigationService>;
    mockActionBarService = {
      selectedTab: { id: 0 },
    } as jest.Mocked<ActionBarService>;

    mockUserPermissionService = {
      checkPermissions: jest.fn().mockReturnValue(true), // Allow all permissions by default
    } as jest.Mocked<UserPermissionService>;

    const mockActivatedRoute = {
      snapshot: {
        queryParams: {},
      },
      queryParams: of({}),
    };

    await TestBed.configureTestingModule({
      imports: [TranslatePipe, HttpClientModule, ActionBarComponent, BrowserAnimationsModule, NoopAnimationsModule],
      providers: [
        { provide: TranslationsService, useValue: mockTranslationsService },
        { provide: NavigationService, useValue: mockNavigationService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: ActionBarService, useValue: mockActionBarService },
        { provide: UserPermissionService, useValue: mockUserPermissionService },
      ],
    }).compileComponents();

    // Assign the mock to the global ResizeObserver
    global.ResizeObserver = ResizeObserver;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ActionBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clears all mocks
    jest.clearAllTimers(); // Clears all timers
    jest.restoreAllMocks(); // Restores original implementation of mocked functions
    TestBed.resetTestingModule();
    mockActionBarService.close?.();
    mockUserPermissionService.close?.();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize tabs correctly', () => {
    component.ngAfterViewInit();
    expect(component.tabs.length).toBe(4);
  });

  it('should set the active tab on ngAfterViewInit', () => {
    component.tabs = [{ abbreviation: 'CO', id: 0, label: undefined, name: TabsTypesEnum.CURRENT_ORDERS, static: true }];

    component.tpsTabs = {
      setActiveTab: jest.fn(),
    } as MatTabGroup;

    component.ngAfterViewInit();

    expect(component.tpsTabs.setActiveTab).toHaveBeenCalled;
  });

  it('should navigate to new order page', () => {
    component.newOrder();
    expect(mockNavigationService.navigate).toHaveBeenCalledWith(['orders', 'add'], {
      extras: { queryParams: { [SOURCE_TAB_PARAM]: 'CURRENT_ORDERS' } },
    });
  });

  it('should set the clicked tab active', () => {
    const event = { index: 1 } as MatTabChangeEvent;
    component.tabClicked(event);
    expect(component.actionBarService.selectedTab).toBe(component.tabs[1]);
  });

  it('should set selectedTab and selectedIndex on ngAfterViewInit', () => {
    component.tpsTabs = {
      selectedIndex: 0,
    } as MatTabGroup;

    component.ngAfterViewInit();

    expect(component.actionBarService.selectedTab).toBe(component.tabs[0]);
    expect(component.tpsTabs.selectedIndex).toBe(0);
  });
});
