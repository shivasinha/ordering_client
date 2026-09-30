import { Pipe, PipeTransform } from '@angular/core';

import { TranslatePipeBase } from '@tps/angular-translation';
import { TranslationsService } from '@Ordering/core/services/translations.service';

import * as translationsSource from '../../../assets/lang/translations.json';

@Pipe({
  name: 'translate',
  standalone: true,
})
export class TranslatePipe extends TranslatePipeBase<typeof translationsSource> implements PipeTransform {
  constructor(tr: TranslationsService) {
    super(tr);
  }
}
