import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { Component } from '@angular/core';

import { MultiChipAutocompleteComponent } from './multi-chip-autocomplete.component';
import { MultiChipAutocompleteConfig } from './multi-chip-autocomplete-config.interface';
import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { TranslationsService } from '@Ordering/core/services/translations.service';

// Test data interface
interface TestOption {
  id: number;
  name: string;
  email: string;
}

// Test host component for easier testing
@Component({
  standalone: true,
  imports: [MultiChipAutocompleteComponent],
  template: `
    <app-multi-chip-autocomplete [config]="config" (selectionChange)="onSelectionChange($event)"> </app-multi-chip-autocomplete>
  `,
})
class TestHostComponent {
  config: MultiChipAutocompleteConfig<TestOption> = {
    label: 'Test Label',
    placeholder: 'Test Placeholder',
    readonly: false,
    required: false,
    maxSelections: 5,
    allowDuplicates: false,
    options: [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
      { id: 3, name: 'Bob Johnson', email: 'bob@example.com' },
    ],
    displayProperty: 'name',
    valueProperty: 'id',
    searchProperties: ['name', 'email'],
    emitObjects: true,
  };
  selectedOptions: TestOption[] = [];

  onSelectionChange(selections: TestOption[]) {
    this.selectedOptions = selections;
  }
}

describe('MultiChipAutocompleteComponent', () => {
  let component: MultiChipAutocompleteComponent<TestOption>;
  let hostComponent: TestHostComponent;
  let hostFixture: ComponentFixture<TestHostComponent>;

  const mockOptions: TestOption[] = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com' },
  ];

  beforeEach(async () => {
    const mockTranslationsService = {
      translate: jest.fn((key: string) => key), // Mock translate method that returns the key
      guiLanguage: 'en',
    };

    await TestBed.configureTestingModule({
      imports: [MultiChipAutocompleteComponent, TestHostComponent, ReactiveFormsModule, SharedMaterialModule, NoopAnimationsModule],
      providers: [{ provide: TranslationsService, useValue: mockTranslationsService }],
    }).compileComponents();

    hostFixture = TestBed.createComponent(TestHostComponent);
    hostComponent = hostFixture.componentInstance;

    // Set the options before detecting changes
    hostComponent.config.options = mockOptions;
    hostFixture.detectChanges();

    const componentDebugElement = hostFixture.debugElement.query(By.directive(MultiChipAutocompleteComponent));
    component = componentDebugElement.componentInstance;
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with host component config values', () => {
      expect(component.config().label).toBe('Test Label');
      expect(component.config().placeholder).toBe('Test Placeholder');
      expect(component.config().readonly).toBe(false);
      expect(component.config().required).toBe(false);
      expect(component.config().maxSelections).toBe(5);
      expect(component.config().allowDuplicates).toBe(false);
      expect(component.config().emitObjects).toBe(true);
    });

    it('should set up input control value changes subscription', () => {
      const spy = jest.spyOn(component['inputControl'].valueChanges, 'subscribe').mockReturnValue({} as any);

      component.ngOnInit();

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('ControlValueAccessor Implementation', () => {
    it('should write value correctly with array of objects', () => {
      const testValue = [mockOptions[0], mockOptions[1]];

      component.writeValue(testValue);

      expect(component['selectedValuesSig']()).toEqual(testValue);
    });

    it('should write value correctly with array of primitive values', () => {
      const testValue = [1, 2];

      component.writeValue(testValue);

      expect(component['selectedValuesSig']()).toEqual([mockOptions[0], mockOptions[1]]);
    });

    it('should handle null/undefined writeValue', () => {
      component.writeValue(null as any);
      expect(component['selectedValuesSig']()).toEqual([]);

      component.writeValue(undefined as any);
      expect(component['selectedValuesSig']()).toEqual([]);
    });

    it('should handle non-array writeValue', () => {
      component.writeValue('not an array' as any);
      expect(component['selectedValuesSig']()).toEqual([]);
    });

    it('should register onChange callback', () => {
      const mockOnChange = jest.fn();

      component.registerOnChange(mockOnChange);

      expect(component['onChange']).toBe(mockOnChange);
    });

    it('should register onTouched callback', () => {
      const mockOnTouched = jest.fn();

      component.registerOnTouched(mockOnTouched);

      expect(component['onTouched']).toBe(mockOnTouched);
    });

    it('should disable/enable input control', () => {
      component.setDisabledState(true);
      expect(component['inputControl'].disabled).toBe(true);

      component.setDisabledState(false);
      expect(component['inputControl'].enabled).toBe(true);
    });
  });

  describe('Selection Management', () => {
    it('should add selection correctly', () => {
      const mockEvent = {
        option: {
          value: mockOptions[0],
          deselect: jest.fn(),
        },
      } as any;

      component['selectedValuesSig'].set([]);
      (component as any).selected(mockEvent);

      expect(component['selectedValuesSig']()).toContain(mockOptions[0]);
      expect(mockEvent.option.deselect).toHaveBeenCalled();
    });

    it('should not add selection when max selections reached', () => {
      hostComponent.config = { ...hostComponent.config, maxSelections: 2 };
      hostFixture.detectChanges();
      component['selectedValuesSig'].set([mockOptions[0], mockOptions[1]]);

      const mockEvent = {
        option: {
          value: mockOptions[2],
          deselect: jest.fn(),
        },
      } as any;

      (component as any).selected(mockEvent);

      expect(component['selectedValuesSig']()).not.toContain(mockOptions[2]);
      expect(component['selectedValuesSig']().length).toBe(2);
    });

    it('should remove selection correctly', () => {
      component['selectedValuesSig'].set([mockOptions[0], mockOptions[1]]);

      (component as any).remove(mockOptions[0]);

      expect(component['selectedValuesSig']()).not.toContain(mockOptions[0]);
      expect(component['selectedValuesSig']()).toContain(mockOptions[1]);
    });

    it('should not remove when readonly', () => {
      hostComponent.config = { ...hostComponent.config, readonly: true };
      hostFixture.detectChanges();
      component['selectedValuesSig'].set([mockOptions[0], mockOptions[1]]);

      (component as any).remove(mockOptions[0]);

      expect(component['selectedValuesSig']()).toContain(mockOptions[0]);
    });

    it('should emit correct values based on emitObjects setting', () => {
      const mockOnChange = jest.fn();
      component.registerOnChange(mockOnChange);

      // Test with emitObjects = true
      hostComponent.config = { ...hostComponent.config, emitObjects: true };
      hostFixture.detectChanges();
      component['updateSelections']([mockOptions[0]]);
      expect(mockOnChange).toHaveBeenCalledWith([mockOptions[0]]);

      // Test with emitObjects = false
      hostComponent.config = { ...hostComponent.config, emitObjects: false };
      hostFixture.detectChanges();
      component['updateSelections']([mockOptions[0]]);
      expect(mockOnChange).toHaveBeenCalledWith([1]);
    });
  });

  describe('Search and Filtering', () => {
    it('should filter options based on search term', () => {
      component['searchValueSig'].set('john');

      const filtered = component['filteredOptionsSig']();

      expect(filtered.length).toBe(2); // John Doe and Bob Johnson
      expect(filtered).toContain(mockOptions[0]); // John Doe
      expect(filtered).toContain(mockOptions[2]); // Bob Johnson
    });

    it('should filter options by email', () => {
      component['searchValueSig'].set('jane@example.com');

      const filtered = component['filteredOptionsSig']();

      expect(filtered.length).toBe(1);
      expect(filtered[0]).toEqual(mockOptions[1]);
    });

    it('should handle multiple search terms', () => {
      component['searchValueSig'].set('jane smith');

      const filtered = component['filteredOptionsSig']();

      expect(filtered.length).toBe(1);
      expect(filtered[0]).toEqual(mockOptions[1]);
    });

    it('should return all options when search is empty', () => {
      component['searchValueSig'].set('');

      const filtered = component['filteredOptionsSig']();

      expect(filtered).toEqual(mockOptions);
    });

    it('should match search terms correctly', () => {
      const result1 = component['matchesSearchTerms'](mockOptions[0], ['john']);
      expect(result1).toBe(true);

      const result2 = component['matchesSearchTerms'](mockOptions[0], ['xyz']);
      expect(result2).toBe(false);

      const result3 = component['matchesSearchTerms'](mockOptions[1], ['jane', 'smith']);
      expect(result3).toBe(true);
    });
  });

  describe('Duplicate Handling', () => {
    describe('when allowDuplicates is false (default)', () => {
      beforeEach(() => {
        hostComponent.config = { ...hostComponent.config, allowDuplicates: false };
        hostFixture.detectChanges();
      });

      it('should filter out already selected options from available options', () => {
        component['selectedValuesSig'].set([mockOptions[0]]);

        const filtered = component['filteredOptionsSig']();

        expect(filtered.length).toBe(2);
        expect(filtered).not.toContain(mockOptions[0]);
        expect(filtered).toContain(mockOptions[1]);
        expect(filtered).toContain(mockOptions[2]);
      });

      it('should filter out multiple selected options', () => {
        component['selectedValuesSig'].set([mockOptions[0], mockOptions[2]]);

        const filtered = component['filteredOptionsSig']();

        expect(filtered.length).toBe(1);
        expect(filtered).toContain(mockOptions[1]);
        expect(filtered).not.toContain(mockOptions[0]);
        expect(filtered).not.toContain(mockOptions[2]);
      });

      it('should combine duplicate filtering with search filtering', () => {
        component['selectedValuesSig'].set([mockOptions[0]]); // Select John Doe
        component['searchValueSig'].set('john'); // Search for 'john'

        const filtered = component['filteredOptionsSig']();

        // Should find Bob Johnson but not John Doe (already selected)
        expect(filtered.length).toBe(1);
        expect(filtered).toContain(mockOptions[2]); // Bob Johnson
        expect(filtered).not.toContain(mockOptions[0]); // John Doe (selected)
      });

      it('should show all options when no selections made', () => {
        component['selectedValuesSig'].set([]);

        const filtered = component['filteredOptionsSig']();

        expect(filtered).toEqual(mockOptions);
      });

      it('should dynamically update filtered options when selections change', () => {
        // Initially no selections
        component['selectedValuesSig'].set([]);
        expect(component['filteredOptionsSig']().length).toBe(3);

        // Add one selection
        component['selectedValuesSig'].set([mockOptions[0]]);
        expect(component['filteredOptionsSig']().length).toBe(2);

        // Add another selection
        component['selectedValuesSig'].set([mockOptions[0], mockOptions[1]]);
        expect(component['filteredOptionsSig']().length).toBe(1);

        // Remove a selection
        component['selectedValuesSig'].set([mockOptions[0]]);
        expect(component['filteredOptionsSig']().length).toBe(2);
      });
    });

    describe('when allowDuplicates is true', () => {
      beforeEach(() => {
        hostComponent.config = { ...hostComponent.config, allowDuplicates: true };
        hostFixture.detectChanges();
      });

      it('should show all options even when some are already selected', () => {
        component['selectedValuesSig'].set([mockOptions[0], mockOptions[1]]);

        const filtered = component['filteredOptionsSig']();

        expect(filtered).toEqual(mockOptions);
        expect(filtered.length).toBe(3);
      });

      it('should allow selecting the same option multiple times', () => {
        const mockEvent = {
          option: {
            value: mockOptions[0],
            deselect: jest.fn(),
          },
        } as any;

        // First selection
        component['selectedValuesSig'].set([]);
        (component as any).selected(mockEvent);
        expect(component['selectedValuesSig']().length).toBe(1);

        // Second selection of same option
        (component as any).selected(mockEvent);
        expect(component['selectedValuesSig']().length).toBe(2);
        expect(component['selectedValuesSig']()).toEqual([mockOptions[0], mockOptions[0]]);
      });

      it('should combine duplicate allowing with search filtering', () => {
        component['selectedValuesSig'].set([mockOptions[0], mockOptions[0]]); // Select John Doe twice
        component['searchValueSig'].set('john'); // Search for 'john'

        const filtered = component['filteredOptionsSig']();

        // Should find both John Doe and Bob Johnson (duplicates allowed)
        expect(filtered.length).toBe(2);
        expect(filtered).toContain(mockOptions[0]); // John Doe
        expect(filtered).toContain(mockOptions[2]); // Bob Johnson
      });
    });

    describe('allowDuplicates config property', () => {
      it('should default to false', () => {
        expect(component.config().allowDuplicates).toBe(false);
      });

      it('should update when host component changes allowDuplicates', () => {
        hostComponent.config = { ...hostComponent.config, allowDuplicates: true };
        hostFixture.detectChanges();
        expect(component.config().allowDuplicates).toBe(true);

        hostComponent.config = { ...hostComponent.config, allowDuplicates: false };
        hostFixture.detectChanges();
        expect(component.config().allowDuplicates).toBe(false);
      });
    });
  });

  describe('Value Mapping', () => {
    it('should map object value to existing option', () => {
      const inputValue = { id: 1, name: 'John Doe', email: 'john@example.com' };

      const result = component['mapValueToOption'](inputValue);

      expect(result).toEqual(mockOptions[0]);
    });

    it('should map primitive value to option', () => {
      const result = component['mapValueToOption'](2);

      expect(result).toEqual(mockOptions[1]);
    });

    it('should return null for non-existing value', () => {
      const result = component['mapValueToOption'](999);

      expect(result).toBeNull();
    });

    it('should return null for object not in options', () => {
      const inputValue = { id: 999, name: 'Unknown', email: 'unknown@example.com' };

      const result = component['mapValueToOption'](inputValue);

      expect(result).toBeNull();
    });
  });

  describe('Display and UI', () => {
    it('should get display value correctly', () => {
      const displayValue = (component as any).getDisplayValue(mockOptions[0]);

      expect(displayValue).toBe('John Doe');
    });

    it('should handle null option in getDisplayValue', () => {
      const displayValue = (component as any).getDisplayValue(null);

      expect(displayValue).toBe('');
    });

    it('should clear input correctly', () => {
      component['inputControl'].setValue('test');
      component['searchValueSig'].set('test');

      (component as any).clearInput();

      expect(component['inputControl'].value).toBe('');
      expect(component['searchValueSig']()).toBe('');
    });

    it('should check if can add more selections', () => {
      component['selectedValuesSig'].set([mockOptions[0]]);
      expect((component as any).canAddMoreSelections()).toBe(true);

      hostComponent.config = { ...hostComponent.config, maxSelections: 1 };
      hostFixture.detectChanges();
      expect((component as any).canAddMoreSelections()).toBe(false);
    });
  });

  describe('Integration Tests with Host Component', () => {
    it('should emit selection changes', () => {
      component['updateSelections']([mockOptions[0]]);

      expect(hostComponent.selectedOptions).toEqual([mockOptions[0]]);
    });

    it('should respect maxSelections input', () => {
      hostComponent.config = { ...hostComponent.config, maxSelections: 2 };
      hostFixture.detectChanges();

      component['selectedValuesSig'].set([mockOptions[0], mockOptions[1]]);

      expect(component['canAddMoreSelections']()).toBe(false);
    });

    it('should handle readonly state', () => {
      hostComponent.config = { ...hostComponent.config, readonly: true };
      hostFixture.detectChanges();

      component['selectedValuesSig'].set([mockOptions[0]]);

      component['remove'](mockOptions[0]);

      expect(component['selectedValuesSig']()).toContain(mockOptions[0]);
    });

    it('should update options when host component options change', () => {
      const newOptions = [{ id: 4, name: 'Alice Cooper', email: 'alice@example.com' }];
      hostComponent.config = { ...hostComponent.config, options: newOptions };
      hostFixture.detectChanges();

      expect(component.config().options).toEqual(newOptions);
    });
  });

  describe('Form Integration', () => {
    it('should work with reactive forms', () => {
      const formControl = new FormControl([1, 2]);
      const onChange = jest.fn();

      component.registerOnChange(onChange);
      component.writeValue(formControl.value || []);

      expect(component['selectedValuesSig']()).toEqual([mockOptions[0], mockOptions[1]]);
    });

    it('should emit touched when selection changes', () => {
      const onTouched = jest.fn();
      component.registerOnTouched(onTouched);

      component['updateSelections']([mockOptions[0]]);

      expect(onTouched).toHaveBeenCalled();
    });

    it('should handle form control with duplicate values when allowDuplicates is true', () => {
      hostComponent.config = { ...hostComponent.config, allowDuplicates: true };
      hostFixture.detectChanges();

      const formControl = new FormControl([1, 1, 2]); // Duplicate IDs
      component.writeValue(formControl.value || []);

      expect(component['selectedValuesSig']().length).toBe(3);
      expect(component['selectedValuesSig']().filter((opt: TestOption) => opt.id === 1).length).toBe(2);
    });

    it('should handle form control with duplicate values when allowDuplicates is false', () => {
      hostComponent.config = { ...hostComponent.config, allowDuplicates: false };
      hostFixture.detectChanges();

      const formControl = new FormControl([1, 1, 2]); // Duplicate IDs
      component.writeValue(formControl.value || []);

      // writeValue should still set all values (including duplicates)
      // The duplicate filtering only applies to the dropdown options
      expect(component['selectedValuesSig']().length).toBe(3);
      expect(component['selectedValuesSig']().filter((opt: TestOption) => opt.id === 1).length).toBe(2);

      // But the filtered options should exclude selected values
      const filtered = component['filteredOptionsSig']();
      expect(filtered).not.toContain(mockOptions[0]); // ID 1
      expect(filtered).not.toContain(mockOptions[1]); // ID 2
      expect(filtered).toContain(mockOptions[2]); // ID 3
    });
  });

  describe('Cleanup', () => {
    it('should clean up subscriptions on destroy', () => {
      const nextSpy = jest.spyOn(component['destroy$'], 'next');
      const completeSpy = jest.spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty options array', () => {
      hostComponent.config = { ...hostComponent.config, options: [] };
      hostFixture.detectChanges();

      const result = component['mapValueToOption'](1);
      expect(result).toBeNull();
    });

    it('should handle empty search properties', () => {
      hostComponent.config = { ...hostComponent.config, searchProperties: [] };
      hostFixture.detectChanges();

      component['searchValueSig'].set('john');
      const filtered = component['filteredOptionsSig']();

      // When searchProperties is empty, the filtering logic should return no results
      // because it tries to search in empty properties array
      expect(filtered).toEqual([]);
    });

    it('should handle options with missing properties', () => {
      const optionsWithMissing: any[] = [
        { id: 1, name: 'John' }, // missing email
        { id: 2, email: 'jane@test.com' }, // missing name
      ];
      hostComponent.config = { ...hostComponent.config, options: optionsWithMissing };
      hostFixture.detectChanges();

      component['searchValueSig'].set('john');
      const filtered = component['filteredOptionsSig']();

      expect(filtered.length).toBe(1);
      expect(filtered[0]).toEqual(optionsWithMissing[0]);
    });

    it('should handle duplicate selections when allowDuplicates is true', () => {
      hostComponent.config = { ...hostComponent.config, allowDuplicates: true };
      hostFixture.detectChanges();

      component['selectedValuesSig'].set([mockOptions[0]]);

      const mockEvent = {
        option: {
          value: mockOptions[0], // Same option again
          deselect: jest.fn(),
        },
      } as any;

      (component as any).selected(mockEvent);

      // Should now have 2 instances of the same option
      expect(component['selectedValuesSig']().length).toBe(2);
      expect(component['selectedValuesSig']().filter((opt: TestOption) => opt.id === 1).length).toBe(2);
    });

    it('should prevent duplicate selections when allowDuplicates is false', () => {
      hostComponent.config = { ...hostComponent.config, allowDuplicates: false };
      hostFixture.detectChanges();

      component['selectedValuesSig'].set([mockOptions[0]]);

      // The filtered options should not contain the already selected option
      const filtered = component['filteredOptionsSig']();
      expect(filtered).not.toContain(mockOptions[0]);
      expect(filtered.length).toBe(2);
    });

    it('should only remove first matching instance when removing duplicates', () => {
      component['selectedValuesSig'].set([mockOptions[0], mockOptions[0], mockOptions[1]]);

      (component as any).remove(mockOptions[0]);

      expect(component['selectedValuesSig']().length).toBe(2);
      expect(component['selectedValuesSig']().filter((opt: TestOption) => opt.id === 1).length).toBe(1);
      expect(component['selectedValuesSig']()).toContain(mockOptions[1]);
    });
  });
});
