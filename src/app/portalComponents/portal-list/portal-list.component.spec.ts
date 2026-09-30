// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal, Component } from '@angular/core';

import { TranslationsService } from '@Ordering/core/services/translations.service';
import { ActionBarService } from '@Ordering/shared/services/action-bar.service';
import { TabsTypesEnum } from '@Ordering/data/custom/enum/tabTypes';
import { ITabInstanceData } from '@Ordering/data/custom/ITabInstanceData';
import { PortalListComponent } from './portal-list.component';

// Stub all child container components to avoid deep provider chains
@Component({ selector: 'app-action-bar', standalone: true, template: '' })
class StubActionBarComponent {}

@Component({ selector: 'app-current-orders-container', standalone: true, template: '' })
class StubCurrentOrdersContainerComponent {}

@Component({ selector: 'app-archived-orders-container', standalone: true, template: '' })
class StubArchivedOrdersContainerComponent {}

@Component({ selector: 'app-train-run-list-container', standalone: true, template: '' })
class StubTrainRunListContainerComponent {}

@Component({ selector: 'app-spare-capacity-container', standalone: true, template: '' })
class StubSpareCapacityContainerComponent {}

function createMockActionBarService(tabName: string = TabsTypesEnum.CURRENT_ORDERS) {
  const mockSelectedTabSignal = signal<ITabInstanceData | undefined>({ name: tabName });
  return {
    get selectedTab(): ITabInstanceData | undefined {
      return mockSelectedTabSignal();
    },
    set selectedTab(tab: ITabInstanceData) {
      mockSelectedTabSignal.set(tab);
    },
    selectTab: jest.fn(),
  };
}

describe('PortalListComponent', () => {
  let component: PortalListComponent;
  let fixture: ComponentFixture<PortalListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortalListComponent, NoopAnimationsModule],
      providers: [
        { provide: TranslationsService, useValue: { translate: jest.fn((key: string) => key) } },
        { provide: ActionBarService, useValue: createMockActionBarService() },
      ],
    })
      .overrideComponent(PortalListComponent, {
        set: {
          imports: [
            StubActionBarComponent,
            StubCurrentOrdersContainerComponent,
            StubArchivedOrdersContainerComponent,
            StubTrainRunListContainerComponent,
            StubSpareCapacityContainerComponent,
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(PortalListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render app-train-run-list-container when TRAIN_RUNS tab is selected', () => {
    const actionBarService = TestBed.inject(ActionBarService);
    actionBarService.selectedTab = { name: TabsTypesEnum.TRAIN_RUNS } as ITabInstanceData;
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('app-train-run-list-container');
    expect(el).toBeTruthy();
  });

  it('should render app-current-orders-container when CURRENT_ORDERS tab is selected', () => {
    const el = fixture.nativeElement.querySelector('app-current-orders-container');
    expect(el).toBeTruthy();
  });

  it('should render app-spare-capacity-container when SPARE_CAPACITY tab is selected', () => {
    const actionBarService = TestBed.inject(ActionBarService);
    actionBarService.selectedTab = { name: TabsTypesEnum.SPARE_CAPACITY } as ITabInstanceData;
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('app-spare-capacity-container');
    expect(el).toBeTruthy();
  });
});
