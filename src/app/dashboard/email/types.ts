export interface EmailAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
}

export interface Email {
  id: number;
  folder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam';
  from: string;
  fromName: string;
  to: string;
  subject: string;
  body: string;
  date: Date | string;
  isRead: boolean;
  isStarred: boolean;
  attachments?: EmailAttachment[];
  itemId?: string;
} 