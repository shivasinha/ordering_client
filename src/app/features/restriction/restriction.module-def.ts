import { OrderItemType, OrderItemAction } from '@Ordering/api';
import { OrderItemModule } from '@Ordering/shared/models/order-item-module.interface';

export const RESTRICTION_MODULE: OrderItemModule = {
  moduleId: OrderItemType.RESTRICTION,
  labelKey: 'lblRestriction',
  icon: 'engineering',
  defaultCreationOperation: OrderItemAction.CREATION,
};
