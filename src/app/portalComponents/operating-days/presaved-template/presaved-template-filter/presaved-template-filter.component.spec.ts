// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import dayjs from 'dayjs';

import { PresavedTemplateFilterComponent } from './presaved-template-filter.component';
import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { PresavedTemplateFilterCriteria } from '@Ordering/portalComponents/operating-days/presaved-template/models/presaved-template-filter.interface';
import { provideDayjsDateAdapter } from '@Ordering/utils/dayjs-date-adapter-provider';
import { DateTimeFormat } from '@Ordering/utils/dates';

describe('PresavedTemplateFilterComponent', () => {
  let component: PresavedTemplateFilterComponent;
  let fixture: ComponentFixture<PresavedTemplateFilterComponent>;
  let mockTranslationsService: jest.Mocked<TranslationsService>;

  beforeEach(async () => {
    mockTranslationsService = {
      translate: jest.fn().mockReturnValue('translated'),
    } as any;

    await TestBed.configureTestingModule({
      imports: [
        PresavedTemplateFilterComponent,
        NoopAnimationsModule,
        SharedMaterialModule,
        MatSlideToggleModule,
        ReactiveFormsModule,
        TranslatePipe,
      ],
      providers: [provideDayjsDateAdapter(), { provide: TranslationsService, useValue: mockTranslationsService }],
    }).compileComponents();

    fixture = TestBed.createComponent(PresavedTemplateFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component.filterForm).toBeDefined();
    expect(component.filterForm.get('searchString')?.value).toBe('');
    expect(component.filterForm.get('matchAnyDate')?.value).toBe(false);
    expect(component.filterForm.get('dateRange')?.value.beginDate).toBeUndefined();
    expect(component.filterForm.get('dateRange')?.value.endDate).toBeUndefined();
  });

  it('should not apply filter when dates are missing', () => {
    // Clear date range
    component.filterForm.patchValue({
      dateRange: { beginDate: null, endDate: null },
    });

    fixture.detectChanges();

    expect(component.canApplyFilter()).toBe(false);
  });

  it('should emit filter criteria when apply filter is called', () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    let emittedCriteria: PresavedTemplateFilterCriteria | undefined;
    component.filterApplied.subscribe((criteria: PresavedTemplateFilterCriteria) => {
      emittedCriteria = criteria;
    });

    // Set form values
    component.filterForm.patchValue({
      searchString: 'test search',
      dateRange: { beginDate: today, endDate: tomorrow },
      matchAnyDate: true,
    });

    fixture.detectChanges();

    // Call applyFilter
    component.applyFilter();

    expect(emittedCriteria).toBeDefined();
    expect(emittedCriteria?.searchString).toBe('test search');
    expect(emittedCriteria?.beginDate).toBe(dayjs(today).format(DateTimeFormat.API_DATE_FORMAT));
    expect(emittedCriteria?.endDate).toBe(dayjs(tomorrow).format(DateTimeFormat.API_DATE_FORMAT));
    expect(emittedCriteria?.matchAnyDate).toBe(true);
  });

  it('should not emit filter criteria when filter cannot be applied', () => {
    let emittedCriteria: PresavedTemplateFilterCriteria | undefined;
    component.filterApplied.subscribe((criteria: PresavedTemplateFilterCriteria) => {
      emittedCriteria = criteria;
    });

    // Set invalid form state
    component.filterForm.patchValue({
      dateRange: { beginDate: null, endDate: null },
    });

    fixture.detectChanges();

    // Call applyFilter
    component.applyFilter();

    expect(emittedCriteria).toBeUndefined();
  });

  it('should setup form subscriptions on init', () => {
    // Test that form subscriptions are working by updating form values and checking signal
    const testValue = 'test subscription';

    component.ngOnInit();

    component.filterForm.patchValue({
      searchString: testValue,
    });

    fixture.detectChanges();

    expect(component.formState().searchString).toBe(testValue);
  });

  it('should clean up subscriptions on destroy', () => {
    const destroySpy = jest.spyOn(component['destroy$'], 'next');
    const completeSpy = jest.spyOn(component['destroy$'], 'complete');

    component.ngOnDestroy();

    expect(destroySpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });

  it('should update form state signal when form values change', () => {
    const newSearchString = 'updated search';

    component.filterForm.patchValue({
      searchString: newSearchString,
    });

    fixture.detectChanges();

    expect(component.formState().searchString).toBe(newSearchString);
  });

  it('should handle empty search string in filter criteria', () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    let emittedCriteria: PresavedTemplateFilterCriteria | undefined;
    component.filterApplied.subscribe((criteria: PresavedTemplateFilterCriteria) => {
      emittedCriteria = criteria;
    });

    // Set form values with empty search string
    component.filterForm.patchValue({
      searchString: '',
      dateRange: { beginDate: today, endDate: tomorrow },
      matchAnyDate: false,
    });

    fixture.detectChanges();

    // Call applyFilter
    component.applyFilter();

    expect(emittedCriteria).toBeDefined();
    expect(emittedCriteria?.searchString).toBe('');
  });
});
