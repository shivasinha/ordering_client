import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AdminDataEntry, MasterDataService } from '@Ordering/api';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { ImportedSignalValidationResult } from '@Ordering/shared/models/infra-signal.model';

import { InfraSignalsService } from './infra-signals.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeEntry(display: string, overrides: Partial<AdminDataEntry> = {}): AdminDataEntry {
  return { id: `id-${display}`, display, unique: `unique-${display}`, ...overrides };
}

function makeResponse(items: AdminDataEntry[]): { items: AdminDataEntry[] } {
  return { items };
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('InfraSignalsService', () => {
  let service: InfraSignalsService;
  let masterDataServiceMock: jest.Mocked<Pick<MasterDataService, 'searchInfraSignals'>>;
  let translationsServiceMock: { translate: jest.Mock };

  beforeEach(() => {
    masterDataServiceMock = {
      searchInfraSignals: jest.fn(),
    };
    translationsServiceMock = {
      translate: jest.fn((key: string) => ({ lblOk: 'OK', lblUnknown: 'NOT_FOUND' })[key] ?? key),
    };

    TestBed.configureTestingModule({
      providers: [
        InfraSignalsService,
        { provide: MasterDataService, useValue: masterDataServiceMock },
        { provide: TranslationsService, useValue: translationsServiceMock },
      ],
    });

    service = TestBed.inject(InfraSignalsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('should call searchInfraSignals with the provided request', () => {
    const request = { filters: { display: ['Signal A', 'Signal B'] } };
    masterDataServiceMock.searchInfraSignals.mockReturnValue(of(makeResponse([])) as any);

    service.searchSignals(request).subscribe();

    expect(masterDataServiceMock.searchInfraSignals).toHaveBeenCalledTimes(1);
    expect(masterDataServiceMock.searchInfraSignals).toHaveBeenCalledWith(request);
  });

  it('should return OK status with the matched signal for each row found in the response', done => {
    const entryA = makeEntry('Signal A');
    const entryB = makeEntry('Signal B');
    masterDataServiceMock.searchInfraSignals.mockReturnValue(of(makeResponse([entryA, entryB])) as any);

    service.validateImportedSignals(['Signal A', 'Signal B']).subscribe(results => {
      expect(results).toEqual<ImportedSignalValidationResult[]>([
        { area: 'Signal A', status: 'OK', signal: entryA },
        { area: 'Signal B', status: 'OK', signal: entryB },
      ]);
      done();
    });
  });

  it('should return NOT_FOUND status for rows absent from the response', done => {
    masterDataServiceMock.searchInfraSignals.mockReturnValue(of(makeResponse([])) as any);

    service.validateImportedSignals(['Unknown']).subscribe(results => {
      expect(results).toEqual<ImportedSignalValidationResult[]>([{ area: 'Unknown', status: 'NOT_FOUND' }]);
      done();
    });
  });

  it('should correctly distinguish found and not-found rows in a mixed response', done => {
    const entryA = makeEntry('Signal A');
    masterDataServiceMock.searchInfraSignals.mockReturnValue(of(makeResponse([entryA])) as any);

    service.validateImportedSignals(['Signal A', 'Missing']).subscribe(results => {
      expect(results).toEqual<ImportedSignalValidationResult[]>([
        { area: 'Signal A', status: 'OK', signal: entryA },
        { area: 'Missing', status: 'NOT_FOUND' },
      ]);
      done();
    });
  });

  it('should preserve the original row order in the results', done => {
    const entryC = makeEntry('C');
    const entryA = makeEntry('A');
    masterDataServiceMock.searchInfraSignals.mockReturnValue(of(makeResponse([entryC, entryA])) as any);

    service.validateImportedSignals(['A', 'B', 'C']).subscribe(results => {
      expect(results.map(r => r.area)).toEqual(['A', 'B', 'C']);
      done();
    });
  });

  it('should use the first occurrence when the response contains duplicate display names', done => {
    const first = makeEntry('Signal A', { id: 'first' });
    const second = makeEntry('Signal A', { id: 'second' });
    masterDataServiceMock.searchInfraSignals.mockReturnValue(of(makeResponse([first, second])) as any);

    service.validateImportedSignals(['Signal A']).subscribe(results => {
      expect(results[0].signal).toBe(first);
      done();
    });
  });

  it('should return an empty array when no rows are provided', done => {
    masterDataServiceMock.searchInfraSignals.mockReturnValue(of(makeResponse([])) as any);

    service.validateImportedSignals([]).subscribe(results => {
      expect(results).toEqual([]);
      done();
    });
  });

  it('should handle a response with more items than input rows', done => {
    const entryA = makeEntry('A');
    const entryExtra = makeEntry('Extra');
    masterDataServiceMock.searchInfraSignals.mockReturnValue(of(makeResponse([entryA, entryExtra])) as any);

    service.validateImportedSignals(['A']).subscribe(results => {
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ area: 'A', status: 'OK', signal: entryA });
      done();
    });
  });

  it('should return NOT_FOUND status for validation rows with no matching signals', done => {
    masterDataServiceMock.searchInfraSignals.mockReturnValue(of(makeResponse([])) as any);

    service.validateImportedSignals(['Signal A']).subscribe(results => {
      expect(results).toEqual([{ area: 'Signal A', status: 'NOT_FOUND' }]);
      done();
    });
  });
});
