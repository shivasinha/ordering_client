import { Routes } from '@angular/router';
import { PortalListComponent } from '@Ordering/portalComponents/portal-list/portal-list.component';

import { AuthenticationGuard } from '@Ordering/auth/guards/authentication.guard';
import { LoginGuard } from '@Ordering/auth/guards/login.guard';

import { LoginComponent } from '@Ordering/auth/components/login/login.component';
import { OrderComponent } from '@Ordering/portalComponents/order/order.component';
import { OrderItemHostComponent } from '@Ordering/portalComponents/order-item-host/order-item-host.component';

import { orderItemResolver, offerItemResolver, orderResolver, trainRunResolver } from '@Ordering/shared/portalResolvers';
import { UnsavedChangesGuard } from '@Ordering/shared/guards/unsaved-data.guards';
import { UserPermissionsGuard } from '@Ordering/core/guards/user-permissions.guard';
import {
  formatOrderLabel,
  formatTrainRunLabel,
  formatOfferItemLabel,
  formatNewOrderLabel,
  formatNewOrderItemLabel,
  breadcrumb,
  formatOrderItemLabel,
} from '@Ordering/shared/services/breadcrumb.service';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [LoginGuard] },
  {
    path: 'list',
    component: PortalListComponent,
    canActivate: [AuthenticationGuard],
  },
  {
    path: 'orders/add',
    component: OrderComponent,
    canActivate: [AuthenticationGuard, UserPermissionsGuard],
    canDeactivate: [UnsavedChangesGuard],
    data: breadcrumb({
      label: formatNewOrderLabel,
    }),
  },
  {
    path: 'orders/:externalId',
    component: OrderComponent,
    canActivate: [AuthenticationGuard],
    canDeactivate: [UnsavedChangesGuard],
    resolve: { order: orderResolver },
    data: breadcrumb({
      label: formatOrderLabel,
    }),
  },
  {
    path: 'train-run/:trainId/:schedVersionId',
    component: OrderItemHostComponent,
    canActivate: [AuthenticationGuard],
    canDeactivate: [UnsavedChangesGuard],
    resolve: { trainRun: trainRunResolver },
    data: breadcrumb({
      label: formatTrainRunLabel,
    }),
  },
  {
    path: 'orders/:order-id/order-items/add',
    component: OrderItemHostComponent,
    canActivate: [AuthenticationGuard, UserPermissionsGuard],
    canDeactivate: [UnsavedChangesGuard],
    data: breadcrumb({
      label: formatNewOrderItemLabel,
      parent: {
        label: formatOrderLabel,
        url: (params: Record<string, string>) => `/orders/${params['order-id']}`,
      },
    }),
  },
  {
    path: 'orders/:order-id/offer-items/:offer-item-id',
    component: OrderItemHostComponent,
    canActivate: [AuthenticationGuard],
    resolve: { offerItem: offerItemResolver },
    data: breadcrumb({
      label: formatOfferItemLabel,
      parent: {
        label: formatOrderLabel,
        url: (params: Record<string, string>) => `/orders/${params['order-id']}`,
      },
    }),
  },
  {
    path: 'orders/:order-id/order-items/:order-item-id',
    component: OrderItemHostComponent,
    canActivate: [AuthenticationGuard],
    resolve: { orderItem: orderItemResolver },
    canDeactivate: [UnsavedChangesGuard],
    data: breadcrumb({
      label: formatOrderItemLabel,
      parent: {
        label: formatOrderLabel,
        url: (params: Record<string, string>) => `/orders/${params['order-id']}`,
      },
    }),
  },
];
