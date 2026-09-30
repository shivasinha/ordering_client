// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule, MatSortHeader } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError, Subscription } from 'rxjs';
import { OrderResponse, MessageState, OrderState, TrainState, TrainRunListItem, Source, OrderItemAction } from '@Ordering/api';
import { OrderingApiName } from '@Ordering/data/custom/enum/ordering-api-names.enum';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { FilterService } from '@Ordering/shared/services/filter.service';
import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { ListActionsService } from '@Ordering/shared/services/list-actions.service';
import { OrderActionsService } from '@Ordering/shared/services/order-actions.service';
import { ConfirmationDialogComponent } from '@Ordering/shared/components/confirmation-dialog/confirmation-dialog.component';
import { ListTypesEnum, ActionNamesEnum } from '@Ordering/data/custom/enum/listTypes';
import { ListComponent } from './list.component';

describe('ListComponent', () => {
  let component: ListComponent;
  let fixture: ComponentFixture<ListComponent>;
  let dialog: MatDialog;
  let listActionsService: ListActionsService;
  let orderActionsService: OrderActionsService;
  let subscriptions: Subscription[] = [];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ListComponent,
        HttpClientModule,
        MatPaginatorModule,
        MatSortModule,
        MatDialogModule,
        RouterTestingModule,
        SharedMaterialModule,
        TranslatePipe,
      ],
      providers: [FilterService, TranslationsService, ListActionsService, OrderActionsService],
    }).compileComponents();

    fixture = TestBed.createComponent(ListComponent);
    component = fixture.componentInstance;
    dialog = TestBed.inject(MatDialog);
    listActionsService = TestBed.inject(ListActionsService);
    orderActionsService = TestBed.inject(OrderActionsService);
    fixture.detectChanges();
  });

  afterEach(() => {
    // Unsubscribe from all subscriptions
    subscriptions.forEach(sub => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
    subscriptions = [];

    // Clear timers and mocks
    jest.clearAllTimers();
    jest.clearAllMocks();
    jest.restoreAllMocks();

    // Reset TestBed
    TestBed.resetTestingModule();

    // Destroy fixture
    if (fixture) {
      fixture.destroy();
    }
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set tableDataSource and displayedColumns on data change', () => {
    const data = new MatTableDataSource([{ id: 1, name: 'Test' }]);
    const columns = [{ columnDef: 'id' }, { columnDef: 'name' }];
    component.data = data;
    component.columns = columns;

    component.ngOnChanges({
      data: {
        currentValue: data,
        previousValue: undefined,
        firstChange: true,
        isFirstChange: () => true,
      },
    });

    expect(component.tableDataSource).toBe(data);
    expect(component.displayedColumns).toEqual(['id', 'name']);
  });

  it('should not render mat-sort-header on the actions column', () => {
    const data = new MatTableDataSource([{ trainNumber: 123 }]);
    const columns = [
      { columnDef: 'trainNumber', type: 'number', header: 'Train Number' },
      { columnDef: 'actions', type: 'actions', header: 'Actions', actionsList: [] },
    ];
    component.data = data;
    component.columns = columns;

    component.ngOnChanges({
      data: {
        currentValue: data,
        previousValue: undefined,
        firstChange: true,
        isFirstChange: () => true,
      },
    });
    fixture.detectChanges();

    const headerCells: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('th[mat-header-cell]'));
    const actionsHeader = headerCells.find(th => th.textContent?.trim() === 'Actions');
    const trainNumberHeader = headerCells.find(th => th.textContent?.trim() === 'Train Number');

    // mat-sort-header is a template-authored attribute selector; Angular Ivy keeps it in the
    // rendered DOM, so hasAttribute() reliably reflects whether the directive was applied.
    expect(actionsHeader?.hasAttribute('mat-sort-header')).toBe(false);
    expect(trainNumberHeader?.hasAttribute('mat-sort-header')).toBe(true);

    // Directive-based check: confirms MatSortHeader is not instantiated on the actions header,
    // independent of how the attribute happens to be reflected in the DOM.
    const sortHeaderDebugEls = fixture.debugElement.queryAll(By.directive(MatSortHeader));
    const sortHeaderIds = sortHeaderDebugEls.map(el => el.nativeElement.textContent?.trim());
    expect(sortHeaderIds).not.toContain('Actions');
    expect(sortHeaderIds).toContain('Train Number');
  });

  it('should setup table after view init', () => {
    jest.spyOn(component, 'defferedTableSetup');
    component.ngAfterViewInit();
    expect(component.defferedTableSetup).toHaveBeenCalled();
  });

  it('should setup table with paginator and sort', () => {
    component.tableDataSource = new MatTableDataSource([]);
    component.paginator = { pageSize: 10 } as MatPaginator;
    component.sort = {} as MatSort;

    component.setupTable();

    expect(component.tableDataSource.paginator).toBe(component.paginator);
    expect(component.tableDataSource.sort).toBe(component.sort);
  });

  it('should perform cancel action by opening the train run action dialog', () => {
    const actionDialogService = component['actionDialogService'];
    jest.spyOn(actionDialogService, 'openTrainRunActionDialog').mockReturnValue(of(undefined));
    const data = { externalId: '123' } as any;
    component.listType = ListTypesEnum.TRAINS;
    component.performAction(data, ActionNamesEnum.CANCEL_TRAIN_RUN);
    expect(actionDialogService.openTrainRunActionDialog).toHaveBeenCalledWith(expect.anything(), expect.anything(), data);
  });

  it('should perform delete action', () => {
    jest.spyOn(component as any, 'delete');
    const data = { externalId: '123' } as any;
    component.performAction(data, ActionNamesEnum.DELETE, 0);
    expect((component as any).delete).toHaveBeenCalledWith(0);
  });

  it('should perform edit action', () => {
    jest.spyOn(component, 'navigateByListType');
    const data = { externalId: '123' } as any;
    component.performAction(data, ActionNamesEnum.EDIT, 0);
    expect(component.navigateByListType).toHaveBeenCalledWith(data, 0);
  });

  it('should do nothing for an unhandled action such as COPY', () => {
    const actionDialogService = component['actionDialogService'];
    jest.spyOn(actionDialogService, 'openTrainRunActionDialog');
    jest.spyOn(component as any, 'delete');
    jest.spyOn(component, 'navigateByListType');
    const data = { trainNumber: '123' } as any;

    expect(() => component.performAction(data, ActionNamesEnum.COPY)).not.toThrow();

    expect(actionDialogService.openTrainRunActionDialog).not.toHaveBeenCalled();
    expect((component as any).delete).not.toHaveBeenCalled();
    expect(component.navigateByListType).not.toHaveBeenCalled();
  });

  it('should init train run modification', () => {
    const actionDialogService = component['actionDialogService'];
    jest.spyOn(actionDialogService, 'openTrainRunActionDialog').mockReturnValue(of(undefined));
    const data = { trainNumber: '123' } as any;
    component.performAction(data, ActionNamesEnum.MODIFY_TRAIN_RUN);
    expect(actionDialogService.openTrainRunActionDialog).toHaveBeenCalled();
  });

  it('should call actionDialogService.openTrainRunActionDialog for CANCEL_TRAIN_RUN when listType is not TRAINS', () => {
    const actionDialogService = component['actionDialogService'];
    jest.spyOn(actionDialogService, 'openTrainRunActionDialog').mockReturnValue(of(undefined));
    const data = { trainNumber: '123' } as any;
    component.listType = ListTypesEnum.ARCHIVED_ORDERS;
    component.performAction(data, ActionNamesEnum.CANCEL_TRAIN_RUN);
    expect(actionDialogService.openTrainRunActionDialog).toHaveBeenCalled();
  });

  describe('openTrainRunActionDialog behavior', () => {
    it('should call actionDialogService.openTrainRunActionDialog for MODIFY_TRAIN_RUN action', () => {
      const actionDialogService = component['actionDialogService'];
      jest.spyOn(actionDialogService, 'openTrainRunActionDialog').mockReturnValue(of(undefined));
      const trainRunData = { trainNumber: '123' } as any;
      component.performAction(trainRunData, ActionNamesEnum.MODIFY_TRAIN_RUN);
      expect(actionDialogService.openTrainRunActionDialog).toHaveBeenCalled();
    });

    it('should pass train run data to openTrainRunActionDialog', () => {
      const actionDialogService = component['actionDialogService'];
      jest.spyOn(actionDialogService, 'openTrainRunActionDialog').mockReturnValue(of(undefined));
      const trainRunData = { trainNumber: 'TRAIN-123' } as any;
      component.performAction(trainRunData, ActionNamesEnum.MODIFY_TRAIN_RUN);
      expect(actionDialogService.openTrainRunActionDialog).toHaveBeenCalledWith(expect.anything(), expect.anything(), trainRunData);
    });
  });

  describe('openTrainRunActionDialog via performAction', () => {
    it('should call actionDialogService.openTrainRunActionDialog with train data for MODIFY_TRAIN_RUN', () => {
      const actionDialogService = component['actionDialogService'];
      jest.spyOn(actionDialogService, 'openTrainRunActionDialog').mockReturnValue(of(undefined));

      const trainRunData = { trainNumber: 'TRAIN-456' } as any;
      component.performAction(trainRunData, ActionNamesEnum.MODIFY_TRAIN_RUN);

      expect(actionDialogService.openTrainRunActionDialog).toHaveBeenCalledWith(expect.anything(), expect.anything(), trainRunData);
    });
  });

  it('should open confirmation dialog and delete order', () => {
    jest.spyOn(dialog, 'open').mockReturnValue({
      afterClosed: () => of(true),
    } as any);
    jest.spyOn(orderActionsService, 'deleteDraftOrder');
    const data = { externalId: '123' } as any;
    component.listType = ListTypesEnum.CURRENT_ORDERS;
    component.delete(data);
    fixture.detectChanges();
    const dialogRef = dialog.open(ConfirmationDialogComponent, {
      data: { message: 'Are you sure you want to delete this order?' },
    });

    const sub = dialogRef.afterClosed().subscribe(result => {
      if (result) {
        expect(orderActionsService.deleteDraftOrder).toHaveBeenCalledWith('123');
      }
    });
    subscriptions.push(sub);

    expect(dialog.open).toHaveBeenCalled();
    const sub2 = dialogRef.afterClosed().subscribe(() => {
      expect(orderActionsService.deleteDraftOrder).toHaveBeenCalledWith('123');
    });
    subscriptions.push(sub2);
  });

  it('should open confirmation dialog and delete order item', () => {
    jest.spyOn(dialog, 'open').mockReturnValue({
      afterClosed: () => of(true),
    } as any);
    jest.spyOn(listActionsService, 'deleteOrderItem');
    const data = { orderId: '123' } as any;
    component.listType = ListTypesEnum.ORDER_ITEMS;
    component.itemsId = ['item1'];
    component.delete(data, 0);
    const dialogRef = dialog.open(ConfirmationDialogComponent, {
      data: { message: 'Are you sure you want to delete this order?' },
    });

    const sub = dialogRef.afterClosed().subscribe(result => {
      if (result) {
        expect(orderActionsService.deleteOrderItem).toHaveBeenCalledWith('123');
      }
    });
    subscriptions.push(sub);

    expect(dialog.open).toHaveBeenCalled();
    const sub2 = dialogRef.afterClosed().subscribe(() => {
      expect(orderActionsService.deleteOrderItem).toHaveBeenCalledWith('123');
    });
    subscriptions.push(sub2);
  });

  it('should navigate to order detail', () => {
    jest.spyOn(component, 'navigate');
    const data: OrderResponse = {
      subject: 'Mock Subject',
      externalId: '123',
      state: OrderState.DRAFT,
      messageState: MessageState.NO_MESSAGE,
      creationDateTime: new Date().toISOString(),
      lastModifiedDateTime: new Date().toISOString(),
      orderOrigin: Source.INFRASTRUCTURE_MANAGER,
    };
    component.listType = ListTypesEnum.CURRENT_ORDERS;
    component.navigateByListType(data);
    fixture.detectChanges();
    component.navigate('/orders', data.externalId);
    expect(component.navigate).toHaveBeenCalledWith('/orders', '123');
  });

  it('should navigate to order item detail', () => {
    jest.spyOn(component, 'navigate');
    const data: TrainRun = {
      trainId: 1,
      schedVersionId: 1,
      trainNumber: '12345',
      isConditionalTrainRun: false,
      orderId: '123',
      state: TrainState.PUBLISHED,
      operatingCompany: 'Company A',
      trainType: 'Express',
      operatingDays: {
        beginDate: '2023-01-01',
        daysBitmap: '1111100',
      },
    };
    component.listType = ListTypesEnum.ORDER_ITEMS;
    component.itemsId = ['item1'];
    component.orderId = '123';
    component.navigateByListType(data, 0);
    expect(component.navigate).toHaveBeenCalledWith('/orders', '123', 'order-items', 'item1');
  });

  it('should navigate to order detail', () => {
    jest.spyOn(component, 'navigate');
    const data: OrderResponse = {
      subject: 'Mock Subject',
      externalId: '123',
      state: OrderState.DRAFT,
      messageState: MessageState.NO_MESSAGE,
      creationDateTime: new Date().toISOString(),
      lastModifiedDateTime: new Date().toISOString(),
      orderOrigin: Source.INFRASTRUCTURE_MANAGER,
    };
    component.listType = ListTypesEnum.CURRENT_ORDERS;
    component.navigateByListType(data);
    fixture.detectChanges();
    component.navigate('/orders', data.externalId);
    expect(component.navigate).toHaveBeenCalledWith('/orders', '123');
  });

  it('should navigate to order item detail for ORDER_ITEMS', () => {
    jest.spyOn(component, 'navigate');
    const data: TrainRun = {
      trainId: 1,
      schedVersionId: 1,
      trainNumber: '12345',
      isConditionalTrainRun: false,
      orderId: '123',
      state: TrainState.PUBLISHED,
      operatingCompany: 'Company A',
      trainType: 'Express',
      operatingDays: {
        beginDate: '2023-01-01',
        daysBitmap: '1111100',
      },
    };
    component.listType = ListTypesEnum.ORDER_ITEMS;
    component.itemsId = ['098'];
    component.orderId = '123';
    component.navigateByListType(data, 0);
    expect(component.navigate).toHaveBeenCalledWith('/orders', '123', 'order-items', '098');
  });

  it('should navigate to order item detail for ORDER_ITEMS with a Restriction', () => {
    jest.spyOn(component, 'navigate');
    const data = {
      name: 'Test Restriction',
      operatingCompanyID: 'OC1',
      workTypeId: 'WT1',
      lineOfWorkId: 'LOW1',
      speedRestriction: false,
      catShutOff: false,
    };
    component.listType = ListTypesEnum.ORDER_ITEMS;
    component.itemsId = ['restriction-1'];
    component.orderId = '123';
    component.navigateByListType(data, 0);
    expect(component.navigate).toHaveBeenCalledWith('/orders', '123', 'order-items', 'restriction-1');
  });

  it('should navigate to offer item detail for OFFER_ITEMS', () => {
    jest.spyOn(component, 'navigate');
    const data: TrainRun = {
      trainId: 1,
      schedVersionId: 1,
      trainNumber: '12345',
      isConditionalTrainRun: false,
      orderId: '123',
      state: TrainState.PUBLISHED,
      operatingCompany: 'Company A',
      trainType: 'Express',
      operatingDays: {
        beginDate: '2023-01-01',
        daysBitmap: '1111100',
      },
    };
    component.listType = ListTypesEnum.OFFER_ITEMS;
    component.itemsId = ['item1'];
    component.orderId = '123';
    component.navigateByListType(data, 0);
    expect(component.navigate).toHaveBeenCalledWith('/orders', '123', 'offer-items', 'item1');
  });

  it('should not navigate for TRAINS list type (handled by the dedicated train-run-list feature instead)', () => {
    jest.spyOn(component, 'navigate');
    const trainData: TrainRunListItem = {
      trainId: 100,
      schedVersionId: 200,
      trainNumber: '12345',
      state: TrainState.PUBLISHED,
      operatingCompany: 'Company A',
      trainType: 'Express',
      operatingDays: [
        {
          beginDate: '2023-01-01',
          daysBitmap: '1111100',
        },
      ],
      fromStation: { station: 'A' },
      toStation: { station: 'B' },
      lastModifiedDateTime: '2024-01-01T10:00:00Z',
      trainSource: Source.INFRASTRUCTURE_MANAGER,
    } as TrainRunListItem;
    component.listType = ListTypesEnum.TRAINS;
    component.navigateByListType(trainData);
    expect(component.navigate).not.toHaveBeenCalled();
  });

  it('should not navigate for TRAINS list type when trainId is missing', () => {
    jest.spyOn(component, 'navigate');
    const trainData: TrainRunListItem = {
      trainId: undefined,
      schedVersionId: 200,
      trainNumber: '12345',
      state: TrainState.PUBLISHED,
    } as any;
    component.listType = ListTypesEnum.TRAINS;
    component.navigateByListType(trainData);
    expect(component.navigate).not.toHaveBeenCalled();
  });

  it('should not navigate for TRAINS list type when schedVersionId is missing', () => {
    jest.spyOn(component, 'navigate');
    const trainData: TrainRunListItem = {
      trainId: 100,
      schedVersionId: undefined,
      trainNumber: '12345',
      state: TrainState.PUBLISHED,
    } as any;
    component.listType = ListTypesEnum.TRAINS;
    component.navigateByListType(trainData);
    expect(component.navigate).not.toHaveBeenCalled();
  });

  it('should not navigate for unsupported list type', () => {
    jest.spyOn(component, 'navigate');
    const data: OrderResponse = {
      subject: 'Mock Subject',
      externalId: '123',
      state: OrderState.DRAFT,
      messageState: MessageState.NO_MESSAGE,
      creationDateTime: new Date().toISOString(),
      lastModifiedDateTime: new Date().toISOString(),
    };
    component.listType = undefined;
    component.navigateByListType(data);
    expect(component.navigate).not.toHaveBeenCalled();
  });

  describe('Action Visibility', () => {
    it('should always show VIEW action when user has permission', () => {
      const mockAction = {
        actionName: ActionNamesEnum.VIEW,
        actionIcon: 'visibility',
        actionVisibility: true,
      };
      const mockData = { state: TrainState.PUBLISHED, isWithinProjectPeriod: false, orderItems: [] } as any;

      const isVisible = component['isActionVisible'](mockAction.actionVisibility, mockData, mockAction.actionName);
      expect(isVisible).toBe(true);
    });

    it('should show VIEW action regardless of data state', () => {
      const mockAction = {
        actionName: ActionNamesEnum.VIEW,
        actionIcon: 'visibility',
        actionVisibility: true,
      };
      const mockData = { state: TrainState.CANCELLED, isWithinProjectPeriod: false, orderItems: [] } as any;

      const isVisible = component['isActionVisible'](mockAction.actionVisibility, mockData, mockAction.actionName);
      expect(isVisible).toBe(true);
    });

    it('should hide the action when the user lacks the required permission', () => {
      jest.spyOn(component['userPermissionService'], 'getRequiredPermission').mockReturnValue('somePermission' as any);
      jest.spyOn(component['userPermissionService'], 'checkPermissions').mockReturnValue(false);
      const element = {
        state: TrainState.PUBLISHED,
        isWithinProjectPeriod: true,
        orderItems: [],
        orderOrigin: Source.INFRASTRUCTURE_MANAGER,
      } as any;

      const isVisible = component['isActionVisible'](true, element, ActionNamesEnum.EDIT);

      expect(isVisible).toBe(false);
    });

    it('should use function-based visibility when provided', () => {
      jest.spyOn(component['userPermissionService'], 'getRequiredPermission').mockReturnValue(undefined);
      const visibilityFn = jest.fn().mockReturnValue(true);
      const element = {
        state: TrainState.PUBLISHED,
        isWithinProjectPeriod: true,
        orderItems: [],
        orderOrigin: Source.INFRASTRUCTURE_MANAGER,
      } as any;

      const isVisible = component['isActionVisible'](visibilityFn, element, ActionNamesEnum.EDIT);

      expect(visibilityFn).toHaveBeenCalledWith(element);
      expect(isVisible).toBe(true);
    });

    it('should hide EDIT/CANCEL-type actions for infrastructure managers viewing RU orders', () => {
      jest.spyOn(component['userPermissionService'], 'getRequiredPermission').mockReturnValue(undefined);
      jest.spyOn(component['configDataService'], 'isInfrastructureManagerUser').mockReturnValue(true);
      const element = {
        state: TrainState.PUBLISHED,
        isWithinProjectPeriod: true,
        orderItems: [],
        orderOrigin: Source.RAILWAY_UNDERTAKING_WEB_PORTAL,
      } as any;

      const isVisible = component['isActionVisible'](true, element, ActionNamesEnum.EDIT);

      expect(isVisible).toBe(false);
    });

    it('should show the action based on boolean visibility not matching the project period', () => {
      jest.spyOn(component['userPermissionService'], 'getRequiredPermission').mockReturnValue(undefined);
      jest.spyOn(component['configDataService'], 'isInfrastructureManagerUser').mockReturnValue(false);
      const element = {
        state: TrainState.PUBLISHED,
        isWithinProjectPeriod: false,
        orderItems: [],
        orderOrigin: Source.INFRASTRUCTURE_MANAGER,
      } as any;

      const isVisible = component['isActionVisible'](true, element, ActionNamesEnum.EDIT);

      expect(isVisible).toBe(true);
    });

    it('should show the action based on state-array visibility when the order item is not a cancellation', () => {
      jest.spyOn(component['userPermissionService'], 'getRequiredPermission').mockReturnValue(undefined);
      jest.spyOn(component['configDataService'], 'isInfrastructureManagerUser').mockReturnValue(false);
      const orderItems = [{ content: { action: OrderItemAction.CREATION } }] as any;
      const element = {
        state: TrainState.PUBLISHED,
        isWithinProjectPeriod: true,
        orderItems,
        orderOrigin: Source.INFRASTRUCTURE_MANAGER,
      } as any;

      const isVisible = component['isActionVisible']([TrainState.PUBLISHED], element, ActionNamesEnum.EDIT);

      expect(isVisible).toBe(true);
    });

    it('should hide the action based on state-array visibility when the order item is a cancellation', () => {
      jest.spyOn(component['userPermissionService'], 'getRequiredPermission').mockReturnValue(undefined);
      jest.spyOn(component['configDataService'], 'isInfrastructureManagerUser').mockReturnValue(false);
      const orderItems = [{ content: { action: OrderItemAction.CANCELLATION } }] as any;
      const element = {
        state: TrainState.PUBLISHED,
        isWithinProjectPeriod: true,
        orderItems,
        orderOrigin: Source.INFRASTRUCTURE_MANAGER,
      } as any;

      const isVisible = component['isActionVisible']([TrainState.PUBLISHED], element, ActionNamesEnum.EDIT);

      expect(isVisible).toBe(false);
    });
  });

  describe('performAction VIEW', () => {
    it('should delegate to navigateByListType for the VIEW action', () => {
      jest.spyOn(component, 'navigateByListType');
      const data = { externalId: '123' } as any;

      component.performAction(data, ActionNamesEnum.VIEW, 0);

      expect(component.navigateByListType).toHaveBeenCalledWith(data, 0);
    });
  });

  describe('onRowClick', () => {
    it('should delegate to navigateByListType with the row data and index', () => {
      jest.spyOn(component, 'navigateByListType');
      const row = { trainNumber: '123' } as any;

      component.onRowClick(row, 2);

      expect(component.navigateByListType).toHaveBeenCalledWith(row, 2);
    });
  });

  describe('isOrderItemIncomplete', () => {
    it('should return false when row highlighting is disabled', () => {
      component['orderItemHandlingService'].highlightIncompleteRowsSig.set(false);
      component['orderItemHandlingService'].missingFieldsCache.set('T1', ['field1']);

      const result = component['isOrderItemIncomplete']({ trainNumber: 'T1' } as any);

      expect(result).toBe(false);
    });

    it('should return true when highlighting is enabled and the item has missing fields', () => {
      component['orderItemHandlingService'].highlightIncompleteRowsSig.set(true);
      component['orderItemHandlingService'].missingFieldsCache.set('T1', ['field1']);

      const result = component['isOrderItemIncomplete']({ trainNumber: 'T1' } as any);

      expect(result).toBe(true);
    });

    it('should return false when highlighting is enabled but the item has no missing fields', () => {
      component['orderItemHandlingService'].highlightIncompleteRowsSig.set(true);
      component['orderItemHandlingService'].missingFieldsCache.delete('T1');

      const result = component['isOrderItemIncomplete']({ trainNumber: 'T1' } as any);

      expect(result).toBe(false);
    });
  });

  describe('navigate', () => {
    it('should navigate via navigationService when routing is enabled', () => {
      jest.spyOn(component['navigationService'], 'navigate');
      component.enableRouting = true;

      component.navigate('/orders', '123', 'order-items', '456');

      expect(component['navigationService'].navigate).toHaveBeenCalledWith(['/orders', '123', 'order-items', '456']);
    });

    it('should not navigate when routing is disabled', () => {
      jest.spyOn(component['navigationService'], 'navigate');
      component.enableRouting = false;

      component.navigate('/orders', '123');

      expect(component['navigationService'].navigate).not.toHaveBeenCalled();
    });

    it('should not navigate when basePath is empty', () => {
      jest.spyOn(component['navigationService'], 'navigate');
      component.enableRouting = true;

      component.navigate('');

      expect(component['navigationService'].navigate).not.toHaveBeenCalled();
    });
  });

  describe('deleteOrderItem', () => {
    it('should show a success notification and emit refreshOrderData on successful deletion', () => {
      jest.spyOn(listActionsService, 'deleteOrderItem').mockReturnValue(of(undefined));
      jest.spyOn(component['loadingSpinnerService'], 'showSpinner');
      jest.spyOn(component['loadingSpinnerService'], 'hideSpinner');
      jest.spyOn(component['notificationService'], 'pushNotification');
      const refreshSpy = jest.spyOn(component.refreshOrderData, 'emit');
      component.itemsId = ['item1'];

      component['deleteOrderItem']('123', 0);

      expect(component['loadingSpinnerService'].showSpinner).toHaveBeenCalled();
      expect(listActionsService.deleteOrderItem).toHaveBeenCalledWith('123', 'item1');
      expect(component['notificationService'].pushNotification).toHaveBeenCalled();
      expect(refreshSpy).toHaveBeenCalled();
      expect(component['loadingSpinnerService'].hideSpinner).toHaveBeenCalled();
    });

    it('should handle errors when deleting an order item fails', () => {
      const error = new Error('failed');
      jest.spyOn(listActionsService, 'deleteOrderItem').mockReturnValue(throwError(() => error));
      jest.spyOn(component['errorHandlingService'], 'handleError');
      jest.spyOn(component['loadingSpinnerService'], 'hideSpinner');
      component.itemsId = ['item1'];

      component['deleteOrderItem']('123', 0);

      expect(component['errorHandlingService'].handleError).toHaveBeenCalledWith(error, OrderingApiName.DeleteOrderItem);
      expect(component['loadingSpinnerService'].hideSpinner).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should call deleteOrderItem when the confirmation dialog is confirmed for ORDER_ITEMS', () => {
      jest.spyOn(component['dialog'], 'open').mockReturnValue({ afterClosed: () => of(true) } as any);
      const deleteOrderItemSpy = jest.spyOn(component as any, 'deleteOrderItem').mockImplementation(() => {});
      component.listType = ListTypesEnum.ORDER_ITEMS;
      component['orderId'] = '123';
      component.itemsId = ['item1'];

      component['delete'](0);

      expect(deleteOrderItemSpy).toHaveBeenCalledWith('123', 0);
    });

    it('should not call deleteOrderItem when the confirmation dialog is dismissed', () => {
      jest.spyOn(component['dialog'], 'open').mockReturnValue({ afterClosed: () => of(false) } as any);
      const deleteOrderItemSpy = jest.spyOn(component as any, 'deleteOrderItem').mockImplementation(() => {});
      component.listType = ListTypesEnum.ORDER_ITEMS;
      component['orderId'] = '123';
      component.itemsId = ['item1'];

      component['delete'](0);

      expect(deleteOrderItemSpy).not.toHaveBeenCalled();
    });

    it('should do nothing for an unsupported list type', () => {
      const dialogOpenSpy = jest.spyOn(component['dialog'], 'open');
      component.listType = ListTypesEnum.CURRENT_ORDERS;

      component['delete'](0);

      expect(dialogOpenSpy).not.toHaveBeenCalled();
    });
  });

  describe('isValidDate', () => {
    it('should return true for a valid date string', () => {
      expect(component['isValidDate']('2024-01-01')).toBe(true);
    });

    it('should return false for an invalid date string', () => {
      expect(component['isValidDate']('not-a-date')).toBe(false);
    });
  });

  describe('defferedTableSetup', () => {
    it('should call setupTable once the deferred timeout elapses', () => {
      jest.useFakeTimers();
      const setupSpy = jest.spyOn(component as any, 'setupTable');

      component['defferedTableSetup']();
      jest.runAllTimers();

      expect(setupSpy).toHaveBeenCalled();
      jest.useRealTimers();
    });
  });
});
