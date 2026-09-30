import { Injectable, WritableSignal, inject, signal, computed } from '@angular/core';
import { Config, ConfigService } from '@Ordering/api';
import { Observable, catchError, tap } from 'rxjs';

import { CustomDateRangePickerConfig } from '@Ordering/shared/components/custom-date-range-picker/custom-date-range-picker-config.interface';
import { dayjs } from '@Ordering/utils/dayjs-config';

@Injectable({
  providedIn: 'root',
})
export class ConfigDataService {
  private _configData: WritableSignal<Config | undefined> = signal<Config | undefined>(undefined);
  public configService = inject(ConfigService);

  /**
   * Signal that indicates whether the user is an RU (Railway Undertaking) user.
   * Returns true when the config data has a fixedOperator.
   */
  public isRailwayUndertakingUser = computed(() => {
    return !!this._configData()?.fixedOperator;
  });

  /**
   * Signal that indicates whether the user is an IM (Infrastructure Manager) user.
   * Returns true when the config data does NOT have a fixedOperator.
   */
  public isInfrastructureManagerUser = computed(() => {
    return !this._configData()?.fixedOperator;
  });

  public userPermissions = computed(() => {
    return this._configData()?.userProfile.userAccessRights;
  });

  public enableUicCodes = computed(() => {
    return this._configData()?.enableUicCodes ?? true;
  });

  public orderItemTypes = computed(() => {
    return this._configData()?.orderItemTypes ?? [];
  });

  /**
   * Resolves the selectable date-range bounds for the currently selected project.
   *
   * The selected project name is read from local storage, where it is persisted
   * once during login. Its begin/end dates are looked up in the loaded
   * configuration data and mapped onto the date-range picker bounds.
   *
   * @returns {CustomDateRangePickerConfig} Min/max dates for the selected
   *   project, or empty bounds when the project or its dates are unavailable.
   */
  public getSelectedProjectPeriod(): CustomDateRangePickerConfig {
    const selectedProject = localStorage.getItem('project');
    const project = this._configData()?.projects?.find(p => p.name === selectedProject);
    return {
      minDate: project?.begin ? dayjs(project.begin).toDate() : undefined,
      maxDate: project?.end ? dayjs(project.end).toDate() : undefined,
    };
  }

  /**
   * Set the config data
   * @param {Config} data
   */
  public set configData(data: Config) {
    this._configData.set(data);
  }

  /**
   * Get the config data as a signal
   * @returns {Config | undefined}
   */
  public get configData(): Config | undefined {
    return this._configData();
  }

  /**
   * Fetches the configuration data from the config service.
   *
   * @returns {Observable<Config>} An observable that emits the configuration data.
   *
   * @remarks
   * This method uses the `configService` to retrieve the configuration data and
   * updates the local `configData` property with the received data. It also logs
   * the received configuration data to the console.
   */
  public fetchConfigData(): Observable<Config> {
    return this.configService.getConfig().pipe(
      tap((config: Config) => {
        this.configData = config;
      }),
      catchError(error => {
        throw error; // Re-throw the error to ensure it is handled properly
      }),
    );
  }
}
