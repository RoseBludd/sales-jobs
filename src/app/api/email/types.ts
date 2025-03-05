// Type definitions for email functionality

export interface EmailMessage {
  id: number;
  folder: 'inbox' | 'sent' | 'draft' | 'trash';
  from: string;
  fromName: string;
  to: string;
  subject: string;
  body: string;
  date: Date;
  isRead: boolean;
  isStarred: boolean;
  itemId?: string;
}

export interface ImapBox {
  messages: {
    total: number;
  };
}

export interface EmailAction {
  action: 'markAsRead' | 'delete' | 'send' | 'move';
  itemId?: string;
  to?: string;
  subject?: string;
  body?: string;
  fromFolder?: string;
  toFolder?: string;
} 