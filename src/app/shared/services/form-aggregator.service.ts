import { computed, Injectable, Signal, signal, WritableSignal } from '@angular/core';
import { ItemDataContributor } from '../models/item-data-contributor.interface';

/**
 * Aggregates data, validity, and dirty state from all registered ItemDataContributors.
 * Provided at component level (OrderItemHostComponent providers). NOT root.
 */
@Injectable()
export class FormAggregatorService {
  private contributors: WritableSignal<Map<string, ItemDataContributor>> = signal(new Map());

  /**
   * Explicit notification counter. Bumped whenever any contributor reports
   * a state change (dirty/valid). Consumers (like canSave) read this to
   * guarantee re-evaluation even when nested signal tracking across
   * dynamically-created component boundaries is unreliable.
   */
  private _stateVersion = signal(0);
  readonly stateVersion = this._stateVersion.asReadonly();

  /**
   * Signals a state change in any contributor, forcing computed re-evaluation.
   */
  public notifyStateChange(): void {
    this._stateVersion.update(v => v + 1);
  }

  /**
   * Raw aggregated data (synchronous). Used internally and at save-time.
   */
  private rawAggregatedData = computed(() => {
    const result: Record<string, unknown> = {};
    for (const [key, contributor] of this.contributors()) {
      result[key] = contributor.data();
    }
    return result;
  });

  /**
   * Synchronous validity check — AND-ing all contributors' isValid signals.
   */
  public readonly isAllValid: Signal<boolean> = computed(() => {
    this._stateVersion(); // force re-evaluation on any contributor state change
    let allValid = true;
    for (const [, contributor] of this.contributors()) {
      if (!contributor.isValid()) {
        allValid = false;
      }
    }
    return allValid;
  });

  /**
   * Synchronous dirty check — OR-ing all contributors' isDirty signals.
   */
  public readonly isAnyDirty: Signal<boolean> = computed(() => {
    this._stateVersion(); // force re-evaluation on any contributor state change
    let anyDirty = false;
    for (const [, contributor] of this.contributors()) {
      if (contributor.isDirty()) {
        anyDirty = true;
      }
    }
    return anyDirty;
  });

  /**
   * Registers a contributor with the aggregator.
   * @param {ItemDataContributor} contributor - The contributor to register.
   */
  public register(contributor: ItemDataContributor): void {
    this.contributors.update(map => {
      const next = new Map(map);
      next.set(contributor.contributorKey, contributor);
      return next;
    });
  }

  /**
   * Unregisters a contributor by key.
   * @param {string} key - The contributor key to remove.
   */
  public unregister(key: string): void {
    this.contributors.update(map => {
      const next = new Map(map);
      next.delete(key);
      return next;
    });
  }

  /**
   * Resets dirty state on all registered contributors.
   * Called by host after successful save before navigation.
   */
  public resetAll(): void {
    for (const [, contributor] of this.contributors()) {
      contributor.markAsPristine();
    }
  }

  /**
   * Returns the latest aggregated data synchronously (bypasses debounce).
   * Use at save-time to guarantee the most recent values.
   * @returns {Record<string, unknown>} All contributor data keyed by contributorKey.
   */
  public getAggregatedDataSync(): Record<string, unknown> {
    return this.rawAggregatedData();
  }
}
