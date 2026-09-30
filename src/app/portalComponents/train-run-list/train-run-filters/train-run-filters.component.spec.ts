// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { TrainState, Source } from '@Ordering/api';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { FilterService } from '@Ordering/shared/services/filter.service';
import { ConfigDataService } from '@Ordering/shared/services/config-data.service';
import { INITIAL_TRAIN_RUN_FILTER } from '@Ordering/portalComponents/train-run-list/models/train-run-list-filter.model';
import { TrainDateTimeEnum } from '@Ordering/data/custom/enum/trainDateTime';

import { TrainRunFiltersComponent } from './train-run-filters.component';

describe('TrainRunFiltersComponent', () => {
  let component: TrainRunFiltersComponent;
  let fixture: ComponentFixture<TrainRunFiltersComponent>;

  const mockTranslationsService = {
    translate: jest.fn().mockImplementation((key: string) => `translated(${key})`),
  };

  const mockFilterService = {
    trainSources: jest.fn().mockReturnValue([
      { key: undefined, value: 'All Sources' },
      { key: Source.RAILWAY_UNDERTAKING_WEB_PORTAL, value: 'RU Web Portal' },
    ]),
    trainFilterState: undefined,
  };

  const mockConfigDataService = {
    isRailwayUndertakingUser: jest.fn().mockReturnValue(false),
  };

  beforeEach(async () => {
    // Stub localStorage
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('TestProject');

    await TestBed.configureTestingModule({
      imports: [TrainRunFiltersComponent, NoopAnimationsModule],
      providers: [
        { provide: TranslationsService, useValue: mockTranslationsService },
        { provide: FilterService, useValue: mockFilterService },
        { provide: ConfigDataService, useValue: mockConfigDataService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TrainRunFiltersComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('initialFilters', INITIAL_TRAIN_RUN_FILTER);
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    TestBed.resetTestingModule();
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit — form seeding', () => {
    it('should seed dateRangeType from initial filter', () => {
      expect(component['filterForm'].value.dateRangeType).toBe(TrainDateTimeEnum.BEGIN_DATE);
    });

    it('should seed trainState when provided in initial filter', () => {
      fixture.componentRef.setInput('initialFilters', { ...INITIAL_TRAIN_RUN_FILTER, state: [TrainState.PUBLISHED] });
      component.ngOnInit();
      expect(component['filterForm'].value.trainState).toBe(TrainState.PUBLISHED);
    });

    it('should set showAllProjects to false when projectList is not allProjects', () => {
      fixture.componentRef.setInput('initialFilters', { ...INITIAL_TRAIN_RUN_FILTER, showAllProjects: false });
      component.ngOnInit();
      expect(component['filterForm'].value.projectList).toBe('');
    });

    it('should set projectList to allProjects key when showAllProjects is true', () => {
      fixture.componentRef.setInput('initialFilters', { ...INITIAL_TRAIN_RUN_FILTER, showAllProjects: true });
      component.ngOnInit();
      expect(component['filterForm'].value.projectList).toBe('allProjects');
    });
  });

  describe('filterChange output', () => {
    it('should emit filterChange when form value changes', done => {
      const emitted: any[] = [];
      const sub = component.filterChange.subscribe((f: any) => emitted.push(f));

      component['filterForm'].patchValue({ searchString: 'ICE' });

      setTimeout(() => {
        expect(emitted.length).toBeGreaterThanOrEqual(1);
        expect(emitted[0].searchString).toBe('ICE');
        sub.unsubscribe();
        done();
      }, 400);
    });

    it('should not emit duplicate filterChange events', done => {
      const emitted: any[] = [];
      const sub = component.filterChange.subscribe((f: any) => emitted.push(f));

      component['filterForm'].patchValue({ searchString: 'ICE' });
      component['filterForm'].patchValue({ searchString: 'ICE' }); // same value

      setTimeout(() => {
        expect(emitted.length).toBe(1);
        sub.unsubscribe();
        done();
      }, 400);
    });

    it('should map trainState to state array in emitted filter', done => {
      const emitted: any[] = [];
      const sub = component.filterChange.subscribe((f: any) => emitted.push(f));

      component['filterForm'].patchValue({ trainState: TrainState.CANCELLED });

      setTimeout(() => {
        expect(emitted[0].state).toEqual([TrainState.CANCELLED]);
        sub.unsubscribe();
        done();
      }, 400);
    });

    it('should emit empty state array when trainState is undefined', done => {
      const emitted: any[] = [];
      // Start from a state with a train state set
      fixture.componentRef.setInput('initialFilters', { ...INITIAL_TRAIN_RUN_FILTER, state: [TrainState.PUBLISHED] });
      component.ngOnInit();

      const sub = component.filterChange.subscribe((f: any) => emitted.push(f));
      component['filterForm'].patchValue({ trainState: undefined });

      setTimeout(() => {
        expect(emitted[0].state).toEqual([]);
        sub.unsubscribe();
        done();
      }, 400);
    });

    it('should set showAllProjects true when projectList is allProjects', done => {
      const emitted: any[] = [];
      const sub = component.filterChange.subscribe((f: any) => emitted.push(f));

      component['filterForm'].patchValue({ projectList: 'allProjects' });

      setTimeout(() => {
        expect(emitted[0].showAllProjects).toBe(true);
        sub.unsubscribe();
        done();
      }, 400);
    });
  });

  describe('date filters list', () => {
    it('should contain all four date filter options', () => {
      const keys = component['dateFilters'].map((f: any) => f.key);
      expect(keys).toContain(TrainDateTimeEnum.BEGIN_DATE);
      expect(keys).toContain(TrainDateTimeEnum.LAST_MODIFIED_DATETIME);
      expect(keys).toContain(TrainDateTimeEnum.CANCELLATION_DATE);
      expect(keys).toContain(TrainDateTimeEnum.RUNNING_DATE);
    });
  });
});
