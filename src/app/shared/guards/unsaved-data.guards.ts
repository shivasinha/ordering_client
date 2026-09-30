import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CanDeactivate } from '@angular/router';
import { OrderComponent } from '@Ordering/portalComponents/order/order.component';
import { OrderItemHostComponent } from '@Ordering/portalComponents/order-item-host/order-item-host.component';
import { UnsavedChangesService } from '@Ordering/shared/services/unsaved-changes.service';

@Injectable({
  providedIn: 'root',
})
export class UnsavedChangesGuard implements CanDeactivate<OrderComponent | OrderItemHostComponent> {
  constructor(private unsavedChangesService: UnsavedChangesService) {}

  canDeactivate(component: OrderComponent | OrderItemHostComponent): Observable<boolean> | boolean {
    if (!component.isUnsavedChanges()) {
      return true;
    }

    return this.unsavedChangesService.unsavedDialogAction().pipe(map(result => !!result));
  }
}
