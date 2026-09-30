import { CommonModule } from '@angular/common';
import { Component, inject, signal, computed, OnDestroy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';

import { PresavedODTTemplate } from '@Ordering/api';

import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { PresavedTemplateService } from '@Ordering/portalComponents/operating-days/presaved-template/services/presaved-template.service';
import { PresavedTemplateFilterCriteria } from '@Ordering/portalComponents/operating-days/presaved-template/models/presaved-template-filter.interface';
import { PresavedTemplateFilterComponent } from '@Ordering/portalComponents/operating-days/presaved-template/presaved-template-filter/presaved-template-filter.component';
import { PresavedTemplateListComponent } from '@Ordering/portalComponents/operating-days/presaved-template/presaved-template-list/presaved-template-list.component';

@Component({
  selector: 'app-presaved-template-dialog',
  imports: [CommonModule, SharedMaterialModule, TranslatePipe, PresavedTemplateFilterComponent, PresavedTemplateListComponent],
  templateUrl: './presaved-template-dialog.component.html',
  styleUrl: './presaved-template-dialog.component.scss',
})
export class PresavedTemplateDialogComponent implements OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly presavedTemplateService = inject(PresavedTemplateService);
  public readonly dialogRef = inject(MatDialogRef<PresavedTemplateDialogComponent>);

  // State signals for component communication
  protected readonly filterCriteria = signal<PresavedTemplateFilterCriteria | null>(null);
  protected readonly templates = signal<Array<PresavedODTTemplate>>([]);
  protected readonly selectedTemplate = signal<PresavedODTTemplate | null>(null);
  protected readonly hasSearched = signal<boolean>(false);
  /**
   * Computed property that determines whether a template can be applied.
   *
   * @returns {boolean} `true` if a template is currently selected (selectedTemplate is not null),
   * `false` otherwise.
   */
  protected readonly canApplyTemplate = computed(() => {
    return this.selectedTemplate() !== null;
  });

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handles the application of filter criteria to the presaved templates.
   * Updates the internal filter criteria state and triggers a reload of templates
   * based on the new filtering parameters.
   *
   * @param {PresavedTemplateFilterCriteria} criteria - The filter criteria to apply when loading templates
   *
   * @returns {void}
   */
  protected onFilterApplied(criteria: PresavedTemplateFilterCriteria): void {
    this.filterCriteria.set(criteria);
    this.loadTemplates(criteria);
  }

  /**
   * Handles the selection of a presaved operating days template.
   * Updates the selected template signal with the provided template.
   *
   * @param {PresavedODTTemplate} template - The presaved operating days template that was selected
   * @returns {void}
   */
  protected onTemplateSelected(template: PresavedODTTemplate): void {
    this.selectedTemplate.set(template);
  }

  /**
   * Loads presaved templates based on the provided filter criteria.
   *
   * This method subscribes to the presaved template service to fetch templates
   * and updates the component's reactive state accordingly. The loading state
   * is managed by the service itself.
   *
   * - Automatically unsubscribes when the component is destroyed via `takeUntil(this.destroy$)`
   * - Sets `hasSearched` to true regardless of success or failure
   * - Clears any previously selected template on successful load
   * - Sets templates to empty array on error and logs the error to console
   * @param {PresavedTemplateFilterCriteria} criteria - The filter criteria used to query presaved templates
   *
   * @returns {void}
   */
  private loadTemplates(criteria: PresavedTemplateFilterCriteria): void {
    this.presavedTemplateService
      .getPresavedTemplates(criteria)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: templates => {
          this.templates.set(templates);
          this.hasSearched.set(true);
          this.selectedTemplate.set(null); // Clear previous selection
        },
        error: error => {
          this.templates.set([]);
          this.hasSearched.set(true);
          console.error('Failed to load presaved templates:', error);
        },
      });
  }

  /**
   * Handles the confirmation action for the dialog.
   * Closes the dialog with the currently selected template if one is selected.
   * If no template is selected, the dialog remains open.
   *
   * @returns {void}
   */
  protected onConfirm(): void {
    const selected = this.selectedTemplate();
    if (selected) {
      this.dialogRef.close(selected);
      this.selectedTemplate.set(null);
    }
  }

  /**
   * Closes the dialog
   */
  protected onCancel(): void {
    this.dialogRef.close();
  }
}
