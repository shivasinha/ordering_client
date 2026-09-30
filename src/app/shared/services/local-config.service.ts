import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LocalConfigService {
  public static readonly paginatorPageSizes: number[] = [25, 50, 100, 200];
}
