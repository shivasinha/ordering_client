import { TestBed } from '@angular/core/testing';

import { LocalConfigService } from './local-config.service';

describe('LocalConfigService', () => {
  let service: LocalConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocalConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
