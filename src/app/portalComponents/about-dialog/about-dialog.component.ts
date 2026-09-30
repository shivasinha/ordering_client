import { Component, inject, computed } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { ConfigDataService } from '@Ordering/shared/services/config-data.service';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { LEGAL_INFO_CONFIG, LegalInfoItem } from '@Ordering/portalComponents/about-dialog/about-config/legal-info.config';
import dayjs from 'dayjs';

@Component({
  selector: 'app-about-dialog',
  imports: [SharedMaterialModule, TranslatePipe],
  templateUrl: './about-dialog.component.html',
  styleUrl: './about-dialog.component.scss',
})
export class AboutDialogComponent {
  private dialogRef = inject(MatDialogRef<AboutDialogComponent>);
  protected configDataService = inject(ConfigDataService);
  protected tr = inject(TranslationsService);
  protected currentYear = computed(() => dayjs().year().toString());
  protected tpsBuildVersion = computed(() => {
    return this.configDataService.configData?.tpsBuildVersion || this.tr.translate('lblNoData');
  });
  protected legalInfoItems: LegalInfoItem[] = LEGAL_INFO_CONFIG;

  protected closeDialog(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }
}
