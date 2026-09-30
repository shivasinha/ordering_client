export type TypeGuard<T> = (value: any) => value is T;
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * Checks if the given value is a string.
 * @param {any} value
 * @returns {value is string}
 */
export function isString(value: any): value is string {
  return typeof value === 'string';
}

/**
 * Checks if the given value is a boolean.
 * @param {any} value
 * @returns {value is boolean}
 */
export function isBoolean(value: any): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Checks if the given value is a string and not empty, i.e. not `''`.
 * @param {any} value
 * @returns {value is string}
 */
export function isNotEmptyString(value: any): value is string {
  return isString(value) && value !== '';
}

/**
 * Checks if the given value is a string and not blank, i.e. not `''` or `' '`, etc.
 * @param {any} value
 * @returns {value is string}
 */
export function isNotBlankString(value: any): value is string {
  return isString(value) && value.trim() !== '';
}

/**
 * Checks if the given value is a finite number.
 * `NaN`, `Infinity`, `-Infinity` and values that aren't numbers are considered not finite.
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isFinite
 * @param {any} value
 * @returns {value is number}
 */
export function isFiniteNumber(value: any): value is number {
  return Number.isFinite(value);
}

/**
 * Checks if the given value is an integer.
 * @param {any} value
 * @returns {value is number}
 */
export function isInt(value: any): value is number {
  return Number.isInteger(value);
}

/**
 * Checks if the given value is a finite number greater than or equal to zero.
 * @see isFiniteNumber
 * @param {any} value
 * @returns {value is number}
 */
export function isNonNegativeNumber(value: any): value is number {
  return isFiniteNumber(value) && value >= 0;
}

/**
 * Checks if the given value is a finite number greater than zero.
 * @see isFiniteNumber
 * @see isNonNegativeNumber
 * @param {any} value
 * @returns {value is number}
 */
export function isPositiveNumber(value: any): value is number {
  return isFiniteNumber(value) && value > 0;
}

/**
 * Checks if the given value is a record, i.e. not `null` or `undefined` and of type `object`.
 * @param {any} value
 * @returns {value is Record<keyof any, unknown>}
 */
export function isRecord(value: any): value is Record<keyof any, unknown> {
  return value != null && typeof value === 'object';
}

/**
 * Checks if the given value is an array and has at least one item.
 * @param {Array<T> | null | undefined} value
 * @returns {value is NonEmptyArray<T>}
 */
export function isNonEmptyArray<T>(value: Array<T> | null | undefined): value is NonEmptyArray<T> {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Checks if the provided value is a valid enum value.
 *
 * A valid enum value is defined as:
 * - A number
 * - Not null
 * - Not undefined
 * - A non-negative number
 * - An integer
 *
 * @param value - The value to check.
 * @returns `true` if the value is a valid enum value, otherwise `false`.
 */
export function isValidEnumValue(value: any): boolean {
  return typeof value === 'number' && value !== null && value !== undefined && isNonNegativeNumber(value) && isInt(value);
}
