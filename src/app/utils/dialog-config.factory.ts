import { MatDialogConfig } from '@angular/material/dialog';

/**
 * Creates the default {@link MatDialogConfig} to centralize dialog configuration.
 *
 * Defaults:
 * - `disableClose = true` (forces users to explicitly confirm/cancel)
 *
 * @returns {MatDialogConfig} The default dialog configuration object.
 */
export function customMatDialogConfigFactory(): MatDialogConfig {
  const config = new MatDialogConfig();
  config.disableClose = true;
  return config;
}
