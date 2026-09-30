import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TranslationsService } from '@Ordering/core/services/translations.service';
import { ClientAuthenticationService } from '@Ordering/auth/services/client-authentication.service';

import { ChatMessageListComponent } from './chat-message-list.component';

describe('ChatMessageListComponent', () => {
  let component: ChatMessageListComponent;
  let fixture: ComponentFixture<ChatMessageListComponent>;

  const clientAuthServiceMock = {
    getUserName: jest.fn().mockReturnValue('tps_admin'),
  };
  const translationsServiceMock = {
    translate: jest.fn(),
    guiLanguage: 'en',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatMessageListComponent],
      providers: [
        { provide: ClientAuthenticationService, useValue: clientAuthServiceMock },
        { provide: TranslationsService, useValue: translationsServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatMessageListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
