# Order Item Module Architecture

## Overview

The order-item system uses a **Strategy + Module Registry** pattern to decouple item-type-specific logic from the generic host component. Adding a new order item type (e.g. "Restriction") requires no changes to the host — only new strategy classes and a provider registration.

### Key Principles

- **Open/Closed** — the host is closed for modification, open for extension via strategies
- **Slot-based composition** — strategies declare which form components to render and how
- **Reactive data flow** — all component state is signal-based; the `FormAggregatorService` aggregates contributor data
- **Memory-efficient** — `@if` is used (not `[hidden]`) so hidden slots are never instantiated

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│  main.ts                                                │
│    resolveEnabledModuleProviders()                       │
│    → dynamically imports only enabled modules            │
│    → merges providers into appConfig before bootstrap    │
└────────────────────┬────────────────────────────────────┘
                     │ reads ENABLED_MODULE_IDS
                     ▼
┌─────────────────────────────────────────────────────────┐
│  module-providers.config.ts                              │
│    MODULE_PROVIDER_REGISTRY: Record<ModuleId, Loader>   │
│    resolveEnabledModuleProviders(): Promise<Providers[]> │
└────────────────────┬────────────────────────────────────┘
                     │ dynamic import() per enabled module
                     ▼
┌─────────────────────────────────────────────────────────┐
│  provideTrainRunModule() (per module)                    │
│    provideEnvironmentInitializer() → registry.register() │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  OrderItemModuleRegistry (root singleton)                │
│    modules:    Map<ModuleId, OrderItemModule>            │
│    strategies: Map<StrategyType, ItemOperationStrategy>  │
│    availableModules: Signal<OrderItemModule[]>           │
└────────────────────┬────────────────────────────────────┘
                     │ resolveStrategy(type)
                     ▼
┌─────────────────────────────────────────────────────────┐
│  OrderItemHostComponent (route-level)                    │
│    providers: [FormAggregatorService,                    │
│                OrderItemOperationResolverService,        │
│                OrderItemContextBuilderService]           │
│    Reads: strategy → slots → resolvedInputs             │
│    Renders: @for slot → ngComponentOutlet                │
│    Actions: onSave → assembleSavePayload → API          │
│                                                         │
│  OrderItemOperationResolverService                      │
│    resolveOperationInfo(params) → OperationResolution   │
│    applyOperationOverride(resolution, params)           │
│    detectCatalogModule / resolveItemFromRouteData       │
│                                                         │
│  OrderItemContextBuilderService                         │
│    buildItemContext(params) → ItemContext               │
│    buildItemContextData(params) → ItemContextData       │
│    buildLiveContext(baseCtx, isCatalog) → ItemContext   │
└────────────────────┬────────────────────────────────────┘
                     │ ngComponentOutlet per slot
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Slot Components (ItemDataContributor<T>)                │
│    e.g. TrainHeaderFormComponent                         │
│         OperatingDaysListComponent                       │
│         StationListComponent                             │
│    Exposes: data(), isValid(), isDirty(), markAsPristine │
│    Registers with FormAggregatorService on init          │
└─────────────────────────────────────────────────────────┘
```

---

## Core Interfaces

### `ItemOperationStrategy`

The central contract every strategy implements:

```typescript
interface ItemOperationStrategy {
  readonly operationType: OrderItemAction;       // e.g. OrderItemAction.CREATION
  readonly moduleId: OrderItemType;       // e.g. OrderItemType.TRAIN_RUN

  getComponentSlots(): ComponentSlot[];
  getTitleConfig(item: OrderContentItem | null, context: ItemContext): TitleConfig;
  extractInitialData(item: OrderContentItem): Record<string, unknown>;
  resolveEditMode(context: ItemContext): { globalMode: SlotDisplayMode };
  assembleSavePayload?(aggregatedData: Record<string, unknown>, contextData: ItemContextData): OrderContent;
  validateBeforeSave?(aggregatedData: Record<string, unknown>): ValidationResult;
  getActionButtons?(item: OrderContentItem | null, context: ItemContext, contextData: ItemContextData): HostAction[];
}
```

### `ComponentSlot`

Declares a dynamic form section:

```typescript
interface ComponentSlot {
  component: Type<ItemDataContributor<unknown>>;  // The Angular component class
  contributorKey: string;                          // Unique key for data aggregation
  inputs?: Record<string, unknown> | ((item: OrderContentItem | null, context: ItemContext) => Record<string, unknown>);
  layout?: 'full' | 'half' | 'collapsible';
  visible?: (context: ItemContext, aggregatedData: Record<string, unknown>) => boolean;  // Slot visibility (defaults to always visible)
}
```

### `ItemDataContributor<T>`

Contract for slot components:

```typescript
interface ItemDataContributor<T = unknown> {
  readonly contributorKey: string;
  readonly data: Signal<T>;
  readonly isValid: Signal<boolean>;
  readonly isDirty: Signal<boolean>;
  displayMode: InputSignal<SlotDisplayMode>;
  markAsPristine(): void;
}
```

### `OrderItemModule`

Module definition registered with the registry:

```typescript
interface OrderItemModule {
  readonly moduleId: OrderItemType;
  readonly labelKey: string;              // Translation key for UI (e.g. "Train Run")
  readonly icon: string;                  // Material icon name
  readonly defaultCreationOperation: OrderItemType;
  readonly catalogRouteSegment?: string;           // Route segment for catalog view (e.g. 'train-run')
  readonly catalogViewStrategy?: ViewActionType; // Strategy to use for catalog/read-only view
  readonly resolverKeys?: string[];                // Route data keys to check for resolved items
  extractCopyData?(navState: Record<string, unknown>): CopyFlowData | null;
  detectOperationOverride?(activeContent: OrderContent | null): StrategyType | null;
  buildContextData?(activeItem: OrderContentItem | null, navState: Record<string, unknown>): Record<string, unknown>;
  onSaveComplete?(): void;
}
```

Module hooks allow item-type-specific logic to stay in the module without the host needing to know about it:
- `extractCopyData` — extracts item + context from navigation state for copy flows
- `detectOperationOverride` — switches strategy based on content (e.g. detecting replacement)
- `buildContextData` — adds module-specific fields (parentOperatingDays, etc.) to ItemContextData
- `onSaveComplete` — cleanup after successful save (e.g. clearing cached state)

> **Note on `parentOperatingDays`:** This field is **backend-managed**. The frontend
> never sets it during initial order item creation. Instead, `buildTrainRunBasePayload()`
> spreads `contextData['originalItem']` to preserve backend-managed fields (including
> `parentOperatingDays`) as-is when re-saving an existing replacement.

### `ItemContextData`

Non-form data needed by `assembleSavePayload` and `getActionButtons` —
sourced from the order context, route params, or router state.
Base fields are set by the host; module-specific fields via `buildContextData()`.

```typescript
interface ItemContextData {
  orderId: string;
  parentExternalId?: string;
  [key: string]: unknown;   // Module-specific extras (parentOperatingDays, routeParams, etc.)
}
```

**Important:** For catalog views, the host automatically populates `contextData['routeParams']`
with a snapshot of the component's `ActivatedRoute` params. Strategies that need route identifiers
(e.g. `trainId`, `schedVersionId`) **must** read them from `contextData` — never by injecting
`ActivatedRoute` directly. Strategies are environment-level singletons provided via
`makeEnvironmentProviders`, so `inject(ActivatedRoute)` would resolve to the **root** route
rather than the host component's route.

---

## File Structure

```
src/
├── main.ts                                   ← Bootstrap: resolves module providers dynamically
└── app/
    ├── app.config.ts                         ← Core Angular providers (router, HTTP, etc.)
    ├── features/
    │   └── train-run/                        ← Feature module folder
    │       ├── train-run.module-def.ts       ← Module constant (metadata + hooks)
    │       ├── train-run.providers.ts        ← provideTrainRunModule() function
    │       └── strategies/
    │           ├── train-run-strategy.utils.ts  ← Shared utility functions
    │           ├── train-run-creation.strategy.ts
    │           ├── train-run-cancellation.strategy.ts
    │           ├── train-run-replacement.strategy.ts
    │           └── train-run-catalog.strategy.ts
    ├── shared/
    │   ├── models/
    │   │   ├── item-operation-strategy.interface.ts
    │   │   ├── item-data-contributor.interface.ts
    │   │   ├── component-slot.interface.ts
    │   │   └── order-item-module.interface.ts
    │   ├── services/
    │   │   ├── order-item-module-registry.service.ts
    │   │   └── form-aggregator.service.ts
    │   └── config/
    │       ├── enabled-modules.config.ts     ← Static list of enabled module IDs
    │       └── module-providers.config.ts    ← Dynamic loader registry + resolver
    └── portalComponents/
        └── order-item-host/
            ├── order-item-host.component.ts
            ├── order-item-host.component.html
            ├── order-item-operation-resolver.service.ts
            ├── order-item-context-builder.service.ts
            └── slot-error-boundary.component.ts
```

---

## How to Add a New Order Item Module

### Step 1 — Define the Module

Create `src/app/features/restriction/restriction.module-def.ts`:

```typescript
import { OrderItemType } from '@Ordering/api';
import { OrderItemModule } from '@Ordering/shared/models/order-item-module.interface';

export const RESTRICTION_MODULE: OrderItemModule = {
  moduleId: OrderItemType.RESTRICTION,
  labelKey: 'lblRestriction',
  icon: 'engineering',
  defaultCreationOperation: OrderItemType.RESTRICTION_CREATION, // must exist in API enum
};
```

### Step 2 — Create Strategy Classes

Create `src/app/features/restriction/strategies/restriction-creation.strategy.ts`:

```typescript
@Injectable()
export class RestrictionCreationStrategy implements ItemOperationStrategy {
  readonly operationType = OrderItemType.RESTRICTION_CREATION;
  readonly moduleId = OrderItemType.RESTRICTION;

  getComponentSlots(): ComponentSlot[] {
    return [
      {
        component: RestrictionHeaderComponent,
        contributorKey: 'restrictionHeader',
        layout: 'full',
      },
      {
        component: RestrictionDetailsComponent,
        contributorKey: 'details',
      },
    ];
  }

  getTitleConfig(item: OrderContentItem | null, context: ItemContext): TitleConfig {
    return { title: context.translate('lblCreateRestriction') };
  }

  extractInitialData(item: OrderContentItem): Record<string, unknown> {
    const restriction = item as RestrictionItem;
    return {
      restrictionHeader: { /* ... */ },
      details: { /* ... */ },
    };
  }

  resolveEditMode(context: ItemContext): { globalMode: SlotDisplayMode } {
    if (context.isReadonlyOrderState || context.isOfferItemView) {
      return { globalMode: SlotDisplayMode.READONLY };
    }
    return { globalMode: SlotDisplayMode.EDITABLE };
  }

  assembleSavePayload(aggregatedData: Record<string, unknown>, contextData: ItemContextData): OrderContent {
    return {
      type: OrderItemType.RESTRICTION_CREATION,
      item: { /* build from aggregatedData */ },
    };
  }

  validateBeforeSave(aggregatedData: Record<string, unknown>): ValidationResult {
    // Return { valid: false, errors: [...] } to block save with notification
    return { valid: true };
  }
}
```

### Step 3 — Create the Providers Function

Create `src/app/features/restriction/restriction.providers.ts`:

```typescript
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
```

### Step 4 — Register in the Module Provider Registry

In `src/app/shared/config/module-providers.config.ts`, add a lazy loader entry:

```typescript
const MODULE_PROVIDER_REGISTRY: Record<OrderItemType, () => Promise<EnvironmentProviders>> = {
  [OrderItemType.TRAIN_RUN]: () =>
    import('@Ordering/features/train-run/train-run.providers').then(m => m.provideTrainRunModule()),
  [OrderItemType.RESTRICTION]: () =>   // ← add here
    import('@Ordering/features/restriction/restriction.providers').then(m => m.provideRestrictionModule()),
};
```

No changes to `app.config.ts` or `main.ts` are required — the dynamic loader resolves
all enabled modules automatically before bootstrap.

### Step 5 — Enable the Module

In `src/app/shared/config/enabled-modules.config.ts`:

```typescript
export const ENABLED_MODULE_IDS: OrderItemType[] = [
  OrderItemType.TRAIN_RUN,
  OrderItemType.RESTRICTION,  // ← add here
];
```

> **Future:** When the backend delivers `Config.enabledModules`, this static list
> will be replaced by a runtime fetch in `main.ts` before bootstrap.

### Step 6 — Create Slot Components

Each slot component must implement `ItemDataContributor<T>`:

```typescript
@Component({ /* ... */ })
export class RestrictionHeaderComponent implements ItemDataContributor<RestrictionHeaderData>, OnInit {
  readonly contributorKey = 'restrictionHeader';

  displayMode = input.required<SlotDisplayMode>();
  initialData = input<RestrictionHeaderData | undefined>();

  readonly data: Signal<RestrictionHeaderData> = computed(() => this.buildData());
  readonly isValid: Signal<boolean> = computed(() => /* validation logic */);
  readonly isDirty: Signal<boolean> = computed(() => /* dirty tracking */);

  private formAggregator = inject(FormAggregatorService);

  ngOnInit(): void {
    this.formAggregator.register(this);
  }

  markAsPristine(): void {
    // Reset dirty state
  }
}

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Strategies are `@Injectable()` | Allows DI — strategies can inject services (DialogService, etc.) but **not** `ActivatedRoute` (see below) |
| `FormAggregatorService` is component-scoped | Each host instance has its own aggregator; no cross-contamination between routes |
| `@if` instead of `[hidden]` for slot rendering | HIDDEN slots are never instantiated → saves memory and avoids phantom contributors |
| `stateVersion` counter in FormAggregator | Guarantees `canSave` re-evaluates when nested dynamic components change state |
| `SlotErrorBoundaryComponent` wraps each slot | Isolates render failures — one broken slot doesn't take down the page |
| `assembleSavePayload` is optional | View-only strategies (catalog) don't need save logic |
| `visible?` function on slots | Enables cross-slot reactivity (e.g. hiding operating days based on header toggle) |
| Providers use `provideEnvironmentInitializer` | Runs at bootstrap, before any component is created — guarantees registry readiness |
| Dynamic module loading via `module-providers.config.ts` | Disabled modules are never imported — tree-shaken into separate chunks. Adding a module requires no changes to `app.config.ts` or `main.ts` |
| `buildTrainRunBasePayload` spreads `originalItem` | Preserves backend-managed fields (e.g. `parentOperatingDays`) as-is during re-save without FE needing to know about them |
| Strategies must NOT inject `ActivatedRoute` | Strategies are environment-level singletons — `inject(ActivatedRoute)` yields the root route, not the host's route. Use `contextData['routeParams']` instead |
| Host passes `routeParams` to `contextData` for catalog views | Gives strategies safe access to route params without DI coupling to a specific route |
| Operation resolution extracted into `OrderItemOperationResolverService` | Keeps the host component lean; operation logic (copy/edit/catalog/add flows) is independently testable |
| Context building extracted into `OrderItemContextBuilderService` | Separates context assembly (ItemContext, ItemContextData) from component orchestration; host only merges module-hook and copy-extra data inline |

---

## Testing Strategy

Each layer has co-located specs:

| File | Tests |
|------|-------|
| `*strategy.spec.ts` | Slot declarations, title config, initial data extraction, edit mode, validation, save payload |
| `form-aggregator.service.spec.ts` | Registration, aggregation, validity, dirty state, reset |
| `order-item-module-registry.service.spec.ts` | Registration, resolution, enabledModules filtering |
| `order-item-host.component.spec.ts` | Route resolution, save flow, error handling, module-hook integration |
| `order-item-operation-resolver.service.spec.ts` | Copy/edit/catalog/add flow resolution, operation override, fallback logic |
| `order-item-context-builder.service.spec.ts` | ItemContext building, live context, ItemContextData assembly |
| `slot-error-boundary.component.spec.ts` | Error isolation, fallback rendering |
| `*providers.spec.ts` | Registration at bootstrap, strategy injection |
| Slot component specs (e.g. `station-list.component.spec.ts`) | ItemDataContributor contract compliance |

### Testing a New Strategy

```typescript
describe('RestrictionCreationStrategy', () => {
  let strategy: RestrictionCreationStrategy;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [RestrictionCreationStrategy] });
    strategy = TestBed.inject(RestrictionCreationStrategy);
  });

  it('should declare correct operationType and moduleId', () => { /* ... */ });
  it('should return expected component slots', () => { /* ... */ });
  it('should extract initial data from item', () => { /* ... */ });
  it('should resolve READONLY mode for offer items', () => { /* ... */ });
  it('should validate required fields before save', () => { /* ... */ });
  it('should assemble correct save payload', () => { /* ... */ });
});
```

---

## Conventions Checklist (New Module)

- [ ] Module ID added to `enabled-modules.config.ts`
- [ ] Module definition constant created (`*module-def.ts`)
- [ ] At least one strategy implementing `ItemOperationStrategy`
- [ ] Providers function using `provideEnvironmentInitializer`
- [ ] Lazy loader entry added in `module-providers.config.ts`
- [ ] Slot components implement `ItemDataContributor<T>`
- [ ] Slot components register with `FormAggregatorService` in `ngOnInit()`
- [ ] Strategy specs cover all interface methods
- [ ] Providers spec verifies registration
- [ ] No `[hidden]` in templates — use `@if` for conditional rendering
- [ ] Strategies do NOT inject `ActivatedRoute` — use `contextData['routeParams']` instead
- [ ] Translation keys added to `translations.json`
- [ ] API names added to `ordering-api-names.enum.ts` (for error handling)
