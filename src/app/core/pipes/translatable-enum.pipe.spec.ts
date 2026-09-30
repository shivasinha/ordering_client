import { TestBed } from '@angular/core/testing';
import { TranslatableEnumPipe } from './translatable-enum.pipe';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { createMockTranslationsService } from '@Ordering/test-utils/translations-service-mock';

describe('TranslatableEnumPipe', () => {
  let pipe: TranslatableEnumPipe;
  let translationsServiceMock: ReturnType<typeof createMockTranslationsService>;

  beforeEach(() => {
    const translationsServiceSpy = createMockTranslationsService();

    TestBed.configureTestingModule({
      providers: [TranslatableEnumPipe, { provide: TranslationsService, useValue: translationsServiceSpy }],
    });

    pipe = TestBed.inject(TranslatableEnumPipe);
    translationsServiceMock = TestBed.inject(TranslationsService) as any;

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Basic functionality', () => {
    it('should create', () => {
      expect(pipe).toBeTruthy();
    });

    it('should delegate to TranslationsService.translateEnumValue', () => {
      pipe.transform(0, 'OrderState', false);

      expect(translationsServiceMock.translateEnumValue).toHaveBeenCalledWith(0, 'OrderState', false);
    });

    it('should delegate to TranslationsService.translateEnumValue with default translateEnum=false', () => {
      pipe.transform(1, 'TrainState');

      expect(translationsServiceMock.translateEnumValue).toHaveBeenCalledWith(1, 'TrainState', false);
    });

    it('should delegate to TranslationsService.translateEnumValue with translateEnum=true', () => {
      pipe.transform(2, 'OrderState', true);

      expect(translationsServiceMock.translateEnumValue).toHaveBeenCalledWith(2, 'OrderState', true);
    });

    it('should return the value from TranslationsService.translateEnumValue', () => {
      translationsServiceMock.translateEnumValue.mockReturnValue('mocked_result');
      const result = pipe.transform(0, 'OrderState', false);
      expect(result).toBe('mocked_result');
    });
  });

  describe('Different enum types', () => {
    it('should delegate correctly for TrainState enum', () => {
      pipe.transform(0, 'TrainState', true);

      expect(translationsServiceMock.translateEnumValue).toHaveBeenCalledWith(0, 'TrainState', true);
    });

    it('should delegate correctly for MessageState enum', () => {
      pipe.transform(1, 'MessageState', false);

      expect(translationsServiceMock.translateEnumValue).toHaveBeenCalledWith(1, 'MessageState', false);
    });

    it('should delegate correctly for TrainSource enum', () => {
      pipe.transform(2, 'TrainSource', true);

      expect(translationsServiceMock.translateEnumValue).toHaveBeenCalledWith(2, 'TrainSource', true);
    });
  });
});
