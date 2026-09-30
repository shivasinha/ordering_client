import { OrderItemContent, TrainRun } from '@Ordering/api';
import {
  ComponentSlot,
  ItemContext,
  SlotDisplayMode,
  TitleConfig,
  ValidationResult,
} from '@Ordering/shared/models/component-slot.interface';
import { ItemContextData } from '@Ordering/shared/models/item-operation-strategy.interface';
import { UserPermissionsEnum } from '@Ordering/data/custom/enum/user-permissions.enum';
import { TrainHeaderFormComponent } from '@Ordering/features/train-run/train-header-form/train-header-form.component';
import { OperatingDaysListComponent } from '@Ordering/portalComponents/operating-days/operating-days-list/operating-days-list.component';
import { StationListComponent } from '@Ordering/portalComponents/stations/station-list.component';
import { ContributorKey } from '@Ordering/data/custom/enum/contributor-key.enum';

export { ContributorKey } from '@Ordering/data/custom/enum/contributor-key.enum';

/**
 * Shared header form data shape used by all editable train-run strategies.
 */
export interface TrainHeaderData {
  trainNo: string;
  isConditionalTrainRun: boolean;
  hideOperatingDays?: boolean;
  operatingCompany: unknown;
  remark: string;
  cancellationReason: string;
}

// ─── resolveEditMode ─────────────────────────────────────────────────

/**
 * Standard edit-mode resolution for editable train-run strategies.
 * Returns READONLY when viewing offers, IM viewing RU orders,
 * readonly order states, or lacking edit permissions.
 * @param {ItemContext} context - The current view context.
 * @returns {{ globalMode: SlotDisplayMode }} The resolved global display mode.
 */
export function resolveTrainRunEditMode(context: ItemContext): { globalMode: SlotDisplayMode } {
  const hasEditPermission = context.userPermissions.checkPermissions([
    UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER,
    UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER_ITEM,
  ]);
  return {
    globalMode:
      context.isOfferItemView || context.isIMViewingRUOrder || context.isReadonlyOrderState || !hasEditPermission
        ? SlotDisplayMode.READONLY
        : SlotDisplayMode.EDITABLE,
  };
}

// ─── validateBeforeSave ──────────────────────────────────────────────

/**
 * Validates that the first stop has trainType and tractionUnit.
 * Shared by creation, replacement, and modification strategies.
 * @param {Record<string, unknown>} aggregatedData - Form data from all slots.
 * @returns {ValidationResult} Validation outcome with any errors.
 */
export function validateTrainRunStops(aggregatedData: Record<string, unknown>): ValidationResult {
  const stops = (aggregatedData[ContributorKey.STOPS] as any[]) ?? [];

  if (stops.length === 0) {
    return { valid: true };
  }

  const firstStop = stops[0];
  const errors: { key: string; message: string }[] = [];

  if (!firstStop?.trainType) {
    errors.push({ key: 'trainType', message: 'msgErrorMissingTrainTypeStop1' });
  }
  if (!firstStop?.tractionUnit || firstStop.tractionUnit.length === 0) {
    errors.push({ key: 'tractionUnit', message: 'msgErrorMissingTractionUnitsStop1' });
  }

  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}

// ─── assembleSavePayload helpers ─────────────────────────────────────

/**
 * Extracts the operating company abbreviation from a header value
 * that may be an object with `abbreviation` or a plain string.
 * @param {unknown} operatingCompany - Raw value from form.
 * @returns {string} Abbreviation or empty string.
 */
export function extractOperatingCompany(operatingCompany: unknown): string {
  if (typeof operatingCompany === 'object' && operatingCompany !== null) {
    return (operatingCompany as any).abbreviation ?? '';
  }
  return (operatingCompany as string) || '';
}

/**
 * Resolves effective operating days for the save payload.
 * Uses project defaults when the train run is conditional.
 * @param {TrainHeaderData} header - Parsed header form data.
 * @param {any[]} operatingDays - User-entered operating days.
 * @param {ItemContextData} contextData - Context with potential defaults.
 * @returns {any[]} Effective operating days array.
 */
export function resolveEffectiveOperatingDays(
  header: TrainHeaderData,
  operatingDays: any[] | undefined,
  contextData: ItemContextData,
): any[] {
  if (header.isConditionalTrainRun) {
    return (contextData['defaultOperatingDays'] as any[]) ?? [];
  }
  return operatingDays ?? [];
}

/**
 * Builds the common base fields shared by all train-run save payloads
 * (creation, replacement, modification).
 * Spreads originalItem, then overlays trainNumber, operatingCompany,
 * operatingDays, stops, etc.
 * @param {Record<string, unknown>} aggregatedData - Form data from all slots.
 * @param {ItemContextData} contextData - Context with orderId, originalItem, etc.
 * @returns {Record<string, unknown>} Base payload fields to spread into typed objects.
 */
export function buildTrainRunBasePayload(aggregatedData: Record<string, unknown>, contextData: ItemContextData): Record<string, unknown> {
  const header = aggregatedData[ContributorKey.TRAIN_HEADER] as TrainHeaderData;
  const operatingDays = aggregatedData[ContributorKey.OPERATING_DAYS] as any[];
  const stops = aggregatedData[ContributorKey.STOPS] as any[];
  const effectiveOperatingDays = resolveEffectiveOperatingDays(header, operatingDays, contextData);

  return {
    // Spread originalItem to preserve backend-managed fields (e.g. parentOperatingDays) as-is.
    ...((contextData['originalItem'] as Record<string, unknown>) ?? {}),
    trainNumber: header.trainNo,
    isConditionalTrainRun: header.isConditionalTrainRun ?? false,
    orderId: contextData.orderId,
    operatingCompany: extractOperatingCompany(header.operatingCompany),
    remark: header.remark || '',
    operatingDays: effectiveOperatingDays,
    stops: stops ?? [],
  };
}

// ─── extractInitialData ──────────────────────────────────────────────

interface ExtractOptions {
  /** Include cancellationReason from the item (true for creation/catalog). */
  includeCancellationReason?: boolean;
  /** Include state field on trainHeader (true for creation/catalog). */
  includeState?: boolean;
}

/**
 * Extracts initial data from a train-run-like content item.
 * Works for TrainRun, TrainRunModification, and TrainRunReplacement.
 * @param {OrderItemContent} item - The order content item to extract from.
 * @param {ExtractOptions} options - Flags controlling optional fields.
 * @returns {Record<string, unknown>} Initial data keyed by contributor key.
 */
export function extractTrainRunInitialData(item: OrderItemContent, options?: ExtractOptions): Record<string, unknown> {
  const trainRun = item as TrainRun;
  const trainHeader: Record<string, unknown> = {
    trainNo: trainRun.trainNumber,
    isConditionalTrainRun: trainRun.isConditionalTrainRun ?? false,
    operatingCompany: trainRun.operatingCompany,
    remark: trainRun.remark || '',
    cancellationReason: options?.includeCancellationReason ? trainRun.cancellationReason || '' : '',
  };

  if (options?.includeState) {
    trainHeader['state'] = trainRun.state;
  }

  return {
    [ContributorKey.TRAIN_HEADER]: trainHeader,
    [ContributorKey.OPERATING_DAYS]: trainRun.operatingDays ?? [],
    [ContributorKey.STOPS]: trainRun.stops ?? [],
  };
}

// ─── getTitleConfig ──────────────────────────────────────────────────

interface TitleOptions {
  /** Append the trainNumber to the title when item is provided. */
  showTrainNumber?: boolean;
  /** Show the state badge on the title. */
  showStateBadge?: boolean;
  /** Enum name for the translatableEnum pipe (e.g. EnumNameList.TrainState). */
  stateEnumName?: string;
}

/**
 * Builds a TitleConfig for train-run strategies.
 * Translates the key, optionally appends trainNumber, and optionally includes state badge info.
 * @param {OrderItemContent | null} item - The order content item (may be null for add flow).
 * @param {string} translationKey - Translation key for the title.
 * @param {(key: string) => string} translate - Translation function from ItemContext.
 * @param {TitleOptions} options - Optional title customization.
 * @returns {TitleConfig} Title configuration with pre-resolved title string.
 */
export function buildTrainRunTitleConfig(
  item: OrderItemContent | null,
  translationKey: string,
  translate: (key: string) => string,
  options?: TitleOptions,
): TitleConfig {
  const title = resolveTitle(item, translationKey, translate, options);
  const stateBadge = resolveStateBadge(item, options);
  return stateBadge ? { title, stateBadge } : { title };
}

function resolveTitle(
  item: OrderItemContent | null,
  translationKey: string,
  translate: (key: string) => string,
  options?: TitleOptions,
): string {
  const translatedLabel = translate(translationKey);
  if (!options?.showTrainNumber || !item) return translatedLabel;

  const trainNumber = (item as TrainRun).trainNumber;
  return trainNumber ? `${translatedLabel} - ${trainNumber}` : translatedLabel;
}

function resolveStateBadge(item: OrderItemContent | null, options?: TitleOptions): TitleConfig['stateBadge'] {
  if (!options?.showStateBadge || !options.stateEnumName) return undefined;
  if (!item || !('state' in item)) return undefined;

  return {
    state: item.state,
    stateEnumName: options.stateEnumName,
  };
}

// ─── getComponentSlots ───────────────────────────────────────────────

/**
 * Per-slot overrides for the train-run slot builder.
 * All fields are optional — omitting them yields the default (visible, no extra inputs).
 */
export interface TrainRunSlotConfig {
  /** Extra inputs for the TrainHeaderFormComponent. */
  headerInputs?: ComponentSlot['inputs'];
  /** Extra inputs for the OperatingDaysListComponent. */
  operatingDaysInputs?: ComponentSlot['inputs'];
  /** Visibility function for the operating-days slot. */
  operatingDaysVisible?: ComponentSlot['visible'];
  /** Visibility function for the stops slot. Defaults to always visible. */
  stopsVisible?: ComponentSlot['visible'];
}

/**
 * Builds the standard 3-slot array (header → operatingDays → stops)
 * used by all train-run strategies. Each slot can be customized
 * through the config object; unset fields use sensible defaults.
 * @param {TrainRunSlotConfig} config - Per-slot overrides.
 * @returns {ComponentSlot[]} The configured slot array.
 */
export function buildTrainRunSlots(config: TrainRunSlotConfig = {}): ComponentSlot[] {
  return [
    {
      component: TrainHeaderFormComponent,
      contributorKey: ContributorKey.TRAIN_HEADER,
      ...(config.headerInputs !== undefined && { inputs: config.headerInputs }),
    },
    {
      component: OperatingDaysListComponent,
      contributorKey: ContributorKey.OPERATING_DAYS,
      ...(config.operatingDaysVisible !== undefined && { visible: config.operatingDaysVisible }),
      ...(config.operatingDaysInputs !== undefined && { inputs: config.operatingDaysInputs }),
    },
    {
      component: StationListComponent,
      contributorKey: ContributorKey.STOPS,
      ...(config.stopsVisible !== undefined && { visible: config.stopsVisible }),
    },
  ];
}

/**
 * Visibility function that hides the operating-days slot when
 * the header's `hideOperatingDays` flag is true.
 * Used by creation and replacement strategies.
 */
export function isOperatingDaysVisible(_context: ItemContext, aggregatedData: Record<string, unknown>): boolean {
  const header = aggregatedData[ContributorKey.TRAIN_HEADER] as TrainHeaderData | undefined;
  return !header?.hideOperatingDays;
}

/**
 * Visibility function that hides the operating-days slot when
 * the header's `isConditionalTrainRun` flag is true.
 * Used by the modification strategy.
 */
export function isConditionalTrainRunVisible(_context: ItemContext, aggregatedData: Record<string, unknown>): boolean {
  const header = aggregatedData[ContributorKey.TRAIN_HEADER] as TrainHeaderData | undefined;
  return !header?.isConditionalTrainRun;
}
