import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, effect, inject, input, InputSignal, Signal, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { AdminDataEntry } from '@Ordering/api';
import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { RESTRICTION_REFCODE_GROUPS, RestrictionRefCodeGroup } from '@Ordering/shared/constants/restriction-refcode-groups';
import { ContributorKey } from '@Ordering/data/custom/enum/contributor-key.enum';
import { SlotDisplayMode } from '@Ordering/shared/models/component-slot.interface';
import { ItemDataContributor } from '@Ordering/shared/models/item-data-contributor.interface';
import { FormAggregatorService } from '@Ordering/shared/services/form-aggregator.service';
import { MasterDataHandlingService } from '@Ordering/shared/services/master-data-handling.service';

/**
 * Data contract for the restriction header contributor.
 */
export interface RestrictionHeaderData {
  name: string;
  referenceId: string;
  busRefId: string | null;
  description: string;
  operatingCompanyID: string | null;
  projectId: string | null;
  subProjectId: string | null;
  workTypeId: string | null;
  lineOfWorkId: string | null;
  notesForPlanner: string;
  yellowFleetId: string | null;
  interruptible: string | null;
  speedRestriction: boolean;
  catShutOff: boolean;
}

/**
 * Generic select option used by the restriction header form.
 */
export interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-restriction-header-form',
  standalone: true,
  imports: [CommonModule, SharedMaterialModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './restriction-header-form.component.html',
  styleUrl: './restriction-header-form.component.scss',
})
/**
 * Header contributor for the restriction creation flow.
 *
 * Provides the editable form that collects the main restriction metadata and
 * exposes it through the shared contributor contract.
 */
export class RestrictionHeaderFormComponent implements ItemDataContributor<RestrictionHeaderData> {
  readonly contributorKey = ContributorKey.RESTRICTION_HEADER;

  displayMode: InputSignal<SlotDisplayMode> = input<SlotDisplayMode>(SlotDisplayMode.EDITABLE);
  initialData = input<Partial<RestrictionHeaderData>>();

  // Dropdowns sourced from OpenAPI-backed master data (organizations,
  // restriction projects, restriction sub-projects, type-of-works, refcodes).
  // Line of work, interruptible, and yellow fleet are filtered
  // from the shared refcodes cache via RESTRICTION_REFCODE_GROUPS.

  private readonly aggregator = inject(FormAggregatorService, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly masterDataHandlingService = inject(MasterDataHandlingService);

  protected form = new FormGroup({
    name: new FormControl<string>('', [Validators.required]),
    referenceId: new FormControl<string>(''),
    busRefId: new FormControl<string | null>(null),
    description: new FormControl<string>(''),
    operatingCompanyID: new FormControl<string | null>(null, [Validators.required]),
    projectId: new FormControl<string | null>(null),
    subProjectId: new FormControl<string | null>(null),
    workTypeId: new FormControl<string | null>(null, [Validators.required]),
    lineOfWorkId: new FormControl<string | null>(null, [Validators.required]),
    notesForPlanner: new FormControl<string>(''),
    yellowFleetId: new FormControl<string | null>(null),
    interruptible: new FormControl<string | null>(null),
    speedRestriction: new FormControl<boolean>(false),
    catShutOff: new FormControl<boolean>(false),
  });

  private formVersion = signal(0);

  readonly data: Signal<RestrictionHeaderData> = computed(() => {
    this.formVersion();
    const raw = this.form.getRawValue();
    return {
      name: raw.name ?? '',
      referenceId: raw.referenceId ?? '',
      busRefId: raw.busRefId ?? null,
      description: raw.description ?? '',
      operatingCompanyID: raw.operatingCompanyID ?? null,
      projectId: raw.projectId ?? null,
      subProjectId: raw.subProjectId ?? null,
      workTypeId: raw.workTypeId ?? null,
      lineOfWorkId: raw.lineOfWorkId ?? null,
      notesForPlanner: raw.notesForPlanner ?? '',
      yellowFleetId: raw.yellowFleetId ?? null,
      interruptible: raw.interruptible ?? null,
      speedRestriction: raw.speedRestriction ?? false,
      catShutOff: raw.catShutOff ?? false,
    };
  });

  readonly isValid: Signal<boolean> = computed(() => {
    if (this.displayMode() !== SlotDisplayMode.EDITABLE) return true;
    this.formVersion();
    return this.form.valid;
  });

  readonly isDirty: Signal<boolean> = computed(() => {
    if (this.displayMode() !== SlotDisplayMode.EDITABLE) return false;
    this.formVersion();
    return this.form.dirty;
  });

  protected isReadonly = computed(() => this.displayMode() !== SlotDisplayMode.EDITABLE);

  // Track the selected projectId reactively so we can fetch its sub-projects on demand.
  private readonly selectedProjectIdSig = signal<string | null>(null);

  protected operatingCompanyOptions: Signal<SelectOption[]> = computed(() =>
    RestrictionHeaderFormComponent.toSelectOptions(this.masterDataHandlingService.masterDataOrganizationsSig()),
  );
  protected projectOptions: Signal<SelectOption[]> = computed(() =>
    RestrictionHeaderFormComponent.toSelectOptions(this.masterDataHandlingService.masterDataRestrictionProjectsSig()),
  );
  protected subProjectOptions: Signal<SelectOption[]> = computed(() => {
    const projectId = this.selectedProjectIdSig();
    if (projectId == null) {
      return [];
    }
    const entries = this.masterDataHandlingService.masterDataRestrictionSubProjectsSig()[projectId] ?? [];
    return RestrictionHeaderFormComponent.toSelectOptions(entries);
  });
  protected workTypeOptions: Signal<SelectOption[]> = computed(() =>
    RestrictionHeaderFormComponent.toSelectOptions(this.masterDataHandlingService.masterDataTypeOfWorksSig()),
  );
  protected lineOfWorkOptions: Signal<SelectOption[]> = this.refCodeGroupOptions(RESTRICTION_REFCODE_GROUPS.LINE_OF_WORK);
  protected interruptibleOptions: Signal<SelectOption[]> = this.refCodeGroupOptions(RESTRICTION_REFCODE_GROUPS.INTERRUPTIBLE);
  protected yellowFleetOptions: Signal<SelectOption[]> = this.refCodeGroupOptions(RESTRICTION_REFCODE_GROUPS.YELLOW_FLEET);

  /**
   * Synchronises the enabled state of the sub-project control with the current project selection.
   */
  private syncSubProjectControlState(): void {
    const subProjectControl = this.form.controls.subProjectId;
    const hasProjectSelection = this.form.controls.projectId.value != null;

    if (this.displayMode() !== SlotDisplayMode.EDITABLE) {
      return;
    }

    if (hasProjectSelection) {
      if (subProjectControl.disabled) {
        subProjectControl.enable({ emitEvent: false });
      }
      return;
    }

    if (subProjectControl.enabled) {
      subProjectControl.disable({ emitEvent: false });
    }
  }

  /**
   * Builds a select-option signal for a ref-code group.
   *
   * @param {RestrictionRefCodeGroup} group - Ref-code group descriptor.
   * @returns {Signal<SelectOption[]>} Signal with the mapped options for the group.
   */
  private refCodeGroupOptions(group: RestrictionRefCodeGroup): Signal<SelectOption[]> {
    return computed(() => {
      const entries = this.masterDataHandlingService.masterDataRefCodeGroupsSig()[group.table] ?? [];
      return RestrictionHeaderFormComponent.toSelectOptions(entries);
    });
  }

  /**
   * Maps raw admin data entries to select options.
   *
   * @param {AdminDataEntry[]} entries - Admin data entries to transform.
   * @returns {SelectOption[]} Select options for the provided entries.
   */
  private static toSelectOptions(entries: AdminDataEntry[]): SelectOption[] {
    return entries.map(entry => ({ value: entry.id, label: entry.display }));
  }

  private initialDataApplied = false;

  /**
   * Creates the restriction header contributor and wires its reactive state.
   */
  constructor() {
    if (this.aggregator) {
      this.aggregator.register(this);
      this.destroyRef.onDestroy(() => this.aggregator!.unregister(this.contributorKey));
    }

    // Prime parameterless master-data caches (service skips refetch if already populated).
    this.masterDataHandlingService.fetchRefCodes();
    this.masterDataHandlingService.fetchOrganizations();
    this.masterDataHandlingService.fetchRestrictionProjects();
    this.masterDataHandlingService.fetchTypeOfWorks();

    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => {
      this.formVersion.update(v => v + 1);
      // Reset sub-project selection and request the new project's sub-projects when projectId changes.
      const nextProjectId = value.projectId ?? null;
      if (nextProjectId !== this.selectedProjectIdSig()) {
        this.selectedProjectIdSig.set(nextProjectId);
        if (nextProjectId != null) {
          this.masterDataHandlingService.fetchRestrictionSubProjects(nextProjectId);
        }
        if (this.form.controls.subProjectId.value != null) {
          this.form.controls.subProjectId.setValue(null, { emitEvent: false });
        }
      }
      this.syncSubProjectControlState();
      this.aggregator?.notifyStateChange();
    });

    effect(() => {
      const initial = this.initialData();
      if (initial && !this.initialDataApplied) {
        this.initialDataApplied = true;
        this.form.patchValue(
          {
            name: initial.name ?? '',
            referenceId: initial.referenceId ?? '',
            busRefId: initial.busRefId ?? null,
            description: initial.description ?? '',
            operatingCompanyID: initial.operatingCompanyID ?? null,
            projectId: initial.projectId ?? null,
            subProjectId: initial.subProjectId ?? null,
            workTypeId: initial.workTypeId ?? null,
            lineOfWorkId: initial.lineOfWorkId ?? null,
            notesForPlanner: initial.notesForPlanner ?? '',
            yellowFleetId: initial.yellowFleetId ?? null,
            interruptible: initial.interruptible ?? null,
            speedRestriction: initial.speedRestriction ?? false,
            catShutOff: initial.catShutOff ?? false,
          },
          { emitEvent: false },
        );
        this.formVersion.update(v => v + 1);
        // Sync selected project tracker and pre-fetch its sub-projects so the dropdown is populated.
        const initialProjectId = initial.projectId ?? null;
        this.selectedProjectIdSig.set(initialProjectId);
        if (initialProjectId != null) {
          this.masterDataHandlingService.fetchRestrictionSubProjects(initialProjectId);
        }
      }

      if (this.displayMode() === SlotDisplayMode.EDITABLE) {
        this.form.enable({ emitEvent: false });
        this.syncSubProjectControlState();
      } else {
        this.form.disable({ emitEvent: false });
      }
    });
  }

  /**
   * Marks the underlying form as pristine after a successful save.
   */
  public markAsPristine(): void {
    this.form.markAsPristine();
  }
}
