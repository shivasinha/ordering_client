import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError, Subscription } from 'rxjs';
import { ConfigDataService } from './config-data.service';
import { ConfigService, Config, UserAccessRights, Project } from '@Ordering/api';
import { NotificationService } from './notification.service';
import { TranslationsService } from '@Ordering/core/services/translations.service';

describe('ConfigDataService', () => {
  let service: ConfigDataService;
  let configServiceMock: any;
  let notificationServiceMock: any;
  let translationsServiceMock: any;
  let subscriptions: Subscription[] = [];

  const baseMockConfig: Config = {
    username: 'testUser',
    fullUsername: 'Test User',
    tpsBuildVersion: '1.0.0',
    projects: [],
    defaultProject: 'project1',
    apiVersion: 'v1',
    orderItemTypes: [],
    userProfile: {
      userAccessRights: {} as UserAccessRights,
    },
  };

  const mockConfigWithOperator: Config = {
    ...baseMockConfig,
    fixedOperator: {
      externalId: 'RU123',
      displayName: 'Test Operator',
    } as any,
  };

  beforeEach(() => {
    configServiceMock = {
      getConfig: jest.fn(),
    };

    notificationServiceMock = {
      pushNotification: jest.fn(),
    };

    translationsServiceMock = {
      translate: jest.fn().mockReturnValue('Error fetching config'),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ConfigDataService,
        { provide: ConfigService, useValue: configServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: TranslationsService, useValue: translationsServiceMock },
      ],
    });

    service = TestBed.inject(ConfigDataService);
  });

  afterEach(() => {
    // Unsubscribe from all subscriptions to prevent leaks
    subscriptions.forEach(sub => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
    subscriptions = [];

    jest.clearAllMocks(); // Clears all mocks
    jest.clearAllTimers(); // Clears all timers
    jest.restoreAllMocks(); // Restores original implementation of mocked functions
    TestBed.resetTestingModule();
    configServiceMock.close?.();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('fetchConfigData', () => {
    it('should fetch and set config data', done => {
      configServiceMock.getConfig.mockReturnValue(of(baseMockConfig));

      const subscription = service.fetchConfigData().subscribe(result => {
        expect(result).toEqual(baseMockConfig);
        expect(service.configData).toEqual(baseMockConfig);
        expect(configServiceMock.getConfig).toHaveBeenCalled();
        done();
      });
      subscriptions.push(subscription);
    });

    it('should store config data', done => {
      configServiceMock.getConfig.mockReturnValue(of(baseMockConfig));

      const subscription = service.fetchConfigData().subscribe(config => {
        expect(config).toEqual(baseMockConfig);
        expect(service.configData).toEqual(baseMockConfig);
        done();
      });
      subscriptions.push(subscription);
    });

    it('should handle fetch error and show notification', done => {
      configServiceMock.getConfig.mockReturnValue(throwError(() => new Error('Fetch failed')));

      const subscription = service.fetchConfigData().subscribe({
        next: () => {
          fail('Expected an error, but got a success response');
        },
        error: error => {
          expect(error.message).toBe('Fetch failed');
          done();
        },
      });
      subscriptions.push(subscription);
    });
  });

  describe('getSelectedProjectPeriod', () => {
    const buildConfig = (projects: Project[]): Config =>
      ({
        username: 'testUser',
        fullUsername: 'Test User',
        tpsBuildVersion: '1.0.0',
        projects,
        defaultProject: 'Project A',
        apiVersion: 'v1',
        userProfile: {
          userAccessRights: {} as UserAccessRights,
        },
      }) as Config;

    afterEach(() => {
      localStorage.removeItem('project');
    });

    it('should map the selected project begin/end onto min/max dates', () => {
      localStorage.setItem('project', 'Project A');
      service['_configData'].set(
        buildConfig([
          { name: 'Project A', begin: '2026-01-01', end: '2026-12-31' } as Project,
          { name: 'Project B', begin: '2025-06-01', end: '2025-12-31' } as Project,
        ]),
      );

      const period = service.getSelectedProjectPeriod();

      expect(period.minDate?.getFullYear()).toBe(2026);
      expect(period.minDate?.getMonth()).toBe(0);
      expect(period.minDate?.getDate()).toBe(1);
      expect(period.maxDate?.getFullYear()).toBe(2026);
      expect(period.maxDate?.getMonth()).toBe(11);
      expect(period.maxDate?.getDate()).toBe(31);
    });

    it('should resolve the project named in local storage', () => {
      localStorage.setItem('project', 'Project B');
      service['_configData'].set(
        buildConfig([
          { name: 'Project A', begin: '2026-01-01', end: '2026-12-31' } as Project,
          { name: 'Project B', begin: '2025-06-01', end: '2025-12-31' } as Project,
        ]),
      );

      const period = service.getSelectedProjectPeriod();

      expect(period.minDate?.getFullYear()).toBe(2025);
      expect(period.minDate?.getMonth()).toBe(5);
      expect(period.maxDate?.getFullYear()).toBe(2025);
      expect(period.maxDate?.getMonth()).toBe(11);
    });

    it('should return empty bounds when the selected project is not found', () => {
      localStorage.setItem('project', 'Non-existent Project');
      service['_configData'].set(buildConfig([{ name: 'Project A', begin: '2026-01-01', end: '2026-12-31' } as Project]));

      const period = service.getSelectedProjectPeriod();

      expect(period.minDate).toBeUndefined();
      expect(period.maxDate).toBeUndefined();
    });

    it('should return empty bounds when no project is stored in local storage', () => {
      service['_configData'].set(buildConfig([{ name: 'Project A', begin: '2026-01-01', end: '2026-12-31' } as Project]));

      const period = service.getSelectedProjectPeriod();

      expect(period.minDate).toBeUndefined();
      expect(period.maxDate).toBeUndefined();
    });

    it('should return empty bounds when config data is undefined', () => {
      localStorage.setItem('project', 'Project A');
      service['_configData'].set(undefined);

      const period = service.getSelectedProjectPeriod();

      expect(period.minDate).toBeUndefined();
      expect(period.maxDate).toBeUndefined();
    });
  });

  describe('isInfrastructureManagerUser', () => {
    it('should return true when fixedOperator is not set (IM user)', () => {
      service['_configData'].set(baseMockConfig);
      expect(service.isInfrastructureManagerUser()).toBe(true);
    });

    it('should return false when fixedOperator is set (RU user)', () => {
      service['_configData'].set(mockConfigWithOperator);
      expect(service.isInfrastructureManagerUser()).toBe(false);
    });

    it('should return true when config data is undefined (no fixed operator)', () => {
      service['_configData'].set(undefined);
      expect(service.isInfrastructureManagerUser()).toBe(true);
    });
  });

  describe('isRailwayUndertakingUser', () => {
    it('should return true when fixedOperator is set (RU user)', () => {
      service['_configData'].set(mockConfigWithOperator);
      expect(service.isRailwayUndertakingUser()).toBe(true);
    });

    it('should return false when fixedOperator is not set (IM user)', () => {
      service['_configData'].set(baseMockConfig);
      expect(service.isRailwayUndertakingUser()).toBe(false);
    });

    it('should return false when config data is undefined (no fixed operator)', () => {
      service['_configData'].set(undefined);
      expect(service.isRailwayUndertakingUser()).toBe(false);
    });
  });
});
