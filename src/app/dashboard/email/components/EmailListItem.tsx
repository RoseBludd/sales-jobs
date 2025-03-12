'use client';

import React, { useState, useEffect } from 'react';
import { Star, Paperclip } from 'lucide-react';
import { Email } from '../types';
import { parseEmailBody } from '../services/emailService';

interface EmailListItemProps {
  email: Email;
  isSelected?: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  onMove?: (toFolder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam') => void;
  currentFolder?: string;
}

const EmailListItem = ({ 
  email, 
  isSelected, 
  onSelect, 
  onDelete, 
  onMove,
  currentFolder 
}: EmailListItemProps) => {
  const [previewText, setPreviewText] = useState<string>('');
  
  // Format date to be more readable
  const formatDate = (date: Date | string) => {
    // Ensure date is a Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const isToday = dateObj.toDateString() === now.toDateString();
    
    if (isToday) {
      return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Extract clean text from HTML content
  const extractTextFromHtml = (html: string): string => {
    // Create a temporary div to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Get the text content
    const text = tempDiv.textContent || tempDiv.innerText || '';
    
    // Clean up whitespace
    return text.replace(/\s+/g, ' ').trim();
  };

  // Parse and extract preview text when email changes
  useEffect(() => {
    const getEmailPreview = async () => {
      try {
        // If the body looks like it contains HTML or styling
        if (email.body.includes('<') || 
            email.body.includes('{') || 
            email.body.includes('[') || 
            email.body.includes('style=')) {
          
          // Use the same parsing function as EmailContent component
          const parsedHtml = await parseEmailBody(email.body);
          const plainText = extractTextFromHtml(parsedHtml);
          
          if (plainText && plainText.trim() !== '') {
            setPreviewText(plainText);
            return;
          }
        }
        
        // Fallback to simple text extraction if parsing fails or returns empty
        const simpleText = email.body
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/\{[^}]*\}/g, '') // Remove CSS
          .replace(/\[[^\]]*\]/g, '') // Remove attributes in brackets
          .replace(/&nbsp;/g, ' ') // Replace HTML entities
          .replace(/\s+/g, ' ')
          .trim();
        
        if (simpleText && simpleText.trim() !== '') {
          setPreviewText(simpleText);
        } else {
          // If we still don't have text, use the subject as fallback
          setPreviewText(email.subject || 'No preview available');
        }
      } catch (error) {
        console.error('Error generating email preview:', error);
        setPreviewText(email.subject || 'No preview available');
      }
    };
    
    getEmailPreview();
  }, [email]);

  // Handle click on the email item
  const handleClick = (e: React.MouseEvent) => {
    // Prevent default behavior
    e.preventDefault();
    
    // Log the click for debugging
    console.log('Email item clicked:', email.id, email.subject);
    
    // Call the onSelect handler
    onSelect();
  };

  return (
    <div 
      onClick={handleClick}
      className={`p-4 hover:bg-gray-100 dark:hover:bg-gray-700 border-b dark:border-gray-700 cursor-pointer transition-colors 
        ${!email.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
        ${isSelected ? 'bg-blue-100 dark:bg-blue-800/30' : ''}`}
      role="button"
      tabIndex={0}
      aria-selected={isSelected}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <Star 
            size={18} 
            fill={email.isStarred ? "currentColor" : "none"} 
            className={email.isStarred ? "text-yellow-400" : "text-gray-400 dark:text-gray-500 hover:text-yellow-400"}
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1">
            <p className={`text-sm font-medium truncate ${!email.isRead ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
              {email.fromName || email.from || 'Unknown'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 ml-2 whitespace-nowrap">
              {formatDate(email.date)}
            </p>
          </div>
          
          <h3 className={`text-sm truncate mb-1 ${!email.isRead ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
            {email.subject || '(No subject)'}
          </h3>
          
          <div className="flex items-center">
            {email.attachments && email.attachments.length > 0 && (
              <span className="inline-flex items-center mr-2 text-gray-500 dark:text-gray-400">
                <Paperclip size={14} className="mr-1" />
                <span className="text-xs">{email.attachments.length}</span>
              </span>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {previewText.substring(0, 100)}
              {previewText.length > 100 ? '...' : ''}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailListItem;