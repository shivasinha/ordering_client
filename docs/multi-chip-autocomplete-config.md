# Multi-Chip Autocomplete Config Interface Implementation

## Overview

The `MultiChipAutocompleteComponent` has been enhanced to support a configuration object approach using the `MultiChipAutocompleteConfig<T>` interface. This provides a cleaner, more maintainable way to configure the component's properties.

## Interface Definition

```typescript
export interface MultiChipAutocompleteConfig<T> {
  label: string;
  placeholder: string;
  readonly?: boolean;
  required?: boolean;
  maxSelections?: number;
  allowDuplicates?: boolean;
  options: T[];
  displayProperty: keyof T;
  valueProperty: keyof T;
  searchProperties: (keyof T)[];
  emitObjects?: boolean;
}
```

## Usage

The component now exclusively uses the config object approach for a cleaner, more maintainable API:

```html
<!-- Using config object -->
<app-multi-chip-autocomplete
  [config]="tractionUnitConfig()"
  formControlName="tractionUnit">
</app-multi-chip-autocomplete>
```

```typescript
// In your component
protected tractionUnitConfig: Signal<MultiChipAutocompleteConfig<TractionUnit>> = computed(() => ({
  label: this.tr.translate('lblTractionUnits'),
  placeholder: this.tr.translate('lblSelectTractionUnits'),
  options: this.tractionUnitList(),
  displayProperty: 'id' as keyof TractionUnit,
  valueProperty: 'id' as keyof TractionUnit,
  searchProperties: ['id' as keyof TractionUnit],
  readonly: !this.isEditMode,
  required: false,
  allowDuplicates: true,
  emitObjects: true
}));
```

## Benefits of the Config Object Approach

1. **Cleaner Templates**: Reduces HTML complexity by consolidating all configuration into a single object
2. **Better Maintainability**: Configuration logic is centralized in the component class
3. **Type Safety**: Full TypeScript support with proper type checking
4. **Reusability**: Config objects can be easily shared or extended
5. **Reactive**: Works seamlessly with Angular signals and computed properties
6. **Simplified API**: Single input parameter instead of multiple individual properties
7. **Required Configuration**: The config is now required, ensuring all necessary properties are provided

## Implementation Details

The component now uses computed properties that extract values directly from the required config object:

```typescript
protected labelValue = computed(() => this.config().label);
protected optionsValue = computed(() => this.config().options);
protected readonlyValue = computed(() => this.config().readonly ?? false);
// ... other computed properties
```

This approach provides a clean, type-safe API with a single configuration point.

## Configuration Properties

All configuration is now consolidated into the `MultiChipAutocompleteConfig<T>` interface:

- **Required Properties**: `label`, `placeholder`, `options`, `displayProperty`, `valueProperty`, `searchProperties`
- **Optional Properties**: `readonly`, `required`, `maxSelections`, `allowDuplicates`, `emitObjects`

Default values are provided for optional properties:
- `readonly`: `false`
- `required`: `false`
- `maxSelections`: `10`
- `allowDuplicates`: `true`
- `emitObjects`: `true`
