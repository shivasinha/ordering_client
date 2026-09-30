import { inject, Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';

import { TranslationsService } from '../core/services/translations.service';

@Injectable()
export class TablePaginatorIntl extends MatPaginatorIntl {
  private tr = inject(TranslationsService);

  private ofLabel: string | undefined;

  constructor() {
    super();
    this.getTranslations();
  }

  private getTranslations(): void {
    this.itemsPerPageLabel = this.tr.translate('lblItemsPerPage');
    this.ofLabel = this.tr.translate('lblOfLabel');
    this.nextPageLabel = this.tr.translate('lblNextPage');
    this.previousPageLabel = this.tr.translate('lblPrevPage');
    this.firstPageLabel = this.tr.translate('lblFirstPage');
    this.lastPageLabel = this.tr.translate('lblLastPage');
  }

  public override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    if (length === 0 || pageSize === 0) {
      return `0 ${this.ofLabel} ${length}`;
    }

    length = Math.max(length, 0);

    const startIndex: number = page * pageSize;
    const endIndex: number = startIndex < length ? Math.min(startIndex + pageSize, length) : startIndex + pageSize;

    return `${startIndex + 1} - ${endIndex} ${this.ofLabel} ${length}`;
  };
}
