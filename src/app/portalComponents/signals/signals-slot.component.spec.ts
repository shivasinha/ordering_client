// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, input } from '@angular/core';
import { of, Subject } from 'rxjs';

import { AdminDataEntry } from '@Ordering/api';
import { ContributorKey } from '@Ordering/data/custom/enum/contributor-key.enum';
import { SlotDisplayMode } from '@Ordering/shared/models/component-slot.interface';
import { SlotListConfig } from '@Ordering/shared/components/slot-list/slot-list-action.model';
import { FormAggregatorService } from '@Ordering/shared/services/form-aggregator.service';

import { SignalsSlotService } from './services/signals-slot.service';
import { SignalsSlotComponent } from './signals-slot.component';

/** Lightweight stub — avoids pulling in SharedMaterialModule and TranslationsService. */
@Component({
  selector: 'app-slot-list',
  standalone: true,
  template: '',
})
class SlotListStubComponent {
  readonly config = input.required<SlotListConfig<any>>();
  readonly data = input<any[]>([]);
  readonly displayMode = input<SlotDisplayMode>(SlotDisplayMode.EDITABLE);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeEntry(overrides: Partial<AdminDataEntry> = {}): AdminDataEntry {
  return { id: 'id-1', display: 'Signal A', unique: 'unique-1', ...overrides };
}

function buildSlotServiceMock(): jest.Mocked<SignalsSlotService> {
  return {
    sectionLabel: 'Signals',
    noDataMessage: 'No signals',
    editTooltip: 'Edit',
    deleteTooltip: 'Delete',
    addLabel: 'Add Signal',
    importLabel: 'Import Signal',
    getColumns: jest.fn().mockReturnValue([{ field: 'display', colHeader: 'Area' }]),
    openEditDialog: jest.fn(),
    openAddDialog: jest.fn(),
    openImportDialog: jest.fn(),
  } as any;
}

function buildAggregatorMock(): jest.Mocked<FormAggregatorService> {
  return {
    register: jest.fn(),
    unregister: jest.fn(),
    notifyStateChange: jest.fn(),
  } as any;
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('SignalsSlotComponent', () => {
  let fixture: ComponentFixture<SignalsSlotComponent>;
  let component: SignalsSlotComponent;
  let slotServiceMock: ReturnType<typeof buildSlotServiceMock>;
  let aggregatorMock: ReturnType<typeof buildAggregatorMock>;

  async function createComponent(
    withAggregator = true,
    displayMode: SlotDisplayMode = SlotDisplayMode.EDITABLE,
    initialData: AdminDataEntry[] = [],
  ): Promise<void> {
    slotServiceMock = buildSlotServiceMock();
    aggregatorMock = buildAggregatorMock();

    await TestBed.configureTestingModule({
      imports: [SignalsSlotComponent],
      providers: [...(withAggregator ? [{ provide: FormAggregatorService, useValue: aggregatorMock }] : [])],
    })
      .overrideComponent(SignalsSlotComponent, {
        set: {
          imports: [SlotListStubComponent],
          providers: [{ provide: SignalsSlotService, useValue: slotServiceMock }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SignalsSlotComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('displayMode', displayMode);
    fixture.componentRef.setInput('initialData', initialData);

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

  // ── Static interface properties ───────────────────────────────────────────

  it('should expose the correct contributorKey', async () => {
    await createComponent();
    expect(component.contributorKey).toBe(ContributorKey.SIGNALS);
  });

  it('should always report isValid as true', async () => {
    await createComponent();
    expect(component.isValid()).toBe(true);
  });

  // ── data signal ───────────────────────────────────────────────────────────

  it('data() should initially reflect the initialData input', async () => {
    const entry = makeEntry();
    await createComponent(true, SlotDisplayMode.EDITABLE, [entry]);
    expect(component.data()).toEqual([entry]);
  });

  it('data() should be empty when no initialData is provided', async () => {
    await createComponent();
    expect(component.data()).toEqual([]);
  });

  // ── isDirty ───────────────────────────────────────────────────────────────

  it('isDirty should be false when displayMode is READONLY', async () => {
    await createComponent(true, SlotDisplayMode.READONLY, [makeEntry()]);
    expect(component.isDirty()).toBe(false);
  });

  it('isDirty should be false when items match the initial snapshot', async () => {
    await createComponent(true, SlotDisplayMode.EDITABLE, [makeEntry()]);
    expect(component.isDirty()).toBe(false);
  });

  it('isDirty should become true after an item is deleted', async () => {
    const entry = makeEntry();
    await createComponent(true, SlotDisplayMode.EDITABLE, [entry]);

    slotServiceMock.openAddDialog.mockReturnValue(of([]));
    // Trigger a delete via the slotConfig handler (accesses private method)
    const deleteHandler = component.slotConfig().rowActions![1].handler;
    deleteHandler(entry);

    expect(component.isDirty()).toBe(true);
  });

  // ── initialData effect ────────────────────────────────────────────────────

  it('should update items when initialData input changes', async () => {
    const first = makeEntry({ id: '1', display: 'First' });
    const second = makeEntry({ id: '2', display: 'Second' });
    await createComponent(true, SlotDisplayMode.EDITABLE, [first]);

    fixture.componentRef.setInput('initialData', [second]);
    fixture.detectChanges();

    expect(component.data()).toEqual([second]);
  });

  it('should not reset items when the same initialData reference is set again', async () => {
    const entry = makeEntry();
    await createComponent(true, SlotDisplayMode.EDITABLE, [entry]);

    // Mutate current items via delete handler, then re-apply same initialData
    const deleteHandler = component.slotConfig().rowActions![1].handler;
    deleteHandler(entry);

    fixture.componentRef.setInput('initialData', [entry]);
    fixture.detectChanges();

    // The same JSON snapshot — effect should NOT reset
    expect(component.isDirty()).toBe(true);
  });

  // ── ngOnInit / aggregator registration ───────────────────────────────────

  it('should register with the aggregator on init', async () => {
    await createComponent(true);
    expect(aggregatorMock.register).toHaveBeenCalledWith(component);
  });

  it('should not throw when FormAggregatorService is absent', async () => {
    await expect(createComponent(false)).resolves.not.toThrow();
    expect(component).toBeTruthy();
  });

  it('should unregister from the aggregator on destroy', async () => {
    await createComponent(true);
    fixture.destroy();
    expect(aggregatorMock.unregister).toHaveBeenCalledWith(ContributorKey.SIGNALS);
  });

  // ── markAsPristine ────────────────────────────────────────────────────────

  it('markAsPristine should make isDirty false after mutation', async () => {
    const entry = makeEntry();
    await createComponent(true, SlotDisplayMode.EDITABLE, [entry]);

    const deleteHandler = component.slotConfig().rowActions![1].handler;
    deleteHandler(entry);
    expect(component.isDirty()).toBe(true);

    component.markAsPristine();
    expect(component.isDirty()).toBe(false);
  });

  // ── slotConfig ────────────────────────────────────────────────────────────

  it('slotConfig should have 2 rowActions and 2 slotActions in EDITABLE mode', async () => {
    await createComponent(true, SlotDisplayMode.EDITABLE);
    const config = component.slotConfig();
    expect(config.rowActions).toHaveLength(2);
    expect(config.slotActions).toHaveLength(2);
  });

  it('slotConfig should have no rowActions or slotActions in READONLY mode', async () => {
    await createComponent(true, SlotDisplayMode.READONLY);
    const config = component.slotConfig();
    expect(config.rowActions).toHaveLength(0);
    expect(config.slotActions).toHaveLength(0);
  });

  it('slotConfig columns should be provided by the slot service', async () => {
    await createComponent();
    const config = component.slotConfig();
    expect(config.columns).toEqual([{ field: 'display', colHeader: 'Area' }]);
  });

  // ── onEditSignal ──────────────────────────────────────────────────────────

  it('should replace the edited item when dialog confirms', async () => {
    const original = makeEntry({ id: '1', display: 'Old' });
    const updated = makeEntry({ id: '1', display: 'New' });
    await createComponent(true, SlotDisplayMode.EDITABLE, [original]);

    slotServiceMock.openEditDialog.mockReturnValue(of(updated));

    const editHandler = component.slotConfig().rowActions![0].handler;
    editHandler(original);

    expect(component.data()).toEqual([updated]);
    expect(aggregatorMock.notifyStateChange).toHaveBeenCalled();
  });

  it('should not change items when edit dialog is dismissed (null result)', async () => {
    const entry = makeEntry();
    await createComponent(true, SlotDisplayMode.EDITABLE, [entry]);

    slotServiceMock.openEditDialog.mockReturnValue(of(null));

    const editHandler = component.slotConfig().rowActions![0].handler;
    editHandler(entry);

    expect(component.data()).toEqual([entry]);
    expect(aggregatorMock.notifyStateChange).not.toHaveBeenCalled();
  });

  it('should pass the correct item to openEditDialog', async () => {
    const entry = makeEntry();
    await createComponent(true, SlotDisplayMode.EDITABLE, [entry]);

    slotServiceMock.openEditDialog.mockReturnValue(of(null));

    const editHandler = component.slotConfig().rowActions![0].handler;
    editHandler(entry);

    expect(slotServiceMock.openEditDialog).toHaveBeenCalledWith(entry);
  });

  // ── onDeleteSignal ────────────────────────────────────────────────────────

  it('should remove the deleted item from the list', async () => {
    const a = makeEntry({ id: '1', unique: 'a' });
    const b = makeEntry({ id: '2', unique: 'b' });
    await createComponent(true, SlotDisplayMode.EDITABLE, [a, b]);

    const deleteHandler = component.slotConfig().rowActions![1].handler;
    deleteHandler(a);

    expect(component.data()).toEqual([b]);
  });

  it('should notify the aggregator after deleting an item', async () => {
    const entry = makeEntry();
    await createComponent(true, SlotDisplayMode.EDITABLE, [entry]);

    const deleteHandler = component.slotConfig().rowActions![1].handler;
    deleteHandler(entry);

    expect(aggregatorMock.notifyStateChange).toHaveBeenCalledTimes(1);
  });

  // ── onAddSignal ───────────────────────────────────────────────────────────

  it('should append new items returned from the add dialog', async () => {
    const existing = makeEntry({ id: '1', unique: 'a' });
    const added = makeEntry({ id: '2', unique: 'b' });
    await createComponent(true, SlotDisplayMode.EDITABLE, [existing]);

    slotServiceMock.openAddDialog.mockReturnValue(of([added]));

    const addHandler = component.slotConfig().slotActions![0].handler;
    addHandler();

    expect(component.data()).toEqual([existing, added]);
    expect(aggregatorMock.notifyStateChange).toHaveBeenCalled();
  });

  it('should not change items or notify when add dialog returns empty', async () => {
    const existing = makeEntry();
    await createComponent(true, SlotDisplayMode.EDITABLE, [existing]);

    slotServiceMock.openAddDialog.mockReturnValue(of([]));

    const addHandler = component.slotConfig().slotActions![0].handler;
    addHandler();

    expect(component.data()).toEqual([existing]);
    expect(aggregatorMock.notifyStateChange).not.toHaveBeenCalled();
  });

  // ── onImportSignal ────────────────────────────────────────────────────────

  it('should append signals returned from the import dialog', async () => {
    const imported = makeEntry({ id: '3', unique: 'c' });
    await createComponent(true, SlotDisplayMode.EDITABLE);

    slotServiceMock.openImportDialog.mockReturnValue(of([imported]));

    const importHandler = component.slotConfig().slotActions![1].handler;
    importHandler();

    expect(component.data()).toEqual([imported]);
    expect(aggregatorMock.notifyStateChange).toHaveBeenCalled();
  });

  it('should not change items when import dialog returns empty', async () => {
    await createComponent(true, SlotDisplayMode.EDITABLE);

    slotServiceMock.openImportDialog.mockReturnValue(of([]));

    const importHandler = component.slotConfig().slotActions![1].handler;
    importHandler();

    expect(component.data()).toEqual([]);
    expect(aggregatorMock.notifyStateChange).not.toHaveBeenCalled();
  });

  // ── only first emission used (first() operator) ───────────────────────────

  it('should only take the first emission from the edit dialog observable', async () => {
    const original = makeEntry();
    const first = makeEntry({ display: 'First' });
    const second = makeEntry({ display: 'Second' });
    await createComponent(true, SlotDisplayMode.EDITABLE, [original]);

    const subject = new Subject<AdminDataEntry | null>();
    slotServiceMock.openEditDialog.mockReturnValue(subject.asObservable());

    const editHandler = component.slotConfig().rowActions![0].handler;
    editHandler(original);

    subject.next(first);
    subject.next(second); // should be ignored

    expect(component.data()).toEqual([first]);
  });
});
