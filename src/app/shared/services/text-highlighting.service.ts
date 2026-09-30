import { Injectable, inject, SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

/**
 * Service for text highlighting with search query matches.
 * Provides secure, XSS-safe text highlighting functionality.
 */
@Injectable({
  providedIn: 'root',
})
export class TextHighlightingService {
  private readonly domSanitizer = inject(DomSanitizer);

  /**
   * Highlights matched text using Angular's built-in sanitization.
   * This approach is secure and prevents XSS attacks without bypassing security.
   *
   * @param text - The text to highlight.
   * @param query - The search query to highlight.
   * @param cssClass - The CSS class to apply to highlighted text (default: 'highlight-match').
   * @returns {string} The safely sanitized HTML with highlighted matches.
   */
  highlightText(text: string, query: string, cssClass: string = 'highlight-match'): string {
    if (!query || !text) {
      return text;
    }

    const escapedText = this.domSanitizer.sanitize(SecurityContext.HTML, text) || '';
    const lowerText = escapedText.toLowerCase();
    const lowerQuery = query.toLowerCase();

    let result = '';
    let currentIndex = 0;

    // Find all occurrences of the query in the text
    while (currentIndex < escapedText.length) {
      const matchIndex = lowerText.indexOf(lowerQuery, currentIndex);

      if (matchIndex === -1) {
        // No more matches, add the rest of the text
        result += escapedText.substring(currentIndex);
        break;
      }

      // Add unmatched text before the match
      if (matchIndex > currentIndex) {
        result += escapedText.substring(currentIndex, matchIndex);
      }

      // Add the highlighted match (preserve original case)
      const matchedText = escapedText.substring(matchIndex, matchIndex + query.length);
      result += `<span class="${cssClass}">${matchedText}</span>`;

      // Move past this match
      currentIndex = matchIndex + query.length;
    }

    // Sanitize the final result to ensure it's safe
    const sanitizedResult = this.domSanitizer.sanitize(SecurityContext.HTML, result);
    return sanitizedResult || '';
  }
}
