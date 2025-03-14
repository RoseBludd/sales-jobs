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
  onStarToggle?: (isStarred: boolean) => void;
  currentFolder?: string;
}

const EmailListItem = ({ 
  email, 
  isSelected, 
  onSelect, 
  onDelete, 
  onStarToggle,
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
    e.stopPropagation();
    onSelect();
  };
  
  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onStarToggle) {
      onStarToggle(!email.isStarred);
    }
  };
  
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
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
        <div className="flex-shrink-0 flex items-center">
          <button
            className="text-gray-400 hover:text-yellow-500 dark:text-gray-500 dark:hover:text-yellow-400 focus:outline-none"
            aria-label={email.isStarred ? "Unstar email" : "Star email"}
            onClick={handleStarClick}
          >
            <Star 
              className={`h-5 w-5 ${email.isStarred ? 'text-yellow-400 fill-current' : ''}`} 
            />
          </button>
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
      {/* Action buttons (only show on hover) */}
      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {onDelete && (
          <button
            onClick={handleDeleteClick}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            aria-label="Delete email"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default EmailListItem;