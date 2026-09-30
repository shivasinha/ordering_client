import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Sort } from '@angular/material/sort';
import { of } from 'rxjs';

import { AdminDataEntry, InfraSignalsList, SortOrder } from '@Ordering/api';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { BaseListStateService } from '@Ordering/shared/services/base-list-state.service';

import { INFRA_SIGNALS_ENTITY_TYPE, InfraSignalsContainerService } from './infra-signals-container.service';
import { InfraSignalsService } from './infra-signals.service';

describe('InfraSignalsContainerService', () => {
  let service: InfraSignalsContainerService;
  let infraSignalsServiceMock: { searchSignals: jest.Mock };
  let trMock: { translate: jest.Mock };

  const defaultPagination = { pageIndex: 0, pageSize: 25, sortOrder: SortOrder.ASC };
  const defaultState = { filters: {}, paginationAndSorting: defaultPagination };

  function createService(searchMock?: jest.Mock): InfraSignalsContainerService {
    const stateSignal = signal(defaultState);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        InfraSignalsContainerService,
        { provide: InfraSignalsService, useValue: infraSignalsServiceMock },
        { provide: TranslationsService, useValue: trMock },
        {
          provide: BaseListStateService,
          useValue: {
            getState: jest.fn().mockReturnValue(stateSignal),
            updateFilters: jest.fn(),
            updatePagination: jest.fn(),
            updateSort: jest.fn(),
          },
        },
      ],
    });

    if (searchMock) {
      infraSignalsServiceMock.searchSignals = searchMock;
    }

    return TestBed.inject(InfraSignalsContainerService);
  }

  beforeEach(() => {
    infraSignalsServiceMock = {
      searchSignals: jest.fn().mockReturnValue(of({ items: [], totalCount: 0 } as InfraSignalsList)),
    };

    trMock = { translate: jest.fn((key: string) => key) };

    service = createService();
  });

  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('entityType', () => {
    it('should equal INFRA_SIGNALS_ENTITY_TYPE', () => {
      expect((service as any).entityType).toBe(INFRA_SIGNALS_ENTITY_TYPE);
      expect(INFRA_SIGNALS_ENTITY_TYPE).toBe('INFRA_SIGNALS');
    });
  });

  describe('persistState', () => {
    it('should be false to prevent localStorage persistence', () => {
      expect((service as any).persistState).toBe(false);
    });
  });

  describe('onFilterChange()', () => {
    it('should call updateFilters', () => {
      const stateService = TestBed.inject(BaseListStateService);
      const filters = { display: ['test'] };
      service.onFilterChange(filters);
      expect(stateService.updateFilters).toHaveBeenCalledWith(INFRA_SIGNALS_ENTITY_TYPE, filters);
    });
  });

  describe('onPageChange()', () => {
    it('should call updatePagination', () => {
      const stateService = TestBed.inject(BaseListStateService);
      service.onPageChange({ pageIndex: 1, pageSize: 50, length: 100 });
      expect(stateService.updatePagination).toHaveBeenCalledWith(INFRA_SIGNALS_ENTITY_TYPE, { pageIndex: 1, pageSize: 50 });
    });
  });

  describe('onSortChange()', () => {
    it('should call updateSort', () => {
      const stateService = TestBed.inject(BaseListStateService);
      const sort: Sort = { active: 'display', direction: 'asc' };
      service.onSortChange(sort);
      expect(stateService.updateSort).toHaveBeenCalledWith(INFRA_SIGNALS_ENTITY_TYPE, sort);
    });
  });

  describe('defaultFilter', () => {
    it('should be an empty object', () => {
      expect((service as any).defaultFilter).toEqual({});
    });
  });

  describe('noDataMessage', () => {
    it('should translate lblNoSignals key on construction', () => {
      expect(trMock.translate).toHaveBeenCalledWith('lblNoSignals');
      expect((service as any).noDataMessage).toBe('lblNoSignals');
    });
  });

  describe('buildFilter()', () => {
    it('should return empty object for empty string', () => {
      expect(service.buildFilter('')).toEqual({});
    });

    it('should return empty object for whitespace-only string', () => {
      expect(service.buildFilter('   ')).toEqual({});
    });

    it('should return display filter wrapping the trimmed query', () => {
      expect(service.buildFilter('SIG_001')).toEqual({ display: ['SIG_001'], substringSearch: true });
    });

    it('should trim surrounding whitespace before building filter', () => {
      expect(service.buildFilter('  SIG_001  ')).toEqual({ display: ['SIG_001'], substringSearch: true });
    });
  });

  describe('extractItems()', () => {
    it('should return the items array from the response', () => {
      const items: AdminDataEntry[] = [{ display: 'Area A' } as AdminDataEntry];
      const response: InfraSignalsList = { items, totalCount: 1 };

      expect((service as any).extractItems(response)).toEqual(items);
    });

    it('should return empty array when items is undefined', () => {
      const response = { totalCount: 0 } as InfraSignalsList;

      expect((service as any).extractItems(response)).toEqual([]);
    });
  });

  describe('columns getter', () => {
    it('should return exactly one column', () => {
      expect((service as any).columns).toHaveLength(1);
    });

    it('should return a column for the "display" field', () => {
      const [col] = (service as any).columns;

      expect(col.field).toBe('display');
    });

    it('should translate the column header via lblArea key', () => {
      void (service as any).columns;

      expect(trMock.translate).toHaveBeenCalledWith('lblArea');
    });

    it('should mark the column as sortable', () => {
      const [col] = (service as any).columns;

      expect(col.sortable).toBeUndefined();
    });
  });

  describe('actions getter', () => {
    it('should return an empty array', () => {
      expect((service as any).actions).toEqual([]);
    });
  });

  describe('fetchData()', () => {
    it('should call searchSignals with the provided filters and pagination', () => {
      const filters = { display: ['Test'] };
      const pagination = { pageIndex: 1, pageSize: 50, sortOrder: SortOrder.ASC };

      (service as any).fetchData(filters, pagination);

      expect(infraSignalsServiceMock.searchSignals).toHaveBeenCalledWith({
        filters,
        paginationAndSorting: pagination,
      });
    });

    it('should return the observable from infraSignalsService', () => {
      const response: InfraSignalsList = { items: [], totalCount: 0 };
      infraSignalsServiceMock.searchSignals.mockReturnValue(of(response));

      const result$ = (service as any).fetchData({}, defaultPagination);

      result$.subscribe((res: InfraSignalsList) => expect(res).toEqual(response));
    });
  });

  describe('hasLoaded', () => {
    it('should be false before data resource emits', () => {
      expect(service.hasLoaded()).toBe(false);
    });

    it('should remain false while no resource value has been produced', () => {
      infraSignalsServiceMock.searchSignals.mockReturnValue(of({ items: [], totalCount: 0 } as InfraSignalsList));
      service = createService();

      expect(service.hasLoaded()).toBe(false);
    });
  });
});
