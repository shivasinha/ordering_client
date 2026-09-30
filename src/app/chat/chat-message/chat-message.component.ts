import { Component, inject, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatDialog } from '@angular/material/dialog';

import dayjs from 'dayjs';

import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { TranslationsService } from '@Ordering/core/services/translations.service';

import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { AbbreviatePipe } from '@Ordering/core/pipes/abbreviate.pipe';

import { DateTimeFormat } from '@Ordering/utils/dates';

import { LinksComponent } from '../links/links.component';
import { Message, MessageReadState } from '@Ordering/api';
import { ChatService } from '@Ordering/chat/chat.service';
import { HasPermissionDirective } from '@Ordering/core/directives/has-permission.directive';
import { UserPermissionsEnum } from '@Ordering/data/custom/enum/user-permissions.enum';
@Component({
  selector: 'app-chat-message',
  imports: [CommonModule, SharedMaterialModule, AbbreviatePipe, TranslatePipe, HasPermissionDirective],
  templateUrl: './chat-message.component.html',
  styleUrl: './chat-message.component.scss',
})
export class ChatMessageComponent implements OnChanges {
  protected tr = inject(TranslationsService);
  private dialog = inject(MatDialog);
  private chatService = inject(ChatService);
  protected readonly userPermissionsEnum = UserPermissionsEnum;

  @Input() id: string | undefined;
  @Input() chatMessage: Message | undefined;

  // TODO: replace with real data once available in the API
  protected readonly company: string = 'Foo Bar Inc.';
  protected prevMessageId: string = '';

  ngOnChanges(): void {
    this.prevMessageId = this.chatMessage?.replyToMessageId || '';
  }

  private readonly noOfCharsShort: number = 200;
  private readonly noOfCharsMax: number = 2000;
  protected noOfChars: number = this.noOfCharsShort;

  protected get noOfAttachments(): number {
    return this.chatMessage?.links?.length || 0;
  }

  protected get isRead(): boolean {
    return this.chatMessage?.messageReadState === MessageReadState.READ;
  }

  protected get msgDate(): string {
    return dayjs(this.chatMessage?.creationDateTime).format(DateTimeFormat.localeDateTime);
  }

  /**
   * Toggles the size of the message by switching the number of characters
   * between the short and maximum lengths.
   *
   * @returns {void}
   */
  protected toggleSize(): void {
    this.noOfChars = this.noOfChars === this.noOfCharsShort ? this.noOfCharsMax : this.noOfCharsShort;
  }

  /**
   * Opens a dialog displaying links associated with the chat message.
   * The dialog is non-editable and has a fixed width and maximum height.
   *
   * @returns {void}
   */
  protected openLinksDialog(): void {
    const dialogRef = this.dialog.open(LinksComponent, {
      width: '400px',
      maxHeight: '500px',
      data: {
        links: this.chatMessage?.links ? [...this.chatMessage.links] : [],
        isEditable: false,
      },
    });
    dialogRef.afterClosed().subscribe();
  }

  /**
   * Scrolls the view to the previous message element identified by `prevMessageId`.
   * If the element is found, it will be brought into view.
   *
   * @returns {void}
   */
  protected gotoPrevMessage(): void {
    const element = document.getElementById(this.prevMessageId);
    element?.scrollIntoView();
  }

  /**
   * Handles the action of replying to a message.
   * The message ID is stored in the chat service to be used when sending a reply.
   * The message ID is cleared when the user navigates away from the chat message.
   * @param {string} id - The ID of the message to reply to.
   * @returns {void}
   */
  protected replyToMessage(id: string | undefined): void {
    if (id) {
      this.chatService.clearReplyMessageId();
      this.chatService.setReplyMessageId(id);
    }
  }
}
