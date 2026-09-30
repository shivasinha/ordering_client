/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

// TypeScript declaration for jest in test files
declare const jest: any;

/**
 * Type helper for mock TranslationsService
 */
export interface MockTranslationsService {
  translate: any;
  translateEnumValue: any;
  setLanguage: any;
  guiLanguage: string;
}

/**
 * Mock implementation of TranslationsService for testing
 * Provides all necessary methods used by components and pipes
 */
export const createMockTranslationsService = (): MockTranslationsService => ({
  /**
   * Mock translate method - returns the key prefixed with 'translated_'
   */
  translate: jest.fn((key: string) => `translated_${key}`),

  /**
   * Mock translateEnumValue method - handles enum value translation
   * @param value - The numeric value of the enum
   * @param enumName - The name of the enum
   * @param translateEnum - Whether to translate the enum value
   * @returns Translated string or the enum value as string
   */
  translateEnumValue: jest.fn((value: number, enumName: string, translateEnum: boolean = false) => {
    if (translateEnum) {
      // Return a translated mock value
      return `translated_${enumName}_${value}`;
    }
    // Return the enum value as-is
    return `${enumName}_${value}`;
  }),

  /**
   * Mock setLanguage method - sets the GUI language
   */
  setLanguage: jest.fn(() => {
    // Mock implementation - does nothing in tests
  }),

  /**
   * Mock guiLanguage property
   */
  guiLanguage: 'en',
});
