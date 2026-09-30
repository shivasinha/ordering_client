// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, Pipe, PipeTransform, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { AdminDataEntry } from '@Ordering/api';
import { AddSignalDialogData } from '@Ordering/portalComponents/signals/signal-dialog.model';
import { BaseListConfig } from '@Ordering/shared/models/base-list-config.model';
import { InfraSignalsContainerService } from '@Ordering/portalComponents/signals/services/infra-signals-container.service';

import { AddSignalDialogComponent } from './add-signal-dialog.component';

// ─── Stubs ────────────────────────────────────────────────────────────────────

@Pipe({ name: 'translate', standalone: true })
class TranslatePipeStub implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeEntry(id: string, display = `Signal-${id}`): AdminDataEntry {
  return { id, display, unique: `u-${id}` };
}

function buildContainerServiceMock(
  overrides: Partial<{
    isLoading: boolean;
    hasLoaded: boolean;
    formattedData: AdminDataEntry[];
    listConfig: Partial<BaseListConfig<AdminDataEntry>>;
  }> = {},
) {
  const baseConfig: BaseListConfig<AdminDataEntry> = {
    data: overrides.formattedData ?? [],
    columns: [],
    ...(overrides.listConfig ?? {}),
  };

  return {
    isLoading: signal(overrides.isLoading ?? false),
    hasLoaded: signal(overrides.hasLoaded ?? false),
    formattedData: signal(overrides.formattedData ?? []),
    listConfig: signal(baseConfig),
    onFilterChange: jest.fn(),
    buildFilter: jest.fn((query: string) => (query.trim() ? { display: [query.trim()] } : {})),
  };
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('AddSignalDialogComponent', () => {
  let fixture: ComponentFixture<AddSignalDialogComponent>;
  let component: AddSignalDialogComponent;
  let dialogRefMock: { close: jest.Mock };
  let containerServiceMock: ReturnType<typeof buildContainerServiceMock>;

  async function createComponent(dialogData: AddSignalDialogData = {}): Promise<void> {
    dialogRefMock = { close: jest.fn() };
    containerServiceMock = buildContainerServiceMock();

    await TestBed.configureTestingModule({
      imports: [AddSignalDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
      ],
    })
      .overrideComponent(AddSignalDialogComponent, {
        set: {
          imports: [TranslatePipeStub],
          providers: [{ provide: InfraSignalsContainerService, useValue: containerServiceMock }],
          schemas: [NO_ERRORS_SCHEMA],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AddSignalDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  // ── Creation ──────────────────────────────────────────────────────────────

  it('should create', async () => {
    await createComponent();
    expect(component).toBeTruthy();
  });

  it('should create when MAT_DIALOG_DATA is not provided', async () => {
    dialogRefMock = { close: jest.fn() };
    containerServiceMock = buildContainerServiceMock();

    await TestBed.configureTestingModule({
      imports: [AddSignalDialogComponent],
      providers: [{ provide: MatDialogRef, useValue: dialogRefMock }],
    })
      .overrideComponent(AddSignalDialogComponent, {
        set: {
          imports: [TranslatePipeStub],
          providers: [{ provide: InfraSignalsContainerService, useValue: containerServiceMock }],
          schemas: [NO_ERRORS_SCHEMA],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AddSignalDialogComponent);
    component = fixture.componentInstance;
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  // ── Constructor — initial filter ──────────────────────────────────────────

  it('should call onFilterChange on construction with an empty filter when no preselected signals', async () => {
    await createComponent();
    expect(containerServiceMock.onFilterChange).toHaveBeenCalledWith({});
  });

  it('should call onFilterChange with display filter in single-selection mode with one preselected signal', async () => {
    const entry = makeEntry('1', 'My Signal');
    await createComponent({ singleSelection: true, preselectedSignals: [entry] });

    expect(containerServiceMock.buildFilter).toHaveBeenCalledWith('My Signal');
    expect(containerServiceMock.onFilterChange).toHaveBeenCalledWith({ display: ['My Signal'] });
  });

  it('should pre-populate searchControl in single-selection mode with one preselected signal', async () => {
    const entry = makeEntry('1', 'My Signal');
    await createComponent({ singleSelection: true, preselectedSignals: [entry] });

    expect(component.searchControl.value).toBe('My Signal');
  });

  it('should not pre-populate searchControl in single-selection mode with multiple preselected signals', async () => {
    await createComponent({
      singleSelection: true,
      preselectedSignals: [makeEntry('1'), makeEntry('2')],
    });

    expect(component.searchControl.value).toBe('');
  });

  it('should not pre-populate searchControl in multi-selection mode', async () => {
    await createComponent({ singleSelection: false, preselectedSignals: [makeEntry('1', 'A')] });

    expect(component.searchControl.value).toBe('');
  });

  // ── Constructor — preselected signals ─────────────────────────────────────

  it('should load preselected signals into selectedSignalsById', async () => {
    const entry = makeEntry('42');
    await createComponent({ preselectedSignals: [entry] });

    expect(component.selectedSignalsById()).toEqual({ '42': entry });
  });

  it('should start with an empty selection when no preselected signals are provided', async () => {
    await createComponent();
    expect(component.selectedSignalsById()).toEqual({});
  });

  // ── canAdd computed ───────────────────────────────────────────────────────

  it('canAdd should be false when nothing is selected', async () => {
    await createComponent();
    expect(component.canAdd()).toBe(false);
  });

  it('canAdd should be true when at least one signal is selected', async () => {
    await createComponent();
    component.onRowClick(makeEntry('1'));
    expect(component.canAdd()).toBe(true);
  });

  // ── Delegated signals ─────────────────────────────────────────────────────

  it('isLoading should delegate to containerService', async () => {
    await createComponent();
    containerServiceMock.isLoading.set(true);
    expect(component.isLoading()).toBe(true);
  });

  it('hasLoaded should delegate to containerService', async () => {
    await createComponent();
    containerServiceMock.hasLoaded.set(true);
    expect(component.hasLoaded()).toBe(true);
  });

  it('rows should delegate to containerService.formattedData', async () => {
    const entries = [makeEntry('1'), makeEntry('2')];
    await createComponent();
    containerServiceMock.formattedData.set(entries);
    expect(component.rows()).toEqual(entries);
  });

  // ── listConfig computed ───────────────────────────────────────────────────

  it('listConfig should set rowClickable to true', async () => {
    await createComponent();
    expect(component.listConfig().rowClickable).toBe(true);
  });

  it('listConfig.isRowSelected should return true for a selected item', async () => {
    const entry = makeEntry('99');
    await createComponent({ preselectedSignals: [entry] });

    const { isRowSelected } = component.listConfig();
    expect(isRowSelected!(entry)).toBe(true);
  });

  it('listConfig.isRowSelected should return false for an unselected item', async () => {
    await createComponent();
    const { isRowSelected } = component.listConfig();
    expect(isRowSelected!(makeEntry('unselected'))).toBe(false);
  });

  // ── isSelected ────────────────────────────────────────────────────────────

  it('isSelected should return true for an id present in selectedSignalsById', async () => {
    const entry = makeEntry('abc');
    await createComponent({ preselectedSignals: [entry] });

    expect(component.isSelected('abc')).toBe(true);
  });

  it('isSelected should return false for an id not in selectedSignalsById', async () => {
    await createComponent();
    expect(component.isSelected('unknown')).toBe(false);
  });

  // ── onRowClick — multi-select ─────────────────────────────────────────────

  it('should add a signal to the selection in multi-select mode', async () => {
    const entry = makeEntry('1');
    await createComponent({ singleSelection: false });

    component.onRowClick(entry);

    expect(component.selectedSignalsById()).toEqual({ '1': entry });
  });

  it('should deselect an already-selected signal in multi-select mode', async () => {
    const entry = makeEntry('1');
    await createComponent({ singleSelection: false, preselectedSignals: [entry] });

    component.onRowClick(entry);

    expect(component.selectedSignalsById()).toEqual({});
  });

  it('should maintain other selections when deselecting one in multi-select mode', async () => {
    const a = makeEntry('1');
    const b = makeEntry('2');
    await createComponent({ singleSelection: false, preselectedSignals: [a, b] });

    component.onRowClick(a);

    expect(component.selectedSignalsById()).toEqual({ '2': b });
  });

  it('should allow multiple signals to be selected simultaneously in multi-select mode', async () => {
    const a = makeEntry('1');
    const b = makeEntry('2');
    await createComponent({ singleSelection: false });

    component.onRowClick(a);
    component.onRowClick(b);

    expect(component.selectedSignalsById()).toEqual({ '1': a, '2': b });
  });

  // ── onRowClick — single-select ────────────────────────────────────────────

  it('should select a signal in single-select mode', async () => {
    const entry = makeEntry('1');
    await createComponent({ singleSelection: true });

    component.onRowClick(entry);

    expect(component.selectedSignalsById()).toEqual({ '1': entry });
  });

  it('should deselect the signal when clicking the same one again in single-select mode', async () => {
    const entry = makeEntry('1');
    await createComponent({ singleSelection: true, preselectedSignals: [entry] });

    component.onRowClick(entry);

    expect(component.selectedSignalsById()).toEqual({});
  });

  it('should replace the selection when clicking a different signal in single-select mode', async () => {
    const a = makeEntry('1');
    const b = makeEntry('2');
    await createComponent({ singleSelection: true, preselectedSignals: [a] });

    component.onRowClick(b);

    expect(component.selectedSignalsById()).toEqual({ '2': b });
  });

  // ── Search control debounce ───────────────────────────────────────────────
  // fakeAsync cannot be combined with async/await — set up the component in
  // a dedicated beforeEach so the fakeAsync tests remain synchronous.

  describe('search control debounce', () => {
    beforeEach(async () => {
      await createComponent();
      containerServiceMock.onFilterChange.mockClear();
      containerServiceMock.buildFilter.mockClear();
    });

    it('should call onFilterChange after debounce when search value changes', fakeAsync(() => {
      component.searchControl.setValue('new query');
      tick(600);

      expect(containerServiceMock.buildFilter).toHaveBeenCalledWith('new query');
      expect(containerServiceMock.onFilterChange).toHaveBeenCalledTimes(1);
    }));

    it('should not call onFilterChange before debounce time elapses', fakeAsync(() => {
      component.searchControl.setValue('partial');
      tick(300);

      expect(containerServiceMock.onFilterChange).not.toHaveBeenCalled();

      tick(300); // complete the debounce
    }));

    it('should not fire again when the same value is set twice', fakeAsync(() => {
      component.searchControl.setValue('same');
      tick(600);
      component.searchControl.setValue('same');
      tick(600);

      expect(containerServiceMock.onFilterChange).toHaveBeenCalledTimes(1);
    }));
  });

  // ── onCancel ──────────────────────────────────────────────────────────────

  it('should close the dialog without a value on cancel', async () => {
    await createComponent();
    component.onCancel();
    expect(dialogRefMock.close).toHaveBeenCalledWith();
  });

  // ── onAdd ─────────────────────────────────────────────────────────────────

  it('should close the dialog with the selected signals on add', async () => {
    const a = makeEntry('1');
    const b = makeEntry('2');
    await createComponent({ preselectedSignals: [a, b] });

    component.onAdd();

    const closed = dialogRefMock.close.mock.calls[0][0] as AdminDataEntry[];
    expect(closed).toHaveLength(2);
    expect(closed).toEqual(expect.arrayContaining([a, b]));
  });

  it('should close the dialog with an empty array when nothing is selected', async () => {
    await createComponent();
    component.onAdd();
    expect(dialogRefMock.close).toHaveBeenCalledWith([]);
  });
});
