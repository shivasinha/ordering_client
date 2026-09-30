export interface MasterDataEntry {
  id: number;
  unique: string;
  display?: string;
  alt?: number;
}

export interface MasterDataList {
  table: string;
  ref?: number;
  entries: MasterDataEntry[];
}
