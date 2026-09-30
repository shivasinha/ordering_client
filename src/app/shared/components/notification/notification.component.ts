import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';

import { SnackbarContent, SnackBarMessage } from '@Ordering/utils/snackbar';

@Component({
  selector: 'app-notification',
  imports: [CommonModule, MatIconModule],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.scss',
})
export class NotificationComponent {
  public snackBarData: SnackBarMessage[] = [];

  constructor(
    public snackBarRef: MatSnackBarRef<NotificationComponent>,
    @Inject(MAT_SNACK_BAR_DATA) public data: SnackbarContent,
  ) {
    this.snackBarData = this.data.snackBarMessageData;
  }

  /**
   * Remove the notification from display
   * If all of the notifications are removed, close the snackbar
   * @param {string} message
   * @returns {void}
   */
  public removeMessage(message: string): void {
    const index = this.snackBarData.findIndex((snack: SnackBarMessage) => snack.message === message);
    if (index === -1) {
      return;
    }
    this.snackBarData.splice(index, 1);
    if (this.snackBarData.length === 0) {
      this.snackBarRef.dismiss();
    }
  }
}
