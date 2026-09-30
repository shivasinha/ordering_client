import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppToolbarComponent } from './app-toolbar.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { ClientAuthenticationService } from '@Ordering/auth/services/client-authentication.service';
import { NavigationService } from '@Ordering/shared/services/navigation.service';

describe('AppToolbarComponent', () => {
  let component: AppToolbarComponent;
  let fixture: ComponentFixture<AppToolbarComponent>;

  beforeEach(async () => {
    // Mock TranslationsService
    const translationsServiceMock = {
      guiLanguage: 'en',
      translate: (key: string) => key,
    };

    const clientAuthenticationServiceMock = {
      logout: jest.fn(),
    } as unknown as jest.Mocked<ClientAuthenticationService>;

    const navigationServiceMock = {
      navigate: jest.fn(),
      navigateToList: jest.fn(),
      navigateToLogin: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AppToolbarComponent, HttpClientTestingModule],
      providers: [
        { provide: TranslationsService, useValue: translationsServiceMock },
        { provide: ClientAuthenticationService, useValue: clientAuthenticationServiceMock },
        { provide: NavigationService, useValue: navigationServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppToolbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
