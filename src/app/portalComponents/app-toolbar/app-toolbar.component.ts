import { Component, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';

import { TabsTypesEnum } from '@Ordering/data/custom/enum/tabTypes';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { ClientAuthenticationService } from '@Ordering/auth/services/client-authentication.service';
import { AboutDialogComponent } from '@Ordering/portalComponents/about-dialog/about-dialog.component';
import { NavigationService } from '@Ordering/shared/services/navigation.service';
import { ProfileDialogComponent } from '@Ordering/portalComponents/profile-dialog/profile-dialog.component';
import { ConfigDataService } from '@Ordering/shared/services/config-data.service';

@Component({
  selector: 'app-toolbar',
  imports: [MatToolbarModule, MatMenuModule, MatIconModule, MatButtonModule, TranslatePipe],
  templateUrl: './app-toolbar.component.html',
  styleUrl: './app-toolbar.component.scss',
})
export class AppToolbarComponent {
  private navigationService = inject(NavigationService);
  private dialog = inject(MatDialog);
  protected userName = localStorage.getItem('userName');
  protected clientAuthService = inject(ClientAuthenticationService);
  private configDataService = inject(ConfigDataService);

  protected isProfileDisabled(): boolean {
    return (
      !this.configDataService.configData ||
      !(
        this.configDataService.configData.username ||
        this.configDataService.configData.fullUsername ||
        this.configDataService.configData.organisation ||
        this.configDataService.configData.phone ||
        this.configDataService.configData.email ||
        this.configDataService.configData.groupNames?.length
      )
    );
  }

  /**
   * Handle logo click and navigate to the '/list' route.
   * This function is triggered when the user clicks on the logo.
   * @returns {void}
   */
  public onLogoClick(): void {
    this.navigationService.navigateToList({
      extras: { queryParams: { activeTab: TabsTypesEnum.CURRENT_ORDERS } },
    });
  }

  /**
   * Open the Profile dialog.
   * @returns {void}
   */
  protected onProfileClick(): void {
    this.dialog.open(ProfileDialogComponent, { width: '550px' });
  }

  /**
   * Open the About dialog.
   * @returns {void}
   */
  protected onAboutClick(): void {
    this.dialog.open(AboutDialogComponent, { width: '550px' });
  }
}
