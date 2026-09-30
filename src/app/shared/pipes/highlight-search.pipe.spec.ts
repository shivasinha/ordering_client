import { TestBed } from '@angular/core/testing';
import { SafeHtml } from '@angular/platform-browser';
import { HighlightSearchPipe } from './highlight-search.pipe';
import { TextHighlightingService } from '../services/text-highlighting.service';

describe('HighlightSearchPipe', () => {
  let pipe: HighlightSearchPipe;
  let textHighlightingServiceMock: any;
  let mockSafeHtml: SafeHtml;

  beforeEach(() => {
    mockSafeHtml = 'highlighted text' as any;

    textHighlightingServiceMock = {
      highlightText: jest.fn().mockReturnValue(mockSafeHtml),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: TextHighlightingService, useValue: textHighlightingServiceMock }],
    });

    // Create pipe in injection context
    pipe = TestBed.runInInjectionContext(() => new HighlightSearchPipe());
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  it('should be created', () => {
    expect(pipe).toBeTruthy();
  });

  describe('transform', () => {
    it('should call TextHighlightingService with correct parameters', () => {
      const text = 'Hello World';
      const query = 'Hello';

      const result = pipe.transform(text, query);

      expect(result).toBe(mockSafeHtml);
      expect(textHighlightingServiceMock.highlightText).toHaveBeenCalledWith(text, query, undefined);
    });

    it('should use custom CSS class when provided', () => {
      const text = 'Hello World';
      const query = 'Hello';
      const cssClass = 'custom-highlight';

      const result = pipe.transform(text, query, cssClass);

      expect(result).toBe(mockSafeHtml);
      expect(textHighlightingServiceMock.highlightText).toHaveBeenCalledWith(text, query, cssClass);
    });

    it('should handle null and undefined inputs gracefully', () => {
      // Use type assertion to test edge cases that might happen at runtime
      pipe.transform(null as any, 'query');
      expect(textHighlightingServiceMock.highlightText).toHaveBeenCalledWith(null, 'query', undefined);

      pipe.transform('text', null as any);
      expect(textHighlightingServiceMock.highlightText).toHaveBeenCalledWith('text', null, undefined);

      pipe.transform(undefined as any, 'query');
      expect(textHighlightingServiceMock.highlightText).toHaveBeenCalledWith(undefined, 'query', undefined);

      pipe.transform('text', undefined as any);
      expect(textHighlightingServiceMock.highlightText).toHaveBeenCalledWith('text', undefined, undefined);
    });

    it('should handle empty strings', () => {
      pipe.transform('', 'query');
      expect(textHighlightingServiceMock.highlightText).toHaveBeenCalledWith('', 'query', undefined);

      pipe.transform('text', '');
      expect(textHighlightingServiceMock.highlightText).toHaveBeenCalledWith('text', '', undefined);
    });

    it('should use default CSS class when not provided', () => {
      const text = 'Hello World';
      const query = 'Hello';

      pipe.transform(text, query);

      expect(textHighlightingServiceMock.highlightText).toHaveBeenCalledWith(text, query, undefined);
    });
  });

  describe('Pure Pipe Behavior', () => {
    it('should call service for each transform call', () => {
      const text = 'Hello World';
      const query = 'Hello';

      pipe.transform(text, query);
      pipe.transform(text, query);

      expect(textHighlightingServiceMock.highlightText).toHaveBeenCalledTimes(2);
    });
  });
});
