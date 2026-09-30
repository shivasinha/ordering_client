// src/app/Ordering/data/mappings/api-error-overrides.map.ts
import { OrderingApiName } from '@Ordering/data/custom/enum/ordering-api-names.enum';

export const OrderingApiErrorOverrides: Record<OrderingApiName, Partial<Record<number | 'default', string>>> = {
  [OrderingApiName.Login]: {
    403: 'msgErrorForbiddenLogin',
    default: 'msgErrorLogin',
  },
  [OrderingApiName.GetCurrentOrdersList]: {
    403: 'msgErrorForbiddenGetCurrentOrdersList',
    default: 'msgErrorGetCurrentOrderList',
  },
  [OrderingApiName.GetArchivedOrdersList]: {
    403: 'msgErrorForbiddenGetArchivedOrdersList',
    default: 'msgErrorGetArchivedOrderList',
  },
  [OrderingApiName.GetTrainRunList]: {
    403: 'msgErrorForbiddenGetTrainRunList',
    default: 'msgErrorGetTrainRunList',
  },
  [OrderingApiName.GetTrainRun]: {
    403: 'msgErrorForbiddenGetTrainRun',
    default: 'msgErrorGetTrainRun',
  },
  [OrderingApiName.CreateTrainRun]: {
    403: 'msgErrorForbiddenCreateTrainRun',
    default: 'msgErrorCreateOrderItem',
  },
  [OrderingApiName.CreateCancelPathModification]: {
    403: 'msgErrorForbiddenCreatePathModificationTrainRun',
    default: 'msgErrorCreateOrderItem',
  },
  [OrderingApiName.CreateDraftOrderPathModification]: {
    403: 'msgErrorForbiddenCreatePathModificationTrainRun',
    default: 'msgErrorModifyingTrainRun',
  },
  [OrderingApiName.CreateCancelTrainRun]: {
    403: 'msgErrorForbiddenCreateCancelTrainRun',
    default: 'msgErrorCreateOrderItem',
  },
  [OrderingApiName.CreateDraftOrderCancelTrainRun]: {
    403: 'msgErrorForbiddenCreateCancelTrainRun',
    default: 'msgErrorCancellingTrainRun',
  },
  [OrderingApiName.SubmitDraftOrderCancelTrainRun]: {
    403: 'msgErrorForbiddenCreateCancelTrainRun',
    default: 'msgErrorTrainRunCancellation',
  },
  [OrderingApiName.GetOrderDetails]: {
    403: 'msgErrorForbiddenGetOrderDetails',
    default: 'msgErrorGettingOrderDetails',
  },
  [OrderingApiName.GetOrderItemDetails]: {
    403: 'msgErrorForbiddenGetOrderItemDetails',
    default: 'msgErrorGetOrderItemDetails',
  },
  [OrderingApiName.GetOfferItemDetails]: {
    403: 'msgErrorForbiddenGetOfferItemDetails',
    default: 'msgErrorGetOfferItemDetails',
  },
  [OrderingApiName.CreateDraftOrder]: {
    403: 'msgErrorForbiddenCreateDraftOrder',
    default: 'msgErrorCreateDraftOrder',
  },
  [OrderingApiName.EditOrderDetails]: {
    403: 'msgErrorForbiddenEditOrderDetails',
    default: 'msgErrorUpdateOrder',
  },
  [OrderingApiName.EditOrderItem]: {
    403: 'msgErrorForbiddenEditOrderItem',
    default: 'msgErrorUpdateOrderItem',
  },
  [OrderingApiName.DeleteOrder]: {
    403: 'msgErrorForbiddenDeleteOrder',
    default: 'msgErrorDeleteDraftOrder',
  },
  [OrderingApiName.DeleteOrderItem]: {
    403: 'msgErrorForbiddenDeleteOrderItem',
    default: 'msgErrorDeleteOrderItem',
  },
  [OrderingApiName.SubmitOrder]: {
    403: 'msgErrorForbiddenSubmitOrder',
    default: 'msgErrorSubmitOrder',
  },
  [OrderingApiName.CancelOrder]: {
    403: 'msgErrorForbiddenCancelOrder',
    default: 'msgErrorCancelOrder',
  },
  [OrderingApiName.ConfirmOffer]: {
    403: 'msgErrorForbiddenConfirmOffer',
    default: 'msgErrorConfirmOfferItem',
  },
  [OrderingApiName.RefuseOffer]: {
    403: 'msgErrorForbiddenRefuseOffer',
    default: 'msgErrorRefuseOfferItem',
  },
  [OrderingApiName.GetMessages]: {
    403: 'msgErrorForbiddenGetMessages',
    default: 'msgErrorGetOrderMessage',
  },
  [OrderingApiName.SendMessage]: {
    403: 'msgErrorForbiddenSendMessage',
    default: 'msgErrorSendOrderMessage',
  },
  [OrderingApiName.GetSpareCapacityList]: {
    403: 'msgErrorForbiddenGetSpareCapacityList',
    default: 'msgErrorGetSpareCapacityList',
  },
  [OrderingApiName.GetSpareCapacity]: {
    403: 'msgErrorForbiddenGetSpareCapacity',
    default: 'msgErrorGetSpareCapacity',
  },
};
