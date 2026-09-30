import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { ChatService } from '../chat.service';

@Component({
  selector: 'app-compose-message',
  imports: [FormsModule, MatButtonModule, MatInputModule, MatIconModule, TranslatePipe],
  templateUrl: './compose-message.component.html',
  styleUrl: './compose-message.component.scss',
})
export class ComposeMessageComponent {
  public message = '';
  protected chatService = inject(ChatService);

  /**
   * Gets the message id signal.
   * @returns {string | null}
   */
  get replyToMesageId(): string | null {
    return this.chatService.replyToMesageId();
  }

  /**
   * Updates the characted count signal
   * @returns {void}
   */
  protected updateCharacterCount(): void {
    this.chatService.updateCharacterCount(this.message.length);
  }
}
