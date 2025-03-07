import { simpleParser, ParsedMail, AddressObject } from 'mailparser';
import { EmailMessage } from './types';
import { parseEmailAddress } from './utils';

/**
 * Parse an email message using simpleParser from mailparser
 * This provides easier formatting and handling of email content
 * 
 * @param rawEmail The raw email content as a string or Buffer
 * @param folder The folder the email belongs to
 * @param id The email ID
 * @param itemId Optional item ID for the email
 * @returns A parsed EmailMessage object
 */
export const parseEmail = async (
  rawEmail: string | Buffer,
  folder: 'inbox' | 'sent' | 'draft' | 'trash',
  id: number,
  itemId?: string,
  isRead: boolean = false,
  isStarred: boolean = false
): Promise<EmailMessage> => {
  try {
    // Parse the email using simpleParser
    const parsed: ParsedMail = await simpleParser(rawEmail);
    
    // Extract the sender information
    const fromAddress = parsed.from as AddressObject;
    const from = fromAddress?.text || '';
    const fromName = fromAddress?.value?.[0]?.name || parseEmailAddress(from).name || '';
    
    // Extract the recipient information
    const toAddress = parsed.to as AddressObject;
    const to = toAddress?.text || '';
    
    // Create the email message object
    const email: EmailMessage = {
      id,
      folder,
      from,
      fromName,
      to,
      subject: parsed.subject || '(No Subject)',
      // Use HTML content if available, otherwise use text content
      body: parsed.html || parsed.textAsHtml || parsed.text || '',
      date: parsed.date || new Date(),
      isRead,
      isStarred,
      itemId
    };
    
    return email;
  } catch (error) {
    console.error('Error parsing email:', error);
    // Return a basic email object if parsing fails
    return {
      id,
      folder,
      from: '',
      fromName: '',
      to: '',
      subject: 'Error parsing email',
      body: 'There was an error parsing this email message.',
      date: new Date(),
      isRead,
      isStarred,
      itemId
    };
  }
};

/**
 * Parse multiple email messages using simpleParser
 * 
 * @param emails Array of raw email data with metadata
 * @returns Array of parsed EmailMessage objects
 */
export const parseEmails = async (
  emails: Array<{
    raw: string | Buffer;
    folder: 'inbox' | 'sent' | 'draft' | 'trash';
    id: number;
    itemId?: string;
    isRead?: boolean;
    isStarred?: boolean;
  }>
): Promise<EmailMessage[]> => {
  const parsedEmails: EmailMessage[] = [];
  
  for (const email of emails) {
    const parsed = await parseEmail(
      email.raw,
      email.folder,
      email.id,
      email.itemId,
      email.isRead,
      email.isStarred
    );
    parsedEmails.push(parsed);
  }
  
  return parsedEmails;
}; 