import { MasterDataList } from './masterdata.interface';
import { ProjectPeriod } from './project-period.interface';

export interface TpsConfig {
  tpsVersion: string;
  protocolVersion: number;
  lang: string;
  periodID: number;
  periodFrom: string;
  periodTo: string;
  orgName: string;
  tidRegExpStr: string;
  projects?: MasterDataList;
  periods?: ProjectPeriod[];
}
