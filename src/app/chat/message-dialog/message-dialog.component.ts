import { Component, EventEmitter, Inject, OnInit, Output, ViewChild, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { AngularSplitModule } from 'angular-split';
import { Message, OrderResponse } from '@Ordering/api';

import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { ChatMessageListComponent } from '@Ordering/chat/chat-message-list/chat-message-list.component';

import { ComposeMessageComponent } from '@Ordering/chat/compose-message/compose-message.component';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { LinksComponent } from '@Ordering/chat/links/links.component';
import { ChatService } from '@Ordering/chat/chat.service';
import { HasPermissionDirective } from '@Ordering/core/directives/has-permission.directive';
import { UserPermissionsEnum } from '@Ordering/data/custom/enum/user-permissions.enum';

@Component({
  selector: 'app-message-dialog',
  imports: [
    DragDropModule,
    AngularSplitModule,
    SharedMaterialModule,
    ChatMessageListComponent,
    ComposeMessageComponent,
    TranslatePipe,
    HasPermissionDirective,
  ],
  templateUrl: './message-dialog.component.html',
  styleUrl: './message-dialog.component.scss',
})
export class MessageDialogComponent implements OnInit {
  @ViewChild(ComposeMessageComponent) composeMessageComponent: ComposeMessageComponent | undefined;
  @ViewChild(ChatMessageListComponent) chatMessageListComponent: ChatMessageListComponent | undefined;
  @Output() public refreshCurrentOrdersList = new EventEmitter<void>();

  private dialog = inject(MatDialog);
  protected chatService = inject(ChatService);
  public chatServiceResponse: Message[] = [];
  public links: string[] = [];
  protected readonly userPermissionsEnum = UserPermissionsEnum;

  constructor(
    public dialogRef: MatDialogRef<MessageDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public order: OrderResponse, // Inject data here
  ) {}
  /**
   * This property is used to get the current signal value from the chat service.
   *
   * @returns {string | null} The current signal value.
   */
  get messageId(): string | null {
    return this.chatService.replyToMesageId();
  }

  ngOnInit(): void {
    this.loadMessages();
  }

  /**
   * Loads the chat messages for the current order.
   *
   * This method retrieves the messages associated with the order's external ID
   * by calling the `loadMessages` method of the `orderingService`.
   *
   * @returns {void}
   */
  public loadMessages(): void {
    this.chatService.getMessages(this.order.externalId);
    if (this.chatMessageListComponent) {
      this.chatMessageListComponent.gotoSpacerBottom();
    }
  }

  /**
   * Opens a dialog to manage links.
   *
   * @param {boolean} [isEditable=true] - Determines if the links are editable.
   *
   * The dialog will display the current links and allow the user to edit them if `isEditable` is true.
   * After the dialog is closed, if there is a result, the links will be updated with the new values.
   *
   * @returns {void}
   */
  public openLinksDialog(isEditable = true): void {
    const dialogRef = this.dialog.open(LinksComponent, {
      width: '400px',
      maxHeight: '500px',
      data: {
        links: [...this.links],
        isEditable,
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.links = result;
      }
    });
  }

  /**
   * Sends a message using the order service.
   *
   * This method checks if the `composeMessageComponent` and its `message` property are defined.
   * If they are, it sends the message along with any associated links using the `sendOrderMessage` method of the `orderingService`.
   * After the message is sent, the `loadMessages` method is called to refresh the chat messages.
   * If the message ID is set, it is included in the messageID property.
   * If not, the method returns without performing any action.
   *
   * @returns {void}
   */
  public sendMessage(): void {
    if (!this.composeMessageComponent || !this.composeMessageComponent?.message) {
      return;
    }
    const messageId = this.messageId;
    const message: Message = {
      text: this.composeMessageComponent.message,
      links: this.links,
    };
    if (messageId) {
      message.replyToMessageId = messageId;
    }
    this.chatService.sendOrderMessage(this.order.externalId, message);
    this.chatService.characterCount.set(0);
    this.chatService.clearReplyMessageId();
    this.composeMessageComponent.message = '';
    this.links = [];
  }

  /**
   * Determines if sending a message is allowed.
   *
   * @returns {boolean} True if the composeMessageComponent exists and the message is not empty or whitespace; otherwise, false.
   */
  public isSendAllowed(): boolean {
    const message = this.composeMessageComponent?.message;
    return message ? message.trim().length > 0 : false;
  }

  /**
   * Closes the dialog.
   * This method calls the `close` method of the `dialogRef`.
   * @returns {void}
   */
  protected closeMessageDialog(): void {
    this.refreshCurrentOrdersList.emit();
    this.clearReplyMessageId();
  }

  /**
   * Clears the message ID.
   * This method calls the `clearReplyMessageId` method of the `chatService`.
   * @returns {void}
   */
  private clearReplyMessageId(): void {
    this.chatService.clearReplyMessageId();
  }
}
