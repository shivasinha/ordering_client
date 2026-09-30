import { TabsTypesEnum } from '@Ordering/data/custom/enum/tabTypes';
import { KeyValue } from '@angular/common';
import { computed, effect, inject, Injectable, signal, WritableSignal } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Config, OrderType, Source } from '@Ordering/api';
import { ConfigDataService } from './config-data.service';
import { TranslationsService } from '@Ordering/core/services/translations.service';

@Injectable({
  providedIn: 'root',
})
export class FilterService {
  private trainFilter: FormGroup | undefined;

  private configDataService = inject(ConfigDataService);
  private tr = inject(TranslationsService);

  public filteredOrderTypes: WritableSignal<KeyValue<number, string>[]> = signal([]);
  public readonly orderTypeFilterList = computed<KeyValue<number | undefined, string>[]>(() => [
    { key: undefined, value: this.tr.translate('lblAllOrderType') },
    ...this.filteredOrderTypes(),
  ]);

  private readonly orderTypes: KeyValue<number, string>[] = [
    { key: OrderType.LTP, value: this.tr.translate('lblLtp') },
    { key: OrderType.STP, value: this.tr.translate('lblStp') },
  ];

  public readonly trainSources = computed<KeyValue<number | undefined, string>[]>(() => {
    const allSources: KeyValue<number | undefined, string>[] = [
      { key: undefined, value: this.tr.translate('lblAllSources') },
      { key: Source.RAILWAY_UNDERTAKING_WEB_PORTAL, value: this.tr.translate('lblRailwayUndertakingWebPortal') },
      { key: Source.PATH_COORDINATION_SYSTEM, value: this.tr.translate('lblPathCoordinationSystem') },
      { key: Source.INFRASTRUCTURE_MANAGER, value: this.tr.translate('lblInfrastructureManager') },
      { key: Source.RAILWAY_UNDERTAKING_TAF_TAP, value: this.tr.translate('lblRailwayUndertakingTafTap') },
    ];

    // Filter out INFRASTRUCTURE_MANAGER for Railway Undertaker users
    if (this.configDataService.isRailwayUndertakingUser()) {
      return allSources.filter(source => source.key !== Source.INFRASTRUCTURE_MANAGER);
    }

    return allSources;
  });

  constructor() {
    effect(() => {
      this.setOrderTypes();
    });
  }

  public get trainFilterState(): FormGroup | undefined {
    return this.trainFilter;
  }

  public set trainFilterState(state: FormGroup | undefined) {
    this.trainFilter = state;
  }

  /**
   * Save the state of the filter form based on the selected tab.
   *
   * This method checks the currently selected tab and saves the filter form
   * with the corresponding filter state.
   *
   * - If the selected tab is `CURRENT_ORDERS`, it saves the current order filter state.
   * - If the selected tab is `ARCHIVE_ORDERS`, it saves the archived order filter state.
   * - If the selected tab is `TRAIN_RUNS`, it saves the train run filter state.
   *
   * @param { string | undefined } selectedTabName
   * @param { FormGroup } filterForm
   * @returns {void}
   *
   */
  public saveFilterFormState(selectedTabName: string | undefined, filterForm: FormGroup): void {
    if (!filterForm || !selectedTabName) {
      return;
    }
    switch (selectedTabName) {
      case TabsTypesEnum.TRAIN_RUNS:
        this.trainFilterState = filterForm;
        break;
      default:
        break;
    }
  }

  /**
   * Patches the filter form state based on the selected tab.
   *
   * This method checks the currently selected tab and updates the filter form
   * with the corresponding filter state from the filter service.
   *
   * - If the selected tab is `CURRENT_ORDERS`, it patches the form with the current order filter state.
   * - If the selected tab is `ARCHIVE_ORDERS`, it patches the form with the archived order filter state.
   * - If the selected tab is `TRAIN_RUNS`, it patches the form with the train run filter state.
   *
   * @param { string | undefined } selectedTabName
   * @param { FormGroup } filterForm
   * @returns {void}
   */
  public patchFilterFormSate(selectedTabName: string | undefined, filterForm: FormGroup): void {
    switch (selectedTabName) {
      case TabsTypesEnum.TRAIN_RUNS:
        const trainFilterState = this.trainFilterState;
        if (trainFilterState) {
          filterForm.patchValue(trainFilterState.value);
        }
        break;
      default:
        break;
    }
  }

  /**
   * Sets the order types based on the configuration data.
   *
   * @returns {void}
   */
  public setOrderTypes(): void {
    const configData: Config = this.configDataService.configData ?? ({} as Config);
    if (Array.isArray(configData?.orderType)) {
      const filtered: KeyValue<number, string>[] = this.orderTypes.filter(orderType =>
        (configData.orderType ?? []).includes(orderType.key as number),
      );
      this.filteredOrderTypes.set(filtered);
    }
  }
}
