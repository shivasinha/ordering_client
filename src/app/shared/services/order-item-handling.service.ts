import { Injectable, inject, signal } from '@angular/core';
import { OrderItemContent, TrainRun } from '@Ordering/api';
import { OrderActionsService } from '@Ordering/shared/services/order-actions.service';
import { NotificationService } from '@Ordering/shared/services/notification.service';
import { SNACKBARCONFIG_ERROR } from '@Ordering/utils/snackbar';
import { TranslationsService } from '@Ordering/core/services/translations.service';

@Injectable({
  providedIn: 'root',
})
export class OrderItemHandlingService {
  private orderActionsService = inject(OrderActionsService);
  private notificationService = inject(NotificationService);
  private tr = inject(TranslationsService);

  public missingFieldsCache = new Map<string, string[]>();
  public highlightIncompleteRowsSig = signal<boolean>(false); // Flag to control row highlighting

  /**
   * Triggers row highlighting for incomplete order items.
   *
   * @param {void}
   * @returns {void}
   */
  public triggerRowHighlight(): void {
    let hasMissingFields = false;
    this.missingFieldsCache.clear(); // Reset cache

    this.orderActionsService.currentlySelectedOrderSig()?.orderItems?.forEach(({ content: { item } }) => {
      if (item) {
        const missingFields = this.getMissingFields(item);
        this.missingFieldsCache.set((item as TrainRun).trainNumber, missingFields); // Cache result

        if (missingFields.length) {
          hasMissingFields = true;
          this.notificationService.pushNotification(
            `${(item as TrainRun).trainNumber}: ${this.tr.translate('lblMissingFields')} - ${missingFields.join(', ')}`,
            SNACKBARCONFIG_ERROR,
          );
        }
      }
    });
    this.highlightIncompleteRowsSig.set(hasMissingFields);
  }

  /**
   * Returns an array of missing fields for the given order item.
   *
   * @param {OrderItemContent} orderItem - The order item to check for missing fields
   * @returns {string[]} An array of missing fields
   */
  public getMissingFields(orderItem: Partial<OrderItemContent>): string[] {
    const requiredFields = ['trainNumber', 'operatingCompany', 'operatingDays', 'stops'];
    return requiredFields.filter(field => {
      const value = (orderItem as any)[field];
      if (field === 'stops') {
        return !Array.isArray(value) || value.length < 2;
      }
      return value == null || value === '' || (Array.isArray(value) && value.length === 0);
    });
  }
}
