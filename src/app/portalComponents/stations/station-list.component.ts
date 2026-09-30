import { Component, DestroyRef, effect, inject, input, InputSignal, signal, Signal, WritableSignal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';

import { first } from 'rxjs';

import { provideNgxMask } from 'ngx-mask';

import { TrainStop, StopTypeId } from '@Ordering/api';

import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';

import { RollingStockPropagationService } from '@Ordering/shared/services/rolling-stock-propagation.service';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { MasterDataHandlingService } from '@Ordering/shared/services/master-data-handling.service';
import { ConfigDataService } from '@Ordering/shared/services/config-data.service';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';

import { DialogAction } from '@Ordering/data/custom/enum/dialog-action.enum';

import { formatTimeToHourMinute } from '@Ordering/utils/time-format';

import { StationsTableHeader } from '@Ordering/portalComponents/stations/interfaces/stations-header.interface';
import { StationDialogComponent } from '@Ordering/portalComponents/stations/dialogs/station-dialog/station-dialog.component';
import { EnumNameList } from '@Ordering/data/custom/enum-name-list';

import { FormAggregatorService } from '@Ordering/shared/services/form-aggregator.service';
import { ItemDataContributor } from '@Ordering/shared/models/item-data-contributor.interface';
import { SlotDisplayMode } from '@Ordering/shared/models/component-slot.interface';
import { ContributorKey } from '@Ordering/data/custom/enum/contributor-key.enum';

@Component({
  selector: 'app-station-list',
  imports: [CommonModule, SharedMaterialModule, TranslatePipe],
  providers: [provideNgxMask()],
  templateUrl: './station-list.component.html',
  styleUrl: './station-list.component.scss',
})
export class StationListComponent implements ItemDataContributor<TrainStop[]> {
  // ─── ItemDataContributor ──────────────────────────────────────────────
  readonly contributorKey = ContributorKey.STOPS;
  public readonly displayMode: InputSignal<SlotDisplayMode> = input<SlotDisplayMode>(SlotDisplayMode.EDITABLE);
  public readonly initialData: InputSignal<TrainStop[]> = input<TrainStop[]>([]);
  public data: WritableSignal<TrainStop[]> = signal<TrainStop[]>([]);
  public isValid: Signal<boolean> = signal(true);
  public isDirty: WritableSignal<boolean> = signal(false);
  public markAsPristine(): void {
    this.isDirty.set(false);
  }
  // ─────────────────────────────────────────────────────────────────────

  protected isEditMode = computed(() => this.displayMode() === SlotDisplayMode.EDITABLE);

  protected EnumNameList = EnumNameList;

  protected tr = inject(TranslationsService);
  private masterDataHandlingService = inject(MasterDataHandlingService);
  private configDataService = inject(ConfigDataService);
  private propagationService = inject(RollingStockPropagationService);
  private dialog = inject(MatDialog);

  private readonly destroyRef = inject(DestroyRef);
  private readonly aggregator = inject(FormAggregatorService, { optional: true });

  protected stopTypeList: { id: StopTypeId; display: string }[] = [
    { id: StopTypeId.CIRCULATION_STOP, display: this.tr.translate('lblStopTypeCirculation') },
    { id: StopTypeId.DOT_STOP, display: this.tr.translate('lblStopTypeDot') },
    { id: StopTypeId.ENTERING_NETWORK, display: this.tr.translate('lblStopTypeEnteringNetwork') },
    { id: StopTypeId.ENTERING_NETWORK_WITHOUT_STOP, display: this.tr.translate('lblStopTypeEnteringNetworkWithoutStop') },
    { id: StopTypeId.GENERAL_STOP_STATION, display: this.tr.translate('lblStopTypeGeneralStopStation') },
    { id: StopTypeId.LEAVING_NETWORK, display: this.tr.translate('lblStopTypeLeavingNetwork') },
    { id: StopTypeId.LEAVING_NETWORK_WITHOUT_STOP, display: this.tr.translate('lblStopTypeLeavingNetworkWithoutStop') },
    { id: StopTypeId.OCCUPATION_STOP, display: this.tr.translate('lblStopTypeOccupation') },
    { id: StopTypeId.OPTIONAL_STOP_ONLY_FOR_ALIGHTING, display: this.tr.translate('lblStopTypeOptionalOnlyAlighting') },
    { id: StopTypeId.OPTIONAL_STOP_ONLY_FOR_BOARDING, display: this.tr.translate('lblStopTypeOptionalOnlyBoarding') },
    { id: StopTypeId.PARKING_STOP, display: this.tr.translate('lblStopTypeParking') },
    { id: StopTypeId.RUN_THROUGH, display: this.tr.translate('lblStopTypeRunThrough') },
    { id: StopTypeId.SCHEDULED_STOP, display: this.tr.translate('lblStopTypeScheduled') },
    { id: StopTypeId.SERVICE_STOP, display: this.tr.translate('lblStopTypeService') },
    { id: StopTypeId.SIGNAL_STOP, display: this.tr.translate('lblStopTypeSignal') },
    { id: StopTypeId.STOP_FOR_ALIGHTING_ONLY, display: this.tr.translate('lblStopTypeStopAlighting') },
    { id: StopTypeId.STOP_FOR_BOARDING_ONLY, display: this.tr.translate('lblStopTypeStopBoarding') },
    { id: StopTypeId.TECHNICAL_STOP, display: this.tr.translate('lblStopTypeTechnical') },
    { id: StopTypeId.UNDEFINED, display: this.tr.translate('lblStopTypeUndefined') },
  ];

  protected stationsTableDataSource = new MatTableDataSource<StationsTableHeader>();
  protected statiionsTableColumns = ['station', 'track', 'stopType', 'arrival', 'departure', 'trainType', 'action'];

  private selectedStationRow: number = -1;

  // Computed signals for performance optimization
  protected stationNamesMap = computed(() => {
    const stations = this.masterDataHandlingService.masterDataStationsSig();
    const enableUicCodes = this.configDataService.enableUicCodes();

    return new Map(
      stations.map(station => [station.id, enableUicCodes ? `${station.uicCode} - ${station.name}` : `${station.id} - ${station.name}`]),
    );
  });

  protected trainTypeNamesMap = computed(() => {
    const trainTypes = this.masterDataHandlingService.masterDataTrainTypesSig();
    return new Map(trainTypes.map(trainType => [trainType.id, trainType.id]));
  });

  protected stopTypeNamesMap = computed(() => {
    return new Map(this.stopTypeList.map(item => [item.id, item.display]));
  });

  constructor() {
    // Register with aggregator if available (plugin mode)
    if (this.aggregator) {
      this.aggregator.register(this);
      this.destroyRef.onDestroy(() => this.aggregator!.unregister(this.contributorKey));
    }
    // Populate station data whenever initialData changes
    effect(() => {
      const initial = this.initialData();
      if (initial && initial.length > 0) {
        this.data.set(initial);
        this.setupStationData(initial);
      }
    });
  }

  /**
   * Prepare table data and forms
   *
   * @returns {void}
   */
  private setupStationData(stationList?: TrainStop[]): void {
    const stations = stationList ?? this.initialData();
    this.stationsTableDataSource.data = stations.map((stop, index) => ({
      id: index,
      trainStop: {
        ...stop,
        arrivalTime: {
          time: formatTimeToHourMinute(stop.arrivalTime?.time),
          dayOffset: stop.arrivalTime?.dayOffset ?? 0,
        },
        departureTime: {
          time: formatTimeToHourMinute(stop.departureTime?.time),
          dayOffset: stop.departureTime?.dayOffset ?? 0,
        },
      },
    }));
  }

  /**
   * Checks to see whether a particular row is selected
   * @param {number} index
   * @returns {boolean}
   */
  protected isStationRowSelected(index: number): boolean {
    return this.selectedStationRow === index;
  }

  /**
   * Selects a row in station table
   * @param {number} index
   */
  protected selectStationRow(index: number): void {
    this.selectedStationRow = index;
  }

  /**
   * Click handler for adding a station
   *
   * @returns {void}
   */
  protected onAddStation(): void {
    this.showTrainrunDialog(DialogAction.ADD, this.stationsTableDataSource.data.length === 0);
  }

  /**
   * Click handler for editing a station
   *
   * @param {StationsTableHeader} item
   * @returns {void}
   */
  protected openStationDialog(item: StationsTableHeader): void {
    if (this.isEditMode()) {
      this.showTrainrunDialog(DialogAction.UPDATE, this.stationsTableDataSource.data.length === 0, item);
    } else {
      this.showTrainrunDialog(DialogAction.VIEW, this.stationsTableDataSource.data.length === 0, item);
    }
  }

  /**
   * Click handler for delete a station
   *
   * @param {number} index
   * @returns {void}
   */
  protected onDeleteStation(index: number): void {
    if (this.isEditMode()) {
      const dialogRef = this.dialog.open(StationDialogComponent, {
        width: '450px',
        data: {
          editItem: undefined,
          action: DialogAction.DELETE,
        },
      });

      dialogRef
        .afterClosed()
        .pipe(first())
        .subscribe((result: TrainStop) => {
          if (result) {
            const stations = [...this.stationsTableDataSource.data];
            stations.splice(index, 1);
            // Re-index stations to maintain sequential IDs after deletion
            stations.forEach((station, i) => (station.id = i));
            this.stationsTableDataSource.data = stations;
            this.selectedStationRow = -1;
            this.emitStationsChange();
          }
        });
    }
  }

  /**
   * Show station dialog equipped with data
   *
   * @param {DialogAction} action
   * @param {boolean} isFirst
   * @param {StationsTableHeader} item
   */
  private showTrainrunDialog(action: DialogAction, isFirst: boolean, item?: StationsTableHeader): void {
    const dialogRef = this.dialog.open(StationDialogComponent, {
      width: '600px',
      data: {
        stopTypes: this.stopTypeList,
        editItem: item,
        isFirstStation: isFirst,
        action: action,
      },
    });

    dialogRef
      .afterClosed()
      .pipe(first())
      .subscribe((result: StationsTableHeader) => {
        if (result) {
          item ? this.updateStation(result) : this.addStation(result);
        }
      });
  }

  /**
   * Updates a specific station within the table's data source and propagates the changes.
   *
   * This method takes an `updatedStation` object, applies its properties to the
   * corresponding station in the `stationsTableDataSource`, and then emits
   * the updated list of `trainStop` objects. It also ensures that the original
   * state of stations is preserved before modification, allowing for a clean
   * propagation of changes.
   *
   * @param {StationsTableHeader} updatedStation - The station object containing the updated properties.
   *                                             It should conform to the `StationsTableHeader` interface.
   * @returns {void}
   * @fires stationsChange - Emits an array of `TrainStop` objects after the station data has been updated.

   */
  private updateStation(updatedStation: StationsTableHeader): void {
    if (updatedStation) {
      // Store original state before making changes
      const originalStations = this.stationsTableDataSource.data.map(station => ({
        ...station,
        trainStop: { ...station.trainStop },
      }));
      this.stationsTableDataSource.data = this.propagationService.propagateUpdatedStationProperties(originalStations, updatedStation);
      this.emitStationsChange();
    }
  }

  /**
   * Adds a new station to the table's data source, creates its `trainStop` representation,
   * and then applies property inheritance across all stations.
   *
   * This method takes a `StationsTableHeader` object, uses it to construct a new
   * station entry, and appends it to the `stationsTableDataSource`. After adding,
   * it triggers a property inheritance mechanism across all stations to ensure
   * consistency and then emits the updated list of `trainStop` objects.
   *
   * @param {StationsTableHeader} result - The data object used to create the new station's `trainStop` properties.
   *                                     It should conform to the `StationsTableHeader` interface.
   * @returns {void}
   * @fires stationsChange - Emits an array of `TrainStop` objects after the new station has been added
   *                         and property inheritance has been applied.
   */
  private addStation(result: StationsTableHeader): void {
    const newStation = {
      id: this.stationsTableDataSource.data.length,
      trainStop: this.propagationService.createTrainStop(result),
    };

    // Add the new station to the data source
    this.stationsTableDataSource.data = [...this.stationsTableDataSource.data, newStation];

    // Apply property inheritance logic after adding
    const originalStations = this.stationsTableDataSource.data.map(station => ({
      ...station,
      trainStop: { ...station.trainStop },
    }));
    this.stationsTableDataSource.data = this.propagationService.triggerPropertyInheritance(originalStations);
    this.emitStationsChange();
  }

  private emitStationsChange(): void {
    const stops = this.stationsTableDataSource.data.map(d => d.trainStop);
    this.data.set(stops);
    this.isDirty.set(true);
    this.aggregator?.notifyStateChange();
  }
}
