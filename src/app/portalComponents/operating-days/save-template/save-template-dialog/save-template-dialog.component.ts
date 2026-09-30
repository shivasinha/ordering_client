import { Component, inject, signal, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { PresavedODTTemplate } from '@Ordering/api';

import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { PresavedTemplateService } from '@Ordering/portalComponents/operating-days/presaved-template/services/presaved-template.service';

export interface SaveTemplateDialogData {
  template: PresavedODTTemplate;
}

@Component({
  selector: 'app-save-template-dialog',
  imports: [CommonModule, SharedMaterialModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './save-template-dialog.component.html',
  styleUrl: './save-template-dialog.component.scss',
})
export class SaveTemplateDialogComponent implements OnDestroy {
  protected readonly DESCRIPTION_MAX_LENGTH = 1000;
  protected readonly NAME_MAX_LENGTH = 200;
  private readonly fb = inject(FormBuilder);
  public readonly dialogRef = inject(MatDialogRef<SaveTemplateDialogComponent>);
  protected readonly tr = inject(TranslationsService);
  private readonly presavedTemplateService = inject(PresavedTemplateService);
  private readonly destroy$ = new Subject<void>();

  constructor(@Inject(MAT_DIALOG_DATA) public templateData: SaveTemplateDialogData) {}

  // Form for template name and description
  protected readonly templateForm: FormGroup = this.fb.group({
    name: new FormControl<string>('', {
      validators: [Validators.required, Validators.maxLength(this.NAME_MAX_LENGTH)],
      nonNullable: true,
    }),
    description: new FormControl<string>('', {
      validators: [Validators.maxLength(this.DESCRIPTION_MAX_LENGTH)],
      nonNullable: true,
    }),
  });

  // Loading state signal for save operation
  protected readonly isSaving = signal<boolean>(false);

  /**
   * Computed property that determines whether the form can be saved.
   *
   * @returns {boolean} `true` if the form is valid and not currently loading,
   * `false` otherwise.
   */
  protected get canSave(): boolean {
    const formValid = this.templateForm.valid;
    const nameValue = this.nameControl.value;
    const nameHasValue = nameValue && nameValue.trim().length > 0;
    const notSaving = !this.isSaving();

    return formValid && nameHasValue && notSaving;
  }

  /**
   * Gets the name form control for easy access in the template.
   *
   * @returns {FormControl} The name form control
   */
  protected get nameControl(): FormControl {
    return this.templateForm.get('name') as FormControl;
  }

  /**
   * Gets the description form control for easy access in the template.
   *
   * @returns {FormControl} The description form control
   */
  protected get descriptionControl(): FormControl {
    return this.templateForm.get('description') as FormControl;
  }

  /**
   * Handles the save action for the template.
   * Performs the save operation first, and only closes the dialog on successful save.
   *
   * @returns {void}
   */
  protected onSave(): void {
    if (!this.canSave) {
      return;
    }

    this.isSaving.set(true);

    const formValue = this.templateForm.value;
    const templateToSave: PresavedODTTemplate = {
      ...this.templateData.template,
      name: formValue.name.trim(),
      description: formValue.description?.trim() || '',
    };

    this.presavedTemplateService
      .savePresavedTemplate(templateToSave)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: savedTemplate => {
          this.dialogRef.close(savedTemplate);
        },
        error: error => {
          // Error: Keep dialog open, user can retry with different name
          this.isSaving.set(false);

          // If it's a 409 conflict (name not unique), focus on name field for user convenience
          if (error.status === 409) {
            const nameInput = document.querySelector('input[formControlName="name"]') as HTMLInputElement;
            nameInput?.focus();
          }
        },
        complete: () => {
          this.isSaving.set(false);
        },
      });
  }

  /**
   * Handles the cancel action for the dialog.
   * Closes the dialog without returning any data.
   *
   * @returns {void}
   */
  protected onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Component cleanup
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
