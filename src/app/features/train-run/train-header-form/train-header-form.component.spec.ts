// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal, WritableSignal } from '@angular/core';
import { Subject } from 'rxjs';

import { OperatorResponse, TrainState } from '@Ordering/api';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { MasterDataHandlingService } from '@Ordering/shared/services/master-data-handling.service';
import { ConfigDataService } from '@Ordering/shared/services/config-data.service';
import { FormAggregatorService } from '@Ordering/shared/services/form-aggregator.service';
import { SlotDisplayMode } from '@Ordering/shared/models/component-slot.interface';
import { ContributorKey } from '@Ordering/data/custom/enum/contributor-key.enum';

import { TrainHeaderFormComponent } from './train-header-form.component';

function makeOperator(overrides: Partial<OperatorResponse> = {}): OperatorResponse {
  return { id: '1', name: 'Test Operator', abbreviation: 'TO', ...overrides } as OperatorResponse;
}

describe('TrainHeaderFormComponent', () => {
  let component: TrainHeaderFormComponent;
  let fixture: ComponentFixture<TrainHeaderFormComponent>;

  let translationsServiceMock: { translate: jest.Mock };
  let masterDataHandlingServiceMock: { masterDataOperatorsSig: WritableSignal<OperatorResponse[]> };
  let configDataServiceMock: { isRailwayUndertakingUser: WritableSignal<boolean>; configData: any };
  let aggregatorMock: { register: jest.Mock; unregister: jest.Mock; notifyStateChange: jest.Mock; getAggregatedDataSync: jest.Mock };

  beforeEach(async () => {
    translationsServiceMock = {
      translate: jest.fn().mockImplementation((key: string) => key),
    };

    masterDataHandlingServiceMock = {
      masterDataOperatorsSig: signal<OperatorResponse[]>([]),
    };

    // isRailwayUndertakingUser must be a signal so Angular's computed() can track it
    configDataServiceMock = {
      isRailwayUndertakingUser: signal(false),
      configData: undefined,
    };

    aggregatorMock = {
      register: jest.fn(),
      unregister: jest.fn(),
      notifyStateChange: jest.fn(),
      getAggregatedDataSync: jest.fn().mockReturnValue({}),
    };

    await TestBed.configureTestingModule({
      imports: [TrainHeaderFormComponent, NoopAnimationsModule],
      providers: [
        { provide: TranslationsService, useValue: translationsServiceMock },
        { provide: MasterDataHandlingService, useValue: masterDataHandlingServiceMock },
        { provide: ConfigDataService, useValue: configDataServiceMock },
        { provide: FormAggregatorService, useValue: aggregatorMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TrainHeaderFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have contributorKey set to TRAIN_HEADER', () => {
    expect(component.contributorKey).toBe(ContributorKey.TRAIN_HEADER);
  });

  it('should register with aggregator on construction', () => {
    expect(aggregatorMock.register).toHaveBeenCalledWith(component);
  });

  describe('isValid signal', () => {
    it('should be false when form is invalid (empty required fields)', () => {
      expect(component.isValid()).toBe(false);
    });

    it('should be true when displayMode is READONLY regardless of form state', () => {
      fixture.componentRef.setInput('displayMode', SlotDisplayMode.READONLY);
      fixture.detectChanges();
      expect(component.isValid()).toBe(true);
    });

    it('should be true when all required fields are valid', () => {
      const op = makeOperator();
      component['trainHeaderForm'].patchValue({ trainNo: '12345', operatingCompany: op });
      component['formVersion'].update(v => v + 1);
      expect(component.isValid()).toBe(true);
    });
  });

  describe('isDirty signal', () => {
    it('should be false initially', () => {
      expect(component.isDirty()).toBe(false);
    });

    it('should be false when displayMode is READONLY even if form is dirty', () => {
      fixture.componentRef.setInput('displayMode', SlotDisplayMode.READONLY);
      fixture.detectChanges();
      component['trainHeaderForm'].markAsDirty();
      component['formVersion'].update(v => v + 1);
      expect(component.isDirty()).toBe(false);
    });

    it('should be true when form is dirty in EDITABLE mode', () => {
      component['trainHeaderForm'].markAsDirty();
      component['formVersion'].update(v => v + 1);
      expect(component.isDirty()).toBe(true);
    });
  });

  describe('data signal', () => {
    it('should reflect initial empty form values', () => {
      const data = component.data();
      expect(data.trainNo).toBe('');
      expect(data.isConditionalTrainRun).toBe(false);
      expect(data.hideOperatingDays).toBe(false);
      expect(data.operatingCompany).toBe('');
      expect(data.remark).toBe('');
      expect(data.cancellationReason).toBe('');
    });

    it('should reflect updated form values', () => {
      const op = makeOperator();
      component['trainHeaderForm'].patchValue({ trainNo: '99', remark: 'test remark', operatingCompany: op });
      component['formVersion'].update(v => v + 1);
      const data = component.data();
      expect(data.trainNo).toBe('99');
      expect(data.remark).toBe('test remark');
      expect(data.operatingCompany).toEqual(op);
    });

    it('should include hideOperatingDays from the signal', () => {
      component.hideOperatingDaysSig.set(true);
      expect(component.data().hideOperatingDays).toBe(true);
    });
  });

  describe('markAsPristine', () => {
    it('should mark the form as pristine', () => {
      component['trainHeaderForm'].markAsDirty();
      component['formVersion'].update(v => v + 1);
      expect(component.isDirty()).toBe(true);

      component.markAsPristine();
      component['formVersion'].update(v => v + 1);
      expect(component.isDirty()).toBe(false);
    });
  });

  describe('getOperatorName', () => {
    it('should return empty string for undefined', () => {
      expect(component['getOperatorName'](undefined)).toBe('');
    });

    it('should return the string itself when a string is passed', () => {
      expect(component['getOperatorName']('SBB')).toBe('SBB');
    });

    it('should return the operator name from an OperatorResponse', () => {
      const op = makeOperator({ name: 'DB Netz' });
      expect(component['getOperatorName'](op)).toBe('DB Netz');
    });

    it('should return empty string when operator name is undefined', () => {
      const op = makeOperator({ name: undefined });
      expect(component['getOperatorName'](op)).toBe('');
    });
  });

  describe('isReadonly computed', () => {
    it('should be false when displayMode is EDITABLE', () => {
      fixture.componentRef.setInput('displayMode', SlotDisplayMode.EDITABLE);
      fixture.detectChanges();
      expect(component['isReadonly']()).toBe(false);
    });

    it('should be true when displayMode is READONLY', () => {
      fixture.componentRef.setInput('displayMode', SlotDisplayMode.READONLY);
      fixture.detectChanges();
      expect(component['isReadonly']()).toBe(true);
    });
  });

  describe('isTrainNoReadonly computed', () => {
    it('should be false when editable and not locked', () => {
      fixture.componentRef.setInput('displayMode', SlotDisplayMode.EDITABLE);
      fixture.componentRef.setInput('lockTrainNo', false);
      fixture.detectChanges();
      expect(component['isTrainNoReadonly']()).toBe(false);
    });

    it('should be true when lockTrainNo is true', () => {
      fixture.componentRef.setInput('lockTrainNo', true);
      fixture.detectChanges();
      expect(component['isTrainNoReadonly']()).toBe(true);
    });

    it('should be true when displayMode is READONLY', () => {
      fixture.componentRef.setInput('displayMode', SlotDisplayMode.READONLY);
      fixture.detectChanges();
      expect(component['isTrainNoReadonly']()).toBe(true);
    });
  });

  describe('isOperatingCompanyReadonly computed', () => {
    it('should be false when editable, not locked, not RU user', () => {
      configDataServiceMock.isRailwayUndertakingUser.set(false);
      fixture.componentRef.setInput('displayMode', SlotDisplayMode.EDITABLE);
      fixture.componentRef.setInput('lockOperatingCompany', false);
      fixture.detectChanges();
      expect(component['isOperatingCompanyReadonly']()).toBe(false);
    });

    it('should be true when lockOperatingCompany is true', () => {
      fixture.componentRef.setInput('lockOperatingCompany', true);
      fixture.detectChanges();
      expect(component['isOperatingCompanyReadonly']()).toBe(true);
    });

    it('should be true when user is RU user', () => {
      configDataServiceMock.isRailwayUndertakingUser.set(true);
      expect(component['isOperatingCompanyReadonly']()).toBe(true);
    });
  });

  describe('remarkFieldConfig computed', () => {
    it('should use remark label and control when no cancellation state', () => {
      const config = component['remarkFieldConfig']();
      expect(config.label).toBe('lblRemark');
      expect(config.control).toBe(component['trainHeaderForm'].controls.remark);
    });

    it('should use cancellationReason label when initialData has cancellationReason', () => {
      fixture.componentRef.setInput('initialData', { cancellationReason: 'Some reason' });
      fixture.detectChanges();
      const config = component['remarkFieldConfig']();
      expect(config.label).toBe('lblCancellationReason');
      expect(config.control).toBe(component['trainHeaderForm'].controls.cancellationReason);
    });

    it('should use cancellationReason label when initialData state is CANCELLED', () => {
      fixture.componentRef.setInput('initialData', { state: TrainState.CANCELLED });
      fixture.detectChanges();
      expect(component['remarkFieldConfig']().label).toBe('lblCancellationReason');
    });
  });

  describe('ngAfterViewInit — initial data population', () => {
    it('should patch form with initial data', () => {
      const op = makeOperator();
      masterDataHandlingServiceMock.masterDataOperatorsSig.set([op]);

      component['initialDataApplied'] = false;
      fixture.componentRef.setInput('initialData', {
        trainNo: '42',
        isConditionalTrainRun: false,
        operatingCompany: op,
        remark: 'hello',
        cancellationReason: '',
      });
      fixture.detectChanges();
      component.ngAfterViewInit();

      expect(component['trainHeaderForm'].controls.trainNo.value).toBe('42');
      expect(component['trainHeaderForm'].controls.remark.value).toBe('hello');
      expect(component['trainHeaderForm'].controls.operatingCompany.value).toEqual(op);
    });

    it('should set hideOperatingDaysSig to true when initial isConditionalTrainRun is true', () => {
      component['initialDataApplied'] = false;
      fixture.componentRef.setInput('initialData', { isConditionalTrainRun: true });
      fixture.detectChanges();
      component.ngAfterViewInit();

      expect(component.hideOperatingDaysSig()).toBe(true);
      expect(aggregatorMock.notifyStateChange).toHaveBeenCalled();
    });

    it('should not apply initial data a second time if already applied', () => {
      const op = makeOperator();
      component['initialDataApplied'] = false;
      fixture.componentRef.setInput('initialData', { trainNo: '10', operatingCompany: op });
      fixture.detectChanges();
      component.ngAfterViewInit();

      component['trainHeaderForm'].patchValue({ trainNo: '99' }, { emitEvent: false });
      component.ngAfterViewInit(); // second call — should be ignored
      expect(component['trainHeaderForm'].controls.trainNo.value).toBe('99');
    });
  });

  describe('resolveOperatingCompany', () => {
    it('should return empty string for null', () => {
      expect(component['resolveOperatingCompany'](null)).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(component['resolveOperatingCompany']('')).toBe('');
    });

    it('should return object unchanged if value is already an OperatorResponse', () => {
      const op = makeOperator();
      expect(component['resolveOperatingCompany'](op)).toEqual(op);
    });

    it('should look up operator by abbreviation for IM user', () => {
      const op = makeOperator({ abbreviation: 'DB' });
      masterDataHandlingServiceMock.masterDataOperatorsSig.set([op]);
      configDataServiceMock.isRailwayUndertakingUser.set(false);
      expect(component['resolveOperatingCompany']('DB')).toEqual(op);
    });

    it('should fall back to raw string if abbreviation not found', () => {
      masterDataHandlingServiceMock.masterDataOperatorsSig.set([]);
      configDataServiceMock.isRailwayUndertakingUser.set(false);
      expect(component['resolveOperatingCompany']('UNKNOWN')).toBe('UNKNOWN');
    });

    it('should return fixedOperator for RU user when configData has fixedOperator', () => {
      const fixedOp = makeOperator({ abbreviation: 'RU' });
      configDataServiceMock.isRailwayUndertakingUser.set(true);
      configDataServiceMock.configData = { fixedOperator: fixedOp };
      expect(component['resolveOperatingCompany']('RU')).toEqual(fixedOp);
    });
  });

  describe('onConditionalTrainRunChange', () => {
    it('should set hideOperatingDaysSig to false when unchecking conditional', () => {
      component.hideOperatingDaysSig.set(true);
      component['trainHeaderForm'].patchValue({ isConditionalTrainRun: false });

      component['onConditionalTrainRunChange']();

      expect(component.hideOperatingDaysSig()).toBe(false);
      expect(aggregatorMock.notifyStateChange).toHaveBeenCalled();
    });

    it('should hide operating days immediately when no operating days exist', () => {
      aggregatorMock.getAggregatedDataSync.mockReturnValue({ [ContributorKey.OPERATING_DAYS]: [] });
      component['trainHeaderForm'].patchValue({ isConditionalTrainRun: true });

      component['onConditionalTrainRunChange']();

      expect(component.hideOperatingDaysSig()).toBe(true);
      expect(aggregatorMock.notifyStateChange).toHaveBeenCalled();
    });

    it('should open confirmation dialog when operating days exist', () => {
      const afterClosedSubject = new Subject<boolean>();
      const openSpy = jest
        .spyOn(component['dialog'], 'open')
        .mockReturnValue({ afterClosed: () => afterClosedSubject.asObservable() } as any);
      aggregatorMock.getAggregatedDataSync.mockReturnValue({
        [ContributorKey.OPERATING_DAYS]: [{ date: '2026-01-01' }],
      });
      component['trainHeaderForm'].patchValue({ isConditionalTrainRun: true });

      component['onConditionalTrainRunChange']();

      expect(openSpy).toHaveBeenCalledTimes(1);
    });

    it('should set hideOperatingDaysSig to true when user confirms dialog', () => {
      const afterClosedSubject = new Subject<boolean>();
      jest.spyOn(component['dialog'], 'open').mockReturnValue({ afterClosed: () => afterClosedSubject.asObservable() } as any);
      aggregatorMock.getAggregatedDataSync.mockReturnValue({
        [ContributorKey.OPERATING_DAYS]: [{ date: '2026-01-01' }],
      });
      component['trainHeaderForm'].patchValue({ isConditionalTrainRun: true });

      component['onConditionalTrainRunChange']();
      afterClosedSubject.next(true);

      expect(component.hideOperatingDaysSig()).toBe(true);
      expect(aggregatorMock.notifyStateChange).toHaveBeenCalled();
    });

    it('should open info dialog and reset conditional when user cancels confirmation', () => {
      const confirmSubject = new Subject<boolean>();
      const infoSubject = new Subject<void>();
      const openSpy = jest
        .spyOn(component['dialog'], 'open')
        .mockReturnValueOnce({ afterClosed: () => confirmSubject.asObservable() } as any)
        .mockReturnValueOnce({ afterClosed: () => infoSubject.asObservable() } as any);
      aggregatorMock.getAggregatedDataSync.mockReturnValue({
        [ContributorKey.OPERATING_DAYS]: [{ date: '2026-01-01' }],
      });
      component['trainHeaderForm'].patchValue({ isConditionalTrainRun: true });

      component['onConditionalTrainRunChange']();
      confirmSubject.next(false);
      expect(openSpy).toHaveBeenCalledTimes(2);

      infoSubject.next();
      expect(component.hideOperatingDaysSig()).toBe(false);
      expect(component['trainHeaderForm'].value.isConditionalTrainRun).toBe(false);
    });
  });

  describe('operator filtering', () => {
    it('should populate filteredOperatorsSig with sorted operators when query is empty', async () => {
      const ops = [makeOperator({ name: 'Zug AG' }), makeOperator({ id: '2', name: 'Alpha Rail', abbreviation: 'AR' })];
      masterDataHandlingServiceMock.masterDataOperatorsSig.set(ops);
      configDataServiceMock.isRailwayUndertakingUser.set(false);
      configDataServiceMock.configData = undefined;

      component['initializeOperatorField']();
      await new Promise(resolve => setTimeout(resolve, 350));

      const filtered = component['filteredOperatorsSig']();
      expect(filtered[0].name).toBe('Alpha Rail');
      expect(filtered[1].name).toBe('Zug AG');
    });

    it('should filter operators by name query', async () => {
      const ops = [makeOperator({ name: 'DB Netz', abbreviation: 'DB' }), makeOperator({ id: '2', name: 'SBB', abbreviation: 'SB' })];
      masterDataHandlingServiceMock.masterDataOperatorsSig.set(ops);
      configDataServiceMock.isRailwayUndertakingUser.set(false);

      component['initializeOperatorField']();
      component['trainHeaderForm'].controls.operatingCompany.setValue('db');
      await new Promise(resolve => setTimeout(resolve, 350));

      const filtered = component['filteredOperatorsSig']();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('DB Netz');
    });
  });

  describe('initializeOperatorField for RU user', () => {
    it('should set fixedOperator on operating company control', () => {
      const fixedOp = makeOperator({ abbreviation: 'RU' });
      configDataServiceMock.isRailwayUndertakingUser.set(true);
      configDataServiceMock.configData = { fixedOperator: fixedOp };

      component['initializeOperatorField']();

      expect(component['trainHeaderForm'].controls.operatingCompany.value).toEqual(fixedOp);
    });
  });

  describe('displayMode effect', () => {
    it('should disable isConditionalTrainRun control in READONLY mode', () => {
      fixture.componentRef.setInput('displayMode', SlotDisplayMode.READONLY);
      fixture.detectChanges();
      expect(component['trainHeaderForm'].controls.isConditionalTrainRun.disabled).toBe(true);
    });

    it('should enable form controls when switching back to EDITABLE mode', () => {
      fixture.componentRef.setInput('displayMode', SlotDisplayMode.READONLY);
      fixture.detectChanges();
      fixture.componentRef.setInput('displayMode', SlotDisplayMode.EDITABLE);
      fixture.detectChanges();
      expect(component['trainHeaderForm'].controls.trainNo.enabled).toBe(true);
    });
  });

  describe('form value changes', () => {
    it('should call notifyStateChange when a form control value changes', () => {
      const callsBefore = aggregatorMock.notifyStateChange.mock.calls.length;
      component['trainHeaderForm'].controls.trainNo.setValue('123');
      expect(aggregatorMock.notifyStateChange.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });
});
