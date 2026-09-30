import { computed, inject, Injectable, Signal } from '@angular/core';
import { ItemOperationStrategy } from '../models/item-operation-strategy.interface';
import { OperationType, OrderItemModule } from '../models/order-item-module.interface';
import { OrderItemType } from '@Ordering/api';
import { ConfigDataService } from './config-data.service';

/**
 * Central registry for order-item modules and their operation strategies.
 * Provided at root. Single instance.
 */
@Injectable({ providedIn: 'root' })
export class OrderItemModuleRegistry {
  private configDataService = inject(ConfigDataService);

  private modules = new Map<OrderItemType, OrderItemModule>();
  private strategies = new Map<string, ItemOperationStrategy>();
  private enabledModuleIds = this.configDataService.orderItemTypes;

  /**
   * Builds the composite lookup key for a strategy.
   *
   * Strategies are scoped per module because several modules expose an operation
   * of the same type (e.g. both train-run and restriction have a CREATION
   * strategy); keying by operation type alone would let one module overwrite the
   * other's strategy.
   *
   * @param {OrderItemType} moduleId - The owning module id.
   * @param {OperationType} operationType - The operation type of the strategy.
   * @returns {string} The composite map key.
   */
  private strategyKey(moduleId: OrderItemType, operationType: OperationType): string {
    return `${moduleId}::${operationType}`;
  }

  /**
   * Registers a module and its associated strategies.
   * @param {OrderItemModule} module - The module definition to register.
   * @param {ItemOperationStrategy[]} strategies - Strategies belonging to this module.
   */
  public registerModule(module: OrderItemModule, strategies: ItemOperationStrategy[]): void {
    this.modules.set(module.moduleId, module);
    for (const strategy of strategies) {
      this.strategies.set(this.strategyKey(strategy.moduleId, strategy.operationType), strategy);
    }
  }

  /**
   * Returns modules filtered by enabledModuleIds.
   */
  public readonly availableModules: Signal<OrderItemModule[]> = computed(() => {
    const enabledIds = this.enabledModuleIds();
    return enabledIds.map(id => this.modules.get(id)).filter((mod): mod is OrderItemModule => !!mod);
  });

  /**
   * Resolves a strategy by its owning module and operation type.
   * @param {OrderItemType} moduleId - The module the strategy belongs to.
   * @param {OperationType} type - The operation type to look up.
   * @returns {ItemOperationStrategy} The matched strategy.
   * @throws Error if no strategy is registered for the given module and type.
   */
  public resolveStrategy(moduleId: OrderItemType, type: OperationType): ItemOperationStrategy {
    const strategy = this.strategies.get(this.strategyKey(moduleId, type));
    if (!strategy) {
      throw new Error(`No strategy registered for module ${moduleId} and type: ${type}`);
    }
    return strategy;
  }

  /**
   * Resolves a module definition by its ID.
   * @param {OrderItemType} moduleId - The module ID to look up.
   * @returns {OrderItemModule} The matched module.
   * @throws Error if no module is registered with the given ID.
   */
  public resolveModule(moduleId: OrderItemType | undefined): OrderItemModule {
    if (moduleId === undefined) {
      throw new Error('Module ID is undefined');
    }
    const module = this.modules.get(moduleId);
    if (!module) {
      throw new Error(`No module registered with id: ${moduleId}`);
    }
    return module;
  }

  /**
   * Finds a module by its catalog route segment.
   * @param {string} segment - The URL segment to match against catalogRouteSegment.
   * @returns {OrderItemModule | undefined} The matched module or undefined.
   */
  public findModuleByCatalogSegment(segment: string): OrderItemModule | undefined {
    for (const module of this.modules.values()) {
      if (module.catalogRouteSegment === segment) {
        return module;
      }
    }
    return undefined;
  }
}
