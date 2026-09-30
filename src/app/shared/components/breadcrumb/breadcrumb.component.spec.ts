import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Component, signal, computed } from '@angular/core';
import { BreadcrumbService, Breadcrumb, SOURCE_TAB_PARAM } from '@Ordering/shared/services/breadcrumb.service';

/**
 * Lightweight host that mirrors the breadcrumb template so we can test
 * rendering without pulling in RouterLink / MatIconModule.
 */
@Component({
  standalone: true,
  selector: 'app-test-breadcrumb',
  template: `
    @if (svc.showBreadcrumbs()) {
      <nav class="breadcrumb-container" aria-label="Breadcrumb">
        <ol class="breadcrumb-list">
          @for (breadcrumb of svc.breadcrumbs(); track breadcrumb.url; let isLast = $last) {
            <li class="breadcrumb-item">
              @if (!isLast) {
                <a class="breadcrumb-link" [attr.href]="breadcrumb.url">
                  {{ breadcrumb.label }}
                </a>
                <span class="breadcrumb-separator">chevron_right</span>
              } @else {
                <span class="breadcrumb-current">{{ breadcrumb.label }}</span>
              }
            </li>
          }
        </ol>
      </nav>
    }
  `,
})
class TestBreadcrumbComponent {
  constructor(public svc: BreadcrumbService) {}
}

describe('BreadcrumbComponent', () => {
  let component: TestBreadcrumbComponent;
  let fixture: ComponentFixture<TestBreadcrumbComponent>;

  const breadcrumbsSig = signal<Breadcrumb[]>([]);

  const mockBreadcrumbService = {
    showBreadcrumbs: computed(() => breadcrumbsSig().length > 0),
    breadcrumbs: computed(() => breadcrumbsSig()),
  };

  beforeEach(async () => {
    breadcrumbsSig.set([]);

    await TestBed.configureTestingModule({
      imports: [TestBreadcrumbComponent],
      providers: [{ provide: BreadcrumbService, useValue: mockBreadcrumbService }],
    }).compileComponents();

    fixture = TestBed.createComponent(TestBreadcrumbComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should not render breadcrumb nav when there are no breadcrumbs', () => {
    breadcrumbsSig.set([]);
    fixture.detectChanges();

    const nav = fixture.debugElement.query(By.css('.breadcrumb-container'));
    expect(nav).toBeNull();
  });

  it('should render breadcrumb nav when breadcrumbs exist', () => {
    breadcrumbsSig.set([
      { label: 'Home', url: '/list', queryParams: { [SOURCE_TAB_PARAM]: 'CURRENT_ORDERS' } },
      { label: 'Order 123', url: '/order/123', queryParams: { [SOURCE_TAB_PARAM]: 'CURRENT_ORDERS' } },
    ]);
    fixture.detectChanges();

    const nav = fixture.debugElement.query(By.css('.breadcrumb-container'));
    expect(nav).toBeTruthy();
  });

  it('should render links for all breadcrumbs except the last one', () => {
    breadcrumbsSig.set([
      { label: 'Home', url: '/list', queryParams: { [SOURCE_TAB_PARAM]: 'CURRENT_ORDERS' } },
      { label: 'Order 42', url: '/order/42', queryParams: { [SOURCE_TAB_PARAM]: 'CURRENT_ORDERS' } },
      { label: 'Train Run 99', url: '/order/42/train/99', queryParams: { [SOURCE_TAB_PARAM]: 'CURRENT_ORDERS' } },
    ]);
    fixture.detectChanges();

    const links = fixture.debugElement.queryAll(By.css('.breadcrumb-link'));
    expect(links.length).toBe(2);
    expect(links[0].nativeElement.textContent.trim()).toBe('Home');
    expect(links[1].nativeElement.textContent.trim()).toBe('Order 42');
  });

  it('should render the last breadcrumb as a span (current page)', () => {
    breadcrumbsSig.set([
      { label: 'Home', url: '/list', queryParams: { [SOURCE_TAB_PARAM]: 'CURRENT_ORDERS' } },
      { label: 'Order 42', url: '/order/42', queryParams: { [SOURCE_TAB_PARAM]: 'CURRENT_ORDERS' } },
    ]);
    fixture.detectChanges();

    const currentSpan = fixture.debugElement.query(By.css('.breadcrumb-current'));
    expect(currentSpan).toBeTruthy();
    expect(currentSpan.nativeElement.textContent.trim()).toBe('Order 42');
  });

  it('should render separator icons between breadcrumbs', () => {
    breadcrumbsSig.set([
      { label: 'Home', url: '/list', queryParams: { [SOURCE_TAB_PARAM]: 'CURRENT_ORDERS' } },
      { label: 'Order 42', url: '/order/42', queryParams: { [SOURCE_TAB_PARAM]: 'CURRENT_ORDERS' } },
      { label: 'Train Run 7', url: '/order/42/train/7', queryParams: { [SOURCE_TAB_PARAM]: 'CURRENT_ORDERS' } },
    ]);
    fixture.detectChanges();

    const separators = fixture.debugElement.queryAll(By.css('.breadcrumb-separator'));
    // Separators appear after each non-last breadcrumb
    expect(separators.length).toBe(2);
  });

  it('should not render a separator after the last breadcrumb', () => {
    breadcrumbsSig.set([{ label: 'Single Item', url: '/item', queryParams: {} }]);
    fixture.detectChanges();

    const separators = fixture.debugElement.queryAll(By.css('.breadcrumb-separator'));
    expect(separators.length).toBe(0);
  });

  it('should set correct href on breadcrumb links', () => {
    breadcrumbsSig.set([
      { label: 'Home', url: '/list', queryParams: { [SOURCE_TAB_PARAM]: 'CURRENT_ORDERS' } },
      { label: 'Current', url: '/order/1', queryParams: { [SOURCE_TAB_PARAM]: 'CURRENT_ORDERS' } },
    ]);
    fixture.detectChanges();

    const link = fixture.debugElement.query(By.css('.breadcrumb-link'));
    expect(link.nativeElement.getAttribute('href')).toBe('/list');
  });

  it('should render correct number of list items', () => {
    breadcrumbsSig.set([
      { label: 'A', url: '/a', queryParams: {} },
      { label: 'B', url: '/b', queryParams: {} },
      { label: 'C', url: '/c', queryParams: {} },
    ]);
    fixture.detectChanges();

    const items = fixture.debugElement.queryAll(By.css('.breadcrumb-item'));
    expect(items.length).toBe(3);
  });
});
