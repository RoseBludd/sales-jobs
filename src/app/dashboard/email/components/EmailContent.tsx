'use client';

import React, { useState, useEffect } from 'react';
import { parseEmailBody } from '../services/emailService';

// Add CSS for email content styling with dark mode support
const emailContentStyles = `
  .email-html-content {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
  
  .email-html-content blockquote {
    border-left: 3px solid #e5e7eb;
    padding-left: 1rem;
    color: #6b7280;
    margin: 1rem 0;
  }
  
  .email-html-content a {
    color: #3b82f6;
    text-decoration: underline;
  }
  
  .email-html-content pre, .email-html-content code {
    white-space: pre-wrap;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
    font-size: 0.875rem;
    background-color: #f3f4f6;
    padding: 0.25rem;
    border-radius: 0.25rem;
  }
  
  .email-forwarded-content {
    border-left: 4px solid #e5e7eb;
    padding-left: 1rem;
    margin: 1rem 0;
  }
  
  .email-quoted-text {
    color: #6b7280;
    border-left: 2px solid #e5e7eb;
    padding-left: 0.5rem;
    margin: 0.5rem 0;
  }

  /* Dark mode styles */
  .dark .email-html-content {
    color: #e5e7eb;
  }
  
  .dark .email-html-content blockquote {
    border-left-color: #4b5563;
    color: #9ca3af;
  }
  
  .dark .email-html-content a {
    color: #60a5fa;
  }
  
  .dark .email-html-content pre, .dark .email-html-content code {
    background-color: #374151;
    color: #e5e7eb;
  }
  
  .dark .email-forwarded-content {
    border-left-color: #4b5563;
  }
  
  .dark .email-quoted-text {
    color: #9ca3af;
    border-left-color: #4b5563;
  }
`;

interface EmailContentProps {
  body: string;
}

export const EmailContent = ({ body }: EmailContentProps) => {
  const [parsedContent, setParsedContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    console.log('EmailContent received body:', body ? `${body.substring(0, 100)}...` : 'empty/null body');
    console.log('Body type:', typeof body);
    
    if (!body) {
      console.log('Body is empty or null, showing placeholder');
      setParsedContent('<p>No content available</p>');
      setLoading(false);
      return;
    }
    
    // Only parse if the body looks like a raw email
    if (body.includes('Content-Type:') || body.includes('MIME-Version:')) {
      setLoading(true);
      
      const parseBody = async () => {
        try {
          const parsed = await parseEmailBody(body);
          console.log('Parsed email body:', parsed ? `${parsed.substring(0, 100)}...` : 'empty parsed content');
          setParsedContent(parsed || '<p>No content available after parsing</p>');
        } catch (error) {
          console.error('Error parsing email body:', error);
          // Fallback to displaying the raw content
          setParsedContent(`<pre>${body}</pre>`);
        } finally {
          setLoading(false);
        }
      };
      
      parseBody();
    } else if (body.trim().startsWith('<') && body.includes('</')) {
      // Already HTML content
      console.log('Body appears to be HTML, using as-is');
      setParsedContent(body);
      setLoading(false);
    } else {
      // Plain text content
      console.log('Using body as plain text');
      setParsedContent(`<div style="white-space: pre-wrap;">${body}</div>`);
      setLoading(false);
    }
  }, [body]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    );
  }

  return (
    <>
      <style>{emailContentStyles}</style>
      <div 
        className="email-html-content bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-4 rounded-md"
        dangerouslySetInnerHTML={{ __html: parsedContent }}
      />
    </>
  );
};

export default EmailContent; 