import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';

import { TranslationsService } from '@Ordering/core/services/translations.service';
import { ConfigDataService } from '@Ordering/shared/services/config-data.service';
import { Config } from '@Ordering/api';

import { ProfileDialogComponent } from './profile-dialog.component';

describe('ProfileDialogComponent', () => {
  let component: ProfileDialogComponent;
  let fixture: ComponentFixture<ProfileDialogComponent>;
  let mockDialogRef: any;
  let mockDialogData: Config;
  let translationsServiceMock: any;

  const getProviders = (configData: Config | undefined | Record<string, never>) => [
    { provide: MatDialogRef, useValue: mockDialogRef },
    { provide: TranslationsService, useValue: translationsServiceMock },
    { provide: ConfigDataService, useValue: { configData } },
  ];

  const setupComponent = (configData: Config | undefined | Record<string, never>) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ProfileDialogComponent],
      providers: getProviders(configData),
    });
    const newFixture = TestBed.createComponent(ProfileDialogComponent);
    newFixture.detectChanges();
    return newFixture;
  };

  beforeEach(async () => {
    translationsServiceMock = {
      translate: jest.fn((key: string) => key),
      guiLanguage: 'en',
    };

    mockDialogRef = {
      close: jest.fn(),
    };

    mockDialogData = {
      username: 'johndoe_xyz',
      fullUsername: 'John Doe',
      organisation: 'Test Company',
      email: 'john.doe@test.com',
      phone: '+1234567890',
      groupNames: ['Admin', 'Users'],
    } as Config;

    await TestBed.configureTestingModule({
      imports: [ProfileDialogComponent],
      providers: getProviders(mockDialogData),
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('userProfileProps', () => {
    it('should compute user profile properties from dialog data', () => {
      const props = component['userProfileProps'];

      expect(props).toEqual([
        { label: 'lblName', value: 'johndoe_xyz' },
        { label: 'lblUsername', value: 'John Doe' },
        { label: 'lblCompany', value: 'Test Company' },
        { label: 'lblEmailAddress', value: 'john.doe@test.com' },
        { label: 'lblPhoneNumber', value: '+1234567890' },
        { label: 'lblUserGroups', value: 'Admin, Users' },
      ]);
    });

    it('should handle undefined dialog data', () => {
      const newFixture = setupComponent(undefined);
      const newComponent = newFixture.componentInstance;

      const props = newComponent['userProfileProps'];

      expect(props).toEqual([
        { label: 'lblName', value: undefined },
        { label: 'lblUsername', value: undefined },
        { label: 'lblCompany', value: undefined },
        { label: 'lblEmailAddress', value: undefined },
        { label: 'lblPhoneNumber', value: undefined },
        { label: 'lblUserGroups', value: undefined },
      ]);
    });
  });

  describe('closeDialog', () => {
    it('should close the dialog when closeDialog is called', () => {
      component['closeDialog']();
      expect(mockDialogRef.close).toHaveBeenCalled();
    });

    it('should not throw error if dialogRef is undefined', () => {
      component['dialogRef'] = undefined as any;
      expect(() => component['closeDialog']()).not.toThrow();
    });
  });

  describe('template rendering', () => {
    it('should render profile rows when data is available', () => {
      const compiled = fixture.nativeElement;
      const rows = compiled.querySelectorAll('.profile-row');
      expect(rows.length).toBe(6);
    });

    it('should not render profile row when value is not available', () => {
      const newFixture = setupComponent({});

      const compiled = newFixture.nativeElement;
      const rows = compiled.querySelectorAll('.profile-row');
      expect(rows.length).toBe(0);
    });

    it('should display correct values in profile rows', () => {
      const compiled = fixture.nativeElement;
      const values = compiled.querySelectorAll('.profile-value');
      const nameValue = Array.from(values).find((el: any) => el.textContent.trim() === 'John Doe');
      const usernameValue = Array.from(values).find((el: any) => el.textContent.trim() === 'johndoe_xyz');

      expect(nameValue).toBeTruthy();
      expect(usernameValue).toBeTruthy();
    });

    it('should have close button that calls closeDialog', () => {
      const compiled = fixture.nativeElement;
      const closeButton = compiled.querySelector('button[mat-raised-button]');

      expect(closeButton).toBeTruthy();

      jest.spyOn(component as any, 'closeDialog');
      closeButton.click();

      expect(component['closeDialog']).toHaveBeenCalled();
    });
  });
});
