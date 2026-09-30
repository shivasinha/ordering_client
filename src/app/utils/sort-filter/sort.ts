export function sort<T extends Record<K, string>, K extends keyof T>(itemLists: Array<T>, accesorKey: K): Array<T> {
  return itemLists.sort((a: T, b: T) => a[accesorKey].toLowerCase().localeCompare(b[accesorKey].toLowerCase()));
}
