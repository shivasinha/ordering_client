import { EnvironmentProviders } from '@angular/core';
import { ENABLED_MODULE_IDS } from './enabled-modules.config';
import { OrderItemType } from '@Ordering/api';

/**
 * Registry mapping each module ID to a lazy provider factory.
 * When a module is enabled (via ENABLED_MODULE_IDS or future backend config),
 * its provider is dynamically imported and bootstrapped.
 *
 * To add a new module:
 * 1. Add entry here with dynamic import
 * 2. Add module ID to ENABLED_MODULE_IDS (or backend config)
 * No changes to app.config.ts or main.ts required.
 */
const MODULE_PROVIDER_REGISTRY: Partial<Record<OrderItemType, () => Promise<EnvironmentProviders>>> = {
  [OrderItemType.TRAIN_RUN]: () => import('@Ordering/features/train-run/train-run.providers').then(m => m.provideTrainRunModule()),
  [OrderItemType.RESTRICTION]: () => import('@Ordering/features/restriction/restriction.providers').then(m => m.provideRestrictionModule()),
};

/**
 * Resolves enabled module providers via dynamic import.
 * Only modules listed in ENABLED_MODULE_IDS are loaded — disabled modules
 * are tree-shaken out of the main bundle into separate chunks.
 *
 * Called once from main.ts before bootstrap.
 *
 * TODO: When backend delivers Config.enabledModules, this function should
 * accept the enabled IDs as a parameter (fetched before bootstrap) instead of
 * reading the static ENABLED_MODULE_IDS const. This allows per-customer
 * configuration without rebuild. The fetch can happen in main.ts before
 * calling resolveEnabledModuleProviders(enabledIds).
 *
 * @returns {Promise<EnvironmentProviders[]>} Providers for all enabled modules.
 */
export async function resolveEnabledModuleProviders(): Promise<EnvironmentProviders[]> {
  const providerPromises = ENABLED_MODULE_IDS.map(id => MODULE_PROVIDER_REGISTRY[id])
    .filter((provider): provider is () => Promise<EnvironmentProviders> => !!provider)
    .map(provider => provider());

  return Promise.all(providerPromises);
}
