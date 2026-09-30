/**
 * Generates a translation key by converting an enum value from snake_case to CamelCase,
 * and optionally prepending a prefix.
 *
 * @param {string} enumValue - The enum value in snake_case format to be converted.
 * @param {string} prefix - An optional string to prepend to the generated key.
 * @returns The generated translation key in CamelCase format, with the optional prefix.
 */
export function generateTranslationKey(enumValue: string, prefix: string = '', seperator: string = '_'): string {
  const camelCaseValue = enumValue
    .split(seperator)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');

  // Handle null/undefined prefix values by defaulting to empty string
  const safePrefix = prefix || '';
  return `${safePrefix}${camelCaseValue}`;
}
