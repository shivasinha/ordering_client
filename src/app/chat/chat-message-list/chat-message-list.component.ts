import { AfterViewInit, Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { ClientAuthenticationService } from '@Ordering/auth/services/client-authentication.service';
import { ChatMessageComponent } from '../chat-message/chat-message.component';
import { Message } from '@Ordering/api';

@Component({
  selector: 'app-chat-message-list',
  imports: [CommonModule, SharedMaterialModule, TranslatePipe, ChatMessageComponent],
  templateUrl: './chat-message-list.component.html',
  styleUrl: './chat-message-list.component.scss',
})
export class ChatMessageListComponent implements AfterViewInit, OnChanges {
  private useService = inject(ClientAuthenticationService);
  @Input() public chatServiceResponse: Message[] = [];

  protected readonly spacerBottomId: string = 'spacer-bottom';

  public ngAfterViewInit(): void {
    this.gotoSpacerBottom();
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['chatServiceResponse']?.currentValue) {
      setTimeout(() => this.gotoSpacerBottom(), 100);
    }
  }

  protected isSentMessage(message: Message): boolean {
    const myOwnName = this.useService.getUserName();
    return myOwnName === message.author;
  }

  public gotoSpacerBottom(): void {
    const element = document.getElementById(this.spacerBottomId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
