export interface EmailAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
}

export interface Email {
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
  attachments?: EmailAttachment[];
  itemId?: string;
} 