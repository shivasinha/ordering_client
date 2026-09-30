import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { RestrictionTimeSlots } from '@Ordering/api';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { FormAggregatorService } from '@Ordering/shared/services/form-aggregator.service';
import { SlotDisplayMode } from '@Ordering/shared/models/component-slot.interface';
import { ContributorKey } from '@Ordering/data/custom/enum/contributor-key.enum';

import { TimeSlotsSlotComponent } from './time-slots-slot.component';

describe('TimeSlotsSlotComponent', () => {
  let component: TimeSlotsSlotComponent;
  let fixture: ComponentFixture<TimeSlotsSlotComponent>;
  let mockDialog: { open: jest.Mock };
  let openSpy: jest.SpyInstance;
  let mockAggregator: any;

  const mockTimeSlot1: RestrictionTimeSlots = {
    beginDate: '2026-01-01',
    endDate: '2026-01-02',
    fromTime: '09:00',
    toTime: '17:00',
    broken: false,
  };

  const mockTimeSlot2: RestrictionTimeSlots = {
    beginDate: '2026-01-03',
    endDate: '2026-01-04',
    fromTime: '10:30',
    toTime: '18:30',
    broken: true,
  };

  beforeEach(async () => {
    mockDialog = {
      open: jest.fn(),
    };

    mockAggregator = {
      register: jest.fn(),
      unregister: jest.fn(),
      notifyStateChange: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [TimeSlotsSlotComponent],
      providers: [
        {
          provide: MatDialog,
          useValue: mockDialog,
        },
        {
          provide: FormAggregatorService,
          useValue: mockAggregator,
        },
        {
          provide: TranslationsService,
          useValue: {
            translate: jest.fn((key: string) => key),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TimeSlotsSlotComponent);
    component = fixture.componentInstance;
    // In Angular 21 standalone components, inject() may resolve from the root
    // environment injector rather than the TestBed module. Patch directly to
    // guarantee the mock is used regardless of DI resolution order.
    (component as any)['dialog'] = mockDialog;
    fixture.detectChanges();
    openSpy = jest.spyOn(mockDialog, 'open');
  });

  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ItemDataContributor contract', () => {
    it('should have contributorKey "timeSlots"', () => {
      expect(component.contributorKey).toBe(ContributorKey.TIME_SLOTS);
    });

    it('should default displayMode to EDITABLE', () => {
      expect(component.displayMode()).toBe(SlotDisplayMode.EDITABLE);
    });

    it('should default data to empty array', () => {
      expect(component.data()).toEqual([]);
    });

    it('should default isValid to true', () => {
      expect(component.isValid()).toBe(true);
    });

    it('should track data changes with isDirty signal', () => {
      expect(component.isDirty()).toBe(false);

      // Load initial data (effect syncs _currentItems + _lastAppliedSnapshot together)
      fixture.componentRef.setInput('initialData', [mockTimeSlot1]);
      fixture.detectChanges();

      // Mutate via delete to make _currentItems differ from the snapshot
      component['onDeleteTimeSlot'](0);

      expect(component.isDirty()).toBe(true);
    });

    it('should reset isDirty when markAsPristine is called', () => {
      fixture.componentRef.setInput('initialData', [mockTimeSlot1]);
      fixture.detectChanges();
      component['onDeleteTimeSlot'](0);
      expect(component.isDirty()).toBe(true);

      component.markAsPristine();

      expect(component.isDirty()).toBe(false);
    });
  });

  describe('Aggregator integration', () => {
    it('should register with aggregator on init', () => {
      expect(mockAggregator.register).toHaveBeenCalledWith(component);
    });

    it('should unregister from aggregator on destroy', () => {
      fixture.destroy();
      expect(mockAggregator.unregister).toHaveBeenCalledWith(ContributorKey.TIME_SLOTS);
    });

    it('should work without aggregator (optional injection)', async () => {
      // Create a new component without aggregator
      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [TimeSlotsSlotComponent],
        providers: [
          { provide: MatDialog, useValue: { open: jest.fn() } },
          {
            provide: TranslationsService,
            useValue: { translate: jest.fn((key: string) => key) },
          },
          // No FormAggregatorService provider
        ],
      }).compileComponents();

      const newFixture = TestBed.createComponent(TimeSlotsSlotComponent);
      const newComponent = newFixture.componentInstance;
      // Should not throw and component should be created
      expect(newComponent).toBeTruthy();
    });
  });

  describe('Initial data handling', () => {
    it('should load initialData', () => {
      TestBed.runInInjectionContext(() => {
        fixture.componentRef.setInput('initialData', [mockTimeSlot1, mockTimeSlot2]);
      });
      fixture.detectChanges();

      expect(component.data()).toEqual([mockTimeSlot1, mockTimeSlot2]);
    });

    it('should mark as pristine when initialData is set', () => {
      TestBed.runInInjectionContext(() => {
        fixture.componentRef.setInput('initialData', [mockTimeSlot1]);
      });
      fixture.detectChanges();

      component.markAsPristine();
      expect(component.isDirty()).toBe(false);
    });

    it('should detect changes when data differs from last applied snapshot', () => {
      fixture.componentRef.setInput('initialData', [mockTimeSlot1, mockTimeSlot2]);
      fixture.detectChanges();

      // Delete a slot: _currentItems diverges from the pristine snapshot
      component['onDeleteTimeSlot'](0);

      expect(component.isDirty()).toBe(true);
    });
  });

  describe('Display mode', () => {
    it('should respect VIEW mode (read-only)', () => {
      TestBed.runInInjectionContext(() => {
        fixture.componentRef.setInput('displayMode', SlotDisplayMode.READONLY);
        fixture.componentRef.setInput('initialData', [mockTimeSlot1]);
      });
      fixture.detectChanges();

      // In VIEW mode, isDirty should always be false
      expect(component.isDirty()).toBe(false);
    });

    it('should respect EDITABLE mode', () => {
      TestBed.runInInjectionContext(() => {
        fixture.componentRef.setInput('displayMode', SlotDisplayMode.EDITABLE);
        fixture.componentRef.setInput('initialData', [mockTimeSlot1]);
      });
      fixture.detectChanges();

      component.markAsPristine();
      expect(component.isDirty()).toBe(false);
    });
  });

  describe('Time slot rows', () => {
    it('should compute rows from data', () => {
      TestBed.runInInjectionContext(() => {
        fixture.componentRef.setInput('initialData', [mockTimeSlot1, mockTimeSlot2]);
      });
      fixture.detectChanges();

      const rows = component['rows']();
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({
        index: 0,
        dateRange: '2026-01-01 – 2026-01-02',
        timeFrame: '09:00 – 17:00',
        separated: 'lblSeparatedNo',
      });
      expect(rows[1]).toMatchObject({
        index: 1,
        dateRange: '2026-01-03 – 2026-01-04',
        timeFrame: '10:30 – 18:30',
        separated: 'lblSeparatedYes',
      });
    });

    it('should update rows when data changes', () => {
      TestBed.runInInjectionContext(() => {
        fixture.componentRef.setInput('initialData', [mockTimeSlot1]);
      });
      fixture.detectChanges();

      let rows = component['rows']();
      expect(rows).toHaveLength(1);

      TestBed.runInInjectionContext(() => {
        fixture.componentRef.setInput('initialData', [mockTimeSlot1, mockTimeSlot2]);
      });
      fixture.detectChanges();

      rows = component['rows']();
      expect(rows).toHaveLength(2);
    });
  });

  describe('Add time slot dialog', () => {
    it('should open add-time-slot dialog when onAddTimeSlot is triggered', () => {
      const mockDialogRef = {
        afterClosed: jest.fn().mockReturnValue(of(undefined)),
      };
      openSpy.mockReturnValue(mockDialogRef);

      component['onAddTimeSlot']();

      expect(openSpy).toHaveBeenCalled();
      const callArgs = openSpy.mock.calls[0];
      expect(callArgs[1]).toMatchObject({ width: '500px' });
    });

    it('should add new slot when dialog returns data', () => {
      const mockDialogRef = {
        afterClosed: jest.fn().mockReturnValue(of(mockTimeSlot1)),
      };
      openSpy.mockReturnValue(mockDialogRef);

      component['onAddTimeSlot']();

      expect(component.data()).toContainEqual(mockTimeSlot1);
      expect(mockAggregator.notifyStateChange).toHaveBeenCalled();
    });

    it('should not add slot when dialog is cancelled', () => {
      const mockDialogRef = {
        afterClosed: jest.fn().mockReturnValue(of(undefined)),
      };
      openSpy.mockReturnValue(mockDialogRef);

      component['onAddTimeSlot']();

      expect(component.data()).toEqual([]);
      expect(mockAggregator.notifyStateChange).not.toHaveBeenCalled();
    });

    it('should preserve existing slots when adding new one', () => {
      TestBed.runInInjectionContext(() => {
        fixture.componentRef.setInput('initialData', [mockTimeSlot1]);
      });
      fixture.detectChanges();
      component.markAsPristine();

      const mockDialogRef = {
        afterClosed: jest.fn().mockReturnValue(of(mockTimeSlot2)),
      };
      openSpy.mockReturnValue(mockDialogRef);

      component['onAddTimeSlot']();

      expect(component.data()).toEqual([mockTimeSlot1, mockTimeSlot2]);
    });
  });

  describe('Edit time slot dialog', () => {
    it('should open edit-time-slot dialog with current slot data', () => {
      TestBed.runInInjectionContext(() => {
        fixture.componentRef.setInput('initialData', [mockTimeSlot1, mockTimeSlot2]);
      });
      fixture.detectChanges();

      const mockDialogRef = {
        afterClosed: jest.fn().mockReturnValue(of(undefined)),
      };
      openSpy.mockReturnValue(mockDialogRef);

      component['onEditTimeSlot'](1);

      expect(openSpy).toHaveBeenCalled();
      const callArgs = openSpy.mock.calls[0];
      expect(callArgs[1]).toMatchObject({
        width: '500px',
        data: { initialValue: mockTimeSlot2 },
      });
    });

    it('should update slot when dialog returns updated data', () => {
      TestBed.runInInjectionContext(() => {
        fixture.componentRef.setInput('initialData', [mockTimeSlot1, mockTimeSlot2]);
      });
      fixture.detectChanges();

      const updatedSlot = { ...mockTimeSlot1, fromTime: '11:00' };
      const mockDialogRef = {
        afterClosed: jest.fn().mockReturnValue(of(updatedSlot)),
      };
      openSpy.mockReturnValue(mockDialogRef);

      component['onEditTimeSlot'](1);

      expect(component.data()[1]).toEqual(updatedSlot);
      expect(mockAggregator.notifyStateChange).toHaveBeenCalled();
    });

    it('should not update slot when dialog is cancelled', () => {
      TestBed.runInInjectionContext(() => {
        fixture.componentRef.setInput('initialData', [mockTimeSlot1, mockTimeSlot2]);
      });
      fixture.detectChanges();

      const mockDialogRef = {
        afterClosed: jest.fn().mockReturnValue(of(undefined)),
      };
      openSpy.mockReturnValue(mockDialogRef);

      component['onEditTimeSlot'](1);

      expect(component.data()[1]).toEqual(mockTimeSlot2);
      expect(mockAggregator.notifyStateChange).not.toHaveBeenCalled();
    });

    it('should handle invalid index gracefully', () => {
      TestBed.runInInjectionContext(() => {
        fixture.componentRef.setInput('initialData', [mockTimeSlot1]);
      });
      fixture.detectChanges();

      component['onEditTimeSlot'](5); // Out of bounds

      expect(openSpy).not.toHaveBeenCalled();
    });

    it('should handle negative index gracefully', () => {
      fixture.componentRef.setInput('initialData', [mockTimeSlot1]);
      fixture.detectChanges();

      component['onEditTimeSlot'](-1);

      expect(openSpy).not.toHaveBeenCalled();
    });
  });

  describe('Delete time slot', () => {
    it('should delete slot at given index', () => {
      TestBed.runInInjectionContext(() => {
        fixture.componentRef.setInput('initialData', [mockTimeSlot1, mockTimeSlot2]);
      });
      fixture.detectChanges();

      component['onDeleteTimeSlot'](0);

      expect(component.data()).toEqual([mockTimeSlot2]);
      expect(mockAggregator.notifyStateChange).toHaveBeenCalled();
    });

    it('should delete last slot', () => {
      TestBed.runInInjectionContext(() => {
        fixture.componentRef.setInput('initialData', [mockTimeSlot1, mockTimeSlot2]);
      });
      fixture.detectChanges();

      component['onDeleteTimeSlot'](1);

      expect(component.data()).toEqual([mockTimeSlot1]);
    });

    it('should handle deletion leaving empty array', () => {
      TestBed.runInInjectionContext(() => {
        fixture.componentRef.setInput('initialData', [mockTimeSlot1]);
      });
      fixture.detectChanges();

      component['onDeleteTimeSlot'](0);

      expect(component.data()).toEqual([]);
    });
  });

  describe('Slot configuration', () => {
    it('should provide slot config with columns', () => {
      const config = component['slotConfig']();
      expect(config.columns).toHaveLength(3);
      expect(config.columns[0].field).toBe('dateRange');
      expect(config.columns[1].field).toBe('timeFrame');
      expect(config.columns[2].field).toBe('separated');
    });

    it('should include row actions in EDITABLE mode', () => {
      TestBed.runInInjectionContext(() => {
        fixture.componentRef.setInput('displayMode', SlotDisplayMode.EDITABLE);
      });
      fixture.detectChanges();

      const config = component['slotConfig']();
      expect(config.rowActions).toHaveLength(2); // edit and delete
    });

    it('should exclude row actions in VIEW mode', () => {
      TestBed.runInInjectionContext(() => {
        fixture.componentRef.setInput('displayMode', SlotDisplayMode.READONLY);
      });
      fixture.detectChanges();

      const config = component['slotConfig']();
      expect(config.rowActions).toHaveLength(0);
    });

    it('should include slot actions in EDITABLE mode', () => {
      TestBed.runInInjectionContext(() => {
        fixture.componentRef.setInput('displayMode', SlotDisplayMode.EDITABLE);
      });
      fixture.detectChanges();

      const config = component['slotConfig']();
      expect(config.slotActions).toHaveLength(1); // add action
    });

    it('should exclude slot actions in VIEW mode', () => {
      TestBed.runInInjectionContext(() => {
        fixture.componentRef.setInput('displayMode', SlotDisplayMode.READONLY);
      });
      fixture.detectChanges();

      const config = component['slotConfig']();
      expect(config.slotActions).toHaveLength(0);
    });
  });
});
