import { Component, Inject, inject, signal, computed } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { TranslationsService } from '@Ordering/core/services/translations.service';

export interface LinksDialogData {
  links: string[];
  isEditable: boolean;
}

@Component({
  selector: 'app-url-dialog',
  imports: [MatDialogModule, SharedMaterialModule, TranslatePipe],
  templateUrl: './links.component.html',
  styleUrl: './links.component.scss',
})
export class LinksComponent {
  private tr = inject(TranslationsService);
  public newLink = signal<string>('');
  public addedLinks = signal<string[]>([]);
  public initialLinks: string[] = []; // Store original links for comparison
  public isEditable: boolean = true;
  public showValidationError = signal<boolean>(false);

  protected disableDone = computed(() => {
    if (!this.isEditable) {
      return this.addedLinks().length === 0;
    }
    return JSON.stringify(this.initialLinks) === JSON.stringify(this.addedLinks());
  });

  public isDuplicateLink = computed(() => {
    const trimmed = this.newLink().trim();
    return !!trimmed && this.addedLinks().includes(trimmed);
  });

  public isInvalidUrlFormat = computed(() => {
    const trimmed = this.newLink().trim();
    return !!trimmed && !this.isValidUrlFormat(trimmed);
  });

  public isValidLink = computed(() => {
    const trimmed = this.newLink().trim();
    return !!trimmed && this.isValidUrlFormat(trimmed) && !this.addedLinks().includes(trimmed);
  });

  constructor(
    public dialogRef: MatDialogRef<LinksComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LinksDialogData,
  ) {
    this.initialLinks = [...(data.links || [])]; // Store the initial links
    this.addedLinks.set([...this.initialLinks]); // Initialize addedLinks with existing links
    this.isEditable = data.isEditable;
  }

  /**
   * Adds a new link to the list of added links if it is valid and not a duplicate.
   * Resets the input field and validation state on success.
   * @returns {void}
   */
  public addLink(): void {
    this.showValidationError.set(true);
    if (this.isValidLink()) {
      this.addedLinks.update(links => [...links, this.newLink()]);
      this.newLink.set('');
      this.showValidationError.set(false);
    }
  }

  /**
   * Triggers validation display on input blur.
   * @returns {void}
   */
  public onInputBlur(): void {
    if (this.newLink().trim()) {
      this.showValidationError.set(true);
    }
  }

  /**
   * Updates the newLink signal and resets validation error display.
   * @param {string} value - The new input value.
   * @returns {void}
   */
  public onNewLinkChange(value: string): void {
    this.newLink.set(value);
    this.showValidationError.set(false);
  }

  /**
   * Checks if a URL has a valid format using the native URL constructor.
   * Supports URLs with a protocol prefix (e.g. https://example.com, http://example.com, ftp://example.com).
   *
   * @param {string} url - The URL string to validate.
   * @returns {boolean} True if the URL format is valid, false otherwise.
   */
  public isValidUrlFormat(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Removes a link from the list of added links at the specified index.
   * This operation is only performed if the component is in an editable state.
   *
   * @param {number} index - The index of the link to be removed.
   * @returns {void}
   */
  public removeLink(index: number): void {
    if (this.isEditable) {
      this.addedLinks.update(links => links.filter((_, i) => i !== index));
    }
  }

  /**
   * Closes the dialog and passes the added links data back to the caller.
   *
   * @returns {void}
   */
  public closeDialog(): void {
    this.dialogRef.close(this.addedLinks());
  }
}
