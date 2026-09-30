import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { TranslationsService } from '@Ordering/core/services/translations.service';
import { FormAggregatorService } from '@Ordering/shared/services/form-aggregator.service';
import { MasterDataHandlingService } from '@Ordering/shared/services/master-data-handling.service';

import { RestrictionHeaderFormComponent } from './restriction-header-form.component';

describe('RestrictionHeaderFormComponent', () => {
  let fixture: ComponentFixture<RestrictionHeaderFormComponent>;
  let component: RestrictionHeaderFormComponent;
  let masterDataServiceMock: any;

  beforeEach(async () => {
    masterDataServiceMock = {
      fetchRefCodes: jest.fn(),
      fetchOrganizations: jest.fn(),
      fetchRestrictionProjects: jest.fn(),
      fetchTypeOfWorks: jest.fn(),
      fetchRestrictionSubProjects: jest.fn(),
      masterDataOrganizationsSig: signal([]),
      masterDataRestrictionProjectsSig: signal([]),
      masterDataRestrictionSubProjectsSig: signal({
        '1': [{ id: '101', display: 'Sub-1' }],
      }),
      masterDataTypeOfWorksSig: signal([]),
      masterDataRefCodeGroupsSig: signal({
        FLW: [{ id: '1', display: 'Line of Work' }],
        FIR: [{ id: '2', display: 'Interruptible' }],
        FYF: [{ id: '3', display: 'Yellow Fleet' }],
      }),
    };

    await TestBed.configureTestingModule({
      imports: [RestrictionHeaderFormComponent, NoopAnimationsModule],
      providers: [
        {
          provide: FormAggregatorService,
          useValue: {
            register: jest.fn(),
            unregister: jest.fn(),
            notifyStateChange: jest.fn(),
          },
        },
        {
          provide: TranslationsService,
          useValue: {
            translate: jest.fn((key: string) => key),
            guiLanguage: 'en',
          },
        },
        { provide: MasterDataHandlingService, useValue: masterDataServiceMock },
      ],
    })
      .overrideComponent(RestrictionHeaderFormComponent, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(RestrictionHeaderFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should include interruptible control and remove reqChangeId control', () => {
    const form = (component as any).form;

    expect(form.contains('interruptible')).toBe(true);
    expect(form.contains('reqChangeId')).toBe(false);
  });

  it('should keep sub-project disabled until a project is selected', () => {
    const form = (component as any).form;

    expect(form.controls.subProjectId.disabled).toBe(true);

    form.controls.projectId.setValue('1');
    expect(form.controls.subProjectId.enabled).toBe(true);
    expect(masterDataServiceMock.fetchRestrictionSubProjects).toHaveBeenCalledWith('1');
  });

  it('should reset and disable sub-project when selected project is cleared', () => {
    const form = (component as any).form;

    form.controls.projectId.setValue('1');
    form.controls.subProjectId.setValue('101');
    expect(form.controls.subProjectId.enabled).toBe(true);

    form.controls.projectId.setValue(null);
    expect(form.controls.subProjectId.value).toBeNull();
    expect(form.controls.subProjectId.disabled).toBe(true);
  });

  it('should patch and expose interruptible via initial data/data signal', () => {
    fixture.componentRef.setInput('initialData', {
      name: 'P1',
      operatingCompanyID: '11',
      workTypeId: '22',
      lineOfWorkId: '33',
      projectId: '1',
      interruptible: '2',
    });
    fixture.detectChanges();

    const form = (component as any).form;
    expect(form.controls.interruptible.value).toBe('2');

    const data = component.data();
    expect(data.interruptible).toBe('2');
    expect((data as any).reqChangeId).toBeUndefined();
  });

  it('should not react to form changes after the component is destroyed', () => {
    jest.clearAllMocks();
    fixture.destroy();

    const form = (component as any).form;
    form.controls.projectId.setValue('1');

    expect(masterDataServiceMock.fetchRestrictionSubProjects).not.toHaveBeenCalled();
  });
});
