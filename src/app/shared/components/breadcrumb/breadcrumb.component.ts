import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BreadcrumbService } from '@Ordering/shared/services/breadcrumb.service';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.scss',
})
export class BreadcrumbComponent {
  protected breadcrumbService = inject(BreadcrumbService);
}
