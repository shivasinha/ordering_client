import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TextareaComponent } from './textarea.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { TextareaConfig } from './textarea-config.interface';

describe('TextareaComponent', () => {
  let component: TextareaComponent;
  let fixture: ComponentFixture<TextareaComponent>;
  let mockTranslationsService: any;

  const defaultConfig: TextareaConfig = {
    label: 'Test Label',
  };

  beforeEach(async () => {
    mockTranslationsService = {
      translate: jest.fn().mockReturnValue('test translation'),
    };

    await TestBed.configureTestingModule({
      imports: [TextareaComponent, ReactiveFormsModule, MatFormFieldModule, MatInputModule, NoopAnimationsModule],
      providers: [{ provide: TranslationsService, useValue: mockTranslationsService }],
    }).compileComponents();

    fixture = TestBed.createComponent(TextareaComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('config', defaultConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.restoreAllMocks();
    TestBed.resetTestingModule();
    fixture?.destroy();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize textAreaControl with empty string', () => {
      expect(component['textAreaControl'].value).toBe('');
    });

    it('should have default config values', () => {
      const config = component.config();
      expect(config.maxLength).toBeUndefined();
      expect(config.placeholder).toBeUndefined();
      expect(config.required).toBe(undefined);
    });
  });

  describe('Input Configuration', () => {
    it('should update config through componentRef.setInput', () => {
      const newConfig: TextareaConfig = {
        label: 'Test Label',
        maxLength: 500,
        placeholder: 'Test placeholder',
        required: true,
      };
      fixture.componentRef.setInput('config', newConfig);
      fixture.detectChanges();

      const config = component.config();
      expect(config.maxLength).toBe(500);
      expect(config.placeholder).toBe('Test placeholder');
      expect(config.required).toBe(true);
    });

    it('should update validators when maxLength changes', () => {
      const newConfig: TextareaConfig = { label: 'Test', maxLength: 100 };
      fixture.componentRef.setInput('config', newConfig);
      fixture.detectChanges();

      component['textAreaControl'].setValue('a'.repeat(101));
      expect(component['textAreaControl'].hasError('maxlength')).toBe(true);
    });

    it('should update validators when required changes', () => {
      const newConfig: TextareaConfig = { label: 'Test', required: true };
      fixture.componentRef.setInput('config', newConfig);
      fixture.detectChanges();

      component['textAreaControl'].setValue('');
      expect(component['textAreaControl'].hasError('required')).toBe(true);
    });
  });

  describe('Character Counting', () => {
    it('should compute character count correctly', () => {
      component['textAreaControl'].setValue('test');
      expect(component['characterCount']()).toBe(4);
    });

    it('should return 0 for empty value', () => {
      component['textAreaControl'].setValue('');
      expect(component['characterCount']()).toBe(0);
    });

    it('should update character count when value changes', () => {
      component['textAreaControl'].setValue('test');
      expect(component['characterCount']()).toBe(4);

      component['textAreaControl'].setValue('longer text');
      expect(component['characterCount']()).toBe(11);
    });
  });

  describe('Form Validation', () => {
    it('should be valid with value under maxLength', () => {
      const newConfig: TextareaConfig = { label: 'Test', maxLength: 100 };
      fixture.componentRef.setInput('config', newConfig);
      fixture.detectChanges();

      component['textAreaControl'].setValue('valid text');
      expect(component['textAreaControl'].valid).toBe(true);
    });

    it('should be invalid when exceeding maxLength', () => {
      const newConfig: TextareaConfig = { label: 'Test', maxLength: 10 };
      fixture.componentRef.setInput('config', newConfig);
      fixture.detectChanges();

      component['textAreaControl'].setValue('this is too long');
      expect(component['textAreaControl'].hasError('maxlength')).toBe(true);
    });

    it('should be invalid when required and empty', () => {
      const newConfig: TextareaConfig = { label: 'Test', required: true };
      fixture.componentRef.setInput('config', newConfig);
      fixture.detectChanges();

      component['textAreaControl'].setValue('');
      expect(component['textAreaControl'].hasError('required')).toBe(true);
    });

    it('should be valid when required and has value', () => {
      const newConfig: TextareaConfig = { label: 'Test', required: true };
      fixture.componentRef.setInput('config', newConfig);
      fixture.detectChanges();

      component['textAreaControl'].setValue('some value');
      expect(component['textAreaControl'].valid).toBe(true);
    });
  });

  describe('ControlValueAccessor Implementation', () => {
    let onChange: jest.Mock;
    let onTouched: jest.Mock;

    beforeEach(() => {
      onChange = jest.fn();
      onTouched = jest.fn();
      component.registerOnChange(onChange);
      component.registerOnTouched(onTouched);
    });

    describe('writeValue', () => {
      it('should set value when string is provided', () => {
        component.writeValue('test value');
        expect(component['textAreaControl'].value).toBe('test value');
      });

      it('should set empty string when null is provided', () => {
        component.writeValue(null);
        expect(component['textAreaControl'].value).toBe('');
      });

      it('should set empty string when undefined is provided', () => {
        component.writeValue(undefined as any);
        expect(component['textAreaControl'].value).toBe('');
      });
    });

    describe('registerOnChange', () => {
      it('should call onChange when value changes', () => {
        component['textAreaControl'].setValue('new value');
        expect(onChange).toHaveBeenCalledWith('new value');
      });
    });

    describe('registerOnTouched', () => {
      it('should register onTouched callback', () => {
        expect(component['onTouched']).toBe(onTouched);
      });

      it('should call onTouched when blur event occurs', () => {
        const textarea = fixture.nativeElement.querySelector('textarea');
        textarea.dispatchEvent(new Event('blur'));
        expect(onTouched).toHaveBeenCalled();
      });
    });

    describe('setDisabledState', () => {
      it('should disable control when true', () => {
        component.setDisabledState(true);
        expect(component['textAreaControl'].disabled).toBe(true);
      });

      it('should enable control when false', () => {
        component.setDisabledState(true);
        component.setDisabledState(false);
        expect(component['textAreaControl'].disabled).toBe(false);
      });
    });
  });

  describe('Integration with FormControl', () => {
    it('should sync value from parent control', () => {
      component.writeValue('parent value');
      expect(component['textAreaControl'].value).toBe('parent value');
    });

    it('should propagate changes to parent control', () => {
      const onChange = jest.fn();
      component.registerOnChange(onChange);

      component['textAreaControl'].setValue('child value');
      expect(onChange).toHaveBeenCalledWith('child value');
    });

    it('should propagate validation state to parent', () => {
      const newConfig: TextareaConfig = { label: 'Test', required: true, maxLength: 10 };
      fixture.componentRef.setInput('config', newConfig);
      fixture.detectChanges();

      component['textAreaControl'].setValue('');
      expect(component['textAreaControl'].hasError('required')).toBe(true);

      component['textAreaControl'].setValue('too long text');
      expect(component['textAreaControl'].hasError('maxlength')).toBe(true);
    });
  });

  describe('Template Rendering', () => {
    it('should render textarea element', () => {
      fixture.detectChanges();
      const textarea = fixture.nativeElement.querySelector('textarea');
      expect(textarea).toBeTruthy();
    });

    it('should display placeholder when configured', () => {
      const newConfig: TextareaConfig = { label: 'Test', placeholder: 'Enter text here' };
      fixture.componentRef.setInput('config', newConfig);
      fixture.detectChanges();

      const textarea = fixture.nativeElement.querySelector('textarea');
      expect(textarea.placeholder).toBe('Enter text here');
    });

    it('should bind to textAreaControl', () => {
      fixture.detectChanges();
      component['textAreaControl'].setValue('test content');
      fixture.detectChanges();

      const textarea = fixture.nativeElement.querySelector('textarea');
      expect(textarea.value).toBe('test content');
    });

    it('should show character counter', () => {
      fixture.detectChanges();
      component['textAreaControl'].setValue('test');
      fixture.detectChanges();

      const hint = fixture.nativeElement.querySelector('mat-hint');
      expect(hint).toBeTruthy();
      expect(hint.textContent).toContain('4');
      expect(hint.textContent).toContain('2000');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid config changes', () => {
      fixture.componentRef.setInput('config', { maxLength: 100 });
      fixture.detectChanges();
      fixture.componentRef.setInput('config', { maxLength: 200 });
      fixture.detectChanges();
      fixture.componentRef.setInput('config', { maxLength: 50 });
      fixture.detectChanges();

      expect(component.config().maxLength).toBe(50);
    });

    it('should handle value changes during disabled state', () => {
      component.setDisabledState(true);
      component.writeValue('test');
      expect(component['textAreaControl'].value).toBe('test');
      expect(component['textAreaControl'].disabled).toBe(true);
    });

    it('should preserve value when toggling disabled state', () => {
      component['textAreaControl'].setValue('preserved value');
      component.setDisabledState(true);
      component.setDisabledState(false);
      expect(component['textAreaControl'].value).toBe('preserved value');
    });

    it('should handle maxLength at boundary', () => {
      const newConfig: TextareaConfig = { label: 'Test', maxLength: 5 };
      fixture.componentRef.setInput('config', newConfig);
      fixture.detectChanges();

      component['textAreaControl'].setValue('12345');
      expect(component['textAreaControl'].valid).toBe(true);

      component['textAreaControl'].setValue('123456');
      expect(component['textAreaControl'].hasError('maxlength')).toBe(true);
    });
  });
});
