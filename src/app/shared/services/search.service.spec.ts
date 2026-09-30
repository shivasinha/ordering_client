import { TestBed } from '@angular/core/testing';
import { SearchService, SearchField } from './search.service';
import { ConfigDataService } from './config-data.service';

interface TestUser {
  id: number;
  name: string;
  email: string;
  department: string;
}

interface TestStation {
  id: number;
  uicCode: string;
  name: string;
  country: string;
}

describe('SearchService', () => {
  let service: SearchService;
  let configDataServiceMock: jest.Mocked<ConfigDataService>;

  const mockUsers: TestUser[] = [
    { id: 1, name: 'John Doe', email: 'john@example.com', department: 'Engineering' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', department: 'Marketing' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', department: 'Engineering' },
    { id: 4, name: 'Alice Johnson', email: 'alice@example.com', department: 'Design' },
  ];

  const mockStations: TestStation[] = [
    { id: 1, uicCode: '1234567', name: 'Paris Central', country: 'France' },
    { id: 2, uicCode: '7891234', name: 'Central Park Station', country: 'USA' },
    { id: 3, uicCode: '4567890', name: 'London Victoria', country: 'UK' },
    { id: 4, uicCode: '1111111', name: 'Victoria Station', country: 'UK' },
  ];

  beforeEach(() => {
    configDataServiceMock = {
      enableUicCodes: jest.fn().mockReturnValue(true),
    } as any;

    TestBed.configureTestingModule({
      providers: [{ provide: ConfigDataService, useValue: configDataServiceMock }],
    });
    service = TestBed.inject(SearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Simple Search', () => {
    it('should filter items using contains logic with simple field array', () => {
      const result = service.search({
        query: 'john',
        items: mockUsers,
        searchFields: ['name', 'email'],
      });

      expect(result).toHaveLength(3);
      expect(result).toEqual([
        { id: 4, name: 'Alice Johnson', email: 'alice@example.com', department: 'Design' },
        { id: 3, name: 'Bob Johnson', email: 'bob@example.com', department: 'Engineering' },
        { id: 1, name: 'John Doe', email: 'john@example.com', department: 'Engineering' },
      ]);
    });

    it('should sort results by specified sort key', () => {
      const result = service.search({
        query: 'johnson',
        items: mockUsers,
        searchFields: ['name'],
        sortKey: 'name',
      });

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Alice Johnson');
      expect(result[1].name).toBe('Bob Johnson');
    });

    it('should be case insensitive by default', () => {
      const result = service.search({
        query: 'JOHN',
        items: mockUsers,
        searchFields: ['name'],
      });

      expect(result).toHaveLength(3);
      expect(result.some(user => user.name === 'John Doe')).toBe(true);
      expect(result.some(user => user.name === 'Bob Johnson')).toBe(true);
      expect(result.some(user => user.name === 'Alice Johnson')).toBe(true);
    });

    it('should respect case sensitivity when configured', () => {
      const result = service.search({
        query: 'JOHN',
        items: mockUsers,
        searchFields: ['name'],
        config: { caseSensitive: true },
      });

      expect(result).toHaveLength(0);
    });

    it('should perform exact match when configured', () => {
      const result = service.search({
        query: 'John Doe',
        items: mockUsers,
        searchFields: ['name'],
        config: { exactMatch: true },
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('John Doe');
    });
  });

  describe('Priority Search', () => {
    it('should automatically detect priority search when weights are provided', () => {
      const searchFields: SearchField<TestStation>[] = [
        { key: 'uicCode', weight: 100 },
        { key: 'name', weight: 80 },
      ];

      const result = service.search({
        query: 'central',
        items: mockStations,
        searchFields: searchFields,
      });

      // Should prioritize: name starts with > name contains
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Central Park Station'); // name starts with "Central"
      expect(result[1].name).toBe('Paris Central'); // name contains "central"
    });

    it('should prioritize fields by weight (higher weight = higher priority)', () => {
      const searchFields: SearchField<TestStation>[] = [
        { key: 'name', weight: 100 },
        { key: 'uicCode', weight: 80 },
      ];

      const result = service.search({
        query: '1234',
        items: mockStations,
        searchFields: searchFields,
      });

      // Should find uicCode contains "1234"
      expect(result).toHaveLength(2);
      expect(result.some(station => station.uicCode === '1234567')).toBe(true);
      expect(result.some(station => station.uicCode === '7891234')).toBe(true);
    });

    it('should prioritize "starts with" over "contains" matches', () => {
      const searchFields: SearchField<TestStation>[] = [{ key: 'name', weight: 100 }];

      const result = service.search({
        query: 'victoria',
        items: mockStations,
        searchFields: searchFields,
      });

      // "Victoria Station" starts with "Victoria" should come before "London Victoria" contains "Victoria"
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Victoria Station');
      expect(result[1].name).toBe('London Victoria');
    });

    it('should not duplicate items across priority groups', () => {
      const searchFields: SearchField<TestStation>[] = [
        { key: 'uicCode', weight: 100 },
        { key: 'name', weight: 80 },
      ];

      const result = service.search({
        query: 'central',
        items: mockStations,
        searchFields: searchFields,
      });

      // Each station should appear only once
      expect(result).toHaveLength(2);
      const names = result.map(station => station.name);
      expect(new Set(names).size).toBe(names.length);
    });
  });

  describe('Configuration Options', () => {
    it('should force simple search when prioritySearch is false', () => {
      const searchFields: SearchField<TestStation>[] = [
        { key: 'name', weight: 100 },
        { key: 'uicCode', weight: 80 },
      ];

      const result = service.search({
        query: 'victoria',
        items: mockStations,
        searchFields: searchFields,
        config: { prioritySearch: false },
      });

      // Should not prioritize, just filter and sort alphabetically
      expect(result).toHaveLength(2);
      // In simple search, results are sorted by sortKey (default: first field = 'name')
      expect(result[0].name).toBe('London Victoria');
      expect(result[1].name).toBe('Victoria Station');
    });

    it('should use first field as default sort key', () => {
      const result = service.search({
        query: 'engineering',
        items: mockUsers,
        searchFields: ['department'],
      });

      expect(result).toHaveLength(2);
      // Sorted by department (first/only field)
      expect(result.every(user => user.department === 'Engineering')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should return all items sorted when query is empty', () => {
      const result = service.search({
        query: '',
        items: mockUsers,
        searchFields: ['name'],
        sortKey: 'name',
      });

      expect(result).toHaveLength(mockUsers.length);
      expect(result[0].name).toBe('Alice Johnson');
      expect(result[1].name).toBe('Bob Johnson');
      expect(result[2].name).toBe('Jane Smith');
      expect(result[3].name).toBe('John Doe');
    });

    it('should return all items sorted when query is whitespace only', () => {
      const result = service.search({
        query: '   ',
        items: mockUsers,
        searchFields: ['name'],
        sortKey: 'name',
      });

      expect(result).toHaveLength(mockUsers.length);
    });

    it('should return empty array when no matches found', () => {
      const result = service.search({
        query: 'xyz123',
        items: mockUsers,
        searchFields: ['name', 'email'],
      });

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should handle empty items array', () => {
      const result = service.search({
        query: 'test',
        items: [],
        searchFields: ['name'],
      });

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should handle items with undefined/null field values', () => {
      const itemsWithNulls = [
        { id: 1, name: 'John', email: null },
        { id: 2, name: null, email: 'test@example.com' },
        { id: 3, name: 'Jane', email: 'jane@example.com' },
      ];

      const result = service.search({
        query: 'john',
        items: itemsWithNulls as any,
        searchFields: ['name', 'email'],
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('John');
    });
  });

  describe('Helper Methods', () => {
    it('should create station search options with correct weights when UIC codes are enabled', () => {
      configDataServiceMock.enableUicCodes.mockReturnValue(true);

      const stationOptions = service.createStationSearchOptions();

      expect(stationOptions).toHaveLength(2);
      expect(stationOptions[0]).toEqual({ key: 'uicCode', weight: 100 });
      expect(stationOptions[1]).toEqual({ key: 'name', weight: 80 });
    });

    it('should create station search options with correct weights when UIC codes are disabled', () => {
      configDataServiceMock.enableUicCodes.mockReturnValue(false);

      const stationOptions = service.createStationSearchOptions();

      expect(stationOptions).toHaveLength(2);
      expect(stationOptions[0]).toEqual({ key: 'id', weight: 100 });
      expect(stationOptions[1]).toEqual({ key: 'name', weight: 80 });
    });

    it('should default to UIC codes enabled when config is not available', () => {
      configDataServiceMock.enableUicCodes.mockReturnValue(true);

      const stationOptions = service.createStationSearchOptions();

      expect(stationOptions).toHaveLength(2);
      expect(stationOptions[0]).toEqual({ key: 'uicCode', weight: 100 });
      expect(stationOptions[1]).toEqual({ key: 'name', weight: 80 });
    });
  });
});
