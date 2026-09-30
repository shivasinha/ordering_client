import { OrderResponse } from '@Ordering/api';

/**
 * View model for Order list items.
 * Extends the API model with pre-formatted display fields.
 */
export interface OrderListViewModel extends OrderResponse {
  /** Pre-formatted creation date/time string */
  formattedCreationDateTime: string;
  /** Pre-formatted last modified date/time string */
  formattedLastModifiedDateTime: string;
  /** Pre-formatted expiration date/time string */
  formattedExpirationDateTime: string;
  /** Count of order items for display */
  itemCount: number;
  /** Translated value of state */
  translatedState: string;
  /** Translated value of order type */
  translatedOrderType: string;
}
