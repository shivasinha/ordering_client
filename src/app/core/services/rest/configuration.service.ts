import { Injectable } from '@angular/core';

import { TpsConfig } from '@Ordering/data/custom/tps-config.interface';

import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ConfigurationService {
  // The Backend's Base URI (via environment)
  public restBaseURI: string = environment.restBaseURI;

  // Masterdata Table Names
  public readonly mdTableStationTrack: string = 'stationtrack';
  public readonly mdTableStopType: string = 'stoptype';
  public readonly mdTableTrainType: string = 'traintype';
  public readonly mdTableStationHeader: string = 'stationheader';

  public tpsConfig: TpsConfig = {
    tpsVersion: '4.17.410.66',
    protocolVersion: 1,
    lang: 'English',
    periodID: 21,
    periodFrom: '2024-09-25',
    periodTo: '2099-12-10',
    orgName: '',
    tidRegExpStr: '.*',
    projects: {
      table: 'project',
      entries: [
        {
          id: 21,
          unique: 'HGR | K22 Korrigering | TEST',
          display: 'K22 Korrigering',
        },
      ],
    },
    periods: [
      {
        id: 21,
        from: '2021-12-12',
        to: '2099-12-10',
      },
    ],
  };
}
