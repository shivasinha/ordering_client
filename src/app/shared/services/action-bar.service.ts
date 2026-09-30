import { Injectable, signal } from '@angular/core';
import { ITabInstanceData } from '@Ordering/data/custom/ITabInstanceData';

@Injectable({
  providedIn: 'root',
})
export class ActionBarService {
  private selectedTabSig = signal<ITabInstanceData | undefined>(undefined, {
    equal: (a, b) => a?.id === b?.id, // Only emit when tab ID actually changes
  });

  set selectedTab(tab: ITabInstanceData) {
    this.selectedTabSig.set(tab);
  }

  get selectedTab(): ITabInstanceData | undefined {
    return this.selectedTabSig();
  }
}
