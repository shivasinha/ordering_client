import { TestBed } from '@angular/core/testing';

import { StopTypeId, TrainStop } from '@Ordering/api';

import { StationsTableHeader } from '@Ordering/portalComponents/stations/interfaces/stations-header.interface';
import { cloneDeep } from '@Ordering/utils/clone-deep';
import { removeEmptyFields } from '@Ordering/utils/sort-filter';

import { RollingStockPropagationService } from './rolling-stock-propagation.service';

jest.mock('@Ordering/utils/clone-deep', () => ({
  cloneDeep: jest.fn(obj => JSON.parse(JSON.stringify(obj))),
}));

function hasValidProperty(obj: any, key: string): boolean {
  return obj.hasOwnProperty(key) && obj[key] !== undefined && obj[key] !== null && obj[key] !== '';
}

jest.mock('@Ordering/utils/sort-filter', () => ({
  removeEmptyFields: jest.fn(obj => {
    const newObj: any = {};
    for (const key in obj) {
      if (hasValidProperty(obj, key)) {
        newObj[key] = obj[key];
      }
    }
    return newObj;
  }),
}));

describe('RollingStockPropogationService', () => {
  let service: RollingStockPropagationService;

  let mockCloneDeep: jest.MockedFunction<typeof cloneDeep>;
  let mockRemoveEmptyFields: jest.MockedFunction<typeof removeEmptyFields>;

  beforeEach(() => {
    mockCloneDeep = cloneDeep as jest.MockedFunction<typeof cloneDeep>;
    mockRemoveEmptyFields = removeEmptyFields as jest.MockedFunction<typeof removeEmptyFields>;

    TestBed.configureTestingModule({});
    service = TestBed.inject(RollingStockPropagationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createTrainStop', () => {
    it('should correctly map all relevant properties from StationsTableHeader to TrainStop', () => {
      const mockStationHeader: StationsTableHeader = {
        id: 1,
        trainStop: {
          areaCode: 'AC1',
          station: 'STA',
          arrivalTime: { time: '10:00', dayOffset: 0 },
          departureTime: { time: '10:05', dayOffset: 0 },
          stopType: StopTypeId.SCHEDULED_STOP,
          stationTrack: { id: 'Track 1' },
          trainType: 'Cargo',
          tractionUnit: [{ id: 'TU1' }],
          trainLength: 100,
          trainWeight: 500,
          axleLoad: 20,
          maximumVelocity: 120,
          brakingPercentage: 80,
        },
      };

      // The expected raw object before removeEmptyFields is applied
      const rawTrainStop = {
        areaCode: 'AC1',
        station: 'STA',
        arrivalTime: { time: '10:00', dayOffset: 0 },
        departureTime: { time: '10:05', dayOffset: 0 },
        stopType: StopTypeId.SCHEDULED_STOP,
        stationTrack: { id: 'Track 1' },
        trainType: 'Cargo',
        tractionUnit: [{ id: 'TU1' }],
        trainLength: 100,
        trainWeight: 500,
        axleLoad: 20,
        maximumVelocity: 120,
        brakingPercentage: 80,
      };

      // We expect removeEmptyFields to be called with this raw object
      // and we'll mock its return value to control the final output
      const expectedFilteredTrainStop: TrainStop = { ...rawTrainStop };
      mockRemoveEmptyFields.mockReturnValueOnce(expectedFilteredTrainStop);

      const result = service.createTrainStop(mockStationHeader);

      expect(mockRemoveEmptyFields).toHaveBeenCalledWith(rawTrainStop);
      expect(result).toEqual(expectedFilteredTrainStop);
    });

    it('should call removeEmptyFields and ensure undefined/null/empty string properties are removed', () => {
      const mockStationHeader: StationsTableHeader = {
        id: 2,
        trainStop: {
          areaCode: 'AC2',
          station: 'STB',
          trainType: undefined, // Should be removed
          tractionUnit: undefined, // Should be removed
          trainLength: 150,
          trainWeight: 600,
          axleLoad: undefined, // Should be removed
          maximumVelocity: undefined, // Should be removed (empty string)
          brakingPercentage: 75,
          stopType: StopTypeId.SCHEDULED_STOP,
          departureTime: { time: '10:00' },
        },
      };

      // The expected output after removeEmptyFields runs
      const expectedTrainStop: TrainStop = {
        areaCode: 'AC2',
        station: 'STB',
        trainLength: 150,
        trainWeight: 600,
        brakingPercentage: 75,
        stopType: StopTypeId.SCHEDULED_STOP,
        departureTime: { time: '10:00' },
      };

      // Mock `removeEmptyFields` to actually perform its logic for this test
      mockRemoveEmptyFields.mockImplementation((obj: any) => {
        const newObj: any = {};
        for (const key in obj) {
          if (hasValidProperty(obj, key)) {
            newObj[key] = obj[key];
          }
        }
        return newObj;
      });

      const result = service.createTrainStop(mockStationHeader);

      expect(mockRemoveEmptyFields).toHaveBeenCalled();
      expect(result).toEqual(expectedTrainStop);
      expect(result.trainType).toBeUndefined();
      expect(result.tractionUnit).toBeUndefined();
      expect(result.axleLoad).toBeUndefined();
      expect(result.maximumVelocity).toBeUndefined();
    });
  });

  describe('propagateUpdatedStationProperties', () => {
    let originalStations: StationsTableHeader[];
    let updatedStation: StationsTableHeader;
    let spyPropagateUpdatedProperty: jest.SpyInstance;
    let spyCreateTrainStop: jest.SpyInstance;

    beforeEach(() => {
      originalStations = [
        {
          id: 1,
          trainStop: {
            areaCode: 'DE',
            station: 'Station A',
            trainType: 'Cargo',
            tractionUnit: [{ id: 'TU1' }],
            trainLength: 100,
            stopType: StopTypeId.SCHEDULED_STOP,
            departureTime: { time: '10:00' },
          },
        },
        {
          id: 2,
          trainStop: {
            areaCode: 'DE',
            station: 'Station A',
            trainType: 'Cargo',
            tractionUnit: [{ id: 'TU1' }],
            trainLength: 100,
            stopType: StopTypeId.SCHEDULED_STOP,
            departureTime: { time: '10:00' },
          },
        },
        {
          id: 3,
          trainStop: {
            areaCode: 'DE',
            station: 'Station A',
            trainType: 'Cargo',
            tractionUnit: [{ id: 'TU1' }],
            trainLength: 100,
            stopType: StopTypeId.SCHEDULED_STOP,
            departureTime: { time: '10:00' },
          },
        },
      ];
      ((updatedStation = {
        id: 2,
        trainStop: {
          areaCode: 'DE',
          station: 'Station A',
          trainType: 'Cargo',
          tractionUnit: [{ id: 'TU2' }],
          trainLength: 120,
          stopType: StopTypeId.SCHEDULED_STOP,
          departureTime: { time: '10:00' },
        },
      }),
        // Spy on private methods to check if they are called correctly
        (spyPropagateUpdatedProperty = jest.spyOn(service as any, 'propagateUpdatedProperty').mockImplementation(() => {})));
      // Spy on createTrainStop and mock its return value for predictable behavior
      spyCreateTrainStop = jest.spyOn(service, 'createTrainStop').mockReturnValue(updatedStation.trainStop);
    });

    afterEach(() => {
      // Restore spies after each test
      spyPropagateUpdatedProperty.mockRestore();
      spyCreateTrainStop.mockRestore();
    });

    it('should deep clone the original stations array', () => {
      service.propagateUpdatedStationProperties(originalStations, updatedStation);
      expect(mockCloneDeep).toHaveBeenCalledWith(originalStations); // Use mockCloneDeep
    });

    it('should call propagateUpdatedProperty for each propagatable property', () => {
      service.propagateUpdatedStationProperties(originalStations, updatedStation);
      // There are 7 properties defined in PROPAGATABLE_PROPERTIES
      expect(spyPropagateUpdatedProperty).toHaveBeenCalledTimes(7);

      // Verify one specific call as an example
      expect(spyPropagateUpdatedProperty).toHaveBeenCalledWith(
        updatedStation,
        expect.any(Array), // The cloned array passed to private method
        expect.any(Function), // Selector for 'tractionUnit'
        expect.any(Function), // Setter for 'tractionUnit'
        expect.any(Boolean), // requiresRollingStockMatch flag
        expect.any(Boolean), // rollingStockChanged flag
      );
    });

    it('should update the trainStop of the specific updatedStation within the cloned array using createTrainStop', () => {
      // To ensure the spy sees the cloned array, we mock cloneDeep's return
      const clonedStations = mockCloneDeep(originalStations); // Use mockCloneDeep
      mockCloneDeep.mockReturnValue(clonedStations); // Use mockCloneDeep

      const expectedUpdatedTrainStop = { trainType: 'Passenger', tractionUnit: 'TU2', someNewProp: 'value' };
      spyCreateTrainStop.mockReturnValue(expectedUpdatedTrainStop); // Mock the result of createTrainStop

      const result = service.propagateUpdatedStationProperties(originalStations, updatedStation);

      expect(spyCreateTrainStop).toHaveBeenCalledWith(updatedStation);
      const station2InResult = result.find(s => s.id === updatedStation.id);
      expect(station2InResult?.trainStop).toEqual(expectedUpdatedTrainStop);
    });

    it('should return a new array reference and not mutate the originalStations', () => {
      const result = service.propagateUpdatedStationProperties(originalStations, updatedStation);

      expect(result).not.toBe(originalStations); // Ensure it's a new array
      expect(mockCloneDeep).toHaveBeenCalled(); // Use mockCloneDeep
    });
  });

  describe('triggerPropertyInheritance', () => {
    let originalStations: StationsTableHeader[];
    let spyApplyPropertyInheritance: jest.SpyInstance;

    beforeEach(() => {
      originalStations = [
        {
          id: 1,
          trainStop: {
            areaCode: 'DE',
            station: 'Station A',
            trainType: 'Cargo',
            tractionUnit: [{ id: 'TU1' }],
            trainLength: 100,
            stopType: StopTypeId.SCHEDULED_STOP,
            departureTime: { time: '10:00' },
          },
        },
        {
          id: 2,
          trainStop: {
            areaCode: 'DE',
            station: 'Station A',
            trainType: undefined,
            tractionUnit: [{ id: 'TU1' }],
            trainLength: 100,
            stopType: StopTypeId.SCHEDULED_STOP,
            departureTime: { time: '10:00' },
          },
        },
      ];
      // Spy on the private method it calls
      spyApplyPropertyInheritance = jest.spyOn(service as any, 'applyPropertyInheritance').mockImplementation(() => {});
    });

    afterEach(() => {
      spyApplyPropertyInheritance.mockRestore();
    });

    it('should deep clone the original stations array', () => {
      service.triggerPropertyInheritance(originalStations);
      expect(mockCloneDeep).toHaveBeenCalledWith(originalStations); // Use mockCloneDeep
    });

    it('should call applyPropertyInheritance for each propagatable property', () => {
      service.triggerPropertyInheritance(originalStations);
      expect(spyApplyPropertyInheritance).toHaveBeenCalledTimes(7); // 7 propagatable properties
      // Verify one specific call as an example
      expect(spyApplyPropertyInheritance).toHaveBeenCalledWith(
        expect.any(Array), // The cloned array
        expect.any(Function), // Selector for 'trainType'
        expect.any(Function), // Setter for 'trainType'
        expect.any(Boolean), // requiresRollingStockMatch flag
      );
    });

    it('should return a new array reference and not mutate the originalStations', () => {
      const result = service.triggerPropertyInheritance(originalStations);

      expect(result).not.toBe(originalStations);
      expect(mockCloneDeep).toHaveBeenCalled(); // Use mockCloneDeep
    });
  });

  describe('private method: propagateUpdatedProperty', () => {
    let spyPropagatePropertyChange: jest.SpyInstance;
    let spyApplyPropertyInheritance: jest.SpyInstance;
    let spyCreateTrainStop: jest.SpyInstance;
    let spyIsSamePropertyValue: jest.SpyInstance;

    // Helper functions for property selectors/setters
    const trainTypeSelector = (s: StationsTableHeader) => s.trainStop.trainType;
    const trainTypeSetter = (s: StationsTableHeader, v: any) => (s.trainStop.trainType = v);

    let originalStations: StationsTableHeader[];
    const updatedStation: StationsTableHeader = {
      id: 2,
      trainStop: {
        areaCode: 'DE',
        station: 'Station C',
        trainType: undefined,
        tractionUnit: [{ id: 'TU1' }],
        trainLength: 100,
        stopType: StopTypeId.SCHEDULED_STOP,
        departureTime: { time: '10:00' },
      },
    };

    beforeEach(() => {
      // Spy on internal methods that propagateUpdatedProperty calls
      spyPropagatePropertyChange = jest.spyOn(service as any, 'propagatePropertyChange').mockImplementation(() => {});
      spyApplyPropertyInheritance = jest.spyOn(service as any, 'applyPropertyInheritance').mockImplementation(() => {});
      spyCreateTrainStop = jest.spyOn(service, 'createTrainStop');
      spyIsSamePropertyValue = jest.spyOn(service as any, 'isSamePropertyValue');

      originalStations = [
        {
          id: 1,
          trainStop: {
            areaCode: 'DE',
            station: 'Station A',
            trainType: 'Cargo',
            tractionUnit: [{ id: 'TU1' }],
            trainLength: 100,
            stopType: StopTypeId.SCHEDULED_STOP,
            departureTime: { time: '10:00' },
          },
        },
        {
          id: 2,
          trainStop: {
            areaCode: 'DE',
            station: 'Station B',
            trainType: 'Cargo',
            tractionUnit: [{ id: 'TU1' }],
            trainLength: 100,
            stopType: StopTypeId.SCHEDULED_STOP,
            departureTime: { time: '10:00' },
          },
        },
      ];
    });

    afterEach(() => {
      spyPropagatePropertyChange.mockRestore();
      spyApplyPropertyInheritance.mockRestore();
      spyCreateTrainStop.mockRestore();
      spyIsSamePropertyValue.mockRestore();
    });

    it('should call propagatePropertyChange if the new value is different from the original value', () => {
      updatedStation.trainStop.trainType = 'Passenger';

      spyCreateTrainStop.mockReturnValueOnce(updatedStation.trainStop); // Mock for newValue calculation
      spyIsSamePropertyValue.mockReturnValueOnce(false); // Simulate that values are different

      (service as any).propagateUpdatedProperty(updatedStation, originalStations, trainTypeSelector, trainTypeSetter, false);

      expect(spyPropagatePropertyChange).toHaveBeenCalledWith(
        'Passenger', // The new value from updatedStation
        false,
        updatedStation.id,
        originalStations,
        trainTypeSelector,
        trainTypeSetter,
        false,
        expect.any(Object),
      );
      expect(spyApplyPropertyInheritance).not.toHaveBeenCalled();
    });

    it('should call applyPropertyInheritance if the new value is the same as the original value', () => {
      updatedStation.trainStop.trainType = 'Passenger';

      spyCreateTrainStop.mockReturnValueOnce(updatedStation.trainStop); // Mock for newValue calculation
      spyIsSamePropertyValue.mockReturnValueOnce(true); // Simulate that values are the same

      (service as any).propagateUpdatedProperty(updatedStation, originalStations, trainTypeSelector, trainTypeSetter, false);

      expect(spyApplyPropertyInheritance).toHaveBeenCalledWith(originalStations, trainTypeSelector, trainTypeSetter, false, false);
      expect(spyPropagatePropertyChange).not.toHaveBeenCalled();
    });

    it('should call applyPropertyInheritance if the new value is undefined (e.g., property was removed)', () => {
      updatedStation.trainStop.trainType = undefined;

      spyCreateTrainStop.mockReturnValueOnce({
        /* empty trainStop after removal */
      }); // Mocking createTrainStop to return an object where trainType is undefined
      // isSamePropertyValue will be called with (undefined, 'Cargo') which will return false.
      // The crucial part is that `newValue` will be undefined.

      (service as any).propagateUpdatedProperty(updatedStation, originalStations, trainTypeSelector, trainTypeSetter, false);

      expect(spyApplyPropertyInheritance).toHaveBeenCalledWith(originalStations, trainTypeSelector, trainTypeSetter, false, false);
      expect(spyPropagatePropertyChange).not.toHaveBeenCalled(); // propagatePropertyChange is not called if newValue is falsy
    });

    it('should call createTrainStop to determine the new value from the updatedStation', () => {
      updatedStation.trainStop.trainType = 'Passenger';

      spyCreateTrainStop.mockReturnValueOnce(updatedStation.trainStop); // Mock the return value for newValue

      (service as any).propagateUpdatedProperty(updatedStation, originalStations, trainTypeSelector, trainTypeSetter, false);

      expect(spyCreateTrainStop).toHaveBeenCalledWith(updatedStation);
    });
  });

  describe('private method: propagatePropertyChange', () => {
    let propagatePropertyChange: (
      newValue: any,
      isRemovedValue: boolean,
      changedStationId: number,
      originalStations: StationsTableHeader[],
      propertySelector: (station: StationsTableHeader) => any,
      propertySetter: (station: StationsTableHeader, value: any) => void,
    ) => void;

    const trainTypeSelector = (s: StationsTableHeader) => s.trainStop.trainType;
    const trainTypeSetter = (s: StationsTableHeader, v: any) => (s.trainStop.trainType = v);

    beforeEach(() => {
      propagatePropertyChange = (service as any).propagatePropertyChange;
    });

    it('should propagate new value to subsequent stations if they were inheriting or had the same original value', () => {
      const stations: StationsTableHeader[] = [
        {
          id: 1,
          trainStop: {
            areaCode: 'DE',
            station: 'Station A',
            trainType: 'Cargo',
            tractionUnit: [{ id: 'TU1' }],
            trainLength: 100,
            stopType: StopTypeId.SCHEDULED_STOP,
            departureTime: { time: '10:00' },
          },
        },
        {
          id: 2,
          trainStop: {
            areaCode: 'DE',
            station: 'Station B',
            trainType: 'Cargo',
            tractionUnit: [{ id: 'TU1' }],
            trainLength: 100,
            stopType: StopTypeId.SCHEDULED_STOP,
            departureTime: { time: '10:00' },
          },
        },
        {
          id: 3,
          trainStop: {
            areaCode: 'DE',
            station: 'Station C',
            trainType: undefined,
            tractionUnit: [{ id: 'TU1' }],
            trainLength: 100,
            stopType: StopTypeId.SCHEDULED_STOP,
            departureTime: { time: '10:00' },
          },
        },
        {
          id: 4,
          trainStop: {
            areaCode: 'DE',
            station: 'Station D',
            trainType: 'Cargo',
            tractionUnit: [{ id: 'TU1' }],
            trainLength: 100,
            stopType: StopTypeId.SCHEDULED_STOP,
            departureTime: { time: '10:00' },
          },
        },
      ];
      const changedStationId = 1;
      const newValue = 'Passenger';

      propagatePropertyChange(newValue, false, changedStationId, stations, trainTypeSelector, trainTypeSetter);

      expect(stations[0].trainStop.trainType).toBe('Cargo'); // Original station unchanged
      expect(stations[1].trainStop.trainType).toBe('Passenger');
      expect(stations[2].trainStop.trainType).toBe('Passenger');
      expect(stations[3].trainStop.trainType).toBe('Passenger');
    });

    it('should stop propagation when a station with a different explicit value is encountered', () => {
      const stations: StationsTableHeader[] = [
        {
          id: 1,
          trainStop: {
            areaCode: 'DE',
            station: 'Station A',
            trainType: 'Cargo',
            tractionUnit: [{ id: 'TU1' }],
            trainLength: 100,
            stopType: StopTypeId.SCHEDULED_STOP,
            departureTime: { time: '10:00' },
          },
        },
        {
          id: 2,
          trainStop: {
            areaCode: 'DE',
            station: 'Station B',
            trainType: 'Cargo',
            tractionUnit: [{ id: 'TU1' }],
            trainLength: 100,
            stopType: StopTypeId.SCHEDULED_STOP,
            departureTime: { time: '10:00' },
          },
        },
        {
          id: 3,
          trainStop: {
            areaCode: 'DE',
            station: 'Station C',
            trainType: 'Express',
            tractionUnit: [{ id: 'TU1' }],
            trainLength: 100,
            stopType: StopTypeId.SCHEDULED_STOP,
            departureTime: { time: '10:00' },
          },
        },
        {
          id: 4,
          trainStop: {
            areaCode: 'DE',
            station: 'Station D',
            trainType: undefined,
            tractionUnit: [{ id: 'TU1' }],
            trainLength: 100,
            stopType: StopTypeId.SCHEDULED_STOP,
            departureTime: { time: '10:00' },
          },
        },
      ];
      const changedStationId = 1;
      const newValue = 'Passenger';

      propagatePropertyChange(newValue, false, changedStationId, stations, trainTypeSelector, trainTypeSetter);

      expect(stations[0].trainStop.trainType).toBe('Cargo');
      expect(stations[1].trainStop.trainType).toBe('Passenger');
      expect(stations[2].trainStop.trainType).toBe('Express'); // Should remain unchanged
      expect(stations[3].trainStop.trainType).toBeUndefined(); // Should remain unchanged
    });

    it('should handle propagation when the changed station itself had an undefined value', () => {
      const stations: StationsTableHeader[] = [
        {
          id: 1,
          trainStop: {
            areaCode: 'DE',
            station: 'Station A',
            trainType: undefined,
            tractionUnit: [{ id: 'TU1' }],
            trainLength: 100,
            stopType: StopTypeId.SCHEDULED_STOP,
            departureTime: { time: '10:00' },
          },
        },
        {
          id: 2,
          trainStop: {
            areaCode: 'DE',
            station: 'Station B',
            trainType: undefined,
            tractionUnit: [{ id: 'TU1' }],
            trainLength: 100,
            stopType: StopTypeId.SCHEDULED_STOP,
            departureTime: { time: '10:00' },
          },
        },
        {
          id: 3,
          trainStop: {
            areaCode: 'DE',
            station: 'Station C',
            trainType: 'Express',
            tractionUnit: [{ id: 'TU1' }],
            trainLength: 100,
            stopType: StopTypeId.SCHEDULED_STOP,
            departureTime: { time: '10:00' },
          },
        },
      ];
      const changedStationId = 1;
      const newValue = 'Passenger';

      propagatePropertyChange(newValue, false, changedStationId, stations, trainTypeSelector, trainTypeSetter);

      expect(stations[0].trainStop.trainType).toBeUndefined(); // Original station (S1) unchanged
      expect(stations[1].trainStop.trainType).toBe('Passenger'); // S2 was inheriting from S1 (undefined), so it takes newValue
      expect(stations[2].trainStop.trainType).toBe('Express'); // S3 has explicit value, stops propagation
    });
  });

  describe('private method: applyPropertyInheritance', () => {
    let applyPropertyInheritance: (
      originalStations: StationsTableHeader[],
      propertySelector: (station: StationsTableHeader) => any,
      propertySetter: (station: StationsTableHeader, value: any) => void,
    ) => void;

    const trainTypeSelector = (s: StationsTableHeader) => s.trainStop.trainType;
    const trainTypeSetter = (s: StationsTableHeader, v: any) => (s.trainStop.trainType = v);

    let stations: StationsTableHeader[];

    beforeEach(() => {
      applyPropertyInheritance = (service as any).applyPropertyInheritance;
      stations = [
        {
          id: 1,
          trainStop: {
            areaCode: 'DE',
            station: 'Station A',
            trainType: undefined,
            tractionUnit: [{ id: 'TU1' }],
            trainLength: 100,
            stopType: StopTypeId.SCHEDULED_STOP,
            departureTime: { time: '10:00' },
          },
        },
        {
          id: 2,
          trainStop: {
            areaCode: 'DE',
            station: 'Station B',
            trainType: undefined,
            tractionUnit: [{ id: 'TU1' }],
            trainLength: 100,
            stopType: StopTypeId.SCHEDULED_STOP,
            departureTime: { time: '10:00' },
          },
        },
        {
          id: 3,
          trainStop: {
            areaCode: 'DE',
            station: 'Station C',
            trainType: undefined,
            tractionUnit: [{ id: 'TU1' }],
            trainLength: 100,
            stopType: StopTypeId.SCHEDULED_STOP,
            departureTime: { time: '10:00' },
          },
        },
        {
          id: 4,
          trainStop: {
            areaCode: 'DE',
            station: 'Station D',
            trainType: undefined,
            tractionUnit: [{ id: 'TU1' }],
            trainLength: 100,
            stopType: StopTypeId.SCHEDULED_STOP,
            departureTime: { time: '10:00' },
          },
        },
      ];
    });

    it('should apply inheritance from the first explicit value forward', () => {
      stations[0].trainStop.trainType = 'Cargo';

      applyPropertyInheritance(stations, trainTypeSelector, trainTypeSetter);

      expect(stations[0].trainStop.trainType).toBe('Cargo');
      expect(stations[1].trainStop.trainType).toBe('Cargo');
      expect(stations[2].trainStop.trainType).toBe('Cargo');
    });

    it('should update lastKnownValue when an explicit value is encountered mid-sequence', () => {
      stations[0].trainStop.trainType = 'Cargo';
      stations[2].trainStop.trainType = 'Passenger';

      applyPropertyInheritance(stations, trainTypeSelector, trainTypeSetter);

      expect(stations[0].trainStop.trainType).toBe('Cargo');
      expect(stations[1].trainStop.trainType).toBe('Cargo');
      expect(stations[2].trainStop.trainType).toBe('Passenger');
      expect(stations[3].trainStop.trainType).toBe('Passenger');
    });

    it('should not apply inheritance if the first station has no value and no preceding value exists', () => {
      expect(stations[0].trainStop.trainType).toBeUndefined();
      expect(stations[1].trainStop.trainType).toBeUndefined();
    });

    it('should not modify stations that already have explicit values, even if different from lastKnownValue', () => {
      stations[0].trainStop.trainType = 'Cargo';
      stations[1].trainStop.trainType = 'Express';

      applyPropertyInheritance(stations, trainTypeSelector, trainTypeSetter);

      expect(stations[0].trainStop.trainType).toBe('Cargo');
      expect(stations[1].trainStop.trainType).toBe('Express'); // Should remain Express
    });
  });

  describe('private method: isSamePropertyValue', () => {
    let isSamePropertyValue: (a: any, b: any) => boolean;

    beforeEach(() => {
      // Access the private method using bracket notation for testing
      isSamePropertyValue = (service as any).isSamePropertyValue;
    });

    it('should return true for identical primitive values', () => {
      expect(isSamePropertyValue(1, 1)).toBe(true);
      expect(isSamePropertyValue('hello', 'hello')).toBe(true);
      expect(isSamePropertyValue(true, true)).toBe(true);
      expect(isSamePropertyValue(null, null)).toBe(true);
      expect(isSamePropertyValue(undefined, undefined)).toBe(true);
    });

    it('should return false for different primitive values', () => {
      expect(isSamePropertyValue(1, 2)).toBe(false);
      expect(isSamePropertyValue('hello', 'world')).toBe(false);
      expect(isSamePropertyValue(true, false)).toBe(false);
      expect(isSamePropertyValue(null, undefined)).toBe(false);
      expect(isSamePropertyValue(1, '1')).toBe(false); // Different types
    });

    it('should return true for objects with same content (shallow comparison via Object.entries().toString())', () => {
      const obj1 = { a: 1, b: 'test' };
      const obj2 = { a: 1, b: 'test' };
      expect(isSamePropertyValue(obj1, obj2)).toBe(true);
    });

    it('should return false for objects with different content', () => {
      const obj1 = { a: 1, b: 'test' };
      const obj2 = { a: 2, b: 'test' };
      const obj3 = { a: 1, c: 'test' };
      expect(isSamePropertyValue(obj1, obj2)).toBe(false);
      expect(isSamePropertyValue(obj1, obj3)).toBe(false);
    });

    it('should return false for objects with different order of keys (due to Object.entries().toString() behavior)', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { b: 2, a: 1 };
      // Object.entries order is generally stable for simple objects, but toString() of the array of entries
      // might differ if the order is not strictly guaranteed or if the implementation is sensitive to it.
      // This test confirms the current implementation's behavior, which is to treat them as different.
      expect(isSamePropertyValue(obj1, obj2)).toBe(false);
    });

    it('should handle mixed types correctly', () => {
      expect(isSamePropertyValue({ a: 1 }, 1)).toBe(false);
      expect(isSamePropertyValue(1, { a: 1 })).toBe(false);
      expect(isSamePropertyValue(null, { a: 1 })).toBe(false);
    });
  });

  describe('Model Train baseline (SolCon TPRPLAN-13552)', () => {
    describe('isUserInfluenced', () => {
      it('returns false when the stop has no Model Train baseline', () => {
        const stop: TrainStop = {
          areaCode: 'DE',
          station: 'STA',
          stopType: StopTypeId.SCHEDULED_STOP,
          departureTime: { time: '10:00' },
          trainLength: 100,
        };
        expect(service.isUserInfluenced(stop, 'trainLength')).toBe(false);
      });

      it('treats any defined value as user-influenced when the characteristic has no baseline value', () => {
        const stop: TrainStop = {
          areaCode: 'DE',
          station: 'STA',
          stopType: StopTypeId.SCHEDULED_STOP,
          departureTime: { time: '10:00' },
          trainWeight: 200,
          modelTrainValues: { trainLength: 100 },
        };
        expect(service.isUserInfluenced(stop, 'trainWeight')).toBe(true);
      });

      it('treats any defined axle load as user-influenced (no server-side baseline)', () => {
        const stop: TrainStop = {
          areaCode: 'DE',
          station: 'STA',
          stopType: StopTypeId.SCHEDULED_STOP,
          departureTime: { time: '10:00' },
          axleLoad: 20,
          modelTrainValues: { trainLength: 100 },
        };
        expect(service.isUserInfluenced(stop, 'axleLoad')).toBe(true);
      });

      it('returns false for axle load when the stop has no axle load value', () => {
        const stop: TrainStop = {
          areaCode: 'DE',
          station: 'STA',
          stopType: StopTypeId.SCHEDULED_STOP,
          departureTime: { time: '10:00' },
          modelTrainValues: { trainLength: 100 },
        };
        expect(service.isUserInfluenced(stop, 'axleLoad')).toBe(false);
      });

      it('returns false when the value matches the baseline', () => {
        const stop: TrainStop = {
          areaCode: 'DE',
          station: 'STA',
          stopType: StopTypeId.SCHEDULED_STOP,
          departureTime: { time: '10:00' },
          trainLength: 100,
          modelTrainValues: { trainLength: 100 },
        };
        expect(service.isUserInfluenced(stop, 'trainLength')).toBe(false);
      });

      it('returns true when the value differs from the baseline', () => {
        const stop: TrainStop = {
          areaCode: 'DE',
          station: 'STA',
          stopType: StopTypeId.SCHEDULED_STOP,
          departureTime: { time: '10:00' },
          trainLength: 150,
          modelTrainValues: { trainLength: 100 },
        };
        expect(service.isUserInfluenced(stop, 'trainLength')).toBe(true);
      });

      it('returns false when the stop is undefined', () => {
        expect(service.isUserInfluenced(undefined, 'trainLength')).toBe(false);
      });

      it('returns false when the stop trainType differs from the baseline', () => {
        const stop: TrainStop = {
          areaCode: 'DE',
          station: 'STA',
          stopType: StopTypeId.SCHEDULED_STOP,
          departureTime: { time: '10:00' },
          trainType: 'Passenger',
          trainLength: 150,
          modelTrainValues: { trainType: 'Cargo', trainLength: 100 },
        };
        expect(service.isUserInfluenced(stop, 'trainLength')).toBe(false);
      });

      it('returns false when the stop tractionUnit differs from the baseline', () => {
        const stop: TrainStop = {
          areaCode: 'DE',
          station: 'STA',
          stopType: StopTypeId.SCHEDULED_STOP,
          departureTime: { time: '10:00' },
          tractionUnit: [{ id: 'TU2' }],
          trainLength: 150,
          modelTrainValues: { tractionUnit: [{ id: 'TU1' }], trainLength: 100 },
        };
        expect(service.isUserInfluenced(stop, 'trainLength')).toBe(false);
      });
    });

    describe('resetToModelTrainValues', () => {
      it('restores every propagatable characteristic from the baseline simultaneously', () => {
        const stop: TrainStop = {
          areaCode: 'DE',
          station: 'STA',
          stopType: StopTypeId.SCHEDULED_STOP,
          departureTime: { time: '10:00' },
          trainLength: 999,
          trainWeight: 888,
          axleLoad: 77,
          maximumVelocity: 66,
          brakingPercentage: 55,
          modelTrainValues: {
            trainLength: 100,
            trainWeight: 200,
            axleLoad: 20,
            maximumVelocity: 80,
            brakingPercentage: 100,
          },
        };
        const reset = service.resetToModelTrainValues(stop);
        expect(reset.trainLength).toBe(100);
        expect(reset.trainWeight).toBe(200);
        expect(reset.axleLoad).toBe(20);
        expect(reset.maximumVelocity).toBe(80);
        expect(reset.brakingPercentage).toBe(100);
        expect(reset.modelTrainValues).toBe(stop.modelTrainValues);
      });

      it('returns the input untouched when no baseline is available', () => {
        const stop: TrainStop = {
          areaCode: 'DE',
          station: 'STA',
          stopType: StopTypeId.SCHEDULED_STOP,
          departureTime: { time: '10:00' },
          trainLength: 999,
        };
        expect(service.resetToModelTrainValues(stop)).toBe(stop);
      });

      it('clears characteristics that are missing from the baseline', () => {
        const stop: TrainStop = {
          areaCode: 'DE',
          station: 'STA',
          stopType: StopTypeId.SCHEDULED_STOP,
          departureTime: { time: '10:00' },
          trainLength: 999,
          trainWeight: 888,
          maximumVelocity: 66,
          brakingPercentage: 55,
          modelTrainValues: {
            trainLength: 100,
          },
        };
        const reset = service.resetToModelTrainValues(stop);
        expect(reset.trainLength).toBe(100);
        expect(reset.trainWeight).toBeUndefined();
        expect(reset.maximumVelocity).toBeUndefined();
        expect(reset.brakingPercentage).toBeUndefined();
      });

      it('clears axle load on reset because the Model Train provides no baseline for it', () => {
        const stop: TrainStop = {
          areaCode: 'DE',
          station: 'STA',
          stopType: StopTypeId.SCHEDULED_STOP,
          departureTime: { time: '10:00' },
          axleLoad: 77,
          trainWeight: 888,
          modelTrainValues: {
            trainWeight: 200,
          },
        };
        const reset = service.resetToModelTrainValues(stop);
        expect(reset.axleLoad).toBeUndefined();
        expect(reset.trainWeight).toBe(200);
      });

      it('treats explicit null baseline values as missing and clears the stop value', () => {
        const stop: TrainStop = {
          areaCode: 'DE',
          station: 'STA',
          stopType: StopTypeId.SCHEDULED_STOP,
          departureTime: { time: '10:00' },
          trainWeight: 888,
          modelTrainValues: {
            trainWeight: null as unknown as number,
          },
        };
        const reset = service.resetToModelTrainValues(stop);
        expect(reset.trainWeight).toBeUndefined();
      });
    });

    describe('createTrainStop', () => {
      it('preserves the modelTrainValues baseline', () => {
        const baseline = { trainLength: 100, trainType: 'REG' };
        const mockStationHeader: StationsTableHeader = {
          id: 1,
          trainStop: {
            areaCode: 'DE',
            station: 'STA',
            stopType: StopTypeId.SCHEDULED_STOP,
            departureTime: { time: '10:00' },
            trainLength: 150,
            modelTrainValues: baseline,
          },
        };
        mockRemoveEmptyFields.mockImplementation((obj: any) => {
          const newObj: any = {};
          for (const key in obj) {
            if (hasValidProperty(obj, key)) {
              newObj[key] = obj[key];
            }
          }
          return newObj;
        });
        const result = service.createTrainStop(mockStationHeader);
        expect(result.modelTrainValues).toEqual(baseline);
      });
    });
  });

  describe('Model Train inheritance across rolling stock changes', () => {
    beforeEach(() => {
      // Earlier tests permanently install `mockReturnValue` on `mockCloneDeep` and
      // `mockImplementation` on `mockRemoveEmptyFields`; reset both so this block
      // exercises the real propagation flow with a clean deep clone.
      mockCloneDeep.mockReset();
      mockCloneDeep.mockImplementation(obj => JSON.parse(JSON.stringify(obj)));
      mockRemoveEmptyFields.mockReset();
      mockRemoveEmptyFields.mockImplementation((obj: any) => {
        const newObj: any = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key) && obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
            newObj[key] = obj[key];
          }
        }
        return newObj;
      });
    });

    const buildStation = (id: number, overrides: Partial<StationsTableHeader['trainStop']> = {}): StationsTableHeader => ({
      id,
      trainStop: {
        areaCode: 'DE',
        station: `Station ${id}`,
        stopType: StopTypeId.SCHEDULED_STOP,
        departureTime: { time: '10:00' },
        trainType: 'Cargo',
        tractionUnit: [{ id: 'TU1' }],
        trainLength: 100,
        trainWeight: 500,
        axleLoad: 20,
        maximumVelocity: 120,
        brakingPercentage: 80,
        ...overrides,
      },
    });

    it('clears inherited Model Train values on a station whose rolling stock now differs', () => {
      const originalStations = [buildStation(0), buildStation(1)];
      const updatedStation = buildStation(1, {
        trainType: 'Passenger',
        tractionUnit: [{ id: 'TU2' }],
      });

      const result = service.propagateUpdatedStationProperties(originalStations, updatedStation);

      expect(result[0].trainStop.trainLength).toBe(100);
      expect(result[1].trainStop.trainType).toBe('Passenger');
      expect(result[1].trainStop.tractionUnit).toEqual([{ id: 'TU2' }]);
      expect(result[1].trainStop.trainLength).toBeUndefined();
      expect(result[1].trainStop.trainWeight).toBeUndefined();
      expect(result[1].trainStop.axleLoad).toBeUndefined();
      expect(result[1].trainStop.maximumVelocity).toBeUndefined();
      expect(result[1].trainStop.brakingPercentage).toBeUndefined();
    });

    it('clears inherited Model Train values when only the traction unit changes', () => {
      const originalStations = [buildStation(0), buildStation(1)];
      const updatedStation = buildStation(1, {
        tractionUnit: [{ id: 'TU2' }],
      });

      const result = service.propagateUpdatedStationProperties(originalStations, updatedStation);

      expect(result[1].trainStop.tractionUnit).toEqual([{ id: 'TU2' }]);
      expect(result[1].trainStop.trainLength).toBeUndefined();
      expect(result[1].trainStop.trainWeight).toBeUndefined();
      expect(result[1].trainStop.axleLoad).toBeUndefined();
      expect(result[1].trainStop.maximumVelocity).toBeUndefined();
      expect(result[1].trainStop.brakingPercentage).toBeUndefined();
    });

    it('propagates the clear forward through subsequent stations that share the new rolling stock', () => {
      const originalStations = [buildStation(0), buildStation(1), buildStation(2)];
      const updatedStation = buildStation(1, {
        trainType: 'Passenger',
      });

      const result = service.propagateUpdatedStationProperties(originalStations, updatedStation);

      expect(result[2].trainStop.trainType).toBe('Passenger');
      expect(result[2].trainStop.trainLength).toBeUndefined();
      expect(result[2].trainStop.trainWeight).toBeUndefined();
    });

    it('keeps inherited Model Train values when the rolling stock still matches', () => {
      const originalStations = [buildStation(0), buildStation(1)];
      const updatedStation = buildStation(1, {
        // Only a non-rolling-stock property changes (e.g. train weight).
        trainWeight: 550,
      });

      const result = service.propagateUpdatedStationProperties(originalStations, updatedStation);

      expect(result[1].trainStop.trainType).toBe('Cargo');
      expect(result[1].trainStop.trainLength).toBe(100);
      expect(result[1].trainStop.trainWeight).toBe(550);
    });

    it('does not inherit Model Train values across a rolling stock change when adding a station', () => {
      const stations = [
        buildStation(0),
        buildStation(1, {
          trainType: 'Passenger',
          tractionUnit: [{ id: 'TU2' }],
          // Newly added stop starts without Model Train characteristics.
          trainLength: undefined,
          trainWeight: undefined,
          axleLoad: undefined,
          maximumVelocity: undefined,
          brakingPercentage: undefined,
        }),
      ];

      const result = service.triggerPropertyInheritance(stations);

      expect(result[1].trainStop.trainType).toBe('Passenger');
      expect(result[1].trainStop.trainLength).toBeUndefined();
      expect(result[1].trainStop.trainWeight).toBeUndefined();
      expect(result[1].trainStop.axleLoad).toBeUndefined();
      expect(result[1].trainStop.maximumVelocity).toBeUndefined();
      expect(result[1].trainStop.brakingPercentage).toBeUndefined();
    });

    it('does not clear coincidentally matching values on other stops when only a non-rolling-stock property changes', () => {
      // Regression: changing only axle load on Station 0 must not wipe out the weight
      // on Station 1 just because Station 1 has different rolling stock and its weight
      // happens to equal Station 0's weight.
      const originalStations = [
        buildStation(0, { trainWeight: 500, axleLoad: 20 }),
        buildStation(1, {
          trainType: 'Passenger',
          tractionUnit: [{ id: 'TU2' }],
          trainWeight: 500,
          axleLoad: 25,
        }),
      ];
      const updatedStation = buildStation(0, { trainWeight: 500, axleLoad: 25 });

      const result = service.propagateUpdatedStationProperties(originalStations, updatedStation);

      expect(result[0].trainStop.axleLoad).toBe(25);
      expect(result[0].trainStop.trainWeight).toBe(500);
      expect(result[1].trainStop.trainWeight).toBe(500);
      expect(result[1].trainStop.axleLoad).toBe(25);
    });

    it('does not inherit Model Train values across a rolling stock chain break with no value at the break stop', () => {
      // Regression: Station 2 must not pull `axleLoad` back across Station 1's chain
      // break just because Station 2's rolling stock happens to match Station 0's.
      const stations = [
        buildStation(0, { axleLoad: 20 }),
        buildStation(1, {
          trainType: 'Passenger',
          tractionUnit: [{ id: 'TU2' }],
          axleLoad: undefined,
        }),
        buildStation(2, { axleLoad: undefined }),
      ];

      const result = service.triggerPropertyInheritance(stations);

      expect(result[0].trainStop.axleLoad).toBe(20);
      expect(result[1].trainStop.axleLoad).toBeUndefined();
      expect(result[2].trainStop.axleLoad).toBeUndefined();
    });

    it('does not leak Model Train values across a chain-break stop during unrelated edits', () => {
      // Same shape as the previous test, but the trigger is an unrelated edit on
      // Station 1 (no property change). Inheritance for `axleLoad` runs via the
      // else branch of propagateUpdatedProperty and must still respect the break.
      const originalStations = [
        buildStation(0, { axleLoad: 20 }),
        buildStation(1, {
          trainType: 'Passenger',
          tractionUnit: [{ id: 'TU2' }],
          axleLoad: undefined,
        }),
        buildStation(2, { axleLoad: undefined }),
      ];
      const updatedStation = buildStation(1, {
        trainType: 'Passenger',
        tractionUnit: [{ id: 'TU2' }],
        axleLoad: undefined,
      });

      const result = service.propagateUpdatedStationProperties(originalStations, updatedStation);

      expect(result[0].trainStop.axleLoad).toBe(20);
      expect(result[1].trainStop.axleLoad).toBeUndefined();
      expect(result[2].trainStop.axleLoad).toBeUndefined();
    });

    it('propagates a Reset-to-Model-Train clear of axle load to downstream inheritors', () => {
      // Regression: when the user resets Station 0 to Model Train, `axleLoad` is cleared
      // (baseline never provides it). Downstream stops that were inheriting the old
      // axle load must follow the clear, not keep the pre-reset value.
      const originalStations = [buildStation(0, { axleLoad: 20 }), buildStation(1, { axleLoad: 20 }), buildStation(2, { axleLoad: 20 })];
      const updatedStation = buildStation(0, { axleLoad: undefined });

      const result = service.propagateUpdatedStationProperties(originalStations, updatedStation);

      expect(result[0].trainStop.axleLoad).toBeUndefined();
      expect(result[1].trainStop.axleLoad).toBeUndefined();
      expect(result[2].trainStop.axleLoad).toBeUndefined();
    });
  });
});
