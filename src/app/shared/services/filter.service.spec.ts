import { TestBed } from '@angular/core/testing';
import { FormGroup, FormControl } from '@angular/forms';
import { TabsTypesEnum } from '@Ordering/data/custom/enum/tabTypes';
import { FilterService } from './filter.service';
import { ConfigDataService } from './config-data.service';
import { TranslationsService } from '@Ordering/core/services/translations.service';

describe('FilterService', () => {
  let service: FilterService;

  const mockConfigDataService = {
    configData: { orderType: [0, 1] },
    isRailwayUndertakingUser: jest.fn().mockReturnValue(false),
  };

  const mockTranslationsService = {
    translate: (key: string) => `translated(${key})`,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FilterService,
        { provide: ConfigDataService, useValue: mockConfigDataService },
        { provide: TranslationsService, useValue: mockTranslationsService },
      ],
    });
    service = TestBed.inject(FilterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('trainFilterState', () => {
    it('should set and get trainFilterState', () => {
      const formGroup = new FormGroup({ test: new FormControl('testValue') });
      service.trainFilterState = formGroup;
      expect(service.trainFilterState).toBe(formGroup);
    });
  });

  describe('saveFilterFormState', () => {
    it('should save train filter state', () => {
      const formGroup = new FormGroup({ test: new FormControl('testValue') });
      service.saveFilterFormState(TabsTypesEnum.TRAIN_RUNS, formGroup);
      expect(service.trainFilterState).toBe(formGroup);
    });

    it('should do nothing for unknown tab', () => {
      const formGroup = new FormGroup({ test: new FormControl('testValue') });
      service.saveFilterFormState('UNKNOWN_TAB', formGroup);
      expect(service.trainFilterState).toBeUndefined();
    });

    it('should do nothing when filterForm is falsy', () => {
      service.saveFilterFormState(TabsTypesEnum.TRAIN_RUNS, undefined as any);
      expect(service.trainFilterState).toBeUndefined();
    });
  });

  describe('patchFilterFormSate', () => {
    it('should patch train filter form state', () => {
      const target = new FormGroup({ test: new FormControl('') });
      const saved = new FormGroup({ test: new FormControl('trainValue') });
      service.trainFilterState = saved;

      service.patchFilterFormSate(TabsTypesEnum.TRAIN_RUNS, target);

      expect(target.value).toEqual(saved.value);
    });

    it('should not patch when train filter state is not set', () => {
      const target = new FormGroup({ test: new FormControl('original') });

      service.patchFilterFormSate(TabsTypesEnum.TRAIN_RUNS, target);

      expect(target.value.test).toBe('original');
    });
  });

  describe('setOrderTypes', () => {
    it('should populate filteredOrderTypes from configData', () => {
      service.setOrderTypes();

      expect(service.filteredOrderTypes()).toEqual([
        { key: 0, value: 'translated(lblLtp)' },
        { key: 1, value: 'translated(lblStp)' },
      ]);
    });

    it('should compute orderTypeFilterList with undefined "All" option prepended', () => {
      service.setOrderTypes();

      expect(service.orderTypeFilterList()).toEqual([
        { key: undefined, value: 'translated(lblAllOrderType)' },
        { key: 0, value: 'translated(lblLtp)' },
        { key: 1, value: 'translated(lblStp)' },
      ]);
    });

    it('orderTypeFilterList should reactively update when filteredOrderTypes changes', () => {
      service.setOrderTypes();
      const initial = service.orderTypeFilterList().length;

      // Simulate configData with only one type
      mockConfigDataService.configData = { orderType: [0] };
      service.setOrderTypes();

      expect(service.orderTypeFilterList().length).toBe(initial - 1);
      // Restore
      mockConfigDataService.configData = { orderType: [0, 1] };
    });

    it('should set empty filteredOrderTypes when configData has no matching types', () => {
      mockConfigDataService.configData = { orderType: [] };
      service.setOrderTypes();

      expect(service.filteredOrderTypes()).toEqual([]);
      expect(service.orderTypeFilterList()).toEqual([{ key: undefined, value: 'translated(lblAllOrderType)' }]);

      mockConfigDataService.configData = { orderType: [0, 1] };
    });
  });
});
