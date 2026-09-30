// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { SpareCapacityFilters } from '@Ordering/api';

import { SpareCapacityContainerService } from '@Ordering/portalComponents/spare-capacity/services/spare-capacity-container.service';
import { BaseListComponent } from '@Ordering/shared/components/base-list/base-list.component';
import { SpareCapacityFilterComponent } from '@Ordering/portalComponents/spare-capacity/spare-capacity-filter/spare-capacity-filter.component';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { CustomDateAdapter } from '@Ordering/utils/custom-date-adapter';
import { createCustomDateFormats } from '@Ordering/utils/custom-date-formats';
import { SpareCapacityContainerComponent } from './spare-capacity-container.component';

describe('SpareCapacityContainerComponent', () => {
  let component: SpareCapacityContainerComponent;
  let fixture: ComponentFixture<SpareCapacityContainerComponent>;
  let mockContainerService: jest.Mocked<Partial<SpareCapacityContainerService>>;

  beforeEach(async () => {
    const mockFilters = signal<SpareCapacityFilters>({
      trainId: undefined,
      date: undefined,
      fromStation: undefined,
      toStation: undefined,
    });

    const mockListConfig = signal({
      data: [],
      columns: [],
      actions: [],
      paginationAndSorting: {
        totalCount: 0,
        pageIndex: 0,
        pageSize: 25,
      },
      ui: {
        noDataMessage: 'No data available',
      },
    });

    mockContainerService = {
      currentFilters: mockFilters,
      listConfig: mockListConfig,
      onFilterChange: jest.fn(),
      onPageChange: jest.fn(),
      onSortChange: jest.fn(),
    };

    const mockTranslationsService = {
      translate: jest.fn(key => key),
    };

    await TestBed.configureTestingModule({
      imports: [SpareCapacityContainerComponent, BaseListComponent, SpareCapacityFilterComponent, NoopAnimationsModule],
      providers: [{ provide: TranslationsService, useValue: mockTranslationsService }],
    })
      .overrideComponent(SpareCapacityContainerComponent, {
        set: {
          providers: [
            { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
            { provide: DateAdapter, useClass: CustomDateAdapter },
            { provide: MAT_DATE_FORMATS, useFactory: createCustomDateFormats },
            { provide: SpareCapacityContainerService, useValue: mockContainerService },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SpareCapacityContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose currentFilters from container service', () => {
    expect(component['currentFilters']).toBe(mockContainerService.currentFilters);
  });

  it('should expose listConfig from container service', () => {
    expect(component['listConfig']).toBe(mockContainerService.listConfig);
  });

  describe('onFilterChange', () => {
    it('should delegate to container service', () => {
      const mockFilters: SpareCapacityFilters = {
        trainId: 1001,
        date: '2025-11-01',
        fromStation: 'Berlin',
        toStation: 'Munich',
      };

      component['onFilterChange'](mockFilters);

      expect(mockContainerService.onFilterChange).toHaveBeenCalledWith(mockFilters);
    });
  });

  describe('onPageChange', () => {
    it('should delegate to container service', () => {
      const mockPageEvent: PageEvent = {
        pageIndex: 1,
        pageSize: 50,
        length: 100,
      };

      component['onPageChange'](mockPageEvent);

      expect(mockContainerService.onPageChange).toHaveBeenCalledWith(mockPageEvent);
    });
  });

  describe('onSortChange', () => {
    it('should delegate to container service', () => {
      const mockSort: Sort = {
        active: 'trainNumber',
        direction: 'asc',
      };

      component['onSortChange'](mockSort);

      expect(mockContainerService.onSortChange).toHaveBeenCalledWith(mockSort);
    });

    it('should handle descending sort', () => {
      const mockSort: Sort = {
        active: 'departureTime',
        direction: 'desc',
      };

      component['onSortChange'](mockSort);

      expect(mockContainerService.onSortChange).toHaveBeenCalledWith(mockSort);
    });
  });
});
