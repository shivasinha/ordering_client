export enum UserPermissionsEnum {
  CAN_VIEW_WEB_PORTAL = 'canViewWebportal',
  CAN_VIEW_ORDER_LIST = 'canViewOrderList',
  CAN_VIEW_TRAIN_LIST = 'canViewTrainList',
  CAN_VIEW_SPARE_CAPACITY_LIST = 'canViewSpareCapacityList',
  CAN_CREATE_OR_EDIT_ORDER = 'canCreateOrEditOrder',
  CAN_CREATE_OR_EDIT_ORDER_ITEM = 'canCreateOrEditOrderItem',
  CAN_DELETE_ORDER = 'canDeleteOrder',
  CAN_SUBMIT_OR_CANCEL_ORDER = 'canSubmitOrCancelOrder',
  CAN_INITIATE_PATH_ALTERATION = 'canInitiatePathAlteration',
  CAN_INITIATE_PATH_CANCELLATION = 'canInitiatePathCancellation',
  CAN_CONFIRM_OR_REFUSE_OFFER = 'canConfirmOrRefuseOffer',
  CAN_CONFIRM_OFFER_LTP = 'canConfirmOfferLtp',
  CAN_VIEW_MESSAGE = 'canViewMessage',
  CAN_SEND_MESSAGE = 'canSendMessage',
}

export enum OperandEnum {
  AND = 'AND',
  OR = 'OR',
}
