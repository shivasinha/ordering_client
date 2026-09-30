export function nullFilteredList<T extends Record<K, string>, K extends keyof T>(itemLists: Array<T>, accesorKeys: Array<K>): Array<T> {
  // Removes null entry from the array list based on certain property
  const nullFilteredList: Array<T> = itemLists?.filter((item: T) => accesorKeys?.every(key => item?.[key]));

  return nullFilteredList;
}
