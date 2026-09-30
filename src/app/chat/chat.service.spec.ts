import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { MessageState, OrderResponse, OrderState, OrderType, Source } from '@Ordering/api';
import { ChatService } from './chat.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ChatService', () => {
  let service: ChatService;
  let dialogSpy: jest.Mocked<MatDialog>;

  beforeEach(() => {
    const spy = {
      open: jest.fn(),
    };
    const translationsServiceMock = {
      translate: jest.fn(),
      guiLanguage: 'en',
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ChatService, { provide: MatDialog, useValue: spy }, { provide: TranslationsService, useValue: translationsServiceMock }],
    });

    service = TestBed.inject(ChatService);
    dialogSpy = TestBed.inject(MatDialog) as jest.Mocked<MatDialog>;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return an empty array initially', () => {
    expect(service.messages).toEqual([]);
  });

  it('should return the set messages', () => {
    const mockMessages: any[] = [
      {
        text: 'Test message 1',
        creationDate: '2024-06-25T13:10:00',
        author: 'Author 1',
        messageReadState: '',
        messageId: '',
        links: [],
        received: false,
      },
      {
        text: 'Test message 2',
        creationDate: '2024-06-25T13:15:00',
        author: 'Author 2',
        messageReadState: '',
        messageId: '',
        links: [],
        received: false,
      },
    ];

    service.messages = mockMessages;
    expect(service.messages).toEqual(mockMessages);
  });

  it('should open dialog with correct parameters if order is provided', () => {
    const mockOrder: OrderResponse = {
      externalId: '12345',
      subject: 'New Order',
      orderType: OrderType.LTP,
      state: OrderState.DRAFT,
      messageState: MessageState.NEW_MESSAGE,
      creationDateTime: '2024-08-29T12:00:00Z',
      lastModifiedDateTime: '',
      orderOrigin: Source.INFRASTRUCTURE_MANAGER,
    };

    service.openMessageDialog(mockOrder);
    expect(dialogSpy.open).toHaveBeenCalledWith(expect.any(Function), {
      data: mockOrder,
      autoFocus: false,
      panelClass: 'mat-resizeable-dialog-container',
    });
  });
});
