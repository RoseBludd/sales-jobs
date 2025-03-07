/**
 * Email service for handling MIME parsing and other email-related functionality
 * Using server-side API for parsing instead of direct mailparser usage
 */

import { EmailAttachment } from '../types';
// The mime package has built-in types
import mime from 'mime';

/**
 * Parse a raw email body to extract HTML or text content
 * Using server API for parsing to avoid Node.js dependencies on client
 */
export async function parseEmailBody(rawEmail: string): Promise<string> {
  try {
    // For client-side, we'll use a server API endpoint to parse the email
    // This avoids importing node-specific modules on the client
    const response = await fetch('/api/email/parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rawEmail }),
    });

    if (!response.ok) {
      throw new Error(`Failed to parse email: ${response.statusText}`);
    }

    const result = await response.json();
    return result.html || result.textAsHtml || `<pre>${result.text || ''}</pre>` || parseEmailBodySimple(rawEmail);
  } catch (error) {
    console.error('Error parsing email with server API:', error);
    // Fallback to simple parsing if server API fails
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
 * Extract attachments from a raw email using server API
 */
export async function extractAttachments(rawEmail: string): Promise<EmailAttachment[]> {
  try {
    // For client-side, we'll use a server API endpoint to extract attachments
    const response = await fetch('/api/email/attachments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rawEmail }),
    });

    if (!response.ok) {
      throw new Error(`Failed to extract attachments: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error extracting attachments with server API:', error);
    // Fallback to simple extraction if server API fails
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