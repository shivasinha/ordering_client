/**
 * Filter criteria for presaved operating days templates
 */
export interface PresavedTemplateFilterCriteria {
  /**
   * Optional string search for template name/description
   */
  searchString?: string;

  /**
   * Start date of the date range filter
   */
  beginDate: string;

  /**
   * End date of the date range filter
   */
  endDate: string;

  /**
   * When true, ignores date range and matches any template date
   * When false, applies strict date range filtering
   */
  matchAnyDate: boolean;
}
