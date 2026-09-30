import { MatDialogConfig } from '@angular/material/dialog';

import { customMatDialogConfigFactory } from './dialog-config.factory';

describe('customMatDialogConfigFactory', () => {
  it('should create a MatDialogConfig with disableClose=true', () => {
    const config = customMatDialogConfigFactory();

    expect(config).toBeInstanceOf(MatDialogConfig);
    expect(config.disableClose).toBe(true);
  });

  it('should return a fresh config instance each call', () => {
    const config1 = customMatDialogConfigFactory();
    config1.disableClose = false;

    const config2 = customMatDialogConfigFactory();

    expect(config2).not.toBe(config1);
    expect(config2.disableClose).toBe(true);
  });
});
