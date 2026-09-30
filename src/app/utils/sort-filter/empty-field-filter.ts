// empty-field-filter.ts
import { isRecord } from '../type-guards/common';

/**
 * Checks to see whether a property is empty.
 * @param value - the property to check.
 * @returns true if its empty, false otherwise.
 */
function isEmpty(value: any): boolean {
  return value == null || value === '';
}

/**
 * Checks to see whether an object is empty.
 * @param value - the object to check.
 * @returns true if its empty, false otherwise.
 */
function isEmptyObject(value: any): boolean {
  return isRecord(value) && !Object.values(value).some(v => v != null && v !== '');
}

/**
 * Removes empty fields from an object.
 * @param obj - The object to filter.
 * @returns A new object with empty fields removed.
 */
export function removeEmptyFields<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => {
      if (isEmpty(value)) return false;
      if (isEmptyObject(value)) return false;
      return true;
    }),
  ) as Partial<T>;
}
