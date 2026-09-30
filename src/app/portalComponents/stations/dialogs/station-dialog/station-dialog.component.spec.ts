// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';

import { TranslationsService } from '@Ordering/core/services/translations.service';
import { ConfigDataService } from '@Ordering/shared/services/config-data.service';
import { SearchService } from '@Ordering/shared/services/search.service';
import { TextHighlightingService } from '@Ordering/shared/services/text-highlighting.service';

import { StationDialogComponent } from './station-dialog.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DialogAction } from '@Ordering/data/custom/enum/dialog-action.enum';

describe('StationDialogComponent', () => {
  let component: StationDialogComponent;
  let fixture: ComponentFixture<StationDialogComponent>;
  const mockDialogRef: any = {
    close: jest.fn(),
    afterClosed: jest.fn(() => ({
      subscribe: jest.fn(),
    })),
  };

  const mockSearchService = {
    search: jest.fn().mockReturnValue([]),
    createStationSearchOptions: jest.fn().mockReturnValue([
      { key: 'uicCode', weight: 100, description: 'UIC Code' },
      { key: 'name', weight: 90, description: 'Station Name' },
    ]),
  };

  const mockTextHighlightingService = {
    highlightText: jest.fn().mockReturnValue('highlighted text' as any),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StationDialogComponent, NoopAnimationsModule, HttpClientTestingModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: SearchService, useValue: mockSearchService },
        { provide: TextHighlightingService, useValue: mockTextHighlightingService },
        {
          provide: TranslationsService,
          useValue: {
            translate: jest.fn((key: string) => key),
          },
        },
        {
          provide: ConfigDataService,
          useValue: {
            // Add any required ConfigDataService methods here if needed
            enableUicCodes: signal(true),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StationDialogComponent);
    component = fixture.componentInstance;
    // Mock any required inputs or properties for the component
    component.dialogData = { action: DialogAction.VIEW }; // Ensure 'action' is defined
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clears all mocks
    jest.clearAllTimers(); // Clears all timers
    jest.restoreAllMocks(); // Restores original implementation of mocked functions
    TestBed.resetTestingModule();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
