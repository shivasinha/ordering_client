import { Pipe, PipeTransform, inject } from '@angular/core';
import { enumMaps } from '@Ordering/data/custom/enum-maps';
import { TranslationsService } from '@Ordering/core/services/translations.service';

@Pipe({
  name: 'translatableEnum',
  standalone: true,
})
export class TranslatableEnumPipe implements PipeTransform {
  private tr = inject(TranslationsService);

  transform(value: number, enumName: keyof typeof enumMaps, translateEnum: boolean = false): string {
    return this.tr.translateEnumValue(value, enumName, translateEnum);
  }
}
