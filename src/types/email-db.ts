import { z } from 'zod';

// Database User model
export interface DbUser {
  id: number;
  email: string;
  display_name: string | null;
  created_at: Date;
  updated_at: Date;
}

// Database Folder model
export interface DbFolder {
  id: number;
  folder_id: string; // Exchange folder ID
  display_name: string;
  parent_folder_id: string | null;
  user_id: number | null;
  total_count: number;
  child_folder_count: number;
  created_at: Date;
  updated_at: Date;
}

// Database Email model
export interface DbEmail {
  id: number;
  email_id: string; // Exchange email ID
  user_id: number;
  folder_id: number | null;
  subject: string | null;
  from_address: string | null;
  from_name: string | null;
  body: string | null;
  received_date: Date | null;
  has_attachments: boolean;
  is_read: boolean;
  importance: string | null;
  internet_message_id: string | null;
  size: number | null;
  created_at: Date;
  updated_at: Date;
  last_synced_at: Date;
}

// Database Email Recipient model
export interface DbEmailRecipient {
  id: number;
  email_id: number;
  recipient_type: 'to' | 'cc' | 'bcc';
  email_address: string;
  display_name: string | null;
  created_at: Date;
}

// Database Email Attachment model
export interface DbEmailAttachment {
  id: number;
  email_id: number;
  file_name: string;
  content_type: string | null;
  size: number | null;
  content_id: string | null;
  is_inline: boolean;
  attachment_id: string | null; // Exchange attachment ID
  created_at: Date;
}

// Zod schema for validating email data from EWS
export const EmailFromEwsSchema = z.object({
  id: z.string(),
  subject: z.string().nullable(),
  from: z.string().nullable(),
  fromName: z.string().nullable(),
  receivedDate: z.string().nullable().transform(val => val ? new Date(val) : null),
  hasAttachments: z.boolean().default(false),
  isRead: z.boolean().default(false),
  to: z.array(z.string()).optional(),
  cc: z.array(z.string()).optional(),
  body: z.string().nullable().optional(),
  importance: z.string().nullable().optional(),
  internetMessageId: z.string().nullable().optional(),
  size: z.number().nullable().optional(),
});

export type EmailFromEws = z.infer<typeof EmailFromEwsSchema>;

// Function to convert EWS email to database email
export function convertEwsEmailToDbEmail(email: EmailFromEws, userId: number, folderId: number | null): DbEmail {
  return {
    id: 0, // Will be set by database
    email_id: email.id,
    user_id: userId,
    folder_id: folderId,
    subject: email.subject,
    from_address: email.from,
    from_name: email.fromName,
    body: email.body || null,
    received_date: email.receivedDate,
    has_attachments: email.hasAttachments,
    is_read: email.isRead,
    importance: email.importance || null,
    internet_message_id: email.internetMessageId || null,
    size: email.size || null,
    created_at: new Date(),
    updated_at: new Date(),
    last_synced_at: new Date()
  };
}

// Function to convert EWS email recipients to database email recipients
export function convertEwsRecipientsToDbRecipients(
  email: EmailFromEws, 
  dbEmailId: number
): DbEmailRecipient[] {
  const recipients: DbEmailRecipient[] = [];
  
  // Process 'to' recipients
  if (email.to) {
    email.to.forEach(address => {
      recipients.push({
        id: 0, // Will be set by database
        email_id: dbEmailId,
        recipient_type: 'to',
        email_address: address,
        display_name: null, // EWS API doesn't provide display name in the current implementation
        created_at: new Date()
      });
    });
  }
  
  // Process 'cc' recipients
  if (email.cc) {
    email.cc.forEach(address => {
      recipients.push({
        id: 0, // Will be set by database
        email_id: dbEmailId,
        recipient_type: 'cc',
        email_address: address,
        display_name: null,
        created_at: new Date()
      });
    });
  }
  
  return recipients;
} 