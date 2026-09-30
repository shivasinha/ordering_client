import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideAnimations } from '@angular/platform-browser/animations';

import { TranslationsService } from '@Ordering/core/services/translations.service';
import { UserPermissionService } from '@Ordering/core/services/user-permission.service';
import { ConfigDataService } from '@Ordering/shared/services/config-data.service';

import { ChatMessageComponent } from './chat-message.component';
import { ChatService } from '../chat.service';

describe('ChatMessageComponent', () => {
  let component: ChatMessageComponent;
  let fixture: ComponentFixture<ChatMessageComponent>;

  beforeEach(async () => {
    const chatServiceMock = {
      replyToMesageId: jest.fn().mockReturnValue(null),
      clearReplyMessageId: jest.fn(),
      setReplyMessageId: jest.fn(),
    };
    const scrollIntoViewMock = jest.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    const translationsServiceMock = {
      translate: jest.fn().mockReturnValue('Translated Text'),
      guiLanguage: 'en',
    };

    const userPermissionServiceMock = {
      hasPermission: jest.fn().mockReturnValue(true),
      hasAnyPermission: jest.fn().mockReturnValue(true),
      checkPermissions: jest.fn().mockReturnValue(true),
      userPermissions: { CAN_SEND_MESSAGE: true },
    };

    const configDataServiceMock = {
      getConfigurations: jest.fn().mockReturnValue({}),
      configuration: {},
      userPermissions: jest.fn().mockReturnValue({ CAN_SEND_MESSAGE: true }),
    };

    await TestBed.configureTestingModule({
      imports: [ChatMessageComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        provideAnimations(),
        { provide: TranslationsService, useValue: translationsServiceMock },
        { provide: ChatService, useValue: chatServiceMock },
        { provide: UserPermissionService, useValue: userPermissionServiceMock },
        { provide: ConfigDataService, useValue: configDataServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatMessageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
