// directives/has-permission.directive.ts
import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { UserPermissionService } from '../services/user-permission.service';
import { UserAccessRights } from '@Ordering/api';
import { OperandEnum } from '@Ordering/data/custom/enum/user-permissions.enum';

@Directive({
  selector: '[appHasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  private readonly templateRef = inject(TemplateRef);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly userPermissions = inject(UserPermissionService);

  // Signal inputs
  permission = input.required<keyof UserAccessRights | (keyof UserAccessRights)[]>({ alias: 'appHasPermission' });
  operator = input<OperandEnum>(OperandEnum.AND);

  private hasView = false;

  constructor() {
    // Effect to show/hide element when permissions change
    effect(() => {
      this.updateVisibility();
    });
  }

  /**
   * Updates element visibility based on user permissions.
   * Only manipulates DOM when visibility state changes.
   *
   * @private
   */
  private updateVisibility(): void {
    const requiredPermissions = this.permission();
    const op = this.operator();

    const shouldShow = this.userPermissions.checkPermissions(requiredPermissions, op);

    if (shouldShow && !this.hasView) {
      this.showElement();
    } else if (!shouldShow && this.hasView) {
      this.hideElement();
    }
  }

  /**
   * Shows the element by creating an embedded view from the template.
   *
   * @private
   */
  private showElement(): void {
    this.viewContainer.createEmbeddedView(this.templateRef);
    this.hasView = true;
  }

  /**
   * Hides the element by clearing the view container.
   *
   * @private
   */
  private hideElement(): void {
    this.viewContainer.clear();
    this.hasView = false;
  }
}
