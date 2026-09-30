import { EnvironmentProviders, inject, makeEnvironmentProviders, provideEnvironmentInitializer } from '@angular/core';
import { OrderItemModuleRegistry } from '@Ordering/shared/services/order-item-module-registry.service';
import { TRAIN_RUN_MODULE } from './train-run.module-def';
import { TrainRunCreationStrategy } from './strategies/train-run-creation.strategy';
import { TrainRunCatalogStrategy } from './strategies/train-run-catalog.strategy';
import { TrainRunCancellationStrategy } from './strategies/train-run-cancellation.strategy';
import { TrainRunReplacementStrategy } from './strategies/train-run-replacement.strategy';

/**
 * Provides the train-run module and all its strategies.
 * Call from app.config.ts providers array to register the module at bootstrap.
 * @returns {EnvironmentProviders} Angular environment providers for the train-run module.
 */
export function provideTrainRunModule(): EnvironmentProviders {
  return makeEnvironmentProviders([
    TrainRunCreationStrategy,
    TrainRunCatalogStrategy,
    TrainRunCancellationStrategy,
    TrainRunReplacementStrategy,
    provideEnvironmentInitializer(() => {
      const registry = inject(OrderItemModuleRegistry);
      const creationStrategy = inject(TrainRunCreationStrategy);
      const catalogStrategy = inject(TrainRunCatalogStrategy);
      const cancellationStrategy = inject(TrainRunCancellationStrategy);
      const replacementStrategy = inject(TrainRunReplacementStrategy);

      registry.registerModule(TRAIN_RUN_MODULE, [creationStrategy, catalogStrategy, cancellationStrategy, replacementStrategy]);
    }),
  ]);
}
