// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { SaveTemplateDialogComponent, SaveTemplateDialogData } from './save-template-dialog.component';
import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { PresavedTemplateService } from '@Ordering/portalComponents/operating-days/presaved-template/services/presaved-template.service';
import { NotificationService } from '@Ordering/shared/services/notification.service';
import { PresavedODTTemplate } from '@Ordering/api';

describe('SaveTemplateDialogComponent', () => {
  let component: SaveTemplateDialogComponent;
  let fixture: ComponentFixture<SaveTemplateDialogComponent>;
  let mockDialogRef: MatDialogRef<SaveTemplateDialogComponent>;
  let mockPresavedTemplateService: jest.Mocked<PresavedTemplateService>;

  const mockTemplate: PresavedODTTemplate = {
    name: '',
    description: '',
    endDate: '2024-12-31',
    operatingDays: {
      beginDate: '2024-01-01',
      daysBitmap: '1111111',
      selectedDays: [0],
      deselectedDays: [],
    },
  };

  const mockDialogData: SaveTemplateDialogData = {
    template: mockTemplate,
  };

  beforeEach(async () => {
    const mockDialogRefValue = {
      close: jest.fn(),
    };

    const mockPresavedTemplateServiceValue = {
      savePresavedTemplate: jest.fn(),
    };

    const mockTranslationsServiceValue = {
      translate: jest.fn().mockReturnValue('translated'),
    };

    const mockNotificationServiceValue = {
      pushNotification: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [
        SaveTemplateDialogComponent,
        ReactiveFormsModule,
        SharedMaterialModule,
        NoopAnimationsModule,
        HttpClientTestingModule,
        TranslatePipe,
      ],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRefValue },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
        { provide: PresavedTemplateService, useValue: mockPresavedTemplateServiceValue },
        { provide: TranslationsService, useValue: mockTranslationsServiceValue },
        { provide: NotificationService, useValue: mockNotificationServiceValue },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SaveTemplateDialogComponent);
    component = fixture.componentInstance;
    mockDialogRef = TestBed.inject(MatDialogRef);
    mockPresavedTemplateService = TestBed.inject(PresavedTemplateService) as jest.Mocked<PresavedTemplateService>;

    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty form', () => {
    expect(component.nameControl.value).toBe('');
    expect(component.descriptionControl.value).toBe('');
    expect(component.templateForm.valid).toBeFalsy();
  });

  it('should be invalid when name is empty', () => {
    component.nameControl.setValue('');
    expect(component.templateForm.valid).toBeFalsy();
    expect(component.canSave).toBeFalsy();
  });

  it('should be valid when name is provided', () => {
    component.nameControl.setValue('Test Template');
    expect(component.templateForm.valid).toBeTruthy();
    expect(component.canSave).toBeTruthy();
  });

  it('should close dialog on cancel', () => {
    component.onCancel();
    expect(mockDialogRef.close).toHaveBeenCalledWith();
  });

  it('should have correct maximum length constants', () => {
    expect(component.NAME_MAX_LENGTH).toBe(200);
    expect(component.DESCRIPTION_MAX_LENGTH).toBe(1000);
  });

  it('should save template successfully', () => {
    const expectedTemplate: PresavedODTTemplate = {
      ...mockTemplate,
      name: 'Test Template',
      description: 'Test Description',
    };

    component.nameControl.setValue('Test Template');
    component.descriptionControl.setValue('Test Description');
    mockPresavedTemplateService.savePresavedTemplate.mockReturnValue(of(expectedTemplate));

    component.onSave();

    expect(mockPresavedTemplateService.savePresavedTemplate).toHaveBeenCalledWith(expectedTemplate);
    expect(mockDialogRef.close).toHaveBeenCalledWith(expectedTemplate);
  });

  it('should handle save errors and keep dialog open', () => {
    const error = { status: 500, message: 'Server Error' };
    component.nameControl.setValue('Test Template');
    mockPresavedTemplateService.savePresavedTemplate.mockReturnValue(throwError(() => error));

    component.onSave();

    expect(component.isSaving()).toBeFalsy();
    expect(mockDialogRef.close).not.toHaveBeenCalled();
  });

  it('should trim whitespace from form values when saving', () => {
    const expectedTemplate: PresavedODTTemplate = {
      ...mockTemplate,
      name: 'Test Template',
      description: 'Test Description',
    };

    component.nameControl.setValue('  Test Template  ');
    component.descriptionControl.setValue('  Test Description  ');
    mockPresavedTemplateService.savePresavedTemplate.mockReturnValue(of(expectedTemplate));

    component.onSave();

    expect(mockPresavedTemplateService.savePresavedTemplate).toHaveBeenCalledWith(expectedTemplate);
  });

  it('should handle empty description correctly', () => {
    const expectedTemplate: PresavedODTTemplate = {
      ...mockTemplate,
      name: 'Test Template',
      description: '',
    };

    component.nameControl.setValue('Test Template');
    component.descriptionControl.setValue('');
    mockPresavedTemplateService.savePresavedTemplate.mockReturnValue(of(expectedTemplate));

    component.onSave();

    expect(mockPresavedTemplateService.savePresavedTemplate).toHaveBeenCalledWith(expectedTemplate);
  });

  it('should validate form length constraints', () => {
    // Test name max length
    component.nameControl.setValue('a'.repeat(201));
    expect(component.templateForm.valid).toBeFalsy();
    expect(component.canSave).toBeFalsy();

    // Test description max length
    component.nameControl.setValue('Valid Name');
    component.descriptionControl.setValue('a'.repeat(1001));
    expect(component.templateForm.valid).toBeFalsy();
    expect(component.canSave).toBeFalsy();

    // Test valid lengths
    component.nameControl.setValue('Valid Name');
    component.descriptionControl.setValue('Valid Description');
    expect(component.templateForm.valid).toBeTruthy();
    expect(component.canSave).toBeTruthy();
  });

  it('should not allow save when already saving', () => {
    component.nameControl.setValue('Test Template');
    component.isSaving.set(true);

    expect(component.canSave).toBeFalsy();
  });
});
