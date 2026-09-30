import { OrderItemType } from '@Ordering/api';

/**
 * Static list of enabled module IDs.
 * TODO: When backend delivers Config.enabledModules, replace this const with
 * a signal/value read from ConfigDataService and delete this file.
 * All consumers (module-providers.config.ts, OrderItemModuleRegistry) should
 * then read from ConfigDataService.enabledModules instead.
 */
export const ENABLED_MODULE_IDS: OrderItemType[] = [OrderItemType.TRAIN_RUN, OrderItemType.RESTRICTION];
