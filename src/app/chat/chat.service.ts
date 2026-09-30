import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Observable, catchError } from 'rxjs';
import { MessageState, OrderingService, OrderResponse, Message } from '@Ordering/api';
import { MessageDialogComponent } from '@Ordering/chat/message-dialog/message-dialog.component';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { OrderingApiName } from '@Ordering/data/custom/enum/ordering-api-names.enum';
import { ErrorHandlingService } from '@Ordering/shared/services/error-handling.service';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private dialog = inject(MatDialog);
  private errorHandlingService = inject(ErrorHandlingService);
  private tr = inject(TranslationsService);
  private orderingService = inject(OrderingService);
  private messagesSig = signal<Message[]>([]);
  public characterLimit: number = 2000;
  public characterCount = signal(0);
  // Expose a computed value
  public characterCountSig = computed(() => this.characterCount());
  protected messageState = MessageState;
  public messagesList = signal<Message[]>([]);
  public replyToMesageId = signal<string | null>(null);

  /**
   * This method sets the message id to the signal.
   * @param {string} id
   * @returns {void}
   */

  public setReplyMessageId(id: string): void {
    this.replyToMesageId.set(id);
  }
  /**
   * This method clears the message id from the signal.
   * @returns {void}
   */
  public clearReplyMessageId(): void {
    this.replyToMesageId.set(null);
  }
  /**
   * This method gets the messages from the service.
   * @param {string} externalId
   * @returns {Observable<Message[]>}
   */
  public getMessages(externalId: string): void {
    this.orderingService.getOrderMessage(externalId).subscribe({
      next: (messages: Message[]) => {
        this.messagesList.set(messages);
      },
      error: error => {
        this.errorHandlingService.handleError(error, OrderingApiName.GetMessages);
      },
    });
  }

  /**
   * Checks if the user has permission to view messages for the given order.
   * This method returns an Observable that can be used to verify permissions before opening the dialog.
   * @param {string} externalId
   * @returns {Observable<Message[]>}
   */
  public checkMessagePermission(externalId: string): Observable<Message[]> {
    return this.orderingService.getOrderMessage(externalId).pipe(
      catchError((error: HttpErrorResponse) => {
        this.errorHandlingService.handleError(error, OrderingApiName.GetMessages);
        throw error; // Re-throw to allow caller to handle the error flow
      }),
    );
  }

  /**
   * This method sends the message to the service.
   * @param {string} externalId
   * @param {Message} message
   * @returns {Observable<any>}
   */
  public sendOrderMessage(externalId: string, message: Message): void {
    this.orderingService.sendOrderMessage(externalId, message).subscribe({
      next: () => {
        this.getMessages(externalId);
      },
      error: error => {
        this.errorHandlingService.handleError(error, OrderingApiName.SendMessage);
      },
    });
  }

  /**
   * Getter for retrieving the list of messages.
   *
   * @returns {Message[]} An array of Message objects.
   */
  get messages(): Message[] {
    return this.messagesSig();
  }

  /**
   * Sets the messages for the chat service.
   *
   * @param {string[]} messages - An array of Message objects to be set.
   */
  set messages(messages: Message[]) {
    this.messagesSig.set(messages);
  }

  /**
   * Opens a message dialog with the provided order details.
   *
   * @param {OrderResponse} order - The order details to be displayed in the message dialog.
   * @returns {void} This method does not return a value.
   */
  public openMessageDialog(order: OrderResponse): MatDialogRef<MessageDialogComponent> {
    const dialogRef = this.dialog.open(MessageDialogComponent, {
      data: order,
      autoFocus: false,
      panelClass: 'mat-resizeable-dialog-container',
    });
    return dialogRef; // Return the dialogRef instead of afterAllClosed
  }
  /**
   * Show Tolltip for the matIcon.
   * @param {string} action
   * @returns {void}
   */
  public getMessageTooltip(action: MessageState): string {
    switch (action) {
      case this.messageState.NO_MESSAGE:
        return this.tr.translate('lblCreateNewMessage');
      case this.messageState.NEW_MESSAGE:
        return this.tr.translate('lblNewUnreadMessage');
      case this.messageState.ALL_READ:
        return this.tr.translate('lblNoNewMessage');
      default:
        return '';
    }
  }
  /**
   * Get MatIcon for the list.
   * @param {string} action
   * @returns {void}
   */
  public getMatIcon(action: MessageState): string {
    switch (action) {
      case this.messageState.NO_MESSAGE:
        return 'outgoing_mail';
      case this.messageState.NEW_MESSAGE:
        return 'mark_email_unread';
      case this.messageState.ALL_READ:
        return 'drafts';
      default:
        return '';
    }
  }

  /**
   * Method to update character count
   *
   * @param {number} count - The count of characters
   * @returns {void}
   */
  public updateCharacterCount(count: number): void {
    this.characterCount.set(count);
  }
}
