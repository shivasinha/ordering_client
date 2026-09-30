import { TypeGuard, isRecord } from './common';

/**
 * Creates a type guard for a record based on the given type guards for each field.
 * @param {{[K in keyof T]: TypeGuard<T[K]>}} guards
 * @returns {TypeGuard<T>}
 */
export function createRecordGuard<T extends Record<keyof any, any>>(guards: {
  [K in keyof T]: TypeGuard<T[K]>;
}): TypeGuard<T> {
  return (value: any): value is T => {
    if (!isRecord(value)) {
      return false;
    }
    return Object.entries(guards).every(([key, guard]) => guard(value[key]));
  };
}

/**
 * Creates a type guard for an array based on the given item type guard.
 * @param {TypeGuard<T>} itemGuard
 * @returns {TypeGuard<Array<T>>}
 */
export function createArrayGuard<T>(itemGuard: TypeGuard<T>): TypeGuard<Array<T>> {
  return (value: any): value is Array<T> => {
    return Array.isArray(value) && value.every(item => itemGuard(item));
  };
}

/**
 * Creates a type guard that checks if a given value is either **strictly** `undefined` or the type checked by the given type guard.
 * **Strictly** means that the value is not checked for `null` beforehand.
 * @param {TypeGuard<Exclude<T, undefined>>} ifNotUndefinedGuard
 * @returns {TypeGuard<T | undefined>}
 */
export function isUndefinedOr<T>(ifNotUndefinedGuard: TypeGuard<Exclude<T, undefined>>): TypeGuard<T | undefined> {
  return (value: any): value is T | undefined => {
    return value === undefined || ifNotUndefinedGuard(value);
  };
}

/**
 * Creates a type guard that checks if a given value is either **strictly** `null` or the type checked by the given type guard.
 * **Strictly** means that the value is not checked for `undefined` beforehand.
 * @param {TypeGuard<Exclude<T, null>>} ifNotNullGuard
 * @returns {TypeGuard<T | null>}
 */
export function isNullOr<T>(ifNotNullGuard: TypeGuard<Exclude<T, null>>): TypeGuard<T | null> {
  return (value: any): value is T | null => {
    return value === null || ifNotNullGuard(value);
  };
}
