import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';

import { AboutDialogComponent } from './about-dialog.component';
import { ConfigDataService } from '@Ordering/shared/services/config-data.service';
import { TranslationsService } from '@Ordering/core/services/translations.service';

describe('AboutDialogComponent', () => {
  let component: AboutDialogComponent;
  let fixture: ComponentFixture<AboutDialogComponent>;
  let mockDialogRef: any;
  let mockConfigDataService: any;
  let mockTranslationsService: any;

  beforeEach(async () => {
    mockDialogRef = {
      close: jest.fn(),
    };

    mockConfigDataService = {
      configData: {
        tpsAbout: {
          tpsBuildVersion: '11.1.0',
          legalInfoUrl: 'https://example.com/legal',
          apiVersion: 'v1',
        },
      },
    };

    mockTranslationsService = {
      translate: jest.fn().mockReturnValue('Translated Text'),
    };

    await TestBed.configureTestingModule({
      imports: [AboutDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: ConfigDataService, useValue: mockConfigDataService },
        { provide: TranslationsService, useValue: mockTranslationsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AboutDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return current year from dayjs', () => {
    const currentYear = new Date().getFullYear().toString();
    expect((component as any).currentYear()).toBe(currentYear);
  });

  it('should close dialog when closeDialog is called', () => {
    (component as any).closeDialog();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });
});
