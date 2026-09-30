import { CommonModule } from '@angular/common';
import { Component, input, computed, output, inject } from '@angular/core';

import { PresavedODTTemplate } from '@Ordering/api';

import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { DayNumbersToNamesPipe } from '@Ordering/core/pipes/day-numbers-to-names.pipe';
import { PresavedTemplateService } from '@Ordering/portalComponents/operating-days/presaved-template/services/presaved-template.service';

@Component({
  selector: 'app-presaved-template-list',
  imports: [CommonModule, SharedMaterialModule, TranslatePipe, DayNumbersToNamesPipe],
  templateUrl: './presaved-template-list.component.html',
  styleUrl: './presaved-template-list.component.scss',
})
export class PresavedTemplateListComponent {
  // Signal-based inputs
  public templates = input.required<PresavedODTTemplate[]>();
  public loading = input<boolean>(false);
  public selectedTemplate = input<PresavedODTTemplate | null>(null);
  public hasSearched = input<boolean>(false);
  protected presavedTemplateService = inject(PresavedTemplateService);

  // Signal-based output events
  public templateSelected = output<PresavedODTTemplate>();

  protected readonly displayedColumns: string[] = ['name', 'description', 'beginDate', 'endDate', 'operatingDays'];

  /**
   * Computed signal that determines whether to display an empty message to the user.
   * Returns true when a search has been performed, no templates are found, and the component is not currently loading.
   *
   * @returns {boolean} True if an empty message should be shown, false otherwise
   */
  protected readonly showEmptyMessage = computed(() => {
    return this.hasSearched() && this.templates().length === 0 && !this.loading();
  });

  /**
   * Computed signal that determines whether to display the "no search" message.
   *
   * The message is shown when the user hasn't performed a search yet and
   * the component is not currently in a loading state.
   *
   * @returns {boolean} `true` if no search has been performed and not loading, `false` otherwise
   */
  protected readonly showNoSearchMessage = computed(() => {
    return !this.hasSearched() && !this.loading();
  });

  /**
   * Handles the click event on a template row by emitting the selected template.
   *
   * @param {PresavedODTTemplate} template - The presaved operating days template that was clicked
   * @returns {void}
   */
  protected onTemplateRowClick(template: PresavedODTTemplate): void {
    this.templateSelected.emit(template);
  }

  /**
   * A computed function that returns a predicate to check if a given template is currently selected.
   *
   * @returns A function that takes a PresavedODTTemplate and returns true if it matches
   * the currently selected template by name, false otherwise.
   */
  protected isTemplateSelected = computed(() => {
    const selected = this.selectedTemplate();
    return (template: PresavedODTTemplate) => selected !== null && selected.name === template.name;
  });
}
