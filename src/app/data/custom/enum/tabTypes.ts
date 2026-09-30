export enum TabsTypesEnum {
  CURRENT_ORDERS = 'CURRENT_ORDERS',
  ARCHIVE_ORDERS = 'ARCHIVE_ORDERS',
  TRAIN_RUNS = 'TRAIN_RUNS',
  SPARE_CAPACITY = 'SPARE_CAPACITY',
  ORDERED_ITEMS = 'ORDERED_ITEMS',
  OFFERED_ITEMS = 'OFFERED_ITEMS',
}

/** Translation keys for tab labels */
export type TabTranslationKey = 'lblCurrentOrders' | 'lblArchivedOrders' | 'lblTrainsList' | 'lblSpareCapacity';

/** Maps list page tab types to their translation keys */
export const TAB_LABELS: Record<string, TabTranslationKey> = {
  [TabsTypesEnum.CURRENT_ORDERS]: 'lblCurrentOrders',
  [TabsTypesEnum.ARCHIVE_ORDERS]: 'lblArchivedOrders',
  [TabsTypesEnum.TRAIN_RUNS]: 'lblTrainsList',
  [TabsTypesEnum.SPARE_CAPACITY]: 'lblSpareCapacity',
};
