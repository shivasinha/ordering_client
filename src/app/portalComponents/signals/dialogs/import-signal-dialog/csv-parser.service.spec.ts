import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NgxCsvParser, NgxCSVParserError } from 'ngx-csv-parser';

import { CSVParserService } from './csv-parser.service';

describe('CSVParserService', () => {
  let service: CSVParserService;
  let csvParserMock: jest.Mocked<Pick<NgxCsvParser, 'parse'>>;

  const mockFile = new File([''], 'signals.csv', { type: 'text/csv' });

  beforeEach(() => {
    csvParserMock = { parse: jest.fn() };

    TestBed.configureTestingModule({
      providers: [CSVParserService, { provide: NgxCsvParser, useValue: csvParserMock }],
    });

    service = TestBed.inject(CSVParserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('parse()', () => {
    it('should call csvParser.parse with header false and comma delimiter', () => {
      csvParserMock.parse.mockReturnValue(of([['SIG_A', 'SIG_B']]));

      service.parse(mockFile).subscribe();

      expect(csvParserMock.parse).toHaveBeenCalledWith(mockFile, { header: false, delimiter: ',' });
    });

    it('should return the first row of parsed results', done => {
      const firstRow = ['SIG_A', 'SIG_B', 'SIG_C'];
      csvParserMock.parse.mockReturnValue(of([firstRow, ['SIG_D']]));

      service.parse(mockFile).subscribe(result => {
        expect(result).toEqual(firstRow);
        done();
      });
    });

    it('should return empty array when parser emits a NgxCSVParserError', done => {
      const error = new NgxCSVParserError();
      error.type = 'invalid';
      error.code = 1;
      error.message = 'parse error';
      csvParserMock.parse.mockReturnValue(of(error as any));

      service.parse(mockFile).subscribe(result => {
        expect(result).toEqual([]);
        done();
      });
    });

    it('should return empty array when parser emits a non-array value', done => {
      csvParserMock.parse.mockReturnValue(of(null as any));

      service.parse(mockFile).subscribe(result => {
        expect(result).toEqual([]);
        done();
      });
    });
  });
});
