import { Component, ErrorHandler, inject, signal } from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { ErrorHandlingService } from '@Ordering/shared/services/error-handling.service';
import { OrderingApiName } from '@Ordering/data/custom/enum/ordering-api-names.enum';

/**
 * Error boundary component that wraps each contributor slot.
 * If the child component throws during render/lifecycle, this catches the error
 * and isolates it — preventing a single broken contributor from crashing the host.
 */
@Component({
  selector: 'app-slot-error-boundary',
  imports: [MatCardModule, MatIconModule, TranslatePipe],
  providers: [{ provide: ErrorHandler, useExisting: SlotErrorBoundaryComponent }],
  template: `
    @if (!hasError()) {
      <ng-content />
    } @else {
      <mat-card class="slot-error">
        <mat-icon>error_outline</mat-icon>
        <span>{{ $any('lblSlotRenderError') | translate }}</span>
      </mat-card>
    }
  `,
  styles: `
    .slot-error {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px;
      color: #d32f2f;
      background-color: #fce4ec;
    }
  `,
})
export class SlotErrorBoundaryComponent implements ErrorHandler {
  private errorHandlingService = inject(ErrorHandlingService);
  protected hasError = signal(false);

  public handleError(error: unknown): void {
    this.hasError.set(true);
    this.errorHandlingService.handleError(error as any, OrderingApiName.GetOrderItemDetails);
  }
}
