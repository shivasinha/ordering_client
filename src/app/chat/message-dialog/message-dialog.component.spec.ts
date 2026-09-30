import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of } from 'rxjs';
import { MessageDialogComponent } from './message-dialog.component';
import { OrderingService, Message } from '@Ordering/api';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { ChatMessageListComponent } from '@Ordering/chat/chat-message-list/chat-message-list.component';
import { ComposeMessageComponent } from '@Ordering/chat/compose-message/compose-message.component';
import { LinksComponent } from '@Ordering/chat/links/links.component';
import { HttpClientModule, HttpEvent } from '@angular/common/http';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { OAuthService } from 'angular-oauth2-oidc';

describe('MessageDialogComponent', () => {
  let component: MessageDialogComponent;
  let fixture: ComponentFixture<MessageDialogComponent>;
  let orderingService: jest.Mocked<OrderingService>;

  // Suppress Angular deprecation warnings
  const originalConsoleWarn = console.warn;
  beforeAll(() => {
    console.warn = jest.fn(message => {
      if (typeof message === 'string' && message.includes('allowSignalWrites')) {
        return;
      }
      originalConsoleWarn(message);
    });
  });

  afterAll(() => {
    console.warn = originalConsoleWarn;
  });

  beforeEach(async () => {
    const scrollIntoViewMock = jest.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    const orderingServiceMock = {
      getOrderMessage: jest.fn().mockReturnValue(of([{ text: 'Test message', links: [] }] as Message[])),
      sendOrderMessage: jest.fn().mockReturnValue(of(null)),
    };

    const dialogRefMock = {
      close: jest.fn(),
      afterClosed: jest.fn().mockReturnValue(of(true)),
    };

    const oAuthServiceMock = {
      getIdentityClaims: jest.fn().mockReturnValue('user'),
    };

    await TestBed.configureTestingModule({
      imports: [
        MatDialogModule,
        HttpClientModule,
        NoopAnimationsModule,
        TranslatePipe,
        MessageDialogComponent,
        ChatMessageListComponent,
        ComposeMessageComponent,
        LinksComponent,
      ],
      providers: [
        { provide: OrderingService, useValue: orderingServiceMock },
        { provide: OAuthService, useValue: oAuthServiceMock },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: { externalId: '12345' } },
        {
          provide: TranslationsService,
          useValue: {
            translate: jest.fn((key: string) => key),
          },
        },
      ],
    }).compileComponents();

    orderingService = TestBed.inject(OrderingService) as jest.Mocked<OrderingService>;
    fixture = TestBed.createComponent(MessageDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load messages on init', () => {
    component.ngOnInit();

    expect(orderingService.getOrderMessage).toHaveBeenCalledWith('12345');
  });

  it('should send a message', () => {
    component.composeMessageComponent = { message: 'Test message' } as ComposeMessageComponent;
    component.links = ['link1', 'link2'];
    const message: Message = { text: 'Test message', links: ['link1', 'link2'] };
    orderingService.sendOrderMessage.mockReturnValue(of(null as unknown as HttpEvent<any>));

    component.sendMessage();

    expect(orderingService.sendOrderMessage).toHaveBeenCalledWith('12345', message);
  });

  it('should determine if sending a message is allowed', () => {
    component.composeMessageComponent = { message: 'Test message' } as ComposeMessageComponent;
    expect(component.isSendAllowed()).toBe(true);

    component.composeMessageComponent.message = '   ';
    expect(component.isSendAllowed()).toBe(false);

    component.composeMessageComponent = undefined;
    expect(component.isSendAllowed()).toBe(false);
  });
});
