import { Component, computed, Inject, inject, OnInit, Optional, Signal, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { debounceTime, map, merge } from 'rxjs';

import { StationResponse, StationTrack, StopTypeId, TractionUnit, TrainTypeResponse } from '@Ordering/api';

import { SearchOptions, SearchService } from '@Ordering/shared/services/search.service';
import { HighlightSearchPipe } from '@Ordering/shared/pipes/highlight-search.pipe';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { DialogAction } from '@Ordering/data/custom/enum/dialog-action.enum';
import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { CustomValidationService } from '@Ordering/shared/services/custom-validation.service';
import { StationsTableHeader } from '@Ordering/portalComponents/stations/interfaces/stations-header.interface';
import { MasterDataHandlingService } from '@Ordering/shared/services/master-data-handling.service';
import { MultiChipAutocompleteComponent } from '@Ordering/shared/components/multi-chip-autocomplete/multi-chip-autocomplete.component';
import { MultiChipAutocompleteConfig } from '@Ordering/shared/components/multi-chip-autocomplete/multi-chip-autocomplete-config.interface';
import { ConfigDataService } from '@Ordering/shared/services/config-data.service';
import { RollingStockPropagationService } from '@Ordering/shared/services/rolling-stock-propagation.service';
import { sort, nullFilteredList } from '@Ordering/utils/sort-filter';
import { formatTimeToHourMinute } from '@Ordering/utils/time-format';

export interface DialogData {
  stations: StationResponse[];
  stopTypes: { id: StopTypeId; display: string }[];
  trainTypes: TrainTypeResponse[];
  editItem: StationsTableHeader;
  isFirstStation: boolean;
  action: DialogAction;
}

@Component({
  selector: 'app-station-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SharedMaterialModule,
    NgxMaskDirective,
    TranslatePipe,
    MultiChipAutocompleteComponent,
    HighlightSearchPipe,
  ],
  providers: [provideNgxMask()],
  templateUrl: './station-dialog.component.html',
  styleUrl: './station-dialog.component.scss',
})
export class StationDialogComponent implements OnInit {
  protected tr: TranslationsService = inject(TranslationsService);
  protected configDataService: ConfigDataService = inject(ConfigDataService);
  protected masterDataHandlingService: MasterDataHandlingService = inject(MasterDataHandlingService);
  private searchService = inject(SearchService);
  private propagationService: RollingStockPropagationService = inject(RollingStockPropagationService);
  // protected isEditMode: boolean = this.dialogData?.action !== DialogAction.VIEW;
  protected isEditMode: boolean = false;
  protected canConfirmForm: boolean = false;

  protected dialogForm: FormGroup = new FormGroup({
    areaCode: new FormControl<string | undefined>(
      {
        value: undefined,
        disabled: false,
      },
      [Validators.required, CustomValidationService.selectionRequiredValidator({ selectionRequired: true })],
    ),
    station: new FormControl<{ id: StopTypeId; display: string } | string | undefined>(
      {
        value: undefined,
        disabled: false,
      },
      [Validators.required, CustomValidationService.selectionRequiredValidator({ selectionRequired: true })],
    ),
    arrivalTime: new FormControl<number | undefined>({
      value: undefined,
      disabled: false,
    }),
    departureTime: new FormControl<number | undefined>({
      value: undefined,
      disabled: false,
    }),
    stopType: new FormControl<StopTypeId | undefined>(
      {
        value: undefined,
        disabled: false,
      },
      [Validators.required],
    ),
    stationTrack: new FormControl<number | undefined>({
      value: undefined,
      disabled: false,
    }),
    trainType: new FormControl<string | undefined>({
      value: undefined,
      disabled: false,
    }),
    tractionUnit: new FormControl<TractionUnit[] | undefined>({
      value: undefined,
      disabled: false,
    }),
    trainLength: new FormControl<number | undefined>({
      value: undefined,
      disabled: false,
    }),
    trainWeight: new FormControl<number | undefined>({
      value: undefined,
      disabled: false,
    }),
    axleLoad: new FormControl<number | undefined>({
      value: undefined,
      disabled: false,
    }),
    maximumVelocity: new FormControl<number | undefined>({
      value: undefined,
      disabled: false,
    }),
    brakingPercentage: new FormControl<number | undefined>(
      {
        value: undefined,
        disabled: false,
      },
      [Validators.min(0), Validators.max(999)],
    ),
  });

  private dialogAction: DialogAction | undefined;

  protected stopTypesSig: WritableSignal<{ id: StopTypeId; display: string }[]> = signal<{ id: StopTypeId; display: string }[]>([]);
  protected filteredStationsSig: WritableSignal<StationResponse[]> = signal<StationResponse[]>([]);
  protected tracksListSig: WritableSignal<StationTrack[]> = signal<StationTrack[]>([]);
  protected currentStationSearchQuery = signal<string>(''); // Track current search query for highlighting

  //! Marks that the user changed the rolling stock (Traction Units or Train Type) at this stop.
  private rollingStockChangedSig: WritableSignal<boolean> = signal<boolean>(false);

  private editItem: StationsTableHeader | undefined;
  private dialogFormValueSig = signal(this.dialogForm.getRawValue());
  protected isFirstStation: boolean = false;
  protected pageReady: boolean = false;
  protected areTimeEntriesValid: boolean = true; // New property to track time validity
  protected tractionUnitList: Signal<TractionUnit[]> = computed(() =>
    nullFilteredList<TractionUnit, 'id'>(this.masterDataHandlingService.masterDataTractionUnitsSig(), ['id']),
  );

  // Config object for traction unit multi-chip autocomplete
  protected tractionUnitConfig: Signal<MultiChipAutocompleteConfig<TractionUnit>> = computed(() => ({
    label: this.tr.translate('lblTractionUnits'),
    placeholder: this.tr.translate('lblSelectTractionUnits'),
    options: this.tractionUnitList(),
    displayProperty: 'id' as keyof TractionUnit,
    valueProperty: 'id' as keyof TractionUnit,
    searchProperties: ['id' as keyof TractionUnit],
    readonly: !this.isEditMode,
    required: false,
    allowDuplicates: true,
    emitObjects: true,
  }));

  protected useUicCodes = computed(() => this.configDataService.enableUicCodes());
  protected readonly canResetToModelTrainSig = computed(() => {
    const stop = this.editItem?.trainStop;
    const baseline = stop?.modelTrainValues;
    if (!this.isEditMode || !stop || !baseline || this.rollingStockChangedSig()) {
      return false;
    }
    if (!this.propagationService.isBaselineAlignedWithRollingStock(stop)) {
      return false;
    }
    return RollingStockPropagationService.MODEL_TRAIN_KEYS.some(key => this.propagationService.isUserInfluenced(stop, key));
  });
  protected readonly userInfluencedSig = computed(() => {
    const formValue = this.dialogFormValueSig();
    const stop = this.editItem
      ? {
          ...this.editItem.trainStop,
          trainType: formValue.trainType,
          tractionUnit: formValue.tractionUnit || undefined,
          trainLength: formValue.trainLength ?? undefined,
          trainWeight: formValue.trainWeight ?? undefined,
          axleLoad: formValue.axleLoad ?? undefined,
          maximumVelocity: formValue.maximumVelocity ?? undefined,
          brakingPercentage: formValue.brakingPercentage ?? undefined,
        }
      : undefined;

    return {
      trainLength: this.propagationService.isUserInfluenced(stop, 'trainLength'),
      trainWeight: this.propagationService.isUserInfluenced(stop, 'trainWeight'),
      axleLoad: this.propagationService.isUserInfluenced(stop, 'axleLoad'),
      maximumVelocity: this.propagationService.isUserInfluenced(stop, 'maximumVelocity'),
      brakingPercentage: this.propagationService.isUserInfluenced(stop, 'brakingPercentage'),
    };
  });
  public get dialogTitle(): string {
    switch (this.dialogAction) {
      case DialogAction.ADD:
        return this.tr.translate('lblAddStation');
      case DialogAction.UPDATE:
        return this.tr.translate('lblUpdateStation');
      case DialogAction.DELETE:
        return this.tr.translate('lblDeleteStation');
      case DialogAction.VIEW:
        return this.tr.translate('lblViewStation');
      default:
        return '';
    }
  }

  public get actionName(): string {
    switch (this.dialogAction) {
      case DialogAction.ADD:
        return this.tr.translate('lblAdd');
      case DialogAction.UPDATE:
        return this.tr.translate('lblUpdate');
      case DialogAction.DELETE:
        return this.tr.translate('lblDelete');
      default:
        return '';
    }
  }

  protected get isDelete(): boolean {
    return this.dialogAction === DialogAction.DELETE;
  }

  constructor(
    protected dialogRef: MatDialogRef<StationDialogComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) protected dialogData: DialogData | undefined,
  ) {
    if (dialogData) {
      const stopType: { id: StopTypeId; display: string }[] | undefined = dialogData.stopTypes;
      this.stopTypesSig.set(stopType ? sort<{ id: StopTypeId; display: string }, 'display'>(dialogData.stopTypes, 'display') : stopType);
      this.editItem = dialogData.editItem;
      this.isFirstStation = dialogData.isFirstStation;
      this.dialogAction = dialogData.action;
      this.isEditMode = dialogData.action !== DialogAction.VIEW;
    }
  }

  ngOnInit(): void {
    this.setupComponents();
    this.dialogFormValueSig.set(this.dialogForm.getRawValue());

    this.dialogForm.valueChanges.subscribe(() => {
      this.dialogFormValueSig.set(this.dialogForm.getRawValue());
      this.canConfirm();
    });

    this.clearInheritedOnRollingStockChange();
  }

  /**
   * Wires the Model Train reset semantics required by SolCon TPRPLAN-13552, condition 4:
   * whenever the user changes the rolling stock (Traction Units or Train Type) at this stop,
   * every Model Train characteristic previously assumed at the stop must be discarded and the
   * Reset button must be suppressed because the `modelTrainValues` baseline no longer describes
   * the currently selected Model Train.
   *
   * The subscription is installed after `setupComponents` so the initial `patchValue` used to
   * populate the form in edit mode does not trigger a clear by itself.
   *
   * @returns {void}
   */
  private clearInheritedOnRollingStockChange(): void {
    const controls = this.dialogForm.controls;
    merge(controls['tractionUnit'].valueChanges, controls['trainType'].valueChanges).subscribe(() => {
      if (this.rollingStockChangedSig()) {
        return;
      }
      this.rollingStockChangedSig.set(true);
      this.dialogForm.patchValue({
        trainLength: undefined,
        trainWeight: undefined,
        axleLoad: undefined,
        maximumVelocity: undefined,
        brakingPercentage: undefined,
      });
    });
  }

  /**
   * Determines whether the confirmation action can be performed.
   *
   * @returns {boolean} - Returns `true` if the action can be confirmed, otherwise `false`.
   *
   * The method checks the following conditions:
   * - If the action is a delete action (`this.isDelete`), it returns `true`.
   * - If the form controls for 'station' and 'stopType' do not have 'required' or 'selectionRequired' errors, it returns `true`.
   * - Otherwise, it returns `false`.
   */
  protected canConfirm(): void {
    if (this.isDelete) {
      this.canConfirmForm = true;
      return;
    }

    this.canConfirmForm = this.isFormValid();
  }

  /**
   * Checks if the form is valid by verifying individual control errors.
   * @returns {boolean} - Returns true if the form is valid, otherwise false.
   */
  private isFormValid(): boolean {
    const { station, stopType, brakingPercentage, departureTime, arrivalTime } = this.dialogForm.controls;

    return (
      !this.dialogForm.valid && // Ensure the entire form is valid
      !station.hasError('required') &&
      !station.hasError('selectionRequired') &&
      !stopType.hasError('required') &&
      !brakingPercentage.hasError('min') &&
      !brakingPercentage.hasError('max') &&
      !departureTime.hasError('required') &&
      !arrivalTime.hasError('required')
    );
  }

  /**
   * Converts a given time (in number format) into an object containing a formatted time string
   * and a day offset. If the input time is undefined, it returns default values.
   *
   * @param {number | undefined} time - The time to be converted, represented as a number or undefined.
   * @returns An object containing:
   *   - `time`: A formatted time string in "hour:minute" format, or an empty string if the input is undefined.
   *   - `dayOffset`: A number representing the day offset, defaulting to 0.
   */
  private getTimeObject(time: number | undefined): { time: string; dayOffset: number } {
    if (!time) {
      return {
        time: '',
        dayOffset: 0,
      };
    }

    return {
      time: formatTimeToHourMinute(time),
      dayOffset: 0,
    };
  }

  /**
   * Returns sorted TrainTypeResponse.
   */
  protected get trainType(): TrainTypeResponse[] {
    // [TODO]: REFACTOR type and confirm `id` optional in TrainTypeResponse
    const trainTypeList: TrainTypeResponse[] = nullFilteredList<any, 'id'>(this.masterDataHandlingService.masterDataTrainTypesSig(), [
      'id',
    ]);
    return sort<any, 'id'>(trainTypeList, 'id');
  }

  /**
   * Restores the propagatable characteristics on the dialog form to the Model Train baseline
   * stored on the currently edited stop.
   *
   * Only characteristics that are actually present in the baseline are reset; missing
   * baseline values must not clear the current form value. All Model Train characteristics
   * that are present are reset simultaneously; individual characteristics cannot be reset
   * independently (SolCon TPRPLAN-13552, condition 5).
   *
   * @returns {void}
   */
  protected resetToModelTrain(): void {
    const stop = this.editItem?.trainStop;
    if (!stop || !stop.modelTrainValues) {
      return;
    }
    const reset = this.propagationService.resetToModelTrainValues(stop);
    const patch: Record<string, unknown> = {};
    for (const key of RollingStockPropagationService.MODEL_TRAIN_KEYS) {
      if (reset[key] !== stop[key]) {
        patch[key] = reset[key];
      }
    }
    if (Object.keys(patch).length === 0) {
      return;
    }
    this.dialogForm.patchValue(patch);
    this.dialogForm.markAsDirty();
    this.canConfirm();
  }

  /**
   * Closes the dialog and returns an object with the necessary data.
   * The returned object may include the action, operating days,
   * start date, and end date, depending on the implementation.
   */
  protected confirm(): void {
    const stationTrackObj = {
      id: this.dialogForm.value.stationTrack,
    };

    const trainStop = {
      areaCode: this.dialogForm.value.station?.areaCode,
      station: this.dialogForm.value.station?.id,
      arrivalTime: this.getTimeObject(this.dialogForm.value.arrivalTime),
      departureTime: this.getTimeObject(this.dialogForm.value.departureTime),
      stopType: this.dialogForm.value.stopType,
      stationTrack: stationTrackObj,
      trainType: this.dialogForm.value.trainType,
      tractionUnit: this.dialogForm.value.tractionUnit || [],
      trainLength: this.dialogForm.value.trainLength,
      trainWeight: this.dialogForm.value.trainWeight,
      axleLoad: this.dialogForm.value.axleLoad,
      maximumVelocity: this.dialogForm.value.maximumVelocity,
      brakingPercentage: this.dialogForm.value.brakingPercentage,
      // Preserve the Model Train baseline so downstream logic can still detect
      // user-influenced values and support the explicit reset action.
      modelTrainValues: this.editItem?.trainStop.modelTrainValues,
    };
    this.dialogRef.close({
      id: this.editItem?.id,
      trainStop: trainStop, // Grouped under trainStop
    });
  }

  /**
   * Generates a display value for a given station.
   *
   * @param station - The station data entry containing display and unique properties.
   * @returns {string} combining the display and unique properties of the station.
   */
  protected getDisplayValueForStation = (station: StationResponse): string => {
    if (!station) return '';
    const identifier = this.useUicCodes() ? station.uicCode : station.id;
    return `${identifier} - ${station.name}`;
  };

  /**
   * Sets up the form values (in edit mode) and initializes the stations filter.
   */
  private setupComponents(): void {
    if (this.editItem) {
      this.dialogForm.patchValue({
        station: this.masterDataHandlingService
          .masterDataStationsSig()
          ?.find(station => station.id === this.editItem!.trainStop.station) as any,
        arrivalTime: this.editItem.trainStop.arrivalTime?.time,
        departureTime: this.editItem.trainStop.departureTime.time,
        stopType: this.editItem.trainStop.stopType,
        stationTrack: this.editItem.trainStop.stationTrack?.id,
        trainType: this.editItem.trainStop.trainType,
        tractionUnit: this.editItem.trainStop.tractionUnit,
        trainLength: this.editItem.trainStop.trainLength,
        trainWeight: this.editItem.trainStop.trainWeight,
        axleLoad: this.editItem.trainStop.axleLoad,
        maximumVelocity: this.editItem.trainStop.maximumVelocity,
        brakingPercentage: this.editItem.trainStop.brakingPercentage,
      });
    }
    this.setupStationTracks();
    this.filterStationsByUserInput();
  }

  /** */
  private setupStationTracks(): void {
    const stationControl = this.dialogForm.controls['station'];

    // Initialize with existing value if present
    const initialStation: StationResponse = stationControl.value;
    if (initialStation) {
      this.tracksListSig.set(initialStation.tracks);
    }

    // Subscribe to value changes
    stationControl.valueChanges.subscribe((station: StationResponse) => {
      if (station) {
        this.tracksListSig.set(station.tracks);
      } else {
        this.tracksListSig.set([]); // Ensure an array is always set
      }
    });
  }

  //[TODO]: REFACTOR
  private filterStationsByUserInput(): void {
    this.dialogForm.controls['station'].valueChanges
      .pipe(
        debounceTime(300),
        map(query => {
          const searchQuery = typeof query === 'string' ? query : '';
          this.currentStationSearchQuery.set(searchQuery);

          const stationList: StationResponse[] = nullFilteredList<StationResponse, 'name'>(
            this.masterDataHandlingService.masterDataStationsSig(),
            ['name'],
          );
          const stationSearchOptions: SearchOptions<StationResponse> = {
            query: searchQuery,
            items: stationList,
            searchFields: this.searchService.createStationSearchOptions(),
            sortKey: 'name',
            config: { prioritySearch: true },
          };
          return this.searchService.search(stationSearchOptions);
        }),
      )
      .subscribe(filtered => this.filteredStationsSig.set(filtered));
  }

  /**
   * Checks if the given text contains invalid characters for integer input.
   *
   * @param {string} text - The text to validate.
   * @returns {boolean} - True if the text contains invalid characters, false otherwise.
   */
  private hasInvalidChars(text: string): boolean {
    const invalidChars = ['-', '+', 'e', 'E'];
    return invalidChars.some(char => text.includes(char));
  }

  /**
   * Validates keyboard input to ensure only integer values are entered.
   * Prevents invalid characters from being typed into the input field.
   *
   * @param {KeyboardEvent} event - The keyboard event triggered by user input
   * @returns {void}
   */
  protected validateIntegerValue(event: KeyboardEvent): void {
    if (this.hasInvalidChars(event.key)) {
      event.preventDefault(); // Stop the key from being entered
    }
  }

  /**
   * Validates that pasted text contains only valid integer characters.
   * Prevents the paste operation if invalid characters are detected.
   *
   * @param {ClipboardEvent} event - The clipboard event containing the pasted data
   * @returns {void}
   */
  protected validateIntegerPaste(event: ClipboardEvent): void {
    const pastedText = event.clipboardData?.getData('text') || '';

    if (this.hasInvalidChars(pastedText)) {
      event.preventDefault(); // Stop the paste operation
    }
  }
}
