import { Component, Inject, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { TranslationsService } from '@Ordering/core/services/translations.service';

export interface ConfirmationDialogData {
  message: string;
  title?: string;
  cancelButtonText?: string;
  confirmButtonText?: string;
  showCancelButton?: boolean;
}
@Component({
  selector: 'app-confirmation-dialog',
  imports: [SharedMaterialModule],
  templateUrl: './confirmation-dialog.component.html',
  styleUrl: './confirmation-dialog.component.scss',
})
export class ConfirmationDialogComponent {
  protected tr = inject(TranslationsService);
  protected cancelButtonText: string;
  protected confirmButtonText: string;
  protected title: string;
  protected message: string;
  protected showCancelButton = true;
  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData,
  ) {
    this.cancelButtonText = data.cancelButtonText || this.tr.translate('lblCancel');
    this.confirmButtonText = data.confirmButtonText || this.tr.translate('lblOk');
    this.title = data.title || this.tr.translate('lblConfirm');
    this.message = data.message;
    this.showCancelButton = data.showCancelButton ?? true;
  }

  /**
   * To close the dialog and return false.
   * @returns {void}
   */
  protected onCancel(): void {
    this.dialogRef.close(false);
  }

  /**
   * To close the dialog and return true.
   * @returns {void}
   */
  protected onConfirm(): void {
    this.dialogRef.close(true);
  }
}
