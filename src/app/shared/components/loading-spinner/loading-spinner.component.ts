import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { Component } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  imports: [SharedMaterialModule],
  templateUrl: './loading-spinner.component.html',
  styleUrl: './loading-spinner.component.scss',
})
export class LoadingSpinnerComponent {}
