/**
 * Refcode groups used by the restriction order item.
 *
 * The `/data/refcodes` endpoint returns grouped AdminDataEntry items via
 * `result[].table`. The restriction form needs three of those groups.
 */
export interface RestrictionRefCodeGroup {
  /** OpenAPI refcode table key used to group entries, e.g. `FYF`. */
  readonly table: string;
}

export const RESTRICTION_REFCODE_GROUPS = {
  LINE_OF_WORK: { table: 'FLW' },
  INTERRUPTIBLE: { table: 'FIR' },
  YELLOW_FLEET: { table: 'FYF' },
} as const satisfies Record<string, RestrictionRefCodeGroup>;
