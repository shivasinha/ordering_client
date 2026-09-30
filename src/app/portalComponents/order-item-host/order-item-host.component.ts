import { Component, computed, inject, Injector, OnInit, runInInjectionContext, Signal, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { map, Observable, take } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { OfferItemResponse, OrderItemContent, OrderItem, OrderItemResponse, OrderState } from '@Ordering/api';

import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { TranslatableEnumPipe } from '@Ordering/core/pipes/translatable-enum.pipe';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { OrderActionsService } from '@Ordering/shared/services/order-actions.service';
import { NavigationService } from '@Ordering/shared/services/navigation.service';
import { ErrorHandlingService } from '@Ordering/shared/services/error-handling.service';
import { OrderingApiName } from '@Ordering/data/custom/enum/ordering-api-names.enum';
import { NotificationService } from '@Ordering/shared/services/notification.service';
import { SNACKBARCONFIG_ERROR } from '@Ordering/utils/snackbar';

import { FormAggregatorService } from '@Ordering/shared/services/form-aggregator.service';
import { OrderItemModuleRegistry } from '@Ordering/shared/services/order-item-module-registry.service';
import {
  ItemOperationStrategy,
  ItemContextData,
  HostAction,
  ActionButtonColor,
} from '@Ordering/shared/models/item-operation-strategy.interface';
import { ComponentSlot, ItemContext, SlotDisplayMode, TitleConfig } from '@Ordering/shared/models/component-slot.interface';
import { ItemRouteType, OrderItemModule } from '@Ordering/shared/models/order-item-module.interface';

import { SlotErrorBoundaryComponent } from './slot-error-boundary.component';
import { OrderItemOperationResolverService, OperationResolution } from './order-item-operation-resolver.service';
import { OrderItemContextBuilderService } from './order-item-context-builder.service';

interface ResolvedSlot {
  component: ComponentSlot['component'];
  contributorKey: string;
  resolvedInputs: Record<string, unknown>;
  isVisible: boolean;
  layout: ComponentSlot['layout'];
}

@Component({
  selector: 'app-order-item-host',
  imports: [CommonModule, SharedMaterialModule, TranslatableEnumPipe, SlotErrorBoundaryComponent],
  providers: [FormAggregatorService, OrderItemOperationResolverService, OrderItemContextBuilderService],
  templateUrl: './order-item-host.component.html',
  styleUrl: './order-item-host.component.scss',
})
export class OrderItemHostComponent implements OnInit {
  // ─── Injected services ──────────────────────────────────────────────
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly tr = inject(TranslationsService);
  protected readonly orderActionsService = inject(OrderActionsService);
  private readonly navigationService = inject(NavigationService);
  private readonly errorHandlingService = inject(ErrorHandlingService);
  private readonly notificationService = inject(NotificationService);
  private readonly registry = inject(OrderItemModuleRegistry);
  private readonly injector = inject(Injector);
  protected readonly formAggregator = inject(FormAggregatorService);
  private readonly operationResolver = inject(OrderItemOperationResolverService);
  private readonly contextBuilder = inject(OrderItemContextBuilderService);

  // ─── Route-derived state ────────────────────────────────────────────
  private readonly orderId: string = this.route.snapshot.params['order-id'] ?? '';
  private readonly isOrderItemView = this.route.snapshot.url.some(s => s.path === 'order-items');
  private readonly isOfferItemView = this.route.snapshot.url.some(s => s.path === 'offer-items');
  private readonly catalogModule: OrderItemModule | undefined = this.operationResolver.detectCatalogModule(
    this.route.snapshot.url,
    this.registry,
  );
  private readonly isCatalogView: boolean = !!this.catalogModule;

  private readonly item$: Observable<OrderItemResponse | OfferItemResponse | OrderItemContent | null> = this.route.data.pipe(
    map(data => this.operationResolver.resolveItemFromRouteData(data as Record<string, unknown>, this.registry)),
  );

  // ─── Internal signals ───────────────────────────────────────────────
  private strategySig: WritableSignal<ItemOperationStrategy | null> = signal(null);
  private itemSig: WritableSignal<OrderItemContent | null> = signal(null);
  private contextSig: WritableSignal<ItemContext | null> = signal(null);
  private itemContextDataSig: WritableSignal<ItemContextData | null> = signal(null);
  private activeModuleSig: WritableSignal<OrderItemModule | null> = signal(null);
  private isSaving = signal(false);
  private isSaved = signal(false);

  // ─── Public computed signals (template-bound) ───────────────────────
  protected titleConfig: WritableSignal<TitleConfig | null> = signal(null);

  protected activeSlots: Signal<ResolvedSlot[]> = computed(() => {
    const strategy = this.strategySig();
    const baseContext = this.contextSig();
    if (!strategy || !baseContext) return [];

    this.formAggregator.stateVersion();

    const context = this.contextBuilder.buildLiveContext(baseContext, this.isCatalogView);
    const slots = strategy.getComponentSlots();
    const item = this.itemSig();
    const initialData = item ? strategy.extractInitialData(item) : {};
    const { globalMode } = strategy.resolveEditMode(context);
    const aggregatedData = this.formAggregator.getAggregatedDataSync();

    return slots.map<ResolvedSlot>(slot => {
      const isVisible = slot.visible ? slot.visible(context, aggregatedData) : true;

      const staticInputs = typeof slot.inputs === 'function' ? slot.inputs(item, context) : (slot.inputs ?? {});
      const resolvedInputs: Record<string, unknown> = {
        ...staticInputs,
        displayMode: globalMode,
        initialData: initialData[slot.contributorKey] ?? undefined,
      };
      return {
        component: slot.component,
        contributorKey: slot.contributorKey,
        resolvedInputs,
        isVisible,
        layout: slot.layout ?? 'full',
      };
    });
  });

  protected canSave: Signal<boolean> = computed(() => {
    this.formAggregator.stateVersion();
    if (this.isSaving()) return false;
    const allValid = this.formAggregator.isAllValid();
    const anyDirty = this.formAggregator.isAnyDirty();
    if (!allValid) return false;
    const context = this.contextSig();
    const isNewItem = context?.routeType === ItemRouteType.ORDER_ITEM_ADD;
    return isNewItem || anyDirty;
  });

  protected isEditMode: Signal<boolean> = computed(() => {
    const strategy = this.strategySig();
    const baseContext = this.contextSig();
    if (!strategy || !baseContext) return false;
    const context = this.contextBuilder.buildLiveContext(baseContext, this.isCatalogView);
    const { globalMode } = strategy.resolveEditMode(context);
    return globalMode === SlotDisplayMode.EDITABLE;
  });

  protected actionButtons: Signal<HostAction[]> = computed(() => {
    const strategy = this.strategySig();
    const item = this.itemSig();
    const context = this.contextSig();
    const contextData = this.itemContextDataSig();
    if (!strategy?.getActionButtons || !context || !contextData) return [];
    return strategy.getActionButtons(item, context, contextData);
  });

  protected renderedButtons: Signal<HostAction[]> = computed(() => {
    const strategyButtons = this.actionButtons();
    const editMode = this.isEditMode();
    const buttons: HostAction[] = [...strategyButtons];

    if (editMode) {
      buttons.push({
        label: this.tr.translate('lblCancel'),
        variant: 'stroked',
        execute: () => this.onExit(),
      });
      buttons.push({
        label: this.tr.translate('lblSave'),
        color: ActionButtonColor.PRIMARY,
        disabled: !this.canSave(),
        execute: () => this.onSave(),
      });
    } else {
      buttons.push({
        label: this.tr.translate('lblExit'),
        color: ActionButtonColor.PRIMARY,
        execute: () => this.onExit(),
      });
    }

    return buttons;
  });

  // ─── Lifecycle ──────────────────────────────────────────────────────
  ngOnInit(): void {
    this.ensureOrderContext();
    this.resolveStrategyAndItem();
  }

  // ─── UnsavedChangesGuard interface ──────────────────────────────────
  get isUnsavedChanges(): Signal<boolean> {
    return computed(() => {
      if (this.isSaved()) return false;
      const currentOrder = this.orderActionsService.currentlySelectedOrderSig();
      if (![OrderState.DRAFT].includes(currentOrder.state)) return false;
      return this.formAggregator.isAnyDirty();
    });
  }

  // ─── Template actions ───────────────────────────────────────────────

  /**
   * Orchestrates the save workflow: validates, assembles payload, and persists.
   */
  protected onSave(): void {
    const strategy = this.strategySig();
    if (!strategy?.assembleSavePayload) return;

    const aggregatedData = this.formAggregator.getAggregatedDataSync();
    const contextData = this.itemContextDataSig();
    if (!contextData) return;

    if (!this.runPreSaveValidation(strategy, aggregatedData)) return;

    this.isSaving.set(true);
    const orderContent = strategy.assembleSavePayload(aggregatedData, contextData);
    this.persistOrderItem({ content: orderContent });
  }

  /**
   * Runs strategy-defined pre-save validation and shows errors if invalid.
   * @param {ItemOperationStrategy} strategy - The active strategy.
   * @param {Record<string, unknown>} aggregatedData - Aggregated form data.
   * @returns {boolean} True if validation passed.
   */
  private runPreSaveValidation(strategy: ItemOperationStrategy, aggregatedData: Record<string, unknown>): boolean {
    if (!strategy.validateBeforeSave) return true;

    const result = strategy.validateBeforeSave(aggregatedData);
    if (result.valid) return true;

    result.errors?.forEach(err => {
      this.notificationService.pushNotification(this.tr.translate(err.message as any), SNACKBARCONFIG_ERROR);
    });
    return false;
  }

  /**
   * Persists the order item by creating or editing depending on whether an existing item exists.
   * @param {OrderItem} orderItem - The assembled order item payload.
   */
  private persistOrderItem(orderItem: OrderItem): void {
    this.item$.pipe(take(1)).subscribe(resolvedItem => {
      const existingExternalId = resolvedItem && 'externalId' in resolvedItem ? resolvedItem.externalId : undefined;

      const saveOperation = existingExternalId
        ? this.orderActionsService.editOrderItem(this.orderId, existingExternalId, orderItem)
        : this.orderActionsService.createOrderItem(this.orderId, orderItem);

      // `createOrderItem`/`editOrderItem` handle their own error notification and resolve
      // to a completed observable without emitting a value (rather than erroring). Track
      // whether `next` fired so the `complete` path can still reset `isSaving` — otherwise
      // the save button would remain permanently disabled after a failed save.
      let didSucceed = false;
      saveOperation.subscribe({
        next: () => {
          didSucceed = true;
          this.handleSaveSuccess();
        },
        error: (err: HttpErrorResponse) => this.handleSaveError(err),
        complete: () => {
          if (!didSucceed) {
            this.isSaving.set(false);
          }
        },
      });
    });
  }

  /**
   * Handles successful save: resets form state, triggers module hook, and navigates back.
   */
  private handleSaveSuccess(): void {
    this.isSaved.set(true);
    this.formAggregator.resetAll();
    const activeModule = this.activeModuleSig();
    if (activeModule?.onSaveComplete) {
      runInInjectionContext(this.injector, () => activeModule.onSaveComplete!());
    }
    this.navigationService.navigate(['/orders', this.orderId]);
  }

  /**
   * Handles save failure by resetting the saving flag and delegating to error handling.
   * @param {HttpErrorResponse} err - The HTTP error response.
   */
  private handleSaveError(err: HttpErrorResponse): void {
    this.isSaving.set(false);
    this.errorHandlingService.handleError(err, OrderingApiName.EditOrderItem);
  }

  /**
   * Navigates the user back to the order detail or list view.
   */
  protected onExit(): void {
    if (this.isCatalogView) {
      this.navigationService.navigateToList();
    } else {
      this.navigationService.navigate(['/orders', this.orderId]);
    }
  }

  // ─── Private helpers ────────────────────────────────────────────────

  /**
   * Ensures the parent order is loaded (handles tab-refresh or cross-order navigation).
   */
  private ensureOrderContext(): void {
    if (this.isCatalogView || !this.orderId) return;

    const currentOrder = this.orderActionsService.currentlySelectedOrderSig();
    if (!currentOrder.externalId || currentOrder.externalId !== this.orderId) {
      this.orderActionsService.getOrderDetails(this.orderId).subscribe();
    }
  }

  /**
   * Core initialization: resolves the strategy and sets up context.
   * Uses module hooks for copy-flow, operation detection, and context building.
   */
  private resolveStrategyAndItem(): void {
    const navState = this.router.getCurrentNavigation()?.extras?.state ?? history.state ?? {};

    this.item$.pipe(take(1)).subscribe(resolvedItem => {
      const resolution = this.operationResolver.resolveOperationInfo({
        resolvedItem,
        navState,
        isCatalogView: this.isCatalogView,
        catalogModule: this.catalogModule,
        registry: this.registry,
      });
      this.operationResolver.applyOperationOverride(resolution, {
        isCatalogView: this.isCatalogView,
        orderActionsService: this.orderActionsService,
      });
      this.initializeState(resolution, navState, resolvedItem);
    });
  }

  /**
   * Resolves the strategy from the registry and sets all component signals.
   * @param {OperationResolution} resolution - The resolved operation info.
   * @param {Record<string, unknown>} navState - Router navigation state.
   * @param {OrderItemResponse | OfferItemResponse | OrderItemContent | null} resolvedItem - The raw resolved item from the route.
   */
  private initializeState(
    resolution: OperationResolution,
    navState: Record<string, unknown>,
    resolvedItem: OrderItemResponse | OfferItemResponse | OrderItemContent | null,
  ): void {
    const { activeModule } = resolution;
    const { contentItem, operationType, copyExtra } = resolution;

    // The module must be known up front: strategies are scoped per module, so the
    // same operation type (e.g. CREATION) maps to a different strategy per module.
    if (!activeModule) {
      this.showModuleNotAvailableAndNavigateBack();
      return;
    }

    // Resolve the module-specific strategy for this operation type.
    let strategy: ItemOperationStrategy;
    try {
      strategy = this.registry.resolveStrategy(activeModule.moduleId, operationType);
    } catch {
      this.showModuleNotAvailableAndNavigateBack();
      return;
    }

    // Build context
    const context = this.contextBuilder.buildItemContext({
      isCatalogView: this.isCatalogView,
      isOfferItemView: this.isOfferItemView,
      isOrderItemView: this.isOrderItemView,
      hasOrderItemId: !!this.route.snapshot.params['order-item-id'],
    });
    const itemContextData = this.contextBuilder.buildItemContextData({
      orderId: this.orderId,
      isCatalogView: this.isCatalogView,
      routeParams: { ...this.route.snapshot.params },
      resolvedItem,
    });

    // Merge module-specific context data
    if (activeModule?.buildContextData) {
      const moduleContext = runInInjectionContext(this.injector, () => activeModule!.buildContextData!(contentItem, navState));
      Object.assign(itemContextData, moduleContext);
    }

    // Merge copy-flow extra context
    if (copyExtra) {
      Object.assign(itemContextData, copyExtra);
    }

    itemContextData['originalItem'] = contentItem;

    // Set signals
    this.strategySig.set(strategy);
    this.itemSig.set(contentItem);
    this.contextSig.set(context);
    this.itemContextDataSig.set(itemContextData);
    this.activeModuleSig.set(activeModule ?? null);
    this.titleConfig.set(strategy.getTitleConfig(contentItem, context));
  }

  /**
   * Shows a snackbar error indicating the order item module is not available
   * and navigates the user back to the order or list view.
   */
  private showModuleNotAvailableAndNavigateBack(): void {
    const message = this.tr.translate('msgOrderItemModuleNotAvailable');
    this.notificationService.pushNotification(message, SNACKBARCONFIG_ERROR);

    if (this.isCatalogView || !this.orderId) {
      this.navigationService.navigateToList();
    } else {
      this.navigationService.navigate(['/orders', this.orderId]);
    }
  }
}
