import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarRef } from '@angular/material/snack-bar';
import { NotificationComponent } from '@Ordering/shared/components/notification/notification.component';
import { SnackBarMessage, CustomSnackbarConfig } from '@Ordering/utils/snackbar';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private snackBarMessageData: SnackBarMessage[] = [];
  private snackBarRef: MatSnackBarRef<NotificationComponent> | undefined;
  private snackBarIsDisplayed: boolean = false;

  constructor(
    private snackBar: MatSnackBar,
    // private snackBarRef: MatSnackBarRef<NotificationComponent>,
  ) {}

  public pushNotification(message: string, snackBarConfig: CustomSnackbarConfig): void {
    this.snackBarMessageData?.push({ message, panelClasses: snackBarConfig.panelClass, icon: snackBarConfig.icon });
    if (!this.snackBarIsDisplayed) {
      const config: CustomSnackbarConfig = snackBarConfig;
      config.data = {
        snackBarMessageData: this.snackBarMessageData,
      };
      this.snackBarRef = this.snackBar.openFromComponent(NotificationComponent, config);
      this.snackBarIsDisplayed = true;
    }
    if (snackBarConfig.duration) {
      setTimeout(() => this.snackBarRef?.instance.removeMessage(message), snackBarConfig.duration);
    }

    this.snackBarRef?.afterDismissed().subscribe(() => {
      this.snackBarIsDisplayed = false;
    });
  }
}
