import { TypeGuard, isBoolean, isFiniteNumber, isString } from './common';
import { createRecordGuard, isUndefinedOr } from './factories';
import {
  DaySet,
  TrainRun,
  TrainStop,
  StopTypeId,
  TrainRunCancellation,
  TrainRunModification,
  OrderResponse,
  Message,
  MessageState,
  OrderState,
  OperatorResponse,
  TrainTypeResponse,
  StationResponse,
  StationTrack,
  TrainStopTime,
  OrderType,
  Source,
  TrainRunReplacement,
  TrainRunListItem,
  Restriction,
} from '@Ordering/api';

/**
 * Checks if the given value is a valid `DaySet` object.
 *
 * @param {any} value
 * @returns {value is DaySet}
 */
export const isDaySet: TypeGuard<DaySet> = createRecordGuard({
  beginDate: isString,
  daysBitmap: isString,
});

/**
 * Checks if the given value is a valid `StopTypeId` object.
 *
 * @param {any} value
 * @returns {value is StopTypeId}
 */
export function isStopType(value: any): value is StopTypeId {
  return typeof value === 'number' && Object.values(StopTypeId).includes(value);
}

/**
 * Checks if the given value is a valid `TrainStopTime` object.
 *
 * @param {any} value
 * @returns {value is TrainStopTime}
 */
export const isTrainStopTime: TypeGuard<TrainStopTime> = createRecordGuard({
  time: isString,
});

const isTrainStopArray: TypeGuard<TrainStop[]> = (value: any): value is TrainStop[] => {
  return Array.isArray(value) && value.every(isTrainStop);
};

/**
 * Checks if the given value is a valid `TrainStop` object.
 *
 * @param {any} value
 * @returns {value is TrainStop}
 */
export const isTrainStop = createRecordGuard({
  areaCode: isString,
  station: isString,
  stopType: isStopType,
  // The last stop of a route has no departureTime (the train terminates there) and the first
  // stop typically has no arrivalTime, so both must be treated as optional here, even though the
  // generated TrainStop.departureTime type is (incorrectly) non-optional.
  departureTime: isUndefinedOr(isTrainStopTime),
  arrivalTime: isUndefinedOr(isTrainStopTime),
}) as TypeGuard<TrainStop>;

/**
 * Checks if the given value is a valid `TrainRun` object.
 *
 * @param {any} value
 * @returns {value is TrainRun}
 */
export const isTrainRun: TypeGuard<TrainRun> = createRecordGuard({
  trainNumber: isString,
  isConditionalTrainRun: isBoolean,
  operatingCompany: isString,
});

/**
 * Checks if the given value is a valid `TrainRun` object that also has a non-empty route (`stops`).
 * Reuses {@link isTrainRun} instead of repeating its field checks.
 *
 * @param {any} value
 * @returns {value is TrainRun}
 */
export const isTrainRunWithStops: TypeGuard<TrainRun> = (value: any): value is TrainRun => {
  return isTrainRun(value) && isTrainStopArray(value.stops);
};

/**
 * Checks if the given value is a valid `Message` object.
 *
 * @param {any} value
 * @returns {value is Message}
 */
export const isMessage: TypeGuard<Message> = createRecordGuard({
  text: isString,
});

/**
 * Checks if the given value is a valid `MessageState`.
 *
 * @param {any} value
 * @returns {value is MessageState}
 */
export const isMessageState: TypeGuard<MessageState> = (value: any): value is MessageState => {
  return value === MessageState.NO_MESSAGE || value === MessageState.NEW_MESSAGE || value === MessageState.ALL_READ;
};

/**
 * Checks if the given value is a valid `OrderState`.
 *
 * @param {any} value
 * @returns {value is OrderState}
 */
export const isOrderState: TypeGuard<OrderState> = (value: any): value is OrderState => {
  return (
    value === OrderState.AGREED ||
    value === OrderState.CANCELLED ||
    value === OrderState.DRAFT ||
    value === OrderState.OFFERED ||
    value === OrderState.REFUSED ||
    value === OrderState.REJECTED ||
    value === OrderState.SUBMITTED
  );
};

export const isOrderType: TypeGuard<OrderType> = (value: unknown): value is OrderType => {
  return typeof value === 'number' && Object.values(OrderType).includes(value as OrderType);
};

export const isSource: TypeGuard<Source> = (value: unknown): value is Source => {
  return typeof value === 'number' && Object.values(Source).includes(value as Source);
};

/**
 * Checks if the given value is a valid `OrderResponse` object.
 *
 * @param {any} value
 * @returns {value is OrderResponse}
 */
export const isOrderResponse: TypeGuard<OrderResponse> = createRecordGuard({
  subject: isString,
  orderType: isOrderType,
  externalId: isString,
  state: isOrderState,
  messageState: isMessageState,
  creationDateTime: isString,
  lastModifiedDateTime: isString,
  orderOrigin: isSource,
});

/**
 * Checks if the given value is a valid `TrainRunCancellation` object.
 *
 * @param {any} value
 * @returns {value is TrainRunCancellation}
 */
const isDaySetArray: TypeGuard<DaySet[]> = (value: any): value is DaySet[] => {
  return Array.isArray(value) && value.every(isDaySet);
};

export const isTrainRunCancellation: TypeGuard<TrainRunCancellation> = createRecordGuard({
  trainNumber: isString,
  cancellationDays: isDaySetArray,
  operatingCompany: isString,
});

/**
 * Checks if the given value is a valid `Restriction` object.
 *
 * @param {any} value
 * @returns {value is Restriction}
 */
export const isRestriction: TypeGuard<Restriction> = createRecordGuard({
  name: isString,
  operatingCompanyID: isString,
  workTypeId: isString,
  lineOfWorkId: isString,
  speedRestriction: isBoolean,
  catShutOff: isBoolean,
});

/**
 * Checks if the given value is a valid `TrainRunModification` object.
 *
 * @param {any} value
 * @returns {value is TrainRunModification}
 */
export const isTrainRunModification: TypeGuard<TrainRunModification> = createRecordGuard({
  trainNumber: isString,
  isConditionalTrainRun: isBoolean,
  operatingCompany: isString,
  trainType: isString,
});

/**
 * Checks if the given value is a valid `TrainRunReplacement` object.
 *
 * @param {any} value
 * @returns {value is TrainRunReplacement}
 */
export const isTrainRunReplacement: TypeGuard<TrainRunReplacement> = createRecordGuard({
  trainNumber: isString,
  isConditionalTrainRun: isBoolean,
  operatingCompany: isString,
  trainType: isString,
});

/**
 * Checks if the given value is a valid `OperatorResponse` object.
 *
 * @param {any} value
 * @returns {value is OperatorResponse}
 */
export const isOperatorResponse: TypeGuard<OperatorResponse> = createRecordGuard({
  id: isString,
  name: isString,
  abbreviation: isString,
});

export const isTrainTypeResponse: TypeGuard<TrainTypeResponse> = createRecordGuard({
  id: isString,
});

export const isStationTrack: TypeGuard<StationTrack> = createRecordGuard({
  id: isString,
});

export const isStationTracks: TypeGuard<StationTrack[]> = (value: any): value is StationTrack[] => {
  return Array.isArray(value) && value.every(isStationTrack);
};

export const isStationsResponse: TypeGuard<StationResponse> = createRecordGuard({
  id: isString,
  uicCode: isString,
  areaCode: isString,
  name: isString,
  tracks: isStationTracks,
});

export const isTrainRunListItem: TypeGuard<TrainRunListItem> = createRecordGuard({
  trainNumber: isString,
  trainId: isFiniteNumber,
  schedVersionId: isFiniteNumber,
  operatingCompany: isString,
  trainType: isString,
  operatingDays: isDaySetArray,
  fromStation: isTrainStop,
  toStation: isTrainStop,
  lastModifiedDateTime: isString,
});
