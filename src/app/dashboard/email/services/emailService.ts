/**
 * Email service for handling AWS WorkMail EWS integration
 */

import { Email, EmailAttachment } from '../types';

/**
 * Parse a raw email body to extract HTML or text content
 */
export function parseEmailBody(body: string): string {
  // Simple parsing for HTML content
  if (!body) return '';
  
  console.log('Parsing email body, length:', body.length);
  
  // If it's already HTML, return it as is
  if (body.trim().startsWith('<') && body.includes('</')) {
    console.log('Body appears to be HTML already');
    return body;
  }
  
  // Check if it's a MIME message
  if (body.includes('Content-Type:') && body.includes('MIME-Version:')) {
    console.log('Body appears to be a MIME message, extracting content');
    
    // Try to extract HTML part
    const htmlMatch = body.match(/Content-Type: text\/html[\s\S]*?(?:\r?\n\r?\n)([\s\S]*?)(?:\r?\n\r?\n--)/i);
    if (htmlMatch && htmlMatch[1]) {
      console.log('Found HTML content in MIME message');
      return htmlMatch[1].trim();
    }
    
    // Try to extract plain text part
    const textMatch = body.match(/Content-Type: text\/plain[\s\S]*?(?:\r?\n\r?\n)([\s\S]*?)(?:\r?\n\r?\n--)/i);
    if (textMatch && textMatch[1]) {
      console.log('Found plain text content in MIME message');
      return `<div style="white-space: pre-wrap;">${textMatch[1].trim()}</div>`;
    }
  }
  
  // Convert plain text to HTML
  console.log('Treating as plain text');
  return `<div style="white-space: pre-wrap;">${body}</div>`;
}

/**
 * Helper function to extract sender name and email from email data
 */
function extractSenderInfo(fromName: string = '', fromEmail: string = ''): { name: string, email: string } {
  // If fromName is provided, use it
  if (fromName) {
    return { name: fromName, email: fromEmail };
  }
  
  // If no fromName but we have fromEmail
  if (fromEmail) {
    // Check if the from field has a format like "John Doe <john.doe@example.com>"
    const nameMatch = fromEmail.match(/^([^<]+)<([^>]+)>$/);
    if (nameMatch && nameMatch[1]) {
      return { 
        name: nameMatch[1].trim(), 
        email: nameMatch[2].trim() 
      };
    }
    
    // Just use the email address as the name
    return { 
      name: fromEmail, 
      email: fromEmail 
    };
  }
  
  // Fallback
  return { name: 'Unknown', email: fromEmail };
}

/**
 * Fetch emails from a specific folder
 */
export async function fetchEmails(
  folder: string = 'inbox',
  page: number = 1,
  pageSize: number = 50,
  searchQuery?: string,
  sync: boolean = false
): Promise<{
  emails: Email[];
  total: number;
  page: number;
  pageSize: number;
  fromCache: boolean;
}> {
  try {
    // Map folder names to match API expectations
    const folderMap: Record<string, string> = {
      'inbox': 'inbox',
      'sent': 'sent',
      'draft': 'drafts',
      'trash': 'deleted',
      'spam': 'junk'
    };

    const apiFolder = folderMap[folder.toLowerCase()] || 'inbox';
    
    // Build the API URL - don't explicitly convert to strings
    let url = `/api/emails?folder=${apiFolder}&page=${page}&pageSize=${pageSize}`;
    if (sync) {
      url += '&sync=true';
    }
    
    if (searchQuery) {
      url = `/api/emails/search`;
    }

    // Make the API request
    const response = searchQuery 
      ? await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: searchQuery,
            folderIds: [apiFolder],
            page,
            pageSize
          }),
        })
      : await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'No error details provided' }));
      console.error('API error response:', {
        status: response.status,
        statusText: response.statusText,
        data: errorData
      });
      throw new Error(errorData.error || `Failed to fetch emails (${response.status}: ${response.statusText})`);
    }

    const data = await response.json();
    
    // Transform the API response to match our Email interface
    const emails: Email[] = data.emails.map((email: any) => {
      // Extract sender info
      const senderInfo = extractSenderInfo(email.fromName, email.from);
      
      // Log the email data for debugging
      console.log('Email data:', {
        id: email.id,
        from: email.from,
        fromName: email.fromName,
        subject: email.subject,
        extracted: senderInfo
      });
      
      return {
        id: email.id,
        folder: folder as 'inbox' | 'sent' | 'draft' | 'trash' | 'spam',
        from: senderInfo.email,
        fromName: senderInfo.name,
        to: Array.isArray(email.to) ? email.to.join(', ') : (email.to || ''),
        subject: email.subject || '(No Subject)',
        body: email.body || '',
        date: email.receivedDate || new Date().toISOString(),
        isRead: email.isRead || false,
        isStarred: false, // EWS doesn't have a direct "starred" concept
        attachments: email.hasAttachments ? [] : undefined, // We'll load attachments separately when needed
        itemId: email.id // Store the original EWS item ID
      };
    });

    return {
      emails,
      total: data.total || emails.length,
      page: data.page || page,
      pageSize: data.pageSize || pageSize,
      fromCache: data.fromCache || false
    };
  } catch (error) {
    console.error('Error fetching emails:', error);
    throw error;
  }
}

/**
 * Fetch a single email by ID
 */
export async function fetchEmailById(id: string, sync: boolean = false): Promise<Email> {
  try {
    let url = `/api/emails/${id}`;
    if (sync) {
      url += '?sync=true';
    }
    
    console.log(`Fetching email with ID: ${id}, sync: ${sync}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Error fetching email ${id}:`, errorData);
      throw new Error(errorData.error || 'Failed to fetch email');
    }
    
    const data = await response.json();
    const email = data.email;
    
    if (!email) {
      console.error('API returned no email data for ID:', id);
      throw new Error('No email data returned from API');
    }
    
    // Log the email data for debugging
    console.log('Email detail data:', {
      id: email.id,
      from: email.from,
      fromName: email.fromName,
      subject: email.subject,
      bodyLength: email.body ? email.body.length : 0,
      bodyPreview: email.body ? email.body.substring(0, 50) + '...' : 'No body'
    });
    
    // Extract sender info
    const senderInfo = extractSenderInfo(email.fromName, email.from);
    
    // Transform the API response to match our Email interface
    return {
      id: email.id,
      folder: determineFolder(email),
      from: senderInfo.email,
      fromName: senderInfo.name,
      to: Array.isArray(email.to) ? email.to.join(', ') : (email.to || ''),
      subject: email.subject || '(No Subject)',
      body: email.body || '',
      date: email.receivedDate || new Date().toISOString(),
      isRead: email.isRead || false,
      isStarred: false,
      attachments: email.attachments?.map((att: any) => ({
        id: att.id,
        name: att.name,
        size: att.size || 0,
        type: att.contentType || 'application/octet-stream'
      })),
      itemId: email.id
    };
  } catch (error) {
    console.error('Error fetching email by ID:', error);
    throw error;
  }
}

/**
 * Helper function to map email domain from @restoremastersllc.com to @weroofamerica.com
 */
function mapEmailDomain(email: string): string {
  if (email && email.includes('@restoremastersllc.com')) {
    const username = email.split('@')[0];
    return `${username}@weroofamerica.com`;
  }
  return email;
}

/**
 * Send a new email
 */
export async function sendNewEmail(
  to: string,
  subject: string,
  body: string,
  cc?: string,
  bcc?: string,
  attachments?: File[]
): Promise<{ success: boolean; emailId?: string; message: string }> {
  try {
    // Prepare recipients arrays and map domains if needed
    const toArray = to.split(/[,;]/).map(email => mapEmailDomain(email.trim())).filter(Boolean);
    const ccArray = cc ? cc.split(/[,;]/).map(email => mapEmailDomain(email.trim())).filter(Boolean) : undefined;
    const bccArray = bcc ? bcc.split(/[,;]/).map(email => mapEmailDomain(email.trim())).filter(Boolean) : undefined;
    
    // TODO: Handle attachments when implementing attachment support
    
    const response = await fetch('/api/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: toArray,
        subject,
        body,
        cc: ccArray,
        bcc: bccArray
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send email');
    }
    
    const result = await response.json();
    return {
      success: result.success,
      emailId: result.emailId,
      message: result.message || 'Email sent successfully'
    };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Move an email to a different folder
 */
export async function moveEmail(
  emailId: string,
  toFolder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam'
): Promise<{ success: boolean; message: string }> {
  try {
    // Map folder names to match API expectations
    const folderMap: Record<string, string> = {
      'inbox': 'inbox',
      'sent': 'sentitems',
      'draft': 'drafts',
      'trash': 'deleteditems',
      'spam': 'junkemail'
    };
    
    const destinationFolder = folderMap[toFolder.toLowerCase()];
    
    const response = await fetch('/api/emails/move', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emailId,
        destinationFolderId: destinationFolder
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to move email');
    }
    
    const result = await response.json();
    return {
      success: result.success,
      message: result.message || 'Email moved successfully'
    };
  } catch (error) {
    console.error('Error moving email:', error);
    throw error;
  }
}

/**
 * Delete an email
 */
export async function deleteEmail(
  emailId: string,
  hardDelete: boolean = false
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`/api/emails/${emailId}?hardDelete=${hardDelete}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete email');
    }
    
    const result = await response.json();
    return {
      success: result.success,
      message: result.message || 'Email deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting email:', error);
    throw error;
  }
}

/**
 * Helper function to determine the folder of an email
 */
function determineFolder(email: any): 'inbox' | 'sent' | 'draft' | 'trash' | 'spam' {
  if (email.folder) {
    const folderMap: Record<string, 'inbox' | 'sent' | 'draft' | 'trash' | 'spam'> = {
      'inbox': 'inbox',
      'sentitems': 'sent',
      'drafts': 'draft',
      'deleteditems': 'trash',
      'junkemail': 'spam'
    };
    
    return folderMap[email.folder.toLowerCase()] || 'inbox';
  }
  
  // Default to inbox if no folder information is available
  return 'inbox';
} 