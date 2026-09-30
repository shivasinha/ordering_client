import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { TranslationsService } from '@Ordering/core/services/translations.service';
import { LinksComponent } from './links.component';

describe('LinksComponent', () => {
  let component: LinksComponent;
  let fixture: ComponentFixture<LinksComponent>;
  let mockDialogRef: any;

  beforeEach(async () => {
    const translationsServiceMock = {
      translate: jest.fn(),
      guiLanguage: 'en',
    };

    mockDialogRef = {
      close: jest.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [LinksComponent, BrowserAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { links: [], isEditable: true } },
        { provide: TranslationsService, useValue: translationsServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LinksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with provided data', () => {
    component.addedLinks.set(['http://example.com']);
    component.isEditable = true;
    expect(component.addedLinks()).toEqual(['http://example.com']);
    expect(component.isEditable).toBe(true);
  });

  it('should add a valid link', () => {
    component.newLink.set('http://example.com');
    component.addLink();
    expect(component.addedLinks()).toContain('http://example.com');
    expect(component.newLink()).toBe('');
  });

  it('should not add an invalid link', () => {
    component.newLink.set('');
    component.addLink();
    expect(component.addedLinks()).not.toContain('');
  });

  it('should validate links correctly', () => {
    component.newLink.set('http://example.com');
    expect(component.isValidLink()).toBe(true);
    component.addedLinks.set(['http://example.com']);
    expect(component.isValidLink()).toBe(false);
  });

  it('should reject invalid URL format', () => {
    component.newLink.set('just some random text');
    expect(component.isValidLink()).toBe(false);
    expect(component.isInvalidUrlFormat()).toBe(true);
  });

  it('should reject URLs without protocol', () => {
    component.newLink.set('www.google.com');
    expect(component.isValidLink()).toBe(false);
    expect(component.isInvalidUrlFormat()).toBe(true);
  });

  it('should accept valid URL formats', () => {
    expect(component.isValidUrlFormat('http://example.com')).toBe(true);
    expect(component.isValidUrlFormat('https://example.com/path')).toBe(true);
    expect(component.isValidUrlFormat('ftp://files.example.com')).toBe(true);
    expect(component.isValidUrlFormat('https://www.google.com')).toBe(true);
  });

  it('should reject invalid URL formats', () => {
    expect(component.isValidUrlFormat('just some text')).toBe(false);
    expect(component.isValidUrlFormat('not a url at all')).toBe(false);
    expect(component.isValidUrlFormat('www.google.com')).toBe(false);
    expect(component.isValidUrlFormat('example.com')).toBe(false);
    expect(component.isValidUrlFormat('example.com/path?query=1')).toBe(false);
  });

  it('should detect duplicate links', () => {
    component.addedLinks.set(['http://example.com']);
    component.newLink.set('http://example.com');
    expect(component.isDuplicateLink()).toBe(true);
    component.newLink.set('http://other.com');
    expect(component.isDuplicateLink()).toBe(false);
  });

  it('should remove link when editable', () => {
    component.addedLinks.set(['http://example.com']);
    component.isEditable = true;
    component.removeLink(0);
    expect(component.addedLinks()).toEqual([]);
  });

  it('should not remove link when not editable', () => {
    component.addedLinks.set(['http://example.com']);
    component.isEditable = false;
    component.removeLink(0);
    expect(component.addedLinks()).toEqual(['http://example.com']);
  });

  it('should close dialog with added links', () => {
    const dialogRefSpy = jest.spyOn(component.dialogRef, 'close');
    component.addedLinks.set(['http://example.com']);
    component.closeDialog();
    expect(dialogRefSpy).toHaveBeenCalledWith(['http://example.com']);
  });

  it('should not show validation error while typing', () => {
    component.onNewLinkChange('invalid');
    expect(component.showValidationError()).toBe(false);
  });

  it('should show validation error on blur', () => {
    component.newLink.set('invalid text');
    component.onInputBlur();
    expect(component.showValidationError()).toBe(true);
  });

  it('should show validation error on add button click with invalid URL', () => {
    component.newLink.set('invalid text');
    component.addLink();
    expect(component.showValidationError()).toBe(true);
  });

  it('should reset validation error after successful add', () => {
    component.newLink.set('http://example.com');
    component.addLink();
    expect(component.showValidationError()).toBe(false);
  });
});
