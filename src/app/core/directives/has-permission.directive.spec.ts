import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HasPermissionDirective } from './has-permission.directive';
import { UserPermissionService } from '../services/user-permission.service';
import { UserAccessRights } from '@Ordering/api';

// Basic test component
@Component({
  template: ` <div *appHasPermission="testPermission" data-testid="conditional-content">Test Content</div> `,
  imports: [HasPermissionDirective],
})
class TestComponent {
  testPermission: keyof UserAccessRights | (keyof UserAccessRights)[] = 'canCreateOrEditOrder';
}

// Test component for multiple permissions (defaults to AND)
@Component({
  template: ` <div *appHasPermission="testPermissions" data-testid="conditional-content">Test Content</div> `,
  imports: [HasPermissionDirective],
})
class TestMultipleComponent {
  testPermissions: (keyof UserAccessRights)[] = ['canCreateOrEditOrder', 'canCreateOrEditOrderItem'];
}

describe('HasPermissionDirective', () => {
  let mockUserPermissionService: jest.Mocked<UserPermissionService>;

  beforeEach(async () => {
    mockUserPermissionService = {
      checkPermissions: jest.fn(),
    } as any;

    await TestBed.configureTestingModule({
      providers: [{ provide: UserPermissionService, useValue: mockUserPermissionService }],
    }).compileComponents();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('basic functionality', () => {
    let component: TestComponent;
    let fixture: ComponentFixture<TestComponent>;

    beforeEach(() => {
      fixture = TestBed.createComponent(TestComponent);
      component = fixture.componentInstance;
    });

    it('should create directive instance', () => {
      expect(component).toBeTruthy();
    });

    it('should show element when user has required permission', () => {
      mockUserPermissionService.checkPermissions.mockReturnValue(true);

      fixture.detectChanges();

      const conditionalElement = fixture.debugElement.nativeElement.querySelector('[data-testid="conditional-content"]');
      expect(conditionalElement).toBeTruthy();
      expect(conditionalElement.textContent.trim()).toBe('Test Content');
      expect(mockUserPermissionService.checkPermissions).toHaveBeenCalledWith('canCreateOrEditOrder', 'AND');
    });

    it('should hide element when user lacks required permission', () => {
      mockUserPermissionService.checkPermissions.mockReturnValue(false);

      fixture.detectChanges();

      const conditionalElement = fixture.debugElement.nativeElement.querySelector('[data-testid="conditional-content"]');
      expect(conditionalElement).toBeFalsy();
      expect(mockUserPermissionService.checkPermissions).toHaveBeenCalledWith('canCreateOrEditOrder', 'AND');
    });
  });

  describe('single permission scenarios', () => {
    it('should handle single permission with default AND operator', () => {
      const fixture = TestBed.createComponent(TestComponent);
      const component = fixture.componentInstance;

      component.testPermission = 'canCreateOrEditOrder';
      mockUserPermissionService.checkPermissions.mockReturnValue(true);

      fixture.detectChanges();

      const conditionalElement = fixture.debugElement.nativeElement.querySelector('[data-testid="conditional-content"]');
      expect(conditionalElement).toBeTruthy();
      expect(mockUserPermissionService.checkPermissions).toHaveBeenCalledWith('canCreateOrEditOrder', 'AND');
    });

    it('should handle different single permissions', () => {
      const fixture = TestBed.createComponent(TestComponent);
      const component = fixture.componentInstance;

      component.testPermission = 'canCreateOrEditOrderItem';
      mockUserPermissionService.checkPermissions.mockReturnValue(true);

      fixture.detectChanges();

      const conditionalElement = fixture.debugElement.nativeElement.querySelector('[data-testid="conditional-content"]');
      expect(conditionalElement).toBeTruthy();
      expect(mockUserPermissionService.checkPermissions).toHaveBeenCalledWith('canCreateOrEditOrderItem', 'AND');
    });
  });

  describe('multiple permissions scenarios', () => {
    it('should handle multiple permissions with default AND operator', () => {
      const fixture = TestBed.createComponent(TestMultipleComponent);

      mockUserPermissionService.checkPermissions.mockReturnValue(true);

      fixture.detectChanges();

      const conditionalElement = fixture.debugElement.nativeElement.querySelector('[data-testid="conditional-content"]');
      expect(conditionalElement).toBeTruthy();
      expect(mockUserPermissionService.checkPermissions).toHaveBeenCalledWith(['canCreateOrEditOrder', 'canCreateOrEditOrderItem'], 'AND');
    });

    it('should hide element when multiple permissions with AND operator and user lacks some permissions', () => {
      const fixture = TestBed.createComponent(TestMultipleComponent);

      mockUserPermissionService.checkPermissions.mockReturnValue(false);

      fixture.detectChanges();

      const conditionalElement = fixture.debugElement.nativeElement.querySelector('[data-testid="conditional-content"]');
      expect(conditionalElement).toBeFalsy();
      expect(mockUserPermissionService.checkPermissions).toHaveBeenCalledWith(['canCreateOrEditOrder', 'canCreateOrEditOrderItem'], 'AND');
    });

    it('should handle empty permission array gracefully', () => {
      const fixture = TestBed.createComponent(TestMultipleComponent);
      const component = fixture.componentInstance;

      component.testPermissions = [];
      mockUserPermissionService.checkPermissions.mockReturnValue(false);

      fixture.detectChanges();

      const conditionalElement = fixture.debugElement.nativeElement.querySelector('[data-testid="conditional-content"]');
      expect(conditionalElement).toBeFalsy();
      expect(mockUserPermissionService.checkPermissions).toHaveBeenCalledWith([], 'AND');
    });
  });

  describe('dynamic permission changes', () => {
    let component: TestComponent;
    let fixture: ComponentFixture<TestComponent>;

    beforeEach(() => {
      fixture = TestBed.createComponent(TestComponent);
      component = fixture.componentInstance;
    });

    it('should show element when permission changes from false to true', () => {
      mockUserPermissionService.checkPermissions.mockReturnValue(false);
      fixture.detectChanges();

      // Initially hidden
      let conditionalElement = fixture.debugElement.nativeElement.querySelector('[data-testid="conditional-content"]');
      expect(conditionalElement).toBeFalsy();

      // Change permission to true
      mockUserPermissionService.checkPermissions.mockReturnValue(true);
      component.testPermission = 'canCreateOrEditOrderItem'; // Trigger change
      fixture.detectChanges();

      // Should now be visible
      conditionalElement = fixture.debugElement.nativeElement.querySelector('[data-testid="conditional-content"]');
      expect(conditionalElement).toBeTruthy();
    });

    it('should hide element when permission changes from true to false', () => {
      mockUserPermissionService.checkPermissions.mockReturnValue(true);
      fixture.detectChanges();

      // Initially visible
      let conditionalElement = fixture.debugElement.nativeElement.querySelector('[data-testid="conditional-content"]');
      expect(conditionalElement).toBeTruthy();

      // Change permission to false
      mockUserPermissionService.checkPermissions.mockReturnValue(false);
      component.testPermission = 'canCreateOrEditOrderItem'; // Trigger change
      fixture.detectChanges();

      // Should now be hidden
      conditionalElement = fixture.debugElement.nativeElement.querySelector('[data-testid="conditional-content"]');
      expect(conditionalElement).toBeFalsy();
    });

    it('should update when permission type changes', () => {
      const multipleFixture = TestBed.createComponent(TestMultipleComponent);
      const multipleComponent = multipleFixture.componentInstance;

      mockUserPermissionService.checkPermissions.mockReturnValue(true);
      multipleFixture.detectChanges();

      expect(mockUserPermissionService.checkPermissions).toHaveBeenCalledWith(['canCreateOrEditOrder', 'canCreateOrEditOrderItem'], 'AND');

      // Change permissions array
      multipleComponent.testPermissions = ['canCreateOrEditOrder'];
      multipleFixture.detectChanges();

      expect(mockUserPermissionService.checkPermissions).toHaveBeenCalledWith(['canCreateOrEditOrder'], 'AND');
    });
  });

  describe('directive behavior', () => {
    it('should not create multiple views when permission remains true', () => {
      const fixture = TestBed.createComponent(TestComponent);
      const component = fixture.componentInstance;

      mockUserPermissionService.checkPermissions.mockReturnValue(true);
      fixture.detectChanges();

      // Trigger multiple changes while permission stays true
      component.testPermission = 'canCreateOrEditOrder';
      fixture.detectChanges();
      component.testPermission = 'canCreateOrEditOrderItem';
      fixture.detectChanges();

      const conditionalElements = fixture.debugElement.nativeElement.querySelectorAll('[data-testid="conditional-content"]');
      expect(conditionalElements.length).toBe(1);
    });

    it('should not clear view multiple times when permission remains false', () => {
      const fixture = TestBed.createComponent(TestComponent);
      const component = fixture.componentInstance;

      mockUserPermissionService.checkPermissions.mockReturnValue(false);
      fixture.detectChanges();

      // Trigger multiple changes while permission stays false
      component.testPermission = 'canCreateOrEditOrder';
      fixture.detectChanges();
      component.testPermission = 'canCreateOrEditOrderItem';
      fixture.detectChanges();

      const conditionalElement = fixture.debugElement.nativeElement.querySelector('[data-testid="conditional-content"]');
      expect(conditionalElement).toBeFalsy();
    });
  });

  describe('service integration', () => {
    it('should call UserPermissionService.checkPermissions with correct parameters', () => {
      const fixture = TestBed.createComponent(TestComponent);
      const component = fixture.componentInstance;

      const testPermission = 'canCreateOrEditOrder' as keyof UserAccessRights;

      component.testPermission = testPermission;
      mockUserPermissionService.checkPermissions.mockReturnValue(true);

      fixture.detectChanges();

      expect(mockUserPermissionService.checkPermissions).toHaveBeenCalledTimes(1);
      expect(mockUserPermissionService.checkPermissions).toHaveBeenCalledWith(testPermission, 'AND');
    });

    it('should handle UserPermissionService errors gracefully', () => {
      const fixture = TestBed.createComponent(TestComponent);

      mockUserPermissionService.checkPermissions.mockImplementation(() => {
        throw new Error('Permission service error');
      });

      // Since the directive uses Angular effects, errors are handled by Angular's error handler
      // The directive should not crash the application, but the effect will propagate the error
      // We expect the error to be caught by the global error handler (setup-jest.ts)
      expect(() => {
        fixture.detectChanges();
      }).toThrow('Permission service error');

      // The element should not be shown when there's an error
      const conditionalElement = fixture.debugElement.nativeElement.querySelector('[data-testid="conditional-content"]');
      expect(conditionalElement).toBeFalsy();
    });

    it('should use AND as default operator for all permission types', () => {
      const singleFixture = TestBed.createComponent(TestComponent);
      const multipleFixture = TestBed.createComponent(TestMultipleComponent);

      mockUserPermissionService.checkPermissions.mockReturnValue(true);

      singleFixture.detectChanges();
      multipleFixture.detectChanges();

      expect(mockUserPermissionService.checkPermissions).toHaveBeenNthCalledWith(1, 'canCreateOrEditOrder', 'AND');
      expect(mockUserPermissionService.checkPermissions).toHaveBeenNthCalledWith(
        2,
        ['canCreateOrEditOrder', 'canCreateOrEditOrderItem'],
        'AND',
      );
    });
  });
});
