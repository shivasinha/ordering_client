import { Injectable } from '@angular/core';

import { OfferItemResponse, OrderContent, OrderItemContent, OrderItemResponse, OrderState, OrderItemType } from '@Ordering/api';
import { OrderActionsService } from '@Ordering/shared/services/order-actions.service';
import { OrderItemModuleRegistry } from '@Ordering/shared/services/order-item-module-registry.service';
import { CopyFlowData, OrderItemModule, OperationType } from '@Ordering/shared/models/order-item-module.interface';

/**
 * Result of resolving which operation type and item to use for the current route.
 */
export interface OperationResolution {
  contentItem: OrderItemContent | null;
  operationType: OperationType;
  activeModule: OrderItemModule | undefined;
  copyExtra?: Record<string, unknown>;
  /** Original content envelope from the API, used for detectOperationOverride. */
  originalContent?: OrderContent | null;
}

/**
 * Parameters for resolving the operation info from route state.
 */
export interface ResolveOperationParams {
  resolvedItem: OrderItemContent | OrderItemResponse | OfferItemResponse | null;
  navState: Record<string, unknown>;
  isCatalogView: boolean;
  catalogModule: OrderItemModule | undefined;
  registry: OrderItemModuleRegistry;
}

/**
 * Service responsible for resolving the correct operation type, module,
 * and content item based on route state and navigation context.
 *
 * Extracted from OrderItemHostComponent to reduce component complexity.
 */
@Injectable()
export class OrderItemOperationResolverService {
  /**
   * Detects if the current route is a catalog view by matching URL segments
   * against registered module catalogRouteSegments.
   * @param {Array<{ path: string }>} urlSegments - Route URL segments.
   * @param {OrderItemModuleRegistry} registry - The module registry.
   * @returns {OrderItemModule | undefined} The catalog module or undefined.
   */
  public detectCatalogModule(urlSegments: Array<{ path: string }>, registry: OrderItemModuleRegistry): OrderItemModule | undefined {
    for (const segment of urlSegments) {
      const module = registry.findModuleByCatalogSegment(segment.path);
      if (module) return module;
    }
    return undefined;
  }

  /**
   * Resolves the item from route data by checking resolver keys from all
   * registered modules, then falling back to standard keys.
   * @param {Record<string, unknown>} data - Route data object.
   * @param {OrderItemModuleRegistry} registry - The module registry.
   * @returns {OrderItemResponse | OfferItemResponse | OrderItemContent | null} The resolved item.
   */
  public resolveItemFromRouteData(
    data: Record<string, unknown>,
    registry: OrderItemModuleRegistry,
  ): OrderItemResponse | OfferItemResponse | OrderItemContent | null {
    for (const module of registry.availableModules()) {
      for (const key of module.resolverKeys ?? []) {
        if (data[key]) return data[key] as OrderItemResponse | OfferItemResponse | OrderItemContent;
      }
    }
    return (data['orderItem'] ?? data['offerItem'] ?? null) as OrderItemResponse | OfferItemResponse | OrderItemContent | null;
  }

  /**
   * Determines the operation type, content item, and active module based on
   * the current route flow (copy, edit, catalog, or add).
   * @param {ResolveOperationParams} params - Resolution parameters from route state.
   * @returns {OperationResolution} Resolved operation info.
   */
  public resolveOperationInfo(params: ResolveOperationParams): OperationResolution {
    const { resolvedItem, navState, isCatalogView, catalogModule, registry } = params;
    const routerModuleId = navState['moduleId'] as OrderItemType | undefined;

    return (
      this.resolveCopyFlow(navState, routerModuleId, registry) ??
      this.resolveEditFlow(resolvedItem, routerModuleId, registry) ??
      this.resolveCatalogFlow(resolvedItem, isCatalogView, catalogModule) ??
      this.resolveAddFlow(routerModuleId, registry)
    );
  }

  /**
   * Resolves copy-flow if a module extracts copy data from navigation state.
   */
  private resolveCopyFlow(
    navState: Record<string, unknown>,
    routerModuleId: OrderItemType | undefined,
    registry: OrderItemModuleRegistry,
  ): OperationResolution | null {
    const copyData = this.extractCopyFlowData(navState, registry);
    if (!copyData) return null;

    return {
      contentItem: copyData.item,
      operationType: copyData.operationType,
      activeModule: this.resolveActiveModule(routerModuleId, registry),
      copyExtra: copyData.extraContext,
    };
  }

  /**
   * Resolves edit/view flow when the resolved item has a content envelope.
   */
  private resolveEditFlow(
    resolvedItem: OrderItemContent | OrderItemResponse | OfferItemResponse | null,
    routerModuleId: OrderItemType | undefined,
    registry: OrderItemModuleRegistry,
  ): OperationResolution | null {
    if (!resolvedItem || !('content' in resolvedItem)) return null;
    const typed = resolvedItem as OrderItemResponse | OfferItemResponse;
    if (!typed.content?.item) return null;

    // The item's content.type is the authoritative module id when editing an
    // existing item; router state may not carry moduleId (e.g. deep-link or
    // list row click), so falling back to the first available module would
    // dispatch the wrong strategy (e.g. opening a restriction as a train run).
    const effectiveModuleId = typed.content.type ?? routerModuleId;

    return {
      contentItem: typed.content.item,
      operationType: typed.content.action,
      activeModule: this.resolveActiveModule(effectiveModuleId, registry),
      originalContent: typed.content,
    };
  }

  /**
   * Resolves catalog-view flow with the catalog module's view strategy.
   */
  private resolveCatalogFlow(
    resolvedItem: OrderItemContent | OrderItemResponse | OfferItemResponse | null,
    isCatalogView: boolean,
    catalogModule: OrderItemModule | undefined,
  ): OperationResolution | null {
    if (!resolvedItem) return null;
    if (!isCatalogView) return null;
    if (!catalogModule?.catalogViewStrategy) return null;

    return {
      contentItem: resolvedItem as OrderItemContent,
      operationType: catalogModule.catalogViewStrategy,
      activeModule: catalogModule,
    };
  }

  /**
   * Resolves add flow (no existing item) using the module's default creation operation.
   */
  private resolveAddFlow(routerModuleId: OrderItemType | undefined, registry: OrderItemModuleRegistry): OperationResolution {
    const activeModule = this.resolveActiveModule(routerModuleId, registry);
    return {
      contentItem: null,
      operationType: activeModule?.defaultCreationOperation ?? this.detectFallbackOperationType(routerModuleId, registry),
      activeModule,
    };
  }

  /**
   * Lets the active module override the operation type (e.g. replacement detection).
   * Only applies for non-catalog, non-copy flows with an existing item.
   * @param {OperationResolution} resolution - Mutable resolution to update.
   * @param {{ isCatalogView: boolean; orderActionsService: OrderActionsService }} params - Context for override detection.
   */
  public applyOperationOverride(
    resolution: OperationResolution,
    params: { isCatalogView: boolean; orderActionsService: OrderActionsService },
  ): void {
    if (params.isCatalogView) return;
    if (resolution.copyExtra || !resolution.contentItem) return;
    if (!resolution.activeModule?.detectOperationOverride) return;
    if (!this.shouldDetectOverride(params.orderActionsService)) return;

    const activeContent = resolution.originalContent ?? null;
    const override = resolution.activeModule.detectOperationOverride(activeContent);
    if (override) {
      resolution.operationType = override;
    }
  }

  /**
   * Attempts to extract copy-flow data by asking each registered module.
   * @param {Record<string, unknown>} navState - Router navigation state.
   * @param {OrderItemModuleRegistry} registry - Module registry.
   * @returns {CopyFlowData | null} Copy data or null.
   */
  private extractCopyFlowData(navState: Record<string, unknown>, registry: OrderItemModuleRegistry): CopyFlowData | null {
    for (const module of registry.availableModules()) {
      if (module.extractCopyData) {
        const result = module.extractCopyData(navState);
        if (result) return result;
      }
    }
    return null;
  }

  /**
   * Resolves the active module from a moduleId or defaults to the first available.
   * @param {OrderItemType | undefined} moduleId - Optional module ID from router state.
   * @param {OrderItemModuleRegistry} registry - Module registry.
   * @returns {OrderItemModule | undefined} The resolved module.
   */
  private resolveActiveModule(moduleId: OrderItemType | undefined, registry: OrderItemModuleRegistry): OrderItemModule | undefined {
    if (moduleId !== undefined) {
      try {
        return registry.resolveModule(moduleId);
      } catch {
        // Fall through — module requested but not registered
      }
    }
    const available = registry.availableModules();
    return available.length > 0 ? available[0] : undefined;
  }

  /**
   * Falls back to the default creation operation when no module is resolvable.
   * @param {OrderItemType | undefined} moduleId - Optional module ID for lookup.
   * @param {OrderItemModuleRegistry} registry - Module registry.
   * @returns {OperationType} The resolved operation type.
   */
  private detectFallbackOperationType(moduleId: OrderItemType | undefined, registry: OrderItemModuleRegistry): OperationType {
    if (moduleId !== undefined) {
      try {
        const module = registry.resolveModule(moduleId);
        return module.defaultCreationOperation;
      } catch {
        // Fall through
      }
    }
    const available = registry.availableModules();
    return available.length > 0 ? available[0].defaultCreationOperation : ('TRAIN_RUN_CREATION' as OperationType);
  }

  /**
   * Checks whether the current order context requires operation override detection.
   * @param {OrderActionsService} orderActionsService - Service to check order state.
   * @returns {boolean} True if the order is in DRAFT and has existing items.
   */
  private shouldDetectOverride(orderActionsService: OrderActionsService): boolean {
    const currentOrder = orderActionsService.currentlySelectedOrderSig();
    return [OrderState.DRAFT].includes(currentOrder.state) && !!currentOrder.orderItems?.length;
  }
}
