import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { StationListComponent } from './station-list.component';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { MasterDataService } from '@Ordering/api';
import { ConfigDataService } from '@Ordering/shared/services/config-data.service';
import { SlotDisplayMode } from '@Ordering/shared/models/component-slot.interface';

describe('StationListComponent', () => {
  let component: StationListComponent;
  let fixture: ComponentFixture<StationListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StationListComponent],
      providers: [
        {
          provide: TranslationsService,
          useValue: {
            translate: jest.fn((key: string) => key),
          },
        },
        {
          provide: ConfigDataService,
          useValue: {
            enableUicCodes: signal(true),
          },
        },
        {
          provide: MasterDataService,
          useValue: {
            translate: jest.fn((key: string) => key),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StationListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ItemDataContributor contract', () => {
    it('should have contributorKey "stops"', () => {
      expect(component.contributorKey).toBe('stops');
    });

    it('should default displayMode to EDITABLE', () => {
      expect(component.displayMode()).toBe(SlotDisplayMode.EDITABLE);
    });

    it('should default data to an empty array', () => {
      expect(component.data()).toEqual([]);
    });

    it('should default isValid to true', () => {
      expect(component.isValid()).toBe(true);
    });

    it('should default isDirty to false', () => {
      expect(component.isDirty()).toBe(false);
    });

    it('should reset isDirty when markAsPristine is called', () => {
      component.isDirty.set(true);
      expect(component.isDirty()).toBe(true);

      component.markAsPristine();

      expect(component.isDirty()).toBe(false);
    });
  });

  describe('isEditMode', () => {
    it('should be true when displayMode is EDITABLE', () => {
      expect(component['isEditMode']()).toBe(true);
    });
  });

  describe('aggregator integration', () => {
    it('should work without aggregator (optional injection)', () => {
      // Component was created without FormAggregatorService provider — should not throw
      expect(component['aggregator']).toBeNull();
    });
  });
});
