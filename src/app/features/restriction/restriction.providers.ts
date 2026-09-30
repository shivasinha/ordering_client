import { EnvironmentProviders, inject, makeEnvironmentProviders, provideEnvironmentInitializer } from '@angular/core';
import { OrderItemModuleRegistry } from '@Ordering/shared/services/order-item-module-registry.service';
import { RESTRICTION_MODULE } from './restriction.module-def';
import { RestrictionCreationStrategy } from './strategies/restriction-creation.strategy';

/**
 * Provides the restriction module and its strategies.
 *
 * Register this from the application bootstrap providers so the restriction
 * module becomes available in the order-item registry.
 *
 * @returns {EnvironmentProviders} Angular environment providers for the restriction module.
 */
export function provideRestrictionModule(): EnvironmentProviders {
  return makeEnvironmentProviders([
    RestrictionCreationStrategy,
    provideEnvironmentInitializer(() => {
      const registry = inject(OrderItemModuleRegistry);
      const creationStrategy = inject(RestrictionCreationStrategy);

      registry.registerModule(RESTRICTION_MODULE, [creationStrategy]);
    }),
  ]);
}
