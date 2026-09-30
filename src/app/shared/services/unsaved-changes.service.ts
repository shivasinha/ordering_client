import { inject, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { ConfirmationDialogComponent } from '@Ordering/shared/components/confirmation-dialog/confirmation-dialog.component';
import { TranslationsService } from '@Ordering/core/services/translations.service';

@Injectable({
  providedIn: 'root',
})
export class UnsavedChangesService {
  private readonly dialog: MatDialog = inject(MatDialog);
  private readonly tr = inject(TranslationsService);

  unsavedDialogAction(): Observable<boolean> {
    const dialogRef: MatDialogRef<ConfirmationDialogComponent> = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      data: { message: this.tr.translate('msgUnsavedChanges') },
    });
    return dialogRef.afterClosed();
  }
}
