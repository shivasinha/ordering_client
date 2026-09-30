import { Pipe, PipeTransform, inject } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';
import { TextHighlightingService } from '@Ordering/shared/services/text-highlighting.service';

/**
 * Pipe for highlighting search query matches in text.
 *
 * Usage:
 * {{ text | highlightSearch:searchQuery }}
 * {{ text | highlightSearch:searchQuery:'custom-highlight-class' }}
 */
@Pipe({
  name: 'highlightSearch',
  standalone: true,
  pure: true,
})
export class HighlightSearchPipe implements PipeTransform {
  private readonly textHighlightingService = inject(TextHighlightingService);

  /**
   * Transforms text by highlighting matches with the provided search query.
   *
   * @param text - The text to highlight.
   * @param searchQuery - The search query to highlight.
   * @param cssClass - Optional CSS class for highlighting (default: 'highlight-match').
   * @returns {SafeHtml} The text with highlighted matches.
   */
  transform(text: string, searchQuery: string, cssClass?: string): SafeHtml {
    return this.textHighlightingService.highlightText(text, searchQuery, cssClass);
  }
}
