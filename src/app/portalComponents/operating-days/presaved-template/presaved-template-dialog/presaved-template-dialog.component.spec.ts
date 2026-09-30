// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { Pipe, PipeTransform } from '@angular/core';

import { PresavedTemplateDialogComponent } from './presaved-template-dialog.component';
import { PresavedTemplateService } from '../services/presaved-template.service';
import { PresavedTemplateFilterCriteria } from '../models/presaved-template-filter.interface';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { PresavedODTTemplate } from '@Ordering/api';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { CustomDateAdapter } from '@Ordering/utils/custom-date-adapter';
import { createCustomDateFormats } from '@Ordering/utils/custom-date-formats';

// Mock TranslatePipe
@Pipe({
  name: 'translate',
  standalone: true,
})
class MockTranslatePipe implements PipeTransform {
  transform(value: string): string {
    return `translated_${value}`;
  }
}

describe('PresavedTemplateDialogComponent', () => {
  let component: PresavedTemplateDialogComponent;
  let fixture: ComponentFixture<PresavedTemplateDialogComponent>;
  let mockDialogRef: jest.Mocked<MatDialogRef<PresavedTemplateDialogComponent>>;
  let mockPresavedTemplateService: jest.Mocked<PresavedTemplateService>;
  let mockTranslationsService: jest.Mocked<TranslationsService>;

  const mockTemplates: PresavedODTTemplate[] = [
    {
      name: 'ODT12345',
      description: 'Test ODT12345 - Weekdays only',
      endDate: '2024-01-07',
      operatingDays: {
        beginDate: '2024-01-01',
        daysBitmap: '1111100',
        selectedDays: [1, 2, 3, 4, 5],
        deselectedDays: [6, 7],
      },
    },
  ];

  beforeEach(async () => {
    mockDialogRef = {
      close: jest.fn(),
    } as any;

    mockTranslationsService = {
      translate: jest.fn().mockReturnValue('translated'),
    } as any;

    mockPresavedTemplateService = {
      getPresavedTemplates: jest.fn().mockReturnValue(of(mockTemplates)),
      isLoadingSignal: jest.fn().mockReturnValue(false),
      buildQueryParams: jest.fn(),
    } as any;

    await TestBed.configureTestingModule({
      imports: [PresavedTemplateDialogComponent, BrowserAnimationsModule],
      providers: [
        { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
        { provide: DateAdapter, useClass: CustomDateAdapter },
        { provide: MAT_DATE_FORMATS, useFactory: createCustomDateFormats },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: PresavedTemplateService, useValue: mockPresavedTemplateService },
        { provide: TranslationsService, useValue: mockTranslationsService },
      ],
    })
      .overrideComponent(PresavedTemplateDialogComponent, {
        remove: { imports: [TranslatePipe] },
        add: { imports: [MockTranslatePipe] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(PresavedTemplateDialogComponent);
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

  it('should initialize with correct default values', () => {
    expect(component.templates()).toEqual([]);
    expect(component.selectedTemplate()).toBeNull();
    expect(component.hasSearched()).toBe(false);
    expect(component.canApplyTemplate()).toBe(false);
  });

  it('should handle filter application correctly', () => {
    const filterCriteria: PresavedTemplateFilterCriteria = {
      searchString: 'test',
      beginDate: '2024-01-01',
      endDate: '2024-01-31',
      matchAnyDate: false,
    };

    component.onFilterApplied(filterCriteria);

    expect(mockPresavedTemplateService.getPresavedTemplates).toHaveBeenCalledWith(filterCriteria);
    expect(component.filterCriteria()).toEqual(filterCriteria);
  });

  it('should handle template selection', () => {
    const selectedTemplate = mockTemplates[0];

    component.onTemplateSelected(selectedTemplate);

    expect(component.selectedTemplate()).toEqual(selectedTemplate);
    expect(component.canApplyTemplate()).toBe(true);
  });

  it('should close dialog with selected template on confirm', () => {
    const selectedTemplate = mockTemplates[0];
    component.onTemplateSelected(selectedTemplate);

    component.onConfirm();

    expect(mockDialogRef.close).toHaveBeenCalledWith(selectedTemplate);
  });

  it('should not close dialog when no template is selected on confirm', () => {
    // No template selected
    expect(component.selectedTemplate()).toBeNull();

    component.onConfirm();

    expect(mockDialogRef.close).not.toHaveBeenCalled();
  });

  it('should close dialog with no data on cancel', () => {
    component.onCancel();

    expect(mockDialogRef.close).toHaveBeenCalledWith();
  });

  it('should update hasSearched and clear selection when loading templates', () => {
    const filterCriteria: PresavedTemplateFilterCriteria = {
      searchString: 'test',
      beginDate: '2024-01-01',
      endDate: '2024-01-31',
      matchAnyDate: false,
    };

    // First select a template
    component.onTemplateSelected(mockTemplates[0]);
    expect(component.selectedTemplate()).toEqual(mockTemplates[0]);

    // Then apply filter - this should clear selection and set hasSearched
    component.onFilterApplied(filterCriteria);

    expect(component.hasSearched()).toBe(true);
    expect(component.selectedTemplate()).toBeNull();
    expect(component.templates()).toEqual(mockTemplates);
  });

  it('should handle service errors gracefully', () => {
    const errorMessage = 'Service error';
    mockPresavedTemplateService.getPresavedTemplates.mockReturnValue(throwError(() => new Error(errorMessage)));

    const filterCriteria: PresavedTemplateFilterCriteria = {
      searchString: 'test',
      beginDate: '2024-01-01',
      endDate: '2024-01-31',
      matchAnyDate: false,
    };

    // This should not throw an error
    expect(() => component.onFilterApplied(filterCriteria)).not.toThrow();
  });

  it('should properly destroy subscriptions', () => {
    const destroySpy = jest.spyOn(component['destroy$'], 'next');
    const completeSpy = jest.spyOn(component['destroy$'], 'complete');

    component.ngOnDestroy();

    expect(destroySpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });
});
