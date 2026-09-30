import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ChatService } from '../chat.service';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { ComposeMessageComponent } from './compose-message.component';

describe('ComposeMessageComponent', () => {
  let component: ComposeMessageComponent;
  let fixture: ComponentFixture<ComposeMessageComponent>;

  beforeEach(async () => {
    const chatServiceMock = {
      replyToMesageId: jest.fn().mockReturnValue(null),
    };
    const translationsServiceMock = {
      translate: jest.fn(),
      guiLanguage: 'en',
    };
    await TestBed.configureTestingModule({
      imports: [ComposeMessageComponent, BrowserAnimationsModule],
      providers: [
        { provide: TranslationsService, useValue: translationsServiceMock },
        { provide: ChatService, useValue: chatServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ComposeMessageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
