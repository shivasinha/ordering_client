// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';

import { TranslationsService } from '@Ordering/core/services/translations.service';
import { SlotDisplayMode } from '@Ordering/shared/models/component-slot.interface';
import { SlotListConfig } from './slot-list-action.model';
import { SlotListComponent } from './slot-list.component';

interface TestRow {
  id: number;
  name: string;
}

function buildConfig(overrides: Partial<SlotListConfig<TestRow>> = {}): SlotListConfig<TestRow> {
  return {
    columns: [
      { field: 'id', colHeader: 'ID' },
      { field: 'name', colHeader: 'Name' },
    ],
    ...overrides,
  };
}

const TEST_DATA: TestRow[] = [
  { id: 1, name: 'Alpha' },
  { id: 2, name: 'Beta' },
];

describe('SlotListComponent', () => {
  let fixture: ComponentFixture<SlotListComponent<TestRow>>;
  let component: SlotListComponent<TestRow>;

  function createFixture(config: SlotListConfig<TestRow>, data: TestRow[] = [], displayMode: SlotDisplayMode = SlotDisplayMode.EDITABLE) {
    fixture = TestBed.createComponent(SlotListComponent<TestRow>);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('config', config);
    fixture.componentRef.setInput('data', data);
    fixture.componentRef.setInput('displayMode', displayMode);

    fixture.detectChanges();
  }

  beforeEach(async () => {
    const translationsServiceMock = { translate: jest.fn((key: string) => key) };

    await TestBed.configureTestingModule({
      imports: [SlotListComponent, NoopAnimationsModule],
      providers: [{ provide: TranslationsService, useValue: translationsServiceMock }],
    }).compileComponents();
  });

  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  describe('displayedColumns', () => {
    it('should include only data columns when no rowActions are configured', () => {
      createFixture(buildConfig());

      expect((component as any).displayedColumns()).toEqual(['id', 'name']);
    });

    it('should append "actions" column when rowActions are provided', () => {
      const config = buildConfig({
        rowActions: [{ icon: 'edit', tooltipKey: 'Edit', handler: jest.fn() }],
      });
      createFixture(config);

      expect((component as any).displayedColumns()).toEqual(['id', 'name', 'actions']);
    });

    it('should not append "actions" column when rowActions is an empty array', () => {
      createFixture(buildConfig({ rowActions: [] }));

      expect((component as any).displayedColumns()).toEqual(['id', 'name']);
    });
  });

  describe('dataSource', () => {
    it('should initialise with an empty data set', () => {
      createFixture(buildConfig());

      expect((component as any).dataSource.data).toEqual([]);
    });

    it('should reflect the data input in the dataSource', () => {
      createFixture(buildConfig(), TEST_DATA);

      expect((component as any).dataSource.data).toEqual(TEST_DATA);
    });

    it('should update the dataSource when the data input changes', () => {
      createFixture(buildConfig(), TEST_DATA);

      const newData: TestRow[] = [{ id: 3, name: 'Gamma' }];
      fixture.componentRef.setInput('data', newData);
      fixture.detectChanges();

      expect((component as any).dataSource.data).toEqual(newData);
    });
  });

  describe('table rendering', () => {
    it('should render a header cell for each column', () => {
      createFixture(buildConfig(), TEST_DATA);

      const headers = fixture.debugElement.queryAll(By.css('th[mat-header-cell]'));
      // 2 data columns only (no actions)
      expect(headers.length).toBe(2);
    });

    it('should render one row per data item', () => {
      createFixture(buildConfig(), TEST_DATA);

      const rows = fixture.debugElement.queryAll(By.css('tr[mat-row]'));
      expect(rows.length).toBe(TEST_DATA.length);
    });

    it('should show the noDataMessage when data is empty', () => {
      createFixture(buildConfig({ noDataMessage: 'Nothing here' }));

      const noDataRow = fixture.debugElement.query(By.css('.no-data-row'));
      expect(noDataRow.nativeElement.textContent).toContain('Nothing here');
    });

    it('should not render slot action buttons when slotActions is absent', () => {
      createFixture(buildConfig());

      const slotActions = fixture.debugElement.query(By.css('.slot-actions'));
      expect(slotActions).toBeNull();
    });

    it('should render slot action buttons when slotActions are provided', () => {
      const handler = jest.fn();
      const config = buildConfig({
        slotActions: [{ labelKey: 'Add Item', handler }],
      });
      createFixture(config);

      const buttons = fixture.debugElement.queryAll(By.css('.slot-actions button'));
      expect(buttons.length).toBe(1);
      expect(buttons[0].nativeElement.textContent.trim()).toBe('Add Item');
    });
  });

  describe('row actions', () => {
    it('should render action buttons for each configured rowAction', () => {
      const config = buildConfig({
        rowActions: [
          { icon: 'edit', tooltipKey: 'Edit', handler: jest.fn() },
          { icon: 'delete', tooltipKey: 'Delete', handler: jest.fn() },
        ],
      });
      createFixture(config, TEST_DATA);

      // Each data row should have 2 action buttons → 2 rows × 2 buttons = 4
      const buttons = fixture.debugElement.queryAll(By.css('td[mat-cell] button[mat-icon-button]'));
      expect(buttons.length).toBe(TEST_DATA.length * 2);
    });

    it('should invoke the row action handler with the correct row when clicked', () => {
      const handler = jest.fn();
      const config = buildConfig({
        rowActions: [{ icon: 'edit', tooltipKey: 'Edit', handler }],
      });
      createFixture(config, TEST_DATA);

      const firstRowButton = fixture.debugElement.query(By.css('td[mat-cell] button[mat-icon-button]'));
      firstRowButton.nativeElement.click();
      fixture.detectChanges();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(TEST_DATA[0]);
    });

    it('should hide action button when visible predicate returns false', () => {
      const config = buildConfig({
        rowActions: [{ icon: 'edit', tooltipKey: 'Edit', handler: jest.fn(), visible: () => false }],
      });
      createFixture(config, TEST_DATA);

      const buttons = fixture.debugElement.queryAll(By.css('td[mat-cell] button[mat-icon-button]'));
      expect(buttons.length).toBe(0);
    });

    it('should show action button when visible predicate returns true', () => {
      const config = buildConfig({
        rowActions: [{ icon: 'edit', tooltipKey: 'Edit', handler: jest.fn(), visible: () => true }],
      });
      createFixture(config, TEST_DATA);

      const buttons = fixture.debugElement.queryAll(By.css('td[mat-cell] button[mat-icon-button]'));
      expect(buttons.length).toBe(TEST_DATA.length);
    });
  });

  describe('slot actions', () => {
    it('should invoke the slot action handler when button is clicked', () => {
      const handler = jest.fn();
      const config = buildConfig({
        slotActions: [{ labelKey: 'Add', handler }],
      });
      createFixture(config);

      const button = fixture.debugElement.query(By.css('.slot-actions button'));
      button.nativeElement.click();
      fixture.detectChanges();

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('displayMode input', () => {
    it('should default to EDITABLE display mode', () => {
      createFixture(buildConfig());

      expect(component.displayMode()).toBe(SlotDisplayMode.EDITABLE);
    });

    it('should reflect READONLY display mode when set', () => {
      createFixture(buildConfig(), [], SlotDisplayMode.READONLY);

      expect(component.displayMode()).toBe(SlotDisplayMode.READONLY);
    });
  });
});
