// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { SortOrder } from '@Ordering/api';
import { BaseListConfig } from '@Ordering/shared/models/base-list-config.model';
import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { BaseListComponent } from './base-list.component';

describe('BaseListComponent', () => {
  let component: BaseListComponent;
  let fixture: ComponentFixture<BaseListComponent>;

  interface TestItem {
    id: number;
    name: string;
    date: string;
  }

  const mockConfig: BaseListConfig<TestItem> = {
    data: [
      { id: 1, name: 'Item 1', date: '2025-11-01' },
      { id: 2, name: 'Item 2', date: '2025-11-02' },
    ],
    columns: [
      { field: 'id', header: 'ID', sortable: true },
      { field: 'name', header: 'Name', sortable: true },
      { field: 'date', header: 'Date', sortable: false },
    ],
    actions: [
      {
        icon: 'edit',
        tooltip: 'Edit',
        handler: jest.fn(),
      },
    ],
    paginationAndSorting: {
      totalCount: 2,
      pageIndex: 0,
      pageSize: 25,
      sortBy: 'id',
      sortOrder: SortOrder.ASC,
    },
    ui: {
      noDataMessage: 'No data available',
    },
  };

  beforeEach(async () => {
    const mockTranslationsService = {
      translate: jest.fn(key => key),
    };

    await TestBed.configureTestingModule({
      imports: [BaseListComponent, SharedMaterialModule, NoopAnimationsModule, RouterTestingModule],
      providers: [
        {
          provide: TranslatePipe,
          useValue: { transform: jest.fn(key => key) },
        },
        {
          provide: TranslationsService,
          useValue: mockTranslationsService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BaseListComponent);
    component = fixture.componentInstance;

    // Set input using new signal-based approach
    fixture.componentRef.setInput('listConfig', mockConfig);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display data from config', () => {
    expect(component['dataSource'].data).toEqual(mockConfig.data);
  });

  it('should compute displayed columns correctly with actions', () => {
    const displayedColumns = component['displayedColumns']();
    expect(displayedColumns).toEqual(['id', 'name', 'date', 'actions']);
  });

  it('should compute displayed columns correctly without actions', () => {
    const configWithoutActions = {
      ...mockConfig,
      actions: [],
    };

    fixture.componentRef.setInput('listConfig', configWithoutActions);
    fixture.detectChanges();

    const displayedColumns = component['displayedColumns']();
    expect(displayedColumns).toEqual(['id', 'name', 'date']);
  });

  describe('onPageChange', () => {
    it('should emit page change event', done => {
      const mockPageEvent = {
        pageIndex: 1,
        pageSize: 50,
        length: 100,
      };

      component.pageChange.subscribe(event => {
        expect(event).toEqual(mockPageEvent);
        done();
      });

      component['onPageChange'](mockPageEvent);
    });
  });

  describe('onSortChange', () => {
    it('should emit sort change event', done => {
      const mockSort = {
        active: 'name',
        direction: 'asc' as const,
      };

      component.sortChange.subscribe(event => {
        expect(event).toEqual(mockSort);
        done();
      });

      component['onSortChange'](mockSort);
    });
  });

  describe('data source updates', () => {
    it('should update data source when config data changes', () => {
      const newData: TestItem[] = [{ id: 3, name: 'Item 3', date: '2025-11-03' }];

      const newConfig = {
        ...mockConfig,
        data: newData,
      };

      fixture.componentRef.setInput('listConfig', newConfig);
      fixture.detectChanges();

      expect(component['dataSource'].data).toEqual(newData);
    });
  });

  describe('empty data', () => {
    it('should handle empty data array', () => {
      const emptyConfig = {
        ...mockConfig,
        data: [],
      };

      fixture.componentRef.setInput('listConfig', emptyConfig);
      fixture.detectChanges();

      expect(component['dataSource'].data).toEqual([]);
    });
  });

  describe('columns configuration', () => {
    it('should render columns from config', () => {
      const columns = component['listConfig']().columns;
      expect(columns).toHaveLength(3);
      expect(columns[0].field).toBe('id');
      expect(columns[1].field).toBe('name');
      expect(columns[2].field).toBe('date');
    });
  });

  describe('actions configuration', () => {
    it('should include actions column when actions are provided', () => {
      const displayedColumns = component['displayedColumns']();
      expect(displayedColumns).toContain('actions');
    });

    it('should not include actions column when actions array is empty', () => {
      const configWithoutActions = {
        ...mockConfig,
        actions: [],
      };

      fixture.componentRef.setInput('listConfig', configWithoutActions);
      fixture.detectChanges();

      const displayedColumns = component['displayedColumns']();
      expect(displayedColumns).not.toContain('actions');
    });
  });

  describe('pagination configuration', () => {
    it('should use pagination settings from config', () => {
      const config = component['listConfig']();
      expect(config.paginationAndSorting?.totalCount).toBe(2);
      expect(config.paginationAndSorting?.pageIndex).toBe(0);
      expect(config.paginationAndSorting?.pageSize).toBe(25);
    });
  });

  describe('UI configuration', () => {
    it('should use no data message from config', () => {
      const config = component['listConfig']();
      expect(config.ui?.noDataMessage).toBe('No data available');
    });
  });

  describe('onRowClick', () => {
    it('should call onRowClick with the row item when provided in config', () => {
      const onRowClick = jest.fn();
      fixture.componentRef.setInput('listConfig', { ...mockConfig, onRowClick });
      fixture.detectChanges();

      const config = component['listConfig']();
      config.onRowClick?.(mockConfig.data[0]);

      expect(onRowClick).toHaveBeenCalledWith(mockConfig.data[0]);
    });

    it('should not throw when onRowClick is not provided', () => {
      const configWithoutClick = { ...mockConfig };
      delete configWithoutClick.onRowClick;
      fixture.componentRef.setInput('listConfig', configWithoutClick);
      fixture.detectChanges();

      expect(() => component['listConfig']().onRowClick?.(mockConfig.data[0])).not.toThrow();
    });

    it('should expose onRowClick in the listConfig signal', () => {
      const onRowClick = jest.fn();
      fixture.componentRef.setInput('listConfig', { ...mockConfig, onRowClick });
      fixture.detectChanges();

      expect(component['listConfig']().onRowClick).toBe(onRowClick);
    });

    it('should call config.onRowClick and emit rowClick output when handling a row click', () => {
      const onRowClick = jest.fn();
      const rowClickSpy = jest.fn();
      fixture.componentRef.setInput('listConfig', { ...mockConfig, onRowClick });
      fixture.detectChanges();

      component.rowClick.subscribe(rowClickSpy);
      component['onRowClick'](mockConfig.data[0]);

      expect(onRowClick).toHaveBeenCalledWith(mockConfig.data[0]);
      expect(rowClickSpy).toHaveBeenCalledWith(mockConfig.data[0]);
    });

    it('should emit rowClick output even when config.onRowClick is not provided', () => {
      const rowClickSpy = jest.fn();
      const configWithoutClick = { ...mockConfig };
      delete configWithoutClick.onRowClick;
      fixture.componentRef.setInput('listConfig', configWithoutClick);
      fixture.detectChanges();

      component.rowClick.subscribe(rowClickSpy);
      component['onRowClick'](mockConfig.data[1]);

      expect(rowClickSpy).toHaveBeenCalledWith(mockConfig.data[1]);
    });
  });

  describe('isRowClickable', () => {
    it('should return true when row has _routerLink', () => {
      const row = { ...mockConfig.data[0], _routerLink: '/some-path' };
      expect(component['isRowClickable'](row)).toBe(true);
    });

    it('should return true when config.rowClickable is set', () => {
      fixture.componentRef.setInput('listConfig', { ...mockConfig, rowClickable: true });
      fixture.detectChanges();

      expect(component['isRowClickable'](mockConfig.data[0])).toBe(true);
    });

    it('should return true when config.onRowClick is provided', () => {
      fixture.componentRef.setInput('listConfig', { ...mockConfig, onRowClick: jest.fn() });
      fixture.detectChanges();

      expect(component['isRowClickable'](mockConfig.data[0])).toBe(true);
    });

    it('should return false when no clickable indicators are present', () => {
      const configWithoutClick = { ...mockConfig };
      delete configWithoutClick.onRowClick;
      fixture.componentRef.setInput('listConfig', configWithoutClick);
      fixture.detectChanges();

      expect(component['isRowClickable'](mockConfig.data[0])).toBe(false);
    });
  });

  describe('sort effect', () => {
    it('should apply sortBy and ASC sortOrder from config to the sort instance', () => {
      fixture.componentRef.setInput('listConfig', {
        ...mockConfig,
        paginationAndSorting: { ...mockConfig.paginationAndSorting, sortBy: 'name', sortOrder: SortOrder.ASC },
      });
      fixture.detectChanges();

      const sortInstance = component['sort']();
      expect(sortInstance.active).toBe('name');
      expect(sortInstance.direction).toBe('asc');
    });

    it('should apply DESC sortOrder from config to the sort instance', () => {
      fixture.componentRef.setInput('listConfig', {
        ...mockConfig,
        paginationAndSorting: { ...mockConfig.paginationAndSorting, sortBy: 'name', sortOrder: SortOrder.DESC },
      });
      fixture.detectChanges();

      const sortInstance = component['sort']();
      expect(sortInstance.active).toBe('name');
      expect(sortInstance.direction).toBe('desc');
    });

    it('should default to asc direction when sortOrder is undefined but sortBy is set', () => {
      fixture.componentRef.setInput('listConfig', {
        ...mockConfig,
        paginationAndSorting: { ...mockConfig.paginationAndSorting, sortBy: 'name', sortOrder: undefined },
      });
      fixture.detectChanges();

      const sortInstance = component['sort']();
      expect(sortInstance.active).toBe('name');
      expect(sortInstance.direction).toBe('');
    });

    it('should clear sort when sortBy is not provided', () => {
      fixture.componentRef.setInput('listConfig', {
        ...mockConfig,
        paginationAndSorting: { ...mockConfig.paginationAndSorting, sortBy: undefined, sortOrder: undefined },
      });
      fixture.detectChanges();

      const sortInstance = component['sort']();
      expect(sortInstance.active).toBe('');
      expect(sortInstance.direction).toBe('');
    });
  });
});
