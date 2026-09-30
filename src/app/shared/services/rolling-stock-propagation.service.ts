import { Injectable } from '@angular/core';

import { ModelTrainValues, TrainStop } from '@Ordering/api';

import { StationsTableHeader } from '@Ordering/portalComponents/stations/interfaces/stations-header.interface';

import { cloneDeep } from '@Ordering/utils/clone-deep';
import { removeEmptyFields } from '@Ordering/utils/sort-filter';

/**
 * Propagatable Model Train characteristics of a `TrainStop`. These share their
 * name with a property of `ModelTrainValues` and participate in user-influenced
 * detection and the explicit reset action
 * (SolCon TPRPLAN-13552 propagation conditions 5 and 6).
 *
 * Whenever `modelTrainValues` is attached to a stop, a key that is missing from
 * the baseline is treated as an intentionally empty Model Train value: any
 * defined stop value for it counts as user input, and the explicit reset clears
 * the stop value.
 */
export type ModelTrainInfluencedKey = 'trainLength' | 'trainWeight' | 'axleLoad' | 'maximumVelocity' | 'brakingPercentage';

@Injectable({
  providedIn: 'root',
})
export class RollingStockPropagationService {
  public static readonly MODEL_TRAIN_KEYS: readonly ModelTrainInfluencedKey[] = [
    'trainLength',
    'trainWeight',
    'axleLoad',
    'maximumVelocity',
    'brakingPercentage',
  ] as const;

  private readonly PROPAGATABLE_PROPERTIES = [
    {
      selector: (s: StationsTableHeader) => s.trainStop.tractionUnit,
      setter: (s: StationsTableHeader, v: any) => (s.trainStop.tractionUnit = v),
      propertyName: 'tractionUnit',
      requiresRollingStockMatch: false,
    },
    {
      selector: (s: StationsTableHeader) => s.trainStop.trainType,
      setter: (s: StationsTableHeader, v: any) => (s.trainStop.trainType = v),
      propertyName: 'trainType',
      requiresRollingStockMatch: false,
    },
    {
      selector: (s: StationsTableHeader) => s.trainStop.trainLength,
      setter: (s: StationsTableHeader, v: any) => (s.trainStop.trainLength = v),
      propertyName: 'trainLength',
      requiresRollingStockMatch: true,
    },
    {
      selector: (s: StationsTableHeader) => s.trainStop.trainWeight,
      setter: (s: StationsTableHeader, v: any) => (s.trainStop.trainWeight = v),
      propertyName: 'trainWeight',
      requiresRollingStockMatch: true,
    },
    {
      selector: (s: StationsTableHeader) => s.trainStop.axleLoad,
      setter: (s: StationsTableHeader, v: any) => (s.trainStop.axleLoad = v),
      propertyName: 'axleLoad',
      requiresRollingStockMatch: true,
    },
    {
      selector: (s: StationsTableHeader) => s.trainStop.maximumVelocity,
      setter: (s: StationsTableHeader, v: any) => (s.trainStop.maximumVelocity = v),
      propertyName: 'maxVelocity',
      requiresRollingStockMatch: true,
    },
    {
      selector: (s: StationsTableHeader) => s.trainStop.brakingPercentage,
      setter: (s: StationsTableHeader, v: any) => (s.trainStop.brakingPercentage = v),
      propertyName: 'brakingPercentage',
      requiresRollingStockMatch: true,
    },
  ] as const;

  /**
   * Creates a new `TrainStop` object by extracting relevant properties from a `StationsTableHeader` object.
   *
   * This method acts as a mapper, taking specific fields from the provided `StationsTableHeader`
   * (specifically from its nested `trainStop` property) and constructing a new `TrainStop` object.
   * It also includes a step to remove any fields that might be empty from the resulting `TrainStop` object,
   * ensuring a clean data structure.
   *
   * @param {StationsTableHeader} result - The source object containing the `trainStop` properties to be extracted.
   *                                     It should conform to the `StationsTableHeader` interface.
   * @returns {TrainStop} A new `TrainStop` object populated with data from the input,
   *                      with any empty fields removed.
   */
  public createTrainStop(result: StationsTableHeader): TrainStop {
    const rawTrainStop = {
      areaCode: result.trainStop.areaCode,
      station: result.trainStop.station,
      arrivalTime: result.trainStop.arrivalTime,
      departureTime: result.trainStop.departureTime,
      stopType: result.trainStop.stopType,
      stationTrack: result.trainStop.stationTrack,
      trainType: result.trainStop.trainType,
      tractionUnit: result.trainStop.tractionUnit,
      trainLength: result.trainStop.trainLength,
      trainWeight: result.trainStop.trainWeight,
      axleLoad: result.trainStop.axleLoad,
      maximumVelocity: result.trainStop.maximumVelocity,
      brakingPercentage: result.trainStop.brakingPercentage,
      modelTrainValues: result.trainStop.modelTrainValues,
    };
    return removeEmptyFields(rawTrainStop) as TrainStop;
  }

  /**
   * Determines whether the effective value of a propagatable characteristic on a `TrainStop`
   * has been influenced by user input, i.e. it differs from the Model Train baseline stored
   * in `modelTrainValues`.
   *
   * Used by the UI to visually highlight user-influenced values (SolCon TPRPLAN-13552,
   * propagation condition 6). If the baseline exists but has no value for the requested key
   * (e.g. axle load, which the Model Train never provides, or any other key that the Model
   * Train could not derive) then any defined stop value is treated as user input.
   *
   * When the stop's rolling stock (`trainType` + `tractionUnit`) no longer matches the
   * baseline's rolling stock, the baseline no longer describes the current Model Train and
   * the highlight is suppressed (SolCon TPRPLAN-13552, propagation condition 4).
   *
   * @param {TrainStop | undefined} stop - The stop whose characteristic should be checked.
   * @param {ModelTrainInfluencedKey} key - The characteristic to evaluate.
   * @returns {boolean} `true` if the stop's value differs from the Model Train baseline.
   */
  public isUserInfluenced(stop: TrainStop | undefined, key: ModelTrainInfluencedKey): boolean {
    if (!stop || !stop.modelTrainValues) {
      return false;
    }
    const baseline = stop.modelTrainValues;
    if (!this.hasSameRollingStockAsBaseline(stop, baseline)) {
      return false;
    }
    const baselineValue = baseline[key];
    if (baselineValue === undefined || baselineValue === null) {
      const stopValue = stop[key];
      return stopValue !== undefined && stopValue !== null;
    }
    return !this.isSamePropertyValue(stop[key], baselineValue);
  }

  /**
   * Deep-compares the rolling stock (`trainType` + `tractionUnit`) of a stop against the
   * baseline stored in its `modelTrainValues`.
   *
   * @param {TrainStop} stop - Current stop.
   * @param {ModelTrainValues} baseline - Model Train baseline attached to the stop.
   * @returns {boolean} `true` when both rolling-stock fields agree with the baseline.
   */
  private hasSameRollingStockAsBaseline(stop: TrainStop, baseline: ModelTrainValues): boolean {
    return (
      this.isSamePropertyValue(stop.trainType, baseline.trainType) && this.isSamePropertyValue(stop.tractionUnit, baseline.tractionUnit)
    );
  }

  /**
   * Reports whether the Model Train baseline stored on the stop still describes the stop's
   * current rolling stock. Callers use this to hide the "Reset to Model Train" action and
   * to suppress the user-influenced highlight after the user has picked a different Model
   * Train identity (SolCon TPRPLAN-13552, propagation conditions 4 to 6).
   *
   * @param {TrainStop | undefined} stop - The stop to evaluate.
   * @returns {boolean} `true` when the stop carries a baseline and the current rolling stock
   *                    still matches it.
   */
  public isBaselineAlignedWithRollingStock(stop: TrainStop | undefined): boolean {
    if (!stop || !stop.modelTrainValues) {
      return false;
    }
    return this.hasSameRollingStockAsBaseline(stop, stop.modelTrainValues);
  }

  /**
   * Produces a new `TrainStop` in which every propagatable characteristic has been reset to
   * the Model Train baseline stored in the stop's `modelTrainValues`.
   *
   * Implements the explicit user-triggered reset described by SolCon TPRPLAN-13552,
   * propagation condition 5. All Model Train characteristics are reset simultaneously;
   * individual characteristics cannot be reset independently. If no baseline is available,
   * the stop is returned unchanged.
   *
   * If the baseline exists but has no value for a specific key, the stop's value for that
   * key is cleared: the Model Train contributes nothing to restore for it.
   *
   * @param {TrainStop} stop - The stop whose characteristics should be reset.
   * @returns {TrainStop} A new stop instance with the baseline values applied.
   */
  public resetToModelTrainValues(stop: TrainStop): TrainStop {
    const baseline = stop.modelTrainValues;
    if (!baseline) {
      return stop;
    }
    const reset: TrainStop = { ...stop };
    for (const key of RollingStockPropagationService.MODEL_TRAIN_KEYS) {
      const baselineValue = baseline[key];
      if (baselineValue !== undefined && baselineValue !== null) {
        Object.assign(reset, { [key]: baselineValue });
      } else {
        Object.assign(reset, { [key]: undefined });
      }
    }
    return reset;
  }

  /**
   * Propagates specific updated properties from a single station across a list of original stations.
   *
   * This method takes an array of `originalStations` and an `updatedStation` object.
   * It iterates through a predefined list of `PROPAGATABLE_PROPERTIES` and applies
   * the changes from the `updatedStation` to the corresponding properties in the
   * `originalStations` array. It ensures that the specific `updatedStation`'s
   * `trainStop` object is also fully updated within the resulting array.
   * The method uses `cloneDeep` to avoid mutating the original array directly.
   *
   * @param {StationsTableHeader[]} originalStations - The array of stations representing the initial state,
   *                                                 which will be used as a base for propagation.
   * @param {StationsTableHeader} updatedStation - The station object containing the new values
   *                                             for properties that need to be propagated.
   * @returns {StationsTableHeader[]} A new array of `StationsTableHeader` objects with the
   *                                  propagated property updates and the specific `updatedStation`'s
   *                                  `trainStop` fully refreshed.
   */
  public propagateUpdatedStationProperties(
    originalStations: StationsTableHeader[],
    updatedStation: StationsTableHeader,
  ): StationsTableHeader[] {
    const toUpdateStations = cloneDeep(originalStations);
    // Stale-inheritance cleanup only fires when the user actually altered the rolling
    // stock at this stop; unrelated edits (e.g. axle load, arrival time) must not
    // clear Model Train values on other stops just because they happen to match.
    const originalStation = originalStations.find(station => station.id === updatedStation.id);
    const rollingStockChanged = !!originalStation && !this.hasSameRollingStock(updatedStation.trainStop, originalStation.trainStop);

    this.PROPAGATABLE_PROPERTIES.forEach(prop => {
      this.propagateUpdatedProperty(
        updatedStation,
        toUpdateStations,
        prop.selector,
        prop.setter,
        prop.requiresRollingStockMatch,
        rollingStockChanged,
      );
    });
    const toUpdateStation = toUpdateStations.find(station => station.id === updatedStation.id);
    if (toUpdateStation) {
      toUpdateStation.trainStop = this.createTrainStop(updatedStation);
    }
    return toUpdateStations;
  }

  /**
   * Triggers the property inheritance mechanism across a given set of stations for all propagatable properties.
   *
   * This method takes an array of `originalStations`, creates a deep clone to avoid
   * direct mutation, and then iterates through each defined `PROPAGATABLE_PROPERTIES`.
   * For each property, it calls `applyPropertyInheritance` to ensure that properties
   * are correctly inherited down the sequence of stations where explicit values are not set.
   *
   * @param {StationsTableHeader[]} originalStations - The initial array of stations to which
   *                                                 property inheritance logic will be applied.
   * @returns {StationsTableHeader[]} A new array of `StationsTableHeader` objects with
   *                                  all propagatable properties having their inheritance applied.
   */
  public triggerPropertyInheritance(originalStations: StationsTableHeader[]): StationsTableHeader[] {
    const toUpdateStations = cloneDeep(originalStations);
    this.PROPAGATABLE_PROPERTIES.forEach(prop => {
      this.applyPropertyInheritance(toUpdateStations, prop.selector, prop.setter, prop.requiresRollingStockMatch);
    });
    return toUpdateStations;
  }

  /**
   * Propagates a specific updated property from a single station across subsequent stations,
   * or re-applies general inheritance if no new value is to be propagated.
   *
   * This generic method determines whether a change in a specific property of an `updatedStation`
   * needs to be propagated forward. It compares the new property value with the original value
   * at the `updatedStation`'s position.
   * - If a significant change is detected (new value exists and is different from original),
   *   it calls `propagatePropertyChange` to update subsequent stations.
   * - Otherwise, it calls `applyPropertyInheritance` to ensure the correct inheritance
   *   logic is applied for that property across all stations.
   *
   * @template T The type of the property being propagated.
   * @param {StationsTableHeader} updatedStation - The station object containing the potentially
   *                                             changed property value.
   * @param {StationsTableHeader[]} originalStations - The array of stations where the propagation
   *                                                 or inheritance will occur.
   * @param {(station: StationsTableHeader) => T | undefined} propertySelector - A function that
   *                                                                            selects the property
   *                                                                            value from a station object.
   * @param {(station: StationsTableHeader, value: T | undefined) => void} propertySetter - A function that
   *                                                                                        sets the property value on a station object.
   * @returns {void}
   */
  private propagateUpdatedProperty<T>(
    updatedStation: StationsTableHeader,
    originalStations: StationsTableHeader[],
    propertySelector: (station: StationsTableHeader) => T | undefined,
    propertySetter: (station: StationsTableHeader, value: T | undefined) => void,
    requiresRollingStockMatch: boolean,
    rollingStockChanged: boolean = false,
  ): void {
    const originalStation = originalStations.find(station => station.id === updatedStation.id);
    const originalValue = originalStation ? propertySelector(originalStation) : undefined;
    const isRemovedValue = false;
    const updatedTrainStop = this.createTrainStop(updatedStation);
    let newValue = propertySelector({
      ...updatedStation,
      trainStop: updatedTrainStop,
    });

    const previousStation = originalStations.find(station => station.id === updatedStation.id - 1);
    const rollingStockMatchesPrevious = (): boolean =>
      !previousStation || this.hasSameRollingStock(updatedTrainStop, previousStation.trainStop);

    // Add value from previous station (if any) if user removes value.
    // Model Train characteristics only inherit while the rolling stock chain is intact.
    if (!newValue && previousStation && (!requiresRollingStockMatch || rollingStockMatchesPrevious())) {
      newValue = propertySelector({
        ...previousStation,
        trainStop: this.createTrainStop(previousStation),
      });
      propertySetter(updatedStation, newValue);
    }

    // A Model Train value that still equals the previous stop's value after the rolling
    // stock was changed is stale inheritance and must be dropped. Gated on an actual
    // rolling-stock change so unrelated edits do not clear coincidentally matching values.
    let staleClearFired = false;
    if (
      requiresRollingStockMatch &&
      rollingStockChanged &&
      previousStation &&
      !rollingStockMatchesPrevious() &&
      newValue !== undefined &&
      newValue !== null &&
      this.isSamePropertyValue(newValue, propertySelector(previousStation))
    ) {
      propertySetter(updatedStation, undefined);
      if (originalStation) {
        propertySetter(originalStation, undefined);
      }
      newValue = undefined;
      staleClearFired = true;
    }

    // Propagate forward when the user set a new value, or (Reset to Model Train for a
    // key the baseline doesn't provide, such as `axleLoad`) explicitly cleared one.
    const hasNewValue = !!newValue && !this.isSamePropertyValue(newValue, originalValue);
    const isExplicitClear =
      !staleClearFired && originalValue !== undefined && originalValue !== null && (newValue === undefined || newValue === null);

    if (hasNewValue || isExplicitClear) {
      this.propagatePropertyChange(
        hasNewValue ? newValue : undefined,
        isRemovedValue,
        updatedStation.id,
        originalStations,
        propertySelector,
        propertySetter,
        requiresRollingStockMatch,
        updatedTrainStop,
      );
    } else {
      this.applyPropertyInheritance(originalStations, propertySelector, propertySetter, requiresRollingStockMatch, rollingStockChanged);
    }
  }

  /**
   * Propagates a specific property value forward from a changed station to subsequent stations.
   *
   * This generic method iterates through stations starting from the one immediately after
   * `changedStationId`. It updates the property of subsequent stations with `newValue`
   * if their original property value was either inherited (undefined/null) or identical
   * to the *original* value of the `changedStation`. Propagation stops when a station
   * with a different, explicitly set property value is encountered.
   *
   * @template T The type of the property being propagated.
   * @param {T | undefined} newValue - The new value to be propagated to subsequent stations.
   * @param {boolean} isRemovedValue - The value was removed from user and a replacement value was given instead.
   * @param {number} changedStationId - The ID of the station where the property change originated.
   * @param {StationsTableHeader[]} originalStations - The array of stations to modify during propagation.
   * @param {(station: StationsTableHeader) => T | undefined} propertySelector - A function that
   *                                                                            selects the property
   *                                                                            value from a station object.
   * @param {(station: StationsTableHeader, value: T | undefined) => void} propertySetter - A function that
   *                                                                                        sets the property
   *                                                                                        value on a station object.
   * @returns {void}
   */
  private propagatePropertyChange<T>(
    newValue: T | undefined,
    isRemovedValue: boolean,
    changedStationId: number,
    originalStations: StationsTableHeader[],
    propertySelector: (station: StationsTableHeader) => T | undefined,
    propertySetter: (station: StationsTableHeader, value: T | undefined) => void,
    requiresRollingStockMatch: boolean = false,
    sourceTrainStop?: TrainStop,
  ): void {
    const changedStationIndex = originalStations.findIndex(station => station.id === changedStationId);

    if (changedStationIndex === -1) {
      return;
    }

    // Get the original property value of the changed station
    const originalStation = originalStations.find(station => station.id === changedStationId);
    const originalPropertyValue = originalStation ? propertySelector(originalStation) : undefined;
    const referenceStock = sourceTrainStop ?? originalStation?.trainStop;

    // Propagate forward from the next station after the changed one
    for (let i = changedStationIndex + 1; i < originalStations.length; i++) {
      const currentStation = originalStations[i];
      const originalCurrentStation = originalStations[i];
      const originalCurrentPropertyValue = originalCurrentStation ? propertySelector(originalCurrentStation) : undefined;

      // 1) Value was actually removed and it's new value is borrowed from a previous station.
      // Either the value differs from the current value, in which case nothing must be changed.
      // Or the value is the same, in which case nothing needs to be changed.
      // 2) Value was simply changed.
      // If the original station had the same property value as the changed station,
      // or had no property value (was inheriting), then update it
      const sameAsBeforeOrEmpty = !originalCurrentPropertyValue || originalCurrentPropertyValue === originalPropertyValue;
      // Model Train values only flow forward while the rolling stock chain remains intact.
      const rollingStockOk =
        !requiresRollingStockMatch || !referenceStock || this.hasSameRollingStock(currentStation.trainStop, referenceStock);
      if (!isRemovedValue && sameAsBeforeOrEmpty && rollingStockOk) {
        propertySetter(currentStation, newValue);
      } else {
        // Stop propagation when we hit a station with a different explicit property value
        // or when the rolling stock chain breaks.
        break;
      }
    }
  }

  /**
   * Applies property inheritance logic to a specific property across a list of stations.
   *
   * This generic method iterates through the `originalStations` and applies a "waterfall"
   * inheritance pattern for a given property. If a station has an explicit value for the
   * property, that value becomes the `lastKnownValue`. If a subsequent station does not
   * have an explicit value, it inherits the `lastKnownValue` from the preceding stations.
   * This ensures that properties default to the last explicitly defined value in the sequence.
   *
   * @template T The type of the property for which inheritance is being applied.
   * @param {StationsTableHeader[]} originalStations - The array of stations to apply inheritance to.
   * @param {(station: StationsTableHeader) => T | undefined} propertySelector - A function that
   *                                                                            selects the property
   *                                                                            value from a station object.
   * @param {(station: StationsTableHeader, value: T | undefined) => void} propertySetter - A function that
   *                                                                                        sets the property
   *                                                                                        value on a station object.
   * @returns {void}
   */
  private applyPropertyInheritance<T>(
    originalStations: StationsTableHeader[],
    propertySelector: (station: StationsTableHeader) => T | undefined,
    propertySetter: (station: StationsTableHeader, value: T | undefined) => void,
    requiresRollingStockMatch: boolean = false,
    dropStaleInheritance: boolean = false,
  ): void {
    // Snapshot the current value of each stop so that clears made earlier in the pass
    // can still be detected as "was previously inherited" by later stops in the chain.
    const originalValues = originalStations.map(station => propertySelector(station));

    let lastKnownValue: T | undefined = undefined;
    let lastKnownSource: StationsTableHeader | undefined = undefined;

    originalStations.forEach((currentStation, index) => {
      const originalCurrentValue = originalValues[index];
      const chainBreaks =
        requiresRollingStockMatch && !!lastKnownSource && !this.hasSameRollingStock(currentStation.trainStop, lastKnownSource.trainStop);

      if (chainBreaks) {
        // Stale inheritance: only drop the stored value when the caller has confirmed
        // a rolling-stock change occurred in this operation. Otherwise a coincidental
        // value match would incorrectly clear a user-entered value.
        if (
          dropStaleInheritance &&
          originalCurrentValue !== undefined &&
          originalCurrentValue !== null &&
          this.isSamePropertyValue(originalCurrentValue, lastKnownValue)
        ) {
          propertySetter(currentStation, undefined);
        }
        // Reset the chain so downstream stops can only inherit from this stop's chain,
        // never jump back across the break — even when the break stop carries no value.
        lastKnownValue = undefined;
        lastKnownSource = undefined;
      }

      const currentValue = propertySelector(currentStation);
      if (currentValue) {
        lastKnownValue = currentValue;
        lastKnownSource = currentStation;
      } else if (lastKnownValue !== undefined && index > 0) {
        propertySetter(currentStation, lastKnownValue);
      }
    });
  }

  /**
   * Compares two property values for equality. Objects are compared deeply via a
   * canonical JSON serialisation so that arrays of objects (traction units, in
   * particular) are distinguished by content, not by shape.
   *
   * @param {any} a - The first value to compare.
   * @param {any} b - The second value to compare.
   * @returns {boolean} `true` if the properties are considered the same, `false` otherwise.
   */
  private isSamePropertyValue(a: any, b: any): boolean {
    const canonicalize = (v: any): any => (v !== null && typeof v === 'object' ? JSON.stringify(v) : v);
    return canonicalize(a) === canonicalize(b);
  }

  /**
   * Reports whether two `TrainStop` objects share the same rolling stock, i.e. the
   * combination of `tractionUnit` and `trainType` that determines whether Model Train
   * characteristics may be inherited across adjacent stops.
   *
   * @param {TrainStop} a - First stop to compare.
   * @param {TrainStop} b - Second stop to compare.
   * @returns {boolean} `true` if both stops declare the same `tractionUnit` and `trainType`.
   */
  private hasSameRollingStock(a: TrainStop, b: TrainStop): boolean {
    return this.isSamePropertyValue(a.tractionUnit, b.tractionUnit) && this.isSamePropertyValue(a.trainType, b.trainType);
  }
}
