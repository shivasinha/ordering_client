import { Component, inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { ConfigDataService } from '@Ordering/shared/services/config-data.service';

@Component({
  selector: 'app-profile-dialog',
  imports: [SharedMaterialModule, TranslatePipe],
  templateUrl: './profile-dialog.component.html',
  styleUrl: './profile-dialog.component.scss',
})
export class ProfileDialogComponent {
  private tr = inject(TranslationsService);
  private configDataService = inject(ConfigDataService);
  private dialogRef = inject(MatDialogRef<ProfileDialogComponent>);

  protected userProfileProps = [
    { label: this.tr.translate('lblName'), value: this.configDataService.configData?.username },
    { label: this.tr.translate('lblUsername'), value: this.configDataService.configData?.fullUsername },
    { label: this.tr.translate('lblCompany'), value: this.configDataService.configData?.organisation },
    { label: this.tr.translate('lblEmailAddress'), value: this.configDataService.configData?.email },
    { label: this.tr.translate('lblPhoneNumber'), value: this.configDataService.configData?.phone },
    { label: this.tr.translate('lblUserGroups'), value: this.configDataService.configData?.groupNames?.join(', ') },
  ];

  /**
   * Closes the profile dialog.
   *
   * If a dialog reference exists, this method closes the dialog by calling
   * the close method on the dialog reference.
   *
   * @returns {void}
   */
  protected closeDialog(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }
}
