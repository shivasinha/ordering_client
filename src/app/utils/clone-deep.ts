import structuredClone from '@ungap/structured-clone';

/**
 * Deep clones the input data
 * @param {T} data
 * @returns {T}
 */
export function cloneDeep<T>(data: T): T {
  return structuredClone(data);
}
