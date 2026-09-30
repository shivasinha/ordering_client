import { InputSignal, Signal } from '@angular/core';
import { SlotDisplayMode } from './component-slot.interface';

/**
 * Contract for components rendered inside strategy-driven slots.
 * Each contributor exposes its data, validity, and dirty state as signals
 * so the FormAggregatorService can track them reactively.
 */
export interface ItemDataContributor<T = unknown> {
  readonly contributorKey: string;
  readonly data: Signal<T>;
  readonly isValid: Signal<boolean>;
  readonly isDirty: Signal<boolean>;
  displayMode: InputSignal<SlotDisplayMode>;
  markAsPristine(): void;
}
