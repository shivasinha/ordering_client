import { NgModule } from '@angular/core';
import { DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorIntl, MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { TablePaginatorIntl } from '@Ordering/utils/table-paginator-intl';
import { CustomDatePipe } from '@Ordering/core/pipes/custom-date.pipe';
import { CustomDateAdapter } from '@Ordering/utils/custom-date-adapter';
import { createCustomDateFormats } from '@Ordering/utils/custom-date-formats';

@NgModule({
  declarations: [],
  imports: [
    CustomDatePipe,
    MatAutocompleteModule,
    MatButtonModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatTabsModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonToggleModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule,
    MatListModule,
    FormsModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatRadioModule,
  ],
  exports: [
    CustomDatePipe,
    MatAutocompleteModule,
    MatButtonModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatTabsModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonToggleModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule,
    MatListModule,
    FormsModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatRadioModule,
  ],
  providers: [
    { provide: MatPaginatorIntl, useClass: TablePaginatorIntl },
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useFactory: createCustomDateFormats },
  ],
})
export class SharedMaterialModule {}
