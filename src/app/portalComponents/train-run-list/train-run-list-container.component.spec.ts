// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { signal, Component, input, output } from '@angular/core';

import { TrainRunListContainerService } from '@Ordering/portalComponents/train-run-list/services/train-run-list-container.service';
import { INITIAL_TRAIN_RUN_FILTER, TrainRunListFilter } from '@Ordering/portalComponents/train-run-list/models/train-run-list-filter.model';

import { TrainRunListContainerComponent } from './train-run-list-container.component';

// Stub child components to avoid provider chains
@Component({ selector: 'app-train-run-filters', standalone: true, template: '' })
class StubTrainRunFiltersComponent {
  readonly initialFilters = input<any>(INITIAL_TRAIN_RUN_FILTER);
  readonly filterChange = output<any>();
}

@Component({ selector: 'app-base-list', standalone: true, template: '' })
class StubBaseListComponent {
  readonly listConfig = input.required<any>();
  readonly pageChange = output<any>();
  readonly sortChange = output<any>();
}

describe('TrainRunListContainerComponent', () => {
  let component: TrainRunListContainerComponent;
  let fixture: ComponentFixture<TrainRunListContainerComponent>;

  const mockContainerService = {
    currentFilters: signal(INITIAL_TRAIN_RUN_FILTER),
    listConfig: signal({
      data: [],
      columns: [],
      actions: [],
      paginationAndSorting: { pageIndex: 0, pageSize: 10, totalCount: 0, show: true, pageSizeOptions: [10, 25, 50] },
      ui: { noDataMessage: 'No data' },
    }),
    onFilterChange: jest.fn(),
    onPageChange: jest.fn(),
    onSortChange: jest.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrainRunListContainerComponent, NoopAnimationsModule],
    })
      .overrideComponent(TrainRunListContainerComponent, {
        set: {
          imports: [StubTrainRunFiltersComponent, StubBaseListComponent],
          providers: [{ provide: TrainRunListContainerService, useValue: mockContainerService }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(TrainRunListContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should delegate onFilterChange to the container service', () => {
    const newFilter: TrainRunListFilter = { ...INITIAL_TRAIN_RUN_FILTER, searchString: 'ICE' };
    component['onFilterChange'](newFilter);
    expect(mockContainerService.onFilterChange).toHaveBeenCalledWith(newFilter);
  });

  it('should delegate onPageChange to the container service', () => {
    const event: PageEvent = { pageIndex: 1, pageSize: 25, length: 100 };
    component['onPageChange'](event);
    expect(mockContainerService.onPageChange).toHaveBeenCalledWith(event);
  });

  it('should delegate onSortChange to the container service', () => {
    const sort: Sort = { active: 'trainNumber', direction: 'asc' };
    component['onSortChange'](sort);
    expect(mockContainerService.onSortChange).toHaveBeenCalledWith(sort);
  });
});
