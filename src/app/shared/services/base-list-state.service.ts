import { Injectable, signal, WritableSignal } from '@angular/core';
import { Sort } from '@angular/material/sort';
import { PaginationAndSorting, SortOrder } from '@Ordering/api';
import { LocalConfigService } from '@Ordering/shared/services/local-config.service';

/**
 * Complete state for a base list view
 */
export interface BaseListState<TFilter> {
  paginationAndSorting: PaginationAndSorting;
  filters: TFilter;
}

interface StateEntry<TFilter> {
  state: WritableSignal<BaseListState<TFilter>>;
  persist: boolean;
}

/**
 * Generic service for managing base list state (pagination, sorting, filters)
 * Supports multiple entity types with separate state management
 */
@Injectable({
  providedIn: 'root',
})
export class BaseListStateService {
  private readonly STORAGE_KEY = 'LISTS_STATES';
  private states = new Map<string, StateEntry<any>>();

  /**
   * Retrieves the writable signal representing the list state for a given entity type.
   * If the state does not exist, it initializes it using either the stored state from local storage
   * or a default state with provided filter and default pagination/sorting values.
   *
   * @template TFilter - The type of the filter object.
   * @param {string} entityType - The unique identifier for the entity type whose state is being managed.
   * @param {TFilter} defaultFilter - The default filter object to use if no stored state is found.
   * @returns A writable signal containing the current list state for the specified entity type.
   */
  public getState<TFilter>(entityType: string, defaultFilter: TFilter, persist = true): WritableSignal<BaseListState<TFilter>> {
    if (!this.states.has(entityType)) {
      const storedState = persist ? this.loadFromStorage<TFilter>(entityType) : null;
      const initialState: BaseListState<TFilter> = storedState || {
        paginationAndSorting: {
          pageIndex: 0,
          pageSize: LocalConfigService.paginatorPageSizes[0],
          sortOrder: SortOrder.ASC,
        },
        filters: defaultFilter,
      };

      this.states.set(entityType, { state: signal(initialState), persist });
    }

    return this.states.get(entityType)!.state;
  }

  /**
   * Updates the pagination and sorting settings for a specific entity type.
   *
   * Merges the provided partial pagination and sorting values with the current state,
   * updates the state, and persists the changes to storage.
   *
   * @param {string} entityType - The key representing the entity type whose pagination and sorting should be updated.
   * @param {Partial<PaginationAndSorting>} paginationAndSorting - A partial object containing pagination and/or sorting properties to update.
   */
  public updatePagination(entityType: string, paginationAndSorting: Partial<PaginationAndSorting>): void {
    const entry = this.states.get(entityType);
    if (entry) {
      const currentState = entry.state();
      const updatedState = {
        ...currentState,
        paginationAndSorting: { ...currentState.paginationAndSorting, ...paginationAndSorting },
      };
      entry.state.set(updatedState);
      if (entry.persist) this.saveToStorage(entityType, updatedState);
    }
  }

  /**
   * Updates the filters for a given entity type in the state.
   * Cleans the provided filters by removing undefined, null, and empty string values,
   * resets the pagination to the first page, and saves the updated state to storage.
   *
   * @template TFilter - The type of the filters object.
   * @param {string} entityType - The key representing the entity type whose filters are being updated.
   * @param {TFilter} filters - The filters object to apply, which will be cleaned before updating the state.
   */
  public updateFilters<TFilter>(entityType: string, filters: TFilter): void {
    const entry = this.states.get(entityType);
    if (entry) {
      const currentState = entry.state();
      // Clean filters: remove undefined, null, and empty string values
      const cleanedFilters = this.cleanObject(filters);
      const updatedState = {
        ...currentState,
        filters: cleanedFilters as TFilter,
        paginationAndSorting: { ...currentState.paginationAndSorting, pageIndex: 0 }, // Reset to first page on filter change
      };
      entry.state.set(updatedState);
      if (entry.persist) this.saveToStorage(entityType, updatedState);
    }
  }

  /**
   * Updates the sorting configuration for a given entity type and applies it to pagination.
   *
   * @param {String} entityType - The type of entity for which the sorting should be updated.
   * @param {Sort} sort - The sorting information, including the active sort field and direction.
   */
  public updateSort(entityType: string, sort: Sort): void {
    const sortConfig: Partial<PaginationAndSorting> = sort.direction
      ? {
          sortBy: sort.active,
          sortOrder: sort.direction === 'asc' ? SortOrder.ASC : SortOrder.DESC,
        }
      : {
          sortBy: undefined,
          sortOrder: undefined,
        };

    // Reset to first page on sort change so results are shown from the beginning.
    this.updatePagination(entityType, { ...sortConfig, pageIndex: 0 });
  }

  /**
   * Resets the state for a given entity type to its default values.
   *
   * @template TFilter - The type of the filter object.
   * @param {string} entityType - The unique identifier for the entity type whose state should be reset.
   * @param {TFilter} defaultFilter - The default filter values to apply when resetting the state.
   *
   * This method sets the pagination and sorting to their initial values and applies the provided default filter.
   * The updated state is also saved to persistent storage.
   */
  public resetState<TFilter>(entityType: string, defaultFilter: TFilter): void {
    const entry = this.states.get(entityType);
    if (entry) {
      const defaultState: BaseListState<TFilter> = {
        paginationAndSorting: {
          pageIndex: 0,
          pageSize: LocalConfigService.paginatorPageSizes[0],
          sortOrder: SortOrder.ASC,
        },
        filters: defaultFilter,
      };
      entry.state.set(defaultState);
      if (entry.persist) this.saveToStorage(entityType, defaultState);
    }
  }

  /**
   * Retrieves all stored states from localStorage using the specified storage key.
   *
   * @returns {Record<string, any>} An object containing all stored states, or an empty object if none are found or an error occurs.
   * @throws Will log a warning to the console if parsing or retrieval fails.
   */
  private getAllStates(): Record<string, any> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn('Failed to load all states from localStorage:', error);
      return {};
    }
  }

  /**
   * Save all states to localStorage
   */
  private saveAllStates(allStates: Record<string, any>): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allStates));
    } catch (error) {
      console.warn('Failed to save all states to localStorage:', error);
    }
  }

  /**
   * Saves the provided list state for a specific entity type to local storage.
   *
   * @template TFilter - The type of the filter used in the list state.
   * @param {string} entityType - The key representing the entity type whose state is being saved.
   * @param {BaseListState<TFilter>} state - The list state object to be saved.
   * @remarks
   * This method retrieves all existing states from local storage, updates the state for the specified entity type,
   * and then saves the updated states back to local storage. If an error occurs during the process, a warning is logged.
   */
  private saveToStorage<TFilter>(entityType: string, state: BaseListState<TFilter>): void {
    try {
      const allStates = this.getAllStates();
      allStates[entityType] = state;
      this.saveAllStates(allStates);
    } catch (error) {
      console.warn('Failed to save list state to localStorage:', error);
    }
  }

  /**
   * Loads the list state for a specific entity type from local storage.
   *
   * @template TFilter - The type of the filter used in the list state.
   * @param {string} entityType - The key representing the entity type whose state should be loaded.
   * @returns The loaded {@link BaseListState} for the specified entity type, or `null` if not found or an error occurs.
   */
  private loadFromStorage<TFilter>(entityType: string): BaseListState<TFilter> | null {
    try {
      const allStates = this.getAllStates();
      return allStates[entityType] || null;
    } catch (error) {
      console.warn('Failed to load list state from localStorage:', error);
      return null;
    }
  }

  /**
   * Removes properties from the given object whose values are `undefined`, `null`, or empty strings.
   * Returns a new object containing only the properties with valid values.
   *
   * @typeParam T - The type of the input object.
   * @param {T} obj - The object to clean.
   * @returns A partial object of type `T` with only the properties whose values are not `undefined`, `null`, or empty strings.
   */
  private cleanObject<T>(obj: T): Partial<T> {
    if (!obj || typeof obj !== 'object') return obj;

    const cleaned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        // Only include values that are not undefined, null, or empty string
        if (value !== undefined && value !== null && value !== '') {
          cleaned[key] = value;
        }
      }
    }
    return cleaned;
  }
}
