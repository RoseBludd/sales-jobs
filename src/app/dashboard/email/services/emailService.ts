/**
 * Email service for handling MIME parsing and other email-related functionality
 * This implementation uses simple regex parsing, but could be upgraded to use
 * the postal-mime library for more robust parsing if needed.
 */

import { Email, EmailAttachment } from '../types';
// @ts-ignore - mime has built-in types but TypeScript might not recognize them
import mime from 'mime';
// @ts-ignore - postal-mime doesn't have type declarations
import PostalMime from 'postal-mime';

interface PostalMimeAttachment {
  filename?: string;
  mimeType: string;
  content: string;
}

/**
 * Parse a raw email body to extract HTML or text content
 * Using postal-mime for robust parsing
 */
export async function parseEmailBody(rawEmail: string): Promise<string> {
  try {
    const email = await PostalMime.parse(rawEmail);
    return email.html || email.text || rawEmail;
  } catch (error) {
    console.error('Error parsing email with PostalMime:', error);
    // Fallback to simple parsing if PostalMime fails
    return parseEmailBodySimple(rawEmail);
  }
}

/**
 * Simple fallback parser for email bodies
 */
function parseEmailBodySimple(rawEmail: string): string {
  // Check if this is a multipart email
  const boundaryMatch = rawEmail.match(/Content-Type: multipart\/\w+;\s*boundary="([^"]+)"/i);
  
  if (boundaryMatch && boundaryMatch[1]) {
    const boundary = boundaryMatch[1];
    const parts = rawEmail.split(new RegExp(`--${boundary}(?:--)?`, 'g')).filter(Boolean);
    
    // Look for HTML part first
    const htmlPart = parts.find(part => part.includes('Content-Type: text/html'));
    if (htmlPart) {
      const match = htmlPart.match(/(?:^\s*|\n\n)([\s\S]+)$/);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // If no HTML part, look for text part
    const textPart = parts.find(part => part.includes('Content-Type: text/plain'));
    if (textPart) {
      const match = textPart.match(/(?:^\s*|\n\n)([\s\S]+)$/);
      if (match && match[1]) {
        return `<pre>${match[1].trim()}</pre>`;
      }
    }
  }
  
  // If not multipart or couldn't parse parts, return the raw email
  if (rawEmail.includes('Content-Type:')) {
    return `<pre>${rawEmail}</pre>`;
  }
  
  return rawEmail;
}

/**
 * Extract attachments from a raw email using PostalMime
 */
export async function extractAttachments(rawEmail: string): Promise<EmailAttachment[]> {
  try {
    const email = await PostalMime.parse(rawEmail, { attachmentEncoding: 'base64' });
    
    return email.attachments.map((att: PostalMimeAttachment) => ({
      id: Math.random().toString(36).substring(2, 9),
      name: att.filename || 'unnamed',
      size: att.content.length,
      type: att.mimeType,
    }));
  } catch (error) {
    console.error('Error extracting attachments with PostalMime:', error);
    // Fallback to simple extraction if PostalMime fails
    return extractAttachmentsSimple(rawEmail);
  }
}

/**
 * Simple fallback for attachment extraction
 */
function extractAttachmentsSimple(rawEmail: string): EmailAttachment[] {
  const attachments: EmailAttachment[] = [];
  const boundaryMatch = rawEmail.match(/Content-Type: multipart\/\w+;\s*boundary="([^"]+)"/i);
  
  if (boundaryMatch && boundaryMatch[1]) {
    const boundary = boundaryMatch[1];
    const parts = rawEmail.split(new RegExp(`--${boundary}(?:--)?`, 'g')).filter(Boolean);
    
    // Process each part
    parts.forEach((part, index) => {
      // Look for attachment parts
      if (part.includes('Content-Disposition: attachment') || 
          (part.includes('Content-Disposition: inline') && !part.includes('Content-Type: text/'))) {
        
        // Extract filename
        const filenameMatch = part.match(/filename="([^"]+)"/i);
        const filename = filenameMatch ? filenameMatch[1] : `attachment-${index}`;
        
        // Extract content type
        const contentTypeMatch = part.match(/Content-Type: ([^;]+)/i);
        const contentType = contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream';
        
        // Extract content (simplified - would need proper decoding in real implementation)
        const contentStart = part.indexOf('\r\n\r\n');
        let contentLength = 0;
        
        if (contentStart > 0) {
          const content = part.slice(contentStart + 4);
          contentLength = content.length; 
        }
        
        attachments.push({
          id: Math.random().toString(36).substring(2, 9),
          name: filename,
          size: contentLength,
          type: contentType
        });
      }
    });
  }
  
  return attachments;
}

/**
 * Get MIME type for a file extension using the mime library
 */
export function getMimeType(filename: string): string {
  return mime.getType(filename) || 'application/octet-stream';
} 