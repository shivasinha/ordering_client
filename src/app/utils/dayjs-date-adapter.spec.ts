import { TestBed } from '@angular/core/testing';

import { DayjsDateAdapter } from './dayjs-date-adapter';

describe('DayjsDateAdapter', () => {
  let service: DayjsDateAdapter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DayjsDateAdapter],
    });
    service = TestBed.inject(DayjsDateAdapter);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
