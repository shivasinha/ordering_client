import { Injectable, Signal, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LoadingSpinnerService {
  public showSpinnerSig = signal<boolean>(false);

  /**
   * Show the loading spinner.
   * @returns {void}
   */
  public showSpinner(): void {
    this.showSpinnerSig.set(true);
  }

  /**
   * Gets the spinner status
   * @returns {Signal<boolean>}
   */
  public get isSpinnerActive(): Signal<boolean> {
    return this.showSpinnerSig.asReadonly();
  }

  /**
   * Hide the loading spinner.
   * @returns {void}
   */
  public hideSpinner(): void {
    this.showSpinnerSig.set(false);
  }
}
