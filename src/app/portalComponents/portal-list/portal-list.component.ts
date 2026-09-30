import { Component, inject } from '@angular/core';

import { TabsTypesEnum } from '@Ordering/data/custom/enum/tabTypes';
import { ActionBarComponent } from '@Ordering/portalComponents/action-bar/action-bar.component';
import { SpareCapacityContainerComponent } from '@Ordering/portalComponents/spare-capacity/spare-capacity-container/spare-capacity-container.component';
import { CurrentOrdersContainerComponent } from '@Ordering/portalComponents/orders-list/current-orders-container/current-orders-container.component';
import { ArchivedOrdersContainerComponent } from '@Ordering/portalComponents/orders-list/archived-orders-container/archived-orders-container.component';
import { TrainRunListContainerComponent } from '@Ordering/portalComponents/train-run-list/train-run-list-container.component';
import { ActionBarService } from '@Ordering/shared/services/action-bar.service';
@Component({
  selector: 'app-portal-list',
  imports: [
    ActionBarComponent,
    TrainRunListContainerComponent,
    SpareCapacityContainerComponent,
    CurrentOrdersContainerComponent,
    ArchivedOrdersContainerComponent,
  ],
  templateUrl: './portal-list.component.html',
  styleUrl: './portal-list.component.scss',
})
export class PortalListComponent {
  protected tabsTypesEnum = TabsTypesEnum;
  protected actionBarService = inject(ActionBarService);
}
