'use client';

import React, { useState, useEffect } from 'react';
import { parseEmailBody } from '../services/emailService';

// Add CSS for email content styling
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
`;

interface EmailContentProps {
  body: string;
}

export const EmailContent = ({ body }: EmailContentProps) => {
  const [parsedContent, setParsedContent] = useState<string>(body);
  const [loading, setLoading] = useState<boolean>(false);
  
  useEffect(() => {
    // Only parse if the body looks like a raw email
    if (body.includes('Content-Type:') || body.includes('MIME-Version:')) {
      setLoading(true);
      
      const parseBody = async () => {
        try {
          const parsed = await parseEmailBody(body);
          setParsedContent(parsed);
        } catch (error) {
          console.error('Error parsing email body:', error);
          // Fallback to displaying the raw content
          setParsedContent(`<pre>${body}</pre>`);
        } finally {
          setLoading(false);
        }
      };
      
      parseBody();
    } else {
      // Already parsed content
      setParsedContent(body);
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
        className="email-html-content"
        dangerouslySetInnerHTML={{ __html: parsedContent }}
      />
    </>
  );
};

export default EmailContent; 