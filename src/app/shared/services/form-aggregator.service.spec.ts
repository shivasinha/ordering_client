import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { FormAggregatorService } from './form-aggregator.service';
import { ItemDataContributor } from '../models/item-data-contributor.interface';
import { SlotDisplayMode } from '../models/component-slot.interface';

function createMockContributor(
  key: string,
  overrides: Partial<{ data: unknown; isValid: boolean; isDirty: boolean }> = {},
): ItemDataContributor {
  return {
    contributorKey: key,
    data: signal(overrides.data ?? {}),
    isValid: signal(overrides.isValid ?? true),
    isDirty: signal(overrides.isDirty ?? false),
    displayMode: signal(SlotDisplayMode.EDITABLE) as any,
    markAsPristine: jest.fn(),
  };
}

describe('FormAggregatorService', () => {
  let service: FormAggregatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FormAggregatorService],
    });
    service = TestBed.inject(FormAggregatorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('register / unregister', () => {
    it('should register a contributor and include its data in aggregated output', () => {
      const contributor = createMockContributor('stops', { data: [{ id: 1 }] });

      service.register(contributor);

      expect(service.getAggregatedDataSync()).toEqual({ stops: [{ id: 1 }] });
    });

    it('should register multiple contributors', () => {
      service.register(createMockContributor('stops', { data: 'stopsData' }));
      service.register(createMockContributor('header', { data: 'headerData' }));

      expect(service.getAggregatedDataSync()).toEqual({
        stops: 'stopsData',
        header: 'headerData',
      });
    });

    it('should unregister a contributor by key', () => {
      service.register(createMockContributor('stops', { data: 'stopsData' }));
      service.register(createMockContributor('header', { data: 'headerData' }));

      service.unregister('stops');

      expect(service.getAggregatedDataSync()).toEqual({ header: 'headerData' });
    });

    it('should handle unregistering a non-existent key gracefully', () => {
      service.register(createMockContributor('stops'));

      service.unregister('nonExistent');

      expect(service.getAggregatedDataSync()).toEqual({ stops: {} });
    });
  });

  describe('isAllValid', () => {
    it('should return true when no contributors are registered', () => {
      expect(service.isAllValid()).toBe(true);
    });

    it('should return true when all contributors are valid', () => {
      service.register(createMockContributor('a', { isValid: true }));
      service.register(createMockContributor('b', { isValid: true }));

      expect(service.isAllValid()).toBe(true);
    });

    it('should return false when any contributor is invalid', () => {
      service.register(createMockContributor('a', { isValid: true }));
      service.register(createMockContributor('b', { isValid: false }));

      expect(service.isAllValid()).toBe(false);
    });
  });

  describe('isAnyDirty', () => {
    it('should return false when no contributors are registered', () => {
      expect(service.isAnyDirty()).toBe(false);
    });

    it('should return false when no contributors are dirty', () => {
      service.register(createMockContributor('a', { isDirty: false }));
      service.register(createMockContributor('b', { isDirty: false }));

      expect(service.isAnyDirty()).toBe(false);
    });

    it('should return true when any contributor is dirty', () => {
      service.register(createMockContributor('a', { isDirty: false }));
      service.register(createMockContributor('b', { isDirty: true }));

      expect(service.isAnyDirty()).toBe(true);
    });
  });

  describe('notifyStateChange', () => {
    it('should increment stateVersion', () => {
      const initial = service.stateVersion();

      service.notifyStateChange();

      expect(service.stateVersion()).toBe(initial + 1);
    });

    it('should increment stateVersion on each call', () => {
      service.notifyStateChange();
      service.notifyStateChange();
      service.notifyStateChange();

      expect(service.stateVersion()).toBe(3);
    });
  });

  describe('resetAll', () => {
    it('should call markAsPristine on all registered contributors', () => {
      const contributorA = createMockContributor('a');
      const contributorB = createMockContributor('b');
      service.register(contributorA);
      service.register(contributorB);

      service.resetAll();

      expect(contributorA.markAsPristine).toHaveBeenCalledTimes(1);
      expect(contributorB.markAsPristine).toHaveBeenCalledTimes(1);
    });

    it('should not throw when no contributors are registered', () => {
      expect(() => service.resetAll()).not.toThrow();
    });
  });

  describe('getAggregatedDataSync', () => {
    it('should return empty object when no contributors are registered', () => {
      expect(service.getAggregatedDataSync()).toEqual({});
    });

    it('should return latest data from all contributors', () => {
      const dataSig = signal<string[]>(['initial']);
      const contributor: ItemDataContributor = {
        contributorKey: 'stops',
        data: dataSig,
        isValid: signal(true),
        isDirty: signal(false),
        displayMode: signal(SlotDisplayMode.EDITABLE) as any,
        markAsPristine: jest.fn(),
      };
      service.register(contributor);

      expect(service.getAggregatedDataSync()).toEqual({ stops: ['initial'] });

      dataSig.set(['updated']);

      expect(service.getAggregatedDataSync()).toEqual({ stops: ['updated'] });
    });
  });
});
