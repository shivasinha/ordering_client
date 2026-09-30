import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { MasterDataHandlingService } from './master-data-handling.service';
import { MasterDataService } from '@Ordering/api';
import { NotificationService } from '@Ordering/shared/services/notification.service';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { signal, WritableSignal } from '@angular/core';

describe('MasterDataHandlingService', () => {
  let service: MasterDataHandlingService;
  let masterDataServiceMock: any;
  let notificationServiceMock: any;
  let translationsServiceMock: any;

  beforeEach(() => {
    masterDataServiceMock = {
      getOperators: jest.fn(),
      getTrainTypes: jest.fn(),
      getStations: jest.fn(),
      getTractionUnits: jest.fn(),
      getHolidaysList: jest.fn(),
      getRefCodes: jest.fn(),
      getRestrictionProjects: jest.fn(),
      getOrganizations: jest.fn(),
      getTypeOfWorks: jest.fn(),
    };
    notificationServiceMock = {
      pushNotification: jest.fn(),
    };
    translationsServiceMock = {
      translate: jest.fn().mockReturnValue('translated message'),
    };

    TestBed.configureTestingModule({
      providers: [
        MasterDataHandlingService,
        { provide: MasterDataService, useValue: masterDataServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: TranslationsService, useValue: translationsServiceMock },
      ],
    });
    service = TestBed.inject(MasterDataHandlingService);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  const testFetchDataWhenSignalIsEmpty = (signal: any, mockServiceMethod: jest.Mock, fetchMethod: any, mockData: any) => {
    mockServiceMethod.mockReturnValue(of(mockData));
    fetchMethod();
    expect(mockServiceMethod).toHaveBeenCalled();
    expect(signal()).toEqual(mockData);
  };

  const testFetchDataWhenSignalHasData = (signal: any, mockServiceMethod: jest.Mock, fetchMethod: any, existingData: any) => {
    signal.set(existingData);
    fetchMethod();
    expect(mockServiceMethod).not.toHaveBeenCalled();
    expect(signal()).toEqual(existingData);
  };
  describe('fetchAllMasterData', () => {
    it('should call all fetch methods', () => {
      // Ensure that the mocked service methods return observables
      service.fetchOperators = jest.fn().mockReturnValue(of(null));
      service.fetchTrainTypes = jest.fn().mockReturnValue(of(null));
      service.fetchStations = jest.fn().mockReturnValue(of(null));
      service.fetchTractionUnits = jest.fn().mockReturnValue(of(null));
      service.fetchHolidaysList = jest.fn().mockReturnValue(of(null));
      service.fetchRefCodes = jest.fn().mockReturnValue(of(null));
      service.fetchRestrictionProjects = jest.fn().mockReturnValue(of(null));
      service.fetchOrganizations = jest.fn().mockReturnValue(of(null));
      service.fetchTypeOfWorks = jest.fn().mockReturnValue(of(null));

      service.fetchAllMasterData();

      expect(service.fetchOperators).toHaveBeenCalled();
      expect(service.fetchTrainTypes).toHaveBeenCalled();
      expect(service.fetchStations).toHaveBeenCalled();
      expect(service.fetchTractionUnits).toHaveBeenCalled();
      expect(service.fetchHolidaysList).toHaveBeenCalled();
      expect(service.fetchOrganizations).toHaveBeenCalled();
    });

    describe('fetchOperators', () => {
      it('should fetch operators and update the signal when data is empty', () => {
        testFetchDataWhenSignalIsEmpty(
          service.masterDataOperatorsSig,
          masterDataServiceMock.getOperators,
          service.fetchOperators.bind(service),
          [{ id: '1', name: 'Operator 1' }],
        );
      });

      it('should not fetch operators if the signal already has data', () => {
        testFetchDataWhenSignalHasData(
          service.masterDataOperatorsSig,
          masterDataServiceMock.getOperators,
          service.fetchOperators.bind(service),
          [{ id: '1', name: 'Existing Operator' }],
        );
      });
    });

    describe('fetchTrainTypes', () => {
      it('should fetch train types and update the signal when data is empty', () => {
        testFetchDataWhenSignalIsEmpty(
          service.masterDataTrainTypesSig,
          masterDataServiceMock.getTrainTypes,
          service.fetchTrainTypes.bind(service),
          [{ id: '1' }],
        );
      });

      it('should not fetch train types if the signal already has data', () => {
        testFetchDataWhenSignalHasData(
          service.masterDataTrainTypesSig,
          masterDataServiceMock.getTrainTypes,
          service.fetchTrainTypes.bind(service),
          [{ id: '1' }],
        );
      });
    });

    describe('fetchStations', () => {
      it('should fetch stations and update the signal when data is empty', () => {
        testFetchDataWhenSignalIsEmpty(
          service.masterDataStationsSig,
          masterDataServiceMock.getStations,
          service.fetchStations.bind(service),
          [{ id: '1', name: 'Station 1', areaCode: '75346', tracks: [] }],
        );
      });

      it('should not fetch stations if the signal already has data', () => {
        testFetchDataWhenSignalHasData(
          service.masterDataStationsSig,
          masterDataServiceMock.getStations,
          service.fetchStations.bind(service),
          [{ id: '1', name: 'Existing Station', areaCode: '12335', tracks: [] }],
        );
      });
    });

    describe('fetchTractionUnits', () => {
      it('should fetch traction units and update the signal when data is empty', () => {
        testFetchDataWhenSignalIsEmpty(
          service.masterDataTractionUnitsSig,
          masterDataServiceMock.getTractionUnits,
          service.fetchTractionUnits.bind(service),
          [{ id: 'Traction Unit 1' }],
        );
      });

      it('should not fetch traction units if the signal already has data', () => {
        testFetchDataWhenSignalHasData(
          service.masterDataTractionUnitsSig,
          masterDataServiceMock.getTractionUnits,
          service.fetchTractionUnits.bind(service),
          [{ id: 'Existing Traction Unit' }],
        );
      });
    });

    describe('fetchHolidaysList', () => {
      it('should not fetch holidays and update the signal when data is not empty', () => {
        testFetchDataWhenSignalIsEmpty(
          service.masterDataHolidaysListSig,
          masterDataServiceMock.getHolidaysList,
          service.fetchHolidaysList.bind(service),
          [{ date: '2024-12-25' }],
        );
      });

      it('should fetch holidays and update the signal when data is empty', () => {
        testFetchDataWhenSignalHasData(
          service.masterDataHolidaysListSig,
          masterDataServiceMock.getHolidaysList,
          service.fetchHolidaysList.bind(service),
          [{ date: '2024-12-25' }],
        );
      });
    });

    describe('fetchDataIfEmpty', () => {
      it('should fetch data and update the signal when the signal is empty', () => {
        const mockSignal: WritableSignal<unknown[]> = signal<unknown[]>([]);
        const spySignal = jest.spyOn(mockSignal, 'set');
        const mockData = [{ id: '1', name: 'Test Data' }];

        const mockFetchFunction = jest.fn().mockReturnValue(of(mockData));

        service['fetchDataIfEmpty'](mockSignal, mockFetchFunction, 'msgErrorFetchOperators');

        expect(mockFetchFunction).toHaveBeenCalled();
        expect(spySignal).toHaveBeenCalledWith(mockData);
      });

      it('should not fetch data if the signal already has data', () => {
        const mockSignal: WritableSignal<unknown[]> = signal<unknown[]>([{ id: '1', name: 'Existing Data' }]);
        const spySignal = jest.spyOn(mockSignal, 'set');
        const mockFetchFunction = jest.fn();

        service['fetchDataIfEmpty'](mockSignal, mockFetchFunction, 'msgErrorFetchOperators');

        expect(mockFetchFunction).not.toHaveBeenCalled();
        expect(spySignal).not.toHaveBeenCalled();
      });

      it('should handle errors and push a notification when fetching data fails', () => {
        const mockSignal: WritableSignal<unknown[]> = signal<unknown[]>([]);
        const spySignal = jest.spyOn(mockSignal, 'set');
        const mockFetchFunction = jest.fn().mockReturnValue(throwError(() => new Error('Fetch error')));

        service['fetchDataIfEmpty'](mockSignal, mockFetchFunction, 'msgErrorFetchOperators');

        expect(mockFetchFunction).toHaveBeenCalled();
        expect(notificationServiceMock.pushNotification).toHaveBeenCalledWith('translated message', expect.any(Object));
        expect(translationsServiceMock.translate).toHaveBeenCalledWith('msgErrorFetchOperators');
        expect(spySignal).toHaveBeenCalledWith([]);
      });
    });
  });
});
