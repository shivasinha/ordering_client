import { Injectable, inject } from '@angular/core';
import { ConfigDataService } from './config-data.service';

export interface SearchField<T> {
  key: keyof T;
  weight?: number;
}

export interface SearchConfig {
  prioritySearch?: boolean;
  caseSensitive?: boolean;
  exactMatch?: boolean;
}

export interface SearchOptions<T> {
  query: string;
  items: T[];
  searchFields: (keyof T)[] | SearchField<T>[];
  sortKey?: keyof T;
  config?: SearchConfig;
}

/**
 * Universal search service with a single, flexible method.
 * Handles both simple and priority-based search through configuration.
 */
@Injectable({
  providedIn: 'root',
})
export class SearchService {
  private configDataService = inject(ConfigDataService);

  /**
   * Universal search method with intelligent priority detection and flexible configuration.
   *
   * Automatically detects search mode based on field configuration:
   * - Simple fields array → basic contains search
   * - Fields with weights → priority-based search with "starts with" > "contains" ordering
   *
   * @param {SearchOptions<T>} searchOptions - Configuration object containing all search parameters
   *
   * @returns Array of filtered and sorted items
   *
   * @example
   * // Simple search
   * search({ query: 'john', items: users, searchFields: ['name', 'email'] })
   * // → Filters users containing 'john' in name or email
   *
   * @example
   * // Priority search (auto-detected by weights)
   * search({
   *   query: 'central',
   *   items: stations,
   *   searchFields: [{ key: 'uicCode', weight: 100 }, { key: 'name', weight: 80 }]
   * })
   * // → Priority: uicCode starts > name starts > uicCode contains > name contains
   *
   * @example
   * // Advanced config
   * search({
   *   query: 'LAPTOP',
   *   items: products,
   *   searchFields: ['sku'],
   *   config: { caseSensitive: true }
   * })
   * // → Case-sensitive search in sku field only
   */
  public search<T>(searchOptions: SearchOptions<T>): T[] {
    const { query, items, searchFields, sortKey, config } = searchOptions;
    const searchConfig = {
      prioritySearch: config?.prioritySearch ?? this.hasWeights(searchFields),
      caseSensitive: config?.caseSensitive ?? false,
      exactMatch: config?.exactMatch ?? false,
      sortKey: sortKey || this.getFirstKey(searchFields),
    };

    const normalizedQuery = searchConfig.caseSensitive ? query.trim() : query.toLowerCase().trim();

    if (!normalizedQuery) {
      return this.sortItems(items, searchConfig.sortKey);
    }

    // Convert to normalized field format
    const normalizedFields = this.normalizeFields(searchFields);

    if (!searchConfig.prioritySearch) {
      return this.performSimpleSearch(normalizedQuery, items, normalizedFields, searchConfig);
    }

    return this.performPrioritySearch(normalizedQuery, items, normalizedFields, searchConfig);
  }

  /**
   * Creates search options for station search functionality.
   *
   * @template T - The station type that must have id, uicCode, and name properties
   * @returns { SearchField<T>[] } Array of search fields with appropriate weights based on configuration
   *
   * @remarks
   * The returned search fields are prioritized based on the enableUicCodes configuration:
   * - If UIC codes are enabled: uicCode gets highest priority (100), id secondary (90), name tertiary (80)
   * - If UIC codes are disabled: id gets highest priority (100), uicCode secondary (90), name tertiary (80)
   * - name always gets the lowest priority to allow fallback searching
   */
  public createStationSearchOptions<T extends { id?: string; uicCode?: string; name?: string }>(): SearchField<T>[] {
    const useUicCode = this.configDataService.enableUicCodes();

    if (useUicCode) {
      return [
        { key: 'uicCode' as keyof T, weight: 100 },
        { key: 'name' as keyof T, weight: 80 },
      ];
    } else {
      return [
        { key: 'id' as keyof T, weight: 100 },
        { key: 'name' as keyof T, weight: 80 },
      ];
    }
  }

  /**
   * Determines whether the provided fields array contains weighted search fields.
   *
   * @template T - The type of object being searched
   * @param { (keyof T)[] | SearchField<T>[] } fields - Array of either property keys or SearchField objects with weights
   * @returns { boolean } True if the fields array contains SearchField objects with weight properties, false otherwise
   *
   * @example
   * ```typescript
   * // Returns false for simple field names
   * hasWeights(['name', 'email'])
   *
   * // Returns true for weighted search fields
   * hasWeights([{ field: 'name', weight: 2 }, { field: 'email', weight: 1 }])
   * ```
   */
  private hasWeights<T>(fields: (keyof T)[] | SearchField<T>[]): boolean {
    return fields.length > 0 && typeof fields[0] === 'object' && 'weight' in fields[0];
  }

  /**
   * Extracts the first key from an array of fields, handling both simple key arrays
   * and SearchField object arrays.
   *
   * @template T - The type that the keys belong to
   * @param { (keyof T)[] | SearchField<T>[] } fields - An array of either keys of type T or SearchField objects containing keys
   * @returns { keyof T } The first key from the fields array
   *
   * @example
   * ```typescript
   * // With simple keys
   * const keys: (keyof User)[] = ['name', 'email'];
   * const firstKey = getFirstKey(keys); // Returns 'name'
   *
   * // With SearchField objects
   * const searchFields: SearchField<User>[] = [{ key: 'name', ... }, { key: 'email', ... }];
   * const firstKey = getFirstKey(searchFields); // Returns 'name'
   * ```
   */
  private getFirstKey<T>(fields: (keyof T)[] | SearchField<T>[]): keyof T {
    return typeof fields[0] === 'object' ? fields[0].key : fields[0];
  }

  /**
   * Normalizes an array of search fields by converting string keys to SearchField objects
   * and ensuring all fields have appropriate weight values.
   *
   * @template T - The type of the object being searched
   * @param { (keyof T)[] | SearchField<T>[] } fields - Array of field keys (strings) or SearchField objects to normalize
   * @returns { SearchField<T>[] } Array of SearchField objects with assigned weights
   *
   * @remarks
   * - If a field is already a SearchField object, preserves the key and uses existing weight or calculates default
   * - If a field is a string key, converts it to a SearchField object with calculated weight
   * - Default weights start at 100 and decrease by 10 for each subsequent field (100, 90, 80, etc.)
   * - Existing weights in SearchField objects are preserved if present
   */
  private normalizeFields<T>(fields: (keyof T)[] | SearchField<T>[]): SearchField<T>[] {
    return fields.map((field, index) => {
      if (typeof field === 'object') {
        return { key: field.key, weight: field.weight ?? 100 - index * 10 };
      }
      return { key: field, weight: 100 - index * 10 };
    });
  }

  /**
   * Performs a simple search operation on an array of items based on specified fields and configuration.
   *
   * @template T - The type of items being searched
   * @param {string} normalizedQuery - The search query string that has been normalized (e.g., lowercased)
   * @param {T[]} items - The array of items to search through
   * @param {SearchField<T>[]} fields - Array of search field definitions specifying which properties to search
   * @param {any} config - Search configuration object containing options like caseSensitive, exactMatch, and sortKey
   * @returns {T[]} An array of filtered items that match the search criteria, sorted according to the configuration
   *
   * @remarks
   * - Filters items by checking if any of the specified fields contain the search query
   * - Supports both case-sensitive and case-insensitive searching based on configuration
   * - Supports both exact match and partial match searching based on configuration
   * - Results are automatically sorted using the configured sort key
   */
  private performSimpleSearch<T>(normalizedQuery: string, items: T[], fields: SearchField<T>[], config: any): T[] {
    const filtered = items.filter(item =>
      fields.some(field => {
        const value = String(item[field.key] || '');
        const searchValue = config.caseSensitive ? value : value.toLowerCase();
        return config.exactMatch ? searchValue === normalizedQuery : searchValue.includes(normalizedQuery);
      }),
    );

    return this.sortItems(filtered, config.sortKey);
  }

  /**
   * Performs a priority-based search on a collection of items using multiple fields with weighted importance.
   *
   * The search operates in two priority levels:
   * 1. "Starts with" matches - items where field values begin with the search query
   * 2. "Contains" matches - items where field values contain the search query (skipped if exactMatch is true)
   *
   * Within each priority level, results are further prioritized by field weight (higher weight = higher priority).
   * Items that match in higher-weighted fields will appear before items that match in lower-weighted fields.
   *
   * @template T - The type of items being searched
   * @param {string} normalizedQuery - The search query, already normalized (e.g., lowercased if case-insensitive)
   * @param {T[]} items - The collection of items to search through
   * @param {SearchField<T>[]} fields - Array of search field configurations with keys and optional weights
   * @param {any} config - Search configuration object containing caseSensitive, exactMatch, and sortKey options
   * @returns {T[]} Array of items sorted by search relevance priority, with no duplicates
   */
  private performPrioritySearch<T>(normalizedQuery: string, items: T[], fields: SearchField<T>[], config: any): T[] {
    const priorities: Array<{ items: T[]; priority: number }> = [];
    const processedItems = new Set<T>();

    // Sort fields by weight (higher = more important)
    const sortedFields = [...fields].sort((a, b) => (b.weight || 0) - (a.weight || 0));

    // Priority 1: "starts with" matches
    sortedFields.forEach((field, fieldIndex) => {
      const matches = items.filter(item => {
        if (processedItems.has(item)) return false;

        const value = String(item[field.key] || '');
        const searchValue = config.caseSensitive ? value : value.toLowerCase();
        const matches = config.exactMatch ? searchValue === normalizedQuery : searchValue.startsWith(normalizedQuery);

        return matches;
      });

      if (matches.length > 0) {
        priorities.push({ items: matches, priority: fieldIndex * 2 + 1 });
        matches.forEach(item => processedItems.add(item));
      }
    });

    // Priority 2: "contains" matches (if not exact match)
    if (!config.exactMatch) {
      sortedFields.forEach((field, fieldIndex) => {
        const matches = items.filter(item => {
          if (processedItems.has(item)) return false;

          const value = String(item[field.key] || '');
          const searchValue = config.caseSensitive ? value : value.toLowerCase();
          return searchValue.includes(normalizedQuery);
        });

        if (matches.length > 0) {
          priorities.push({ items: matches, priority: fieldIndex * 2 + 2 });
          matches.forEach(item => processedItems.add(item));
        }
      });
    }

    // Combine and sort
    return priorities.sort((a, b) => a.priority - b.priority).flatMap(group => this.sortItems(group.items, config.sortKey));
  }

  /**
   * Sorts an array of items alphabetically based on a specified property key.
   *
   * @template T - The type of items in the array
   * @param {T[]} items - The array of items to sort
   * @param {keyof T} sortKey - The property key to sort by
   * @returns {T[]} A new array with items sorted alphabetically by the specified key
   *
   * @remarks
   * - Uses string comparison with `localeCompare()` for proper alphabetical sorting
   * - Handles undefined/null values by converting them to empty strings
   * - Returns a new sorted array without mutating the original
   */
  private sortItems<T>(items: T[], sortKey: keyof T): T[] {
    return items.sort((a, b) => {
      const aValue = String(a[sortKey] || '');
      const bValue = String(b[sortKey] || '');
      return aValue.localeCompare(bValue);
    });
  }
}
