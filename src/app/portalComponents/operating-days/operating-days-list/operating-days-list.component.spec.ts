import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatDialog } from '@angular/material/dialog';
import { signal } from '@angular/core';

import { OperatingDaysListComponent } from './operating-days-list.component';
import { ConfigurationService } from '@Ordering/core/services/rest/configuration.service';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { PresavedTemplateService } from '@Ordering/portalComponents/operating-days/presaved-template/services/presaved-template.service';
import { DaySet, DaySetEnum } from '@Ordering/api';
import { MatPaginator } from '@angular/material/paginator';
import { DaySetListItem } from '../operating-days.model';
import { SlotDisplayMode } from '@Ordering/shared/models/component-slot.interface';

describe('OperatingDaysListComponent', () => {
  let component: OperatingDaysListComponent;
  let fixture: ComponentFixture<OperatingDaysListComponent>;

  beforeEach(async () => {
    const mockPresavedTemplateService = {
      prepareCombinedTemplate: jest.fn().mockReturnValue({
        name: '',
        description: '',
        endDate: '2024-12-31',
        operatingDays: {
          beginDate: '2024-01-01',
          daysBitmap: '1111111',
          selectedDays: [],
          deselectedDays: [],
        },
      }),
      savePresavedTemplate: jest.fn(),
      isLoadingSignal: jest.fn().mockReturnValue(signal(false)),
    };

    await TestBed.configureTestingModule({
      declarations: [],
      imports: [OperatingDaysListComponent, NoopAnimationsModule, HttpClientTestingModule, TranslatePipe],
      providers: [
        { provide: MatDialog, useValue: { open: jest.fn() } },
        { provide: ConfigurationService, useValue: {} },
        { provide: PresavedTemplateService, useValue: mockPresavedTemplateService },
        {
          provide: TranslationsService,
          useValue: {
            translate: jest.fn((key: string) => key),
          },
        },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OperatingDaysListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clears all mocks
    jest.clearAllTimers(); // Clears all timers
    jest.restoreAllMocks(); // Restores original implementation of mocked functions
    TestBed.resetTestingModule();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ItemDataContributor contract', () => {
    it('should have contributorKey "operatingDays"', () => {
      expect(component.contributorKey).toBe('operatingDays');
    });

    it('should default displayMode to EDITABLE', () => {
      expect(component.displayMode()).toBe(SlotDisplayMode.EDITABLE);
    });

    it('should default data to an empty array', () => {
      expect(component.data()).toEqual([]);
    });

    it('should report valid as false when editable and no operating days', () => {
      expect(component.isValid()).toBe(false);
    });

    it('should report valid as true when readonly regardless of data', () => {
      fixture.componentRef.setInput('displayMode', SlotDisplayMode.READONLY);
      fixture.detectChanges();

      expect(component.isValid()).toBe(true);
    });

    it('should not be dirty initially', () => {
      expect(component.isDirty()).toBe(false);
    });

    it('should reset isDirty when markAsPristine is called', () => {
      component['opreatingDaysListSig'].set([
        { id: 0, beginDate: '2023-01-01', endDate: '2023-01-07', daysBitmap: '0011110', selectedDays: [], deselectedDays: [] },
      ]);

      expect(component.isDirty()).toBe(true);

      component.markAsPristine();

      expect(component.isDirty()).toBe(false);
    });
  });

  it('should set paginator after view init if showPaginator is true', () => {
    fixture.componentRef.setInput('showPaginator', true);
    fixture.detectChanges();
    component.paginator = { pageSize: 10 } as MatPaginator;
    component.ngAfterViewInit();
    expect(component.operatingDaysListDataSource.paginator).toBe(component.paginator);
  });

  it('should add operating days and emit selected operating days', () => {
    const mockDialogRef = {
      afterClosed: jest.fn().mockReturnValue({
        pipe: jest.fn().mockReturnValue({
          subscribe: jest.fn().mockImplementation(callback => {
            callback({
              id: 0,
              beginDate: '2023-01-01',
              endDate: '2023-01-07',
              daysBitmap: '01011100000',
              selectedDays: [],
              deselectedDays: [],
            });
            return { unsubscribe: jest.fn() };
          }),
        }),
      }),
    };
    jest.spyOn(component['dialog'], 'open').mockReturnValue(mockDialogRef as any);
    const emitSpy = jest.spyOn(component as any, 'emitOperatingDays');

    component.addOperatingDays();
    expect(component['opreatingDaysListSig']().length).toBe(1);
    expect(emitSpy).toHaveBeenCalled();
  });

  it('should edit operating days and call emitOperatingDays', () => {
    const mockDaySetListItem: DaySetListItem = {
      id: 0,
      beginDate: '2023-01-01',
      endDate: '2023-01-07',
      daysBitmap: '11111111111',
      selectedDays: [],
      deselectedDays: [],
    };
    component['opreatingDaysListSig'].set([mockDaySetListItem]);

    const mockDialogRef = {
      afterClosed: jest.fn().mockReturnValue({
        pipe: jest.fn().mockReturnValue({
          subscribe: jest.fn().mockImplementation(callback => {
            callback({
              beginDate: '2023-01-02',
              daysBitmap: '0111011111',
              selectedDays: [],
              deselectedDays: [],
            });
            return { unsubscribe: jest.fn() };
          }),
        }),
      }),
    };
    jest.spyOn(component['dialog'], 'open').mockReturnValue(mockDialogRef as any);
    const emitSpy = jest.spyOn(component as any, 'emitOperatingDays');

    component['openOperatingDays'](mockDaySetListItem);
    expect(component['opreatingDaysListSig']()[0].beginDate).toBe('2023-01-02');
    expect(emitSpy).toHaveBeenCalled();
  });

  it('should confirm before deleting operating days and emit selected operating days', () => {
    const mockDaySetListItem: DaySetListItem = {
      id: 0,
      beginDate: '2023-01-01',
      endDate: '2023-01-07',
      daysBitmap: '01111111111',
      selectedDays: [],
      deselectedDays: [],
    };

    component['opreatingDaysListSig'].set([mockDaySetListItem]);
    const emitSpy = jest.spyOn(component as any, 'emitOperatingDays');

    const mockDialogRef = {
      afterClosed: jest.fn().mockReturnValue({
        subscribe: (callback: (result: boolean) => void) => {
          callback(true); // Simulate confirmation
        },
      }),
    };

    jest.spyOn(component['dialog'], 'open').mockReturnValue(mockDialogRef as any);

    component.onDeleteOperatingDays(mockDaySetListItem);

    expect(component['opreatingDaysListSig']().length).toBe(0);
    expect(emitSpy).toHaveBeenCalled();
  });

  it('should notify aggregator when emitOperatingDays is called', () => {
    const mockDaySetListItem: DaySetListItem = {
      id: 0,
      beginDate: '2023-01-01',
      endDate: '2023-01-07',
      daysBitmap: '0111011111',
      selectedDays: [DaySetEnum.MON, DaySetEnum.WED],
      deselectedDays: [DaySetEnum.SUN],
    };
    component['opreatingDaysListSig'].set([mockDaySetListItem]);

    component['emitOperatingDays']();

    expect(component.data()).toEqual([
      {
        beginDate: '2023-01-01',
        daysBitmap: '0111011111',
        selectedDays: [DaySetEnum.MON, DaySetEnum.WED],
        deselectedDays: [DaySetEnum.SUN],
      },
    ]);
  });

  it('should allow adding operating days if maxAllowedOperatingDays is not set', () => {
    component['opreatingDaysListSig'].set([
      { id: 0, beginDate: '2023-01-01', endDate: '2023-01-07', daysBitmap: '0011110', selectedDays: [], deselectedDays: [] },
      { id: 0, beginDate: '2023-01-01', endDate: '2023-01-07', daysBitmap: '1001111', selectedDays: [], deselectedDays: [] },
    ]);

    expect(component['isAddingOperatingDaysAllowedSig']()).toBe(true);
  });

  it('should prepare DaySetListItem correctly', () => {
    const mockDaySet: DaySet = {
      beginDate: '2023-01-01',
      daysBitmap: '1111111',
      selectedDays: [DaySetEnum.MON, DaySetEnum.WED],
      deselectedDays: [DaySetEnum.SUN],
    };

    const result = component['prepareDaySetListItem'](1, mockDaySet);

    expect(result).toEqual({
      id: 1,
      beginDate: '2023-01-01',
      endDate: expect.any(String),
      daysBitmap: '1111111',
      selectedDays: [DaySetEnum.MON, DaySetEnum.WED],
      deselectedDays: [DaySetEnum.SUN],
    });
  });

  describe('aggregator integration', () => {
    it('should work without aggregator (optional injection)', () => {
      expect(component['aggregator']).toBeNull();
    });
  });
});
