/**
 * Canonical contributor keys for slot components implementing ItemDataContributor.
 * Used to key aggregated form data, initial data maps, and slot registration.
 */
export enum ContributorKey {
  TRAIN_HEADER = 'trainHeader',
  OPERATING_DAYS = 'operatingDays',
  STOPS = 'stops',
  SIGNALS = 'signals',
  TIME_SLOTS = 'timeSlots',
  RESTRICTION_HEADER = 'restrictionHeader',
}
