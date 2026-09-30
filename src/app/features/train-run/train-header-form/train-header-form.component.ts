import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, computed, DestroyRef, effect, inject, input, InputSignal, signal, Signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { debounceTime, map, startWith } from 'rxjs';

import { DaySet, OperatorResponse, TrainState } from '@Ordering/api';
import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { MasterDataHandlingService } from '@Ordering/shared/services/master-data-handling.service';
import { ConfigDataService } from '@Ordering/shared/services/config-data.service';
import { CustomValidationService } from '@Ordering/shared/services/custom-validation.service';
import { FormAggregatorService } from '@Ordering/shared/services/form-aggregator.service';
import { ItemDataContributor } from '@Ordering/shared/models/item-data-contributor.interface';
import { SlotDisplayMode } from '@Ordering/shared/models/component-slot.interface';
import { ContributorKey } from '@Ordering/data/custom/enum/contributor-key.enum';
import { sort, nullFilteredList } from '@Ordering/utils/sort-filter';
import { MAX_TRAIN_NO_LENGTH } from '@Ordering/shared/constants/train-constants';
import {
  ConfirmationDialogComponent,
  ConfirmationDialogData,
} from '@Ordering/shared/components/confirmation-dialog/confirmation-dialog.component';

export interface TrainHeaderData {
  trainNo: string;
  isConditionalTrainRun: boolean;
  hideOperatingDays: boolean;
  operatingCompany: OperatorResponse | string;
  remark: string;
  cancellationReason: string;
  state?: TrainState;
}

@Component({
  selector: 'app-train-header-form',
  standalone: true,
  imports: [CommonModule, SharedMaterialModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './train-header-form.component.html',
  styleUrl: './train-header-form.component.scss',
})
export class TrainHeaderFormComponent implements ItemDataContributor<TrainHeaderData>, AfterViewInit {
  readonly contributorKey = ContributorKey.TRAIN_HEADER;

  // --- Inputs ---
  displayMode: InputSignal<SlotDisplayMode> = input<SlotDisplayMode>(SlotDisplayMode.EDITABLE);
  showConditionalToggle = input<boolean>(true);
  lockTrainNo = input<boolean>(false);
  lockOperatingCompany = input<boolean>(false);

  /** Initial data to populate the form. Set by the host via slot inputs. */
  initialData = input<Partial<TrainHeaderData>>();

  /** Public signal for parent to read */
  readonly hideOperatingDaysSig = signal(false);

  // --- Injections ---
  private readonly aggregator = inject(FormAggregatorService, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  protected readonly tr = inject(TranslationsService);
  private readonly masterDataHandlingService = inject(MasterDataHandlingService);
  protected readonly configDataService = inject(ConfigDataService);

  protected readonly MAX_TRAIN_NO_LENGTH = MAX_TRAIN_NO_LENGTH;

  // --- Form ---
  protected trainHeaderForm = new FormGroup({
    trainNo: new FormControl<string>({ value: '', disabled: false }, [
      Validators.required,
      Validators.maxLength(MAX_TRAIN_NO_LENGTH),
      CustomValidationService.isNumericList({ onlyDigits: true }),
    ]),
    isConditionalTrainRun: new FormControl<boolean>(false),
    operatingCompany: new FormControl<OperatorResponse | string>({ value: '', disabled: false }, [
      Validators.required,
      CustomValidationService.selectionRequiredValidator({ matchRequired: true }),
    ]),
    remark: new FormControl<string>({ value: '', disabled: false }),
    cancellationReason: new FormControl<string>({ value: '', disabled: false }),
  });

  // --- Operator filtering ---
  protected filteredOperatorsSig = signal<OperatorResponse[]>([]);

  // --- Form as signal (for data) ---
  private formVersion = signal(0);
  private formValueSig = computed(() => {
    this.formVersion(); // re-trigger when manually bumped
    return this.trainHeaderForm.getRawValue();
  });

  // --- ItemDataContributor implementation ---
  readonly data: Signal<TrainHeaderData> = computed(() => {
    const raw = this.formValueSig();
    return {
      trainNo: raw.trainNo ?? '',
      isConditionalTrainRun: raw.isConditionalTrainRun ?? false,
      hideOperatingDays: this.hideOperatingDaysSig(),
      operatingCompany: raw.operatingCompany ?? '',
      remark: raw.remark ?? '',
      cancellationReason: raw.cancellationReason ?? '',
    };
  });

  // Computed: dynamic remark/cancellationReason field config
  protected readonly remarkFieldConfig = computed(() => {
    const initial = this.initialData();
    const isCancellation = !!initial?.cancellationReason || initial?.state === TrainState.CANCELLED;
    return {
      label: isCancellation ? this.tr.translate('lblCancellationReason') : this.tr.translate('lblRemark'),
      control: isCancellation ? this.trainHeaderForm.controls.cancellationReason : this.trainHeaderForm.controls.remark,
    };
  });

  // Computed: whether fields should be readonly
  protected isReadonly = computed(() => this.displayMode() !== SlotDisplayMode.EDITABLE);
  protected isTrainNoReadonly = computed(() => this.isReadonly() || this.lockTrainNo());
  protected isOperatingCompanyReadonly = computed(() => this.isReadonly() || this.lockOperatingCompany() || this.isRUUser());

  readonly isValid: Signal<boolean> = computed(() => {
    if (this.displayMode() !== SlotDisplayMode.EDITABLE) return true;
    this.formVersion(); // re-trigger on form state changes
    return this.trainHeaderForm.valid;
  });

  readonly isDirty: Signal<boolean> = computed(() => {
    if (this.displayMode() !== SlotDisplayMode.EDITABLE) return false;
    this.formVersion(); // re-trigger on form state changes
    return this.trainHeaderForm.dirty;
  });

  private initialDataApplied = false;

  constructor() {
    // Register with aggregator
    if (this.aggregator) {
      this.aggregator.register(this);
      this.destroyRef.onDestroy(() => this.aggregator!.unregister(this.contributorKey));
    }

    // Track form changes to update the data signal
    this.trainHeaderForm.valueChanges.subscribe(() => {
      this.formVersion.update(v => v + 1);
      this.aggregator?.notifyStateChange();
    });

    // Effect: react to displayMode changes
    effect(() => {
      const mode = this.displayMode();
      if (mode === SlotDisplayMode.EDITABLE) {
        this.trainHeaderForm.enable({ emitEvent: false });
        this.applyFieldLocks();
      } else {
        // In READONLY mode, disable the conditional checkbox (matching old behavior)
        this.trainHeaderForm.controls.isConditionalTrainRun.disable({ emitEvent: false });
      }
    });
  }

  ngAfterViewInit(): void {
    // Apply initial data once (outside of effects to avoid infinite CD loops)
    const initial = this.initialData();
    if (initial && !this.initialDataApplied) {
      this.initialDataApplied = true;

      // Resolve operatingCompany: strategy provides a string abbreviation,
      // but selectionRequiredValidator requires a full OperatorResponse object.
      const resolvedOperator = this.resolveOperatingCompany(initial.operatingCompany);

      this.trainHeaderForm.patchValue(
        {
          trainNo: initial.trainNo ?? '',
          isConditionalTrainRun: initial.isConditionalTrainRun ?? false,
          operatingCompany: resolvedOperator,
          remark: initial.remark ?? '',
          cancellationReason: initial.cancellationReason ?? '',
        },
        { emitEvent: false },
      );
      this.formVersion.update(v => v + 1);

      // Set hideOperatingDays based on initial conditional state
      if (initial.isConditionalTrainRun) {
        this.hideOperatingDaysSig.set(true);
        this.aggregator?.notifyStateChange();
      }
    }

    // Apply field locks
    this.applyFieldLocks();

    // Initialize operator field after the view is ready
    this.initializeOperatorField();
  }

  /**
   * Resolves the operating company to a full OperatorResponse object.
   * If value is already an object, returns it. If it's a string (abbreviation),
   * looks it up in master data. Falls back to the raw value if not found.
   */
  private resolveOperatingCompany(value: unknown): OperatorResponse | string {
    if (!value) return '';
    if (typeof value === 'object') return value as OperatorResponse;

    // For RU users, use the configured fixed operator
    if (this.configDataService.isRailwayUndertakingUser() && this.configDataService.configData?.fixedOperator) {
      return this.configDataService.configData.fixedOperator;
    }

    // Look up by abbreviation in master data
    const found = this.masterDataHandlingService.masterDataOperatorsSig().find(op => op.abbreviation === value);
    return found ?? (value as string);
  }

  markAsPristine(): void {
    this.trainHeaderForm.markAsPristine();
  }

  // --- Operator display ---
  protected getOperatorName = (operator?: OperatorResponse | string): string => {
    if (!operator) return '';
    if (typeof operator === 'string') return operator;
    return operator.name ?? '';
  };

  // --- Conditional train run change handling ---
  protected onConditionalTrainRunChange(): void {
    if (!this.trainHeaderForm.value.isConditionalTrainRun) {
      this.hideOperatingDaysSig.set(false);
      this.aggregator?.notifyStateChange();
      return;
    }

    // Check if there are operating days via the aggregator
    const operatingDaysData = this.aggregator?.getAggregatedDataSync()?.[ContributorKey.OPERATING_DAYS] as DaySet[] | undefined;
    const hasOperatingDays = operatingDaysData && operatingDaysData.length > 0;

    if (!hasOperatingDays) {
      // No operating days — hide immediately
      this.hideOperatingDaysSig.set(true);
      this.aggregator?.notifyStateChange();
      return;
    }

    // Has operating days — show confirmation dialog
    this.showConditionalTrainRunConfirmationDialog();
  }

  private showConditionalTrainRunConfirmationDialog(): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      data: {
        confirmButtonText: this.tr.translate('lblConfirm'),
        message: this.tr.translate('msgConfirmDefaultOperatingDaysUse'),
      } as ConfirmationDialogData,
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.hideOperatingDaysSig.set(true);
        this.aggregator?.notifyStateChange();
      } else {
        this.showConditionalTrainRunInfoDialog();
      }
    });
  }

  private showConditionalTrainRunInfoDialog(): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      data: {
        title: this.tr.translate('lblInfo'),
        showCancelButton: false,
        message: this.tr.translate('msgConditionalOptionIncompatible'),
      } as ConfirmationDialogData,
    });
    dialogRef.afterClosed().subscribe(() => {
      this.hideOperatingDaysSig.set(false);
      this.aggregator?.notifyStateChange();
      this.trainHeaderForm.patchValue({ isConditionalTrainRun: false });
    });
  }

  // --- Private methods ---
  private applyFieldLocks(): void {
    // Field locks are now handled via readonly template bindings (isTrainNoReadonly, isOperatingCompanyReadonly)
    // No need to disable form controls — disabled controls are excluded from validation and getRawValue issues
  }

  private isRUUser(): boolean {
    return this.configDataService.isRailwayUndertakingUser();
  }

  private initializeOperatorField(): void {
    if (this.configDataService.isRailwayUndertakingUser() && this.configDataService.configData?.fixedOperator) {
      this.trainHeaderForm.patchValue({
        operatingCompany: this.configDataService.configData.fixedOperator,
      });
    } else {
      this.filterOperatorsByUserInput();
    }
  }

  private filterOperatorsByUserInput(): void {
    this.trainHeaderForm.controls['operatingCompany'].valueChanges
      .pipe(
        startWith(''),
        debounceTime(300),
        map(query => {
          const operatorList: OperatorResponse[] = nullFilteredList<OperatorResponse, 'name'>(
            this.masterDataHandlingService.masterDataOperatorsSig(),
            ['name'],
          );
          return query && typeof query === 'string' && query.length >= 1
            ? this.filterOperators(query, operatorList)
            : operatorList
              ? sort<OperatorResponse, 'name'>(operatorList, 'name')
              : [];
        }),
      )
      .subscribe(filtered => this.filteredOperatorsSig.set(filtered));
  }

  private filterOperators(value: string, operatorList: OperatorResponse[]): OperatorResponse[] {
    const query = value.toLowerCase();
    return operatorList.filter(
      (operator: OperatorResponse) => operator.name?.toLowerCase().includes(query) || operator.id?.toString().toLowerCase().includes(query),
    );
  }
}
