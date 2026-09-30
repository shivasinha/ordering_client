// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentRef } from '@angular/core';

import { PresavedTemplateListComponent } from './presaved-template-list.component';
import { PresavedTemplateService } from '../services/presaved-template.service';
import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { DayNumbersToNamesPipe } from '@Ordering/core/pipes/day-numbers-to-names.pipe';
import { PresavedODTTemplate } from '@Ordering/api';

describe('PresavedTemplateListComponent', () => {
  let component: PresavedTemplateListComponent;
  let fixture: ComponentFixture<PresavedTemplateListComponent>;
  let componentRef: ComponentRef<PresavedTemplateListComponent>;
  let mockTranslationsService: jest.Mocked<TranslationsService>;
  let mockDayNumbersToNamesPipe: jest.Mocked<DayNumbersToNamesPipe>;
  let mockPresavedTemplateService: jest.Mocked<PresavedTemplateService>;

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
    {
      name: 'ODT67890',
      description: 'Test ODT67890 - Weekend template',
      endDate: '2024-01-14',
      operatingDays: {
        beginDate: '2024-01-08',
        daysBitmap: '0000011',
        selectedDays: [6, 7],
        deselectedDays: [1, 2, 3, 4, 5],
      },
    },
    {
      name: 'ODT11111',
      description: 'Test ODT11111 - Daily operation',
      endDate: '2024-01-21',
      operatingDays: {
        beginDate: '2024-01-15',
        daysBitmap: '1111111',
        selectedDays: [1, 2, 3, 4, 5, 6, 7],
        deselectedDays: [],
      },
    },
  ];

  beforeEach(async () => {
    mockTranslationsService = {
      translate: jest.fn().mockReturnValue('translated'),
    } as any;

    mockDayNumbersToNamesPipe = {
      transform: jest.fn().mockReturnValue('Mon, Tue, Wed'),
    } as any;

    mockPresavedTemplateService = {
      isLoadingSignal: jest.fn(),
    } as any;

    await TestBed.configureTestingModule({
      imports: [PresavedTemplateListComponent, NoopAnimationsModule, SharedMaterialModule, TranslatePipe, DayNumbersToNamesPipe],
      providers: [
        { provide: TranslationsService, useValue: mockTranslationsService },
        { provide: DayNumbersToNamesPipe, useValue: mockDayNumbersToNamesPipe },
        { provide: PresavedTemplateService, useValue: mockPresavedTemplateService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PresavedTemplateListComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    // Set default input values
    componentRef.setInput('templates', []);
    componentRef.setInput('selectedTemplate', null);
    componentRef.setInput('hasSearched', false);

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

  it('should display correct number of templates', () => {
    componentRef.setInput('templates', mockTemplates);
    fixture.detectChanges();

    expect(component.templates()).toEqual(mockTemplates);
    expect(component.templates().length).toBe(3);
  });

  it('should show empty message when search performed but no templates found', () => {
    componentRef.setInput('templates', []);
    componentRef.setInput('hasSearched', true);
    fixture.detectChanges();

    expect(component.showEmptyMessage()).toBe(true);
    expect(component.showNoSearchMessage()).toBe(false);
  });

  it('should show no search message when no search performed yet', () => {
    componentRef.setInput('templates', []);
    componentRef.setInput('hasSearched', false);
    fixture.detectChanges();

    expect(component.showNoSearchMessage()).toBe(true);
    expect(component.showEmptyMessage()).toBe(false);
  });

  it('should not show messages when loading', () => {
    componentRef.setInput('templates', []);
    componentRef.setInput('hasSearched', true);
    componentRef.setInput('loading', true);
    fixture.detectChanges();

    expect(component.showEmptyMessage()).toBe(false);
    expect(component.showNoSearchMessage()).toBe(false);
  });

  it('should not show messages when templates are available', () => {
    componentRef.setInput('templates', mockTemplates);
    componentRef.setInput('hasSearched', true);
    fixture.detectChanges();

    expect(component.showEmptyMessage()).toBe(false);
    expect(component.showNoSearchMessage()).toBe(false);
  });

  it('should emit templateSelected when row is clicked', () => {
    const selectedTemplate = mockTemplates[0];
    let emittedTemplate: PresavedODTTemplate | undefined;

    component.templateSelected.subscribe((template: PresavedODTTemplate) => {
      emittedTemplate = template;
    });

    component.onTemplateRowClick(selectedTemplate);

    expect(emittedTemplate).toEqual(selectedTemplate);
  });

  it('should identify selected template correctly', () => {
    const selectedTemplate = mockTemplates[1];
    componentRef.setInput('selectedTemplate', selectedTemplate);
    fixture.detectChanges();

    const isSelectedPredicate = component.isTemplateSelected();

    expect(isSelectedPredicate(mockTemplates[1])).toBe(true);
    expect(isSelectedPredicate(mockTemplates[0])).toBe(false);
    expect(isSelectedPredicate(mockTemplates[2])).toBe(false);
  });

  it('should return false for isTemplateSelected when no template is selected', () => {
    componentRef.setInput('selectedTemplate', null);
    fixture.detectChanges();

    const isSelectedPredicate = component.isTemplateSelected();

    expect(isSelectedPredicate(mockTemplates[0])).toBe(false);
    expect(isSelectedPredicate(mockTemplates[1])).toBe(false);
    expect(isSelectedPredicate(mockTemplates[2])).toBe(false);
  });

  it('should have correct displayed columns', () => {
    expect(component.displayedColumns).toEqual(['name', 'description', 'beginDate', 'endDate', 'operatingDays']);
  });

  it('should handle loading state correctly', () => {
    componentRef.setInput('loading', true);
    fixture.detectChanges();

    expect(component.loading()).toBe(true);

    componentRef.setInput('loading', false);
    fixture.detectChanges();

    expect(component.loading()).toBe(false);
  });

  it('should handle hasSearched state correctly', () => {
    componentRef.setInput('hasSearched', false);
    fixture.detectChanges();

    expect(component.hasSearched()).toBe(false);

    componentRef.setInput('hasSearched', true);
    fixture.detectChanges();

    expect(component.hasSearched()).toBe(true);
  });

  it('should handle template selection changes', () => {
    const template1 = mockTemplates[0];
    const template2 = mockTemplates[1];

    // Initially no selection
    componentRef.setInput('selectedTemplate', null);
    fixture.detectChanges();
    expect(component.selectedTemplate()).toBeNull();

    // Select first template
    componentRef.setInput('selectedTemplate', template1);
    fixture.detectChanges();
    expect(component.selectedTemplate()).toEqual(template1);

    // Change to second template
    componentRef.setInput('selectedTemplate', template2);
    fixture.detectChanges();
    expect(component.selectedTemplate()).toEqual(template2);
  });

  it('should work with empty templates array', () => {
    componentRef.setInput('templates', []);
    componentRef.setInput('hasSearched', true);
    componentRef.setInput('loading', false);
    fixture.detectChanges();

    expect(component.templates()).toEqual([]);
    expect(component.templates().length).toBe(0);
    expect(component.showEmptyMessage()).toBe(true);
  });

  it('should handle multiple template selection scenarios', () => {
    const selectedTemplate = mockTemplates[0];
    componentRef.setInput('templates', mockTemplates);
    componentRef.setInput('selectedTemplate', selectedTemplate);
    fixture.detectChanges();

    const isSelectedPredicate = component.isTemplateSelected();

    // Test that only the selected template returns true
    mockTemplates.forEach((template, index) => {
      if (index === 0) {
        expect(isSelectedPredicate(template)).toBe(true);
      } else {
        expect(isSelectedPredicate(template)).toBe(false);
      }
    });
  });
});
