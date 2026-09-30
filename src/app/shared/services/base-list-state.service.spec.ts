// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { TestBed } from '@angular/core/testing';
import { Sort } from '@angular/material/sort';
import { SortOrder } from '@Ordering/api';
import { BaseListStateService, BaseListState } from './base-list-state.service';

describe('BaseListStateService', () => {
  let service: BaseListStateService;
  const STORAGE_KEY = 'LISTS_STATES';

  interface TestFilter {
    search?: string;
    status?: string;
  }

  const defaultFilter: TestFilter = {
    search: undefined,
    status: undefined,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BaseListStateService],
    });
    service = TestBed.inject(BaseListStateService);

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getState', () => {
    it('should create initial state when none exists', () => {
      const stateSig = service.getState('test-entity', defaultFilter);
      const state = stateSig();

      expect(state).toBeDefined();
      expect(state.filters).toEqual(defaultFilter);
      expect(state.paginationAndSorting.pageIndex).toBe(0);
      expect(state.paginationAndSorting.sortOrder).toBe(SortOrder.ASC);
    });

    it('should return same signal for repeated calls', () => {
      const stateSig1 = service.getState('test-entity', defaultFilter);
      const stateSig2 = service.getState('test-entity', defaultFilter);

      expect(stateSig1).toBe(stateSig2);
    });

    it('should create different signals for different entities', () => {
      const stateSig1 = service.getState('entity1', defaultFilter);
      const stateSig2 = service.getState('entity2', defaultFilter);

      expect(stateSig1).not.toBe(stateSig2);
    });

    it('should load state from localStorage if exists', () => {
      const savedState: BaseListState<TestFilter> = {
        filters: { search: 'test', status: 'active' },
        paginationAndSorting: {
          pageIndex: 2,
          pageSize: 50,
          sortBy: 'name',
          sortOrder: SortOrder.DESC,
        },
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify({ 'test-entity': savedState }));

      const stateSig = service.getState('test-entity', defaultFilter);
      const state = stateSig();

      expect(state.filters).toEqual(savedState.filters);
      expect(state.paginationAndSorting).toEqual(savedState.paginationAndSorting);
    });
  });

  describe('updatePagination', () => {
    it('should update pagination settings', () => {
      const stateSig = service.getState('test-entity', defaultFilter);

      service.updatePagination('test-entity', {
        pageIndex: 2,
        pageSize: 50,
      });

      const state = stateSig();
      expect(state.paginationAndSorting.pageIndex).toBe(2);
      expect(state.paginationAndSorting.pageSize).toBe(50);
    });

    it('should persist pagination to localStorage', () => {
      service.getState('test-entity', defaultFilter);

      service.updatePagination('test-entity', {
        pageIndex: 3,
        pageSize: 100,
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      expect(stored['test-entity'].paginationAndSorting.pageIndex).toBe(3);
      expect(stored['test-entity'].paginationAndSorting.pageSize).toBe(100);
    });

    it('should merge with existing pagination settings', () => {
      const stateSig = service.getState('test-entity', defaultFilter);

      service.updatePagination('test-entity', { pageSize: 50 });
      service.updatePagination('test-entity', { pageIndex: 2 });

      const state = stateSig();
      expect(state.paginationAndSorting.pageSize).toBe(50);
      expect(state.paginationAndSorting.pageIndex).toBe(2);
    });
  });

  describe('updateFilters', () => {
    it('should update filters', () => {
      const stateSig = service.getState('test-entity', defaultFilter);

      const newFilters: TestFilter = { search: 'test', status: 'active' };
      service.updateFilters('test-entity', newFilters);

      const state = stateSig();
      expect(state.filters).toEqual(newFilters);
    });

    it('should reset pageIndex to 0 when filters change', () => {
      const stateSig = service.getState('test-entity', defaultFilter);

      service.updatePagination('test-entity', { pageIndex: 5 });
      service.updateFilters('test-entity', { search: 'test' });

      const state = stateSig();
      expect(state.paginationAndSorting.pageIndex).toBe(0);
    });

    it('should persist filters to localStorage', () => {
      service.getState('test-entity', defaultFilter);

      const newFilters: TestFilter = { search: 'test', status: 'active' };
      service.updateFilters('test-entity', newFilters);

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      expect(stored['test-entity'].filters).toEqual(newFilters);
    });

    it('should clean filters by removing undefined and empty values', () => {
      const stateSig = service.getState('test-entity', defaultFilter);

      const dirtyFilters: TestFilter = {
        search: '',
        status: undefined,
      };
      service.updateFilters('test-entity', dirtyFilters);

      const state = stateSig();
      expect(state.filters).toEqual({});
    });
  });

  describe('updateSort', () => {
    it('should update sort settings for ascending', () => {
      const stateSig = service.getState('test-entity', defaultFilter);

      const sort: Sort = { active: 'name', direction: 'asc' };
      service.updateSort('test-entity', sort);

      const state = stateSig();
      expect(state.paginationAndSorting.sortBy).toBe('name');
      expect(state.paginationAndSorting.sortOrder).toBe(SortOrder.ASC);
    });

    it('should update sort settings for descending', () => {
      const stateSig = service.getState('test-entity', defaultFilter);

      const sort: Sort = { active: 'date', direction: 'desc' };
      service.updateSort('test-entity', sort);

      const state = stateSig();
      expect(state.paginationAndSorting.sortBy).toBe('date');
      expect(state.paginationAndSorting.sortOrder).toBe(SortOrder.DESC);
    });

    it('should clear sort when direction is empty', () => {
      const stateSig = service.getState('test-entity', defaultFilter);

      const sort: Sort = { active: 'name', direction: '' };
      service.updateSort('test-entity', sort);

      const state = stateSig();
      expect(state.paginationAndSorting.sortBy).toBeUndefined();
      expect(state.paginationAndSorting.sortOrder).toBeUndefined();
    });

    it('should persist sort to localStorage', () => {
      service.getState('test-entity', defaultFilter);

      const sort: Sort = { active: 'name', direction: 'asc' };
      service.updateSort('test-entity', sort);

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      expect(stored['test-entity'].paginationAndSorting.sortBy).toBe('name');
      expect(stored['test-entity'].paginationAndSorting.sortOrder).toBe(SortOrder.ASC);
    });

    it('should reset pageIndex to 0 when sort changes', () => {
      const stateSig = service.getState('test-entity', defaultFilter);

      service.updatePagination('test-entity', { pageIndex: 5 });
      service.updateSort('test-entity', { active: 'name', direction: 'asc' });

      const state = stateSig();
      expect(state.paginationAndSorting.pageIndex).toBe(0);
    });
  });

  describe('resetState', () => {
    it('should reset state to default values', () => {
      const stateSig = service.getState('test-entity', defaultFilter);

      // Make some changes
      service.updateFilters('test-entity', { search: 'test', status: 'active' });
      service.updatePagination('test-entity', { pageIndex: 3, pageSize: 100 });

      // Reset
      service.resetState('test-entity', defaultFilter);

      const state = stateSig();
      expect(state.filters).toEqual(defaultFilter);
      expect(state.paginationAndSorting.pageIndex).toBe(0);
      expect(state.paginationAndSorting.sortOrder).toBe(SortOrder.ASC);
    });

    it('should persist reset state to localStorage', () => {
      service.getState('test-entity', defaultFilter);

      service.updateFilters('test-entity', { search: 'test' });
      service.resetState('test-entity', defaultFilter);

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      expect(stored['test-entity'].filters).toEqual(defaultFilter);
    });
  });

  describe('localStorage error handling', () => {
    it('should handle localStorage read errors gracefully', () => {
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      const stateSig = service.getState('test-entity', defaultFilter);
      const state = stateSig();

      expect(state.filters).toEqual(defaultFilter);
    });

    it('should handle localStorage write errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      service.getState('test-entity', defaultFilter);

      expect(() => {
        service.updateFilters('test-entity', { search: 'test' });
      }).not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('multiple entities', () => {
    it('should maintain separate states for different entities', () => {
      const stateSig1 = service.getState('entity1', defaultFilter);
      const stateSig2 = service.getState('entity2', defaultFilter);

      service.updateFilters('entity1', { search: 'entity1-search' });
      service.updateFilters('entity2', { search: 'entity2-search' });

      expect(stateSig1().filters.search).toBe('entity1-search');
      expect(stateSig2().filters.search).toBe('entity2-search');
    });

    it('should save all entities to same localStorage key', () => {
      service.getState('entity1', defaultFilter);
      service.getState('entity2', defaultFilter);

      service.updateFilters('entity1', { search: 'test1' });
      service.updateFilters('entity2', { search: 'test2' });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      expect(stored['entity1'].filters.search).toBe('test1');
      expect(stored['entity2'].filters.search).toBe('test2');
    });
  });

  describe('persist = false (no localStorage)', () => {
    it('should not load from localStorage when persist is false', () => {
      const savedState: BaseListState<TestFilter> = {
        filters: { search: 'saved', status: 'active' },
        paginationAndSorting: { pageIndex: 5, pageSize: 100, sortOrder: SortOrder.DESC },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ 'no-persist-entity': savedState }));

      const stateSig = service.getState('no-persist-entity', defaultFilter, false);
      const state = stateSig();

      expect(state.filters).toEqual(defaultFilter);
      expect(state.paginationAndSorting.pageIndex).toBe(0);
    });

    it('should not save to localStorage on updatePagination when persist is false', () => {
      service.getState('no-persist-entity', defaultFilter, false);
      service.updatePagination('no-persist-entity', { pageIndex: 3 }, false);

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      expect(stored['no-persist-entity']).toBeUndefined();
    });

    it('should still update in-memory state on updatePagination when persist is false', () => {
      const stateSig = service.getState('no-persist-entity', defaultFilter, false);
      service.updatePagination('no-persist-entity', { pageIndex: 3 }, false);

      expect(stateSig().paginationAndSorting.pageIndex).toBe(3);
    });

    it('should not save to localStorage on updateFilters when persist is false', () => {
      service.getState('no-persist-entity', defaultFilter, false);
      service.updateFilters('no-persist-entity', { search: 'test' }, false);

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      expect(stored['no-persist-entity']).toBeUndefined();
    });

    it('should still update in-memory state on updateFilters when persist is false', () => {
      const stateSig = service.getState('no-persist-entity', defaultFilter, false);
      service.updateFilters('no-persist-entity', { search: 'test' }, false);

      expect(stateSig().filters).toEqual({ search: 'test' });
    });

    it('should not save to localStorage on updateSort when persist is false', () => {
      service.getState('no-persist-entity', defaultFilter, false);
      service.updateSort('no-persist-entity', { active: 'name', direction: 'asc' }, false);

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      expect(stored['no-persist-entity']).toBeUndefined();
    });

    it('should still update in-memory state on updateSort when persist is false', () => {
      const stateSig = service.getState('no-persist-entity', defaultFilter, false);
      service.updateSort('no-persist-entity', { active: 'name', direction: 'asc' }, false);

      expect(stateSig().paginationAndSorting.sortBy).toBe('name');
      expect(stateSig().paginationAndSorting.sortOrder).toBe(SortOrder.ASC);
    });

    it('should not save to localStorage on resetState when persist is false', () => {
      service.getState('no-persist-entity', defaultFilter, false);
      service.updateFilters('no-persist-entity', { search: 'test' }, false);
      service.resetState('no-persist-entity', defaultFilter, false);

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      expect(stored['no-persist-entity']).toBeUndefined();
    });

    it('should still reset in-memory state on resetState when persist is false', () => {
      const stateSig = service.getState('no-persist-entity', defaultFilter, false);
      service.updateFilters('no-persist-entity', { search: 'test' }, false);
      service.resetState('no-persist-entity', defaultFilter, false);

      expect(stateSig().filters).toEqual(defaultFilter);
      expect(stateSig().paginationAndSorting.pageIndex).toBe(0);
    });
  });
});
