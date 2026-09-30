// TODO: Remove this file once the API is ready
export interface Message {
  author: string;
  creationDate: string;
  text: string;
  messageReadState: string;
  messageId: string;
  links: string[];
  received: boolean;
}

export interface MessageList {
  items: Message[];
}
