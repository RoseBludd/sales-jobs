'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Star, Trash, Reply, Forward, MoreHorizontal, Download } from 'lucide-react';
import { EmailContent } from './EmailContent';
import { EmailAttachment } from '../types';

interface Email {
  id: number;
  folder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam';
  from: string;
  fromName: string;
  to: string;
  subject: string;
  body: string;
  date: Date | string;
  isRead: boolean;
  isStarred: boolean;
  attachments?: EmailAttachment[];
  itemId?: string;
}

interface EmailDetailProps {
  email: Email;
  onBack: () => void;
  onDelete: () => void;
  onMove: (folder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam') => void;
  isMobileView?: boolean;
  currentFolder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam';
}

const EmailDetail = ({ 
  email, 
  onBack, 
  onDelete,
  onMove,
  isMobileView = false,
  currentFolder
}: EmailDetailProps) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Debug log to check if the component is receiving the props correctly
  useEffect(() => {
    console.log('EmailDetail rendering with:', { 
      emailId: email?.id, 
      subject: email?.subject, 
      currentFolder 
    });
  }, [email, currentFolder]);
  
  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };
  
  const formatDate = (date: Date | string) => {
    if (!date) return 'Unknown date';
    
    // Ensure date is a Date object
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      return dateObj.toLocaleString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return String(date);
    }
  };
  
  if (!email) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-800">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p>Email not found or still loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* Email header */}
      <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10 shadow-sm">
        <div className="flex items-center">
          <button 
            onClick={onBack} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 mr-2 md:mr-4"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className={`text-lg font-medium text-gray-900 dark:text-gray-100 ${isMobileView ? 'line-clamp-1 max-w-[200px]' : 'line-clamp-1'}`}>
            {email.subject || '(No subject)'}
          </h2>
        </div>
        <div className="flex items-center space-x-1">
          <button 
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400"
            aria-label={email.isStarred ? "Unstar email" : "Star email"}
          >
            <Star 
              size={20} 
              fill={email.isStarred ? "currentColor" : "none"} 
              className={email.isStarred ? "text-yellow-400" : ""}
            />
          </button>
          <div className="relative">
            <button 
              onClick={toggleDropdown}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400"
              aria-label="More options"
              aria-expanded={showDropdown}
              aria-haspopup="true"
            >
              <MoreHorizontal size={20} />
            </button>
            {showDropdown && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border dark:border-gray-700 py-1">
                {currentFolder !== 'inbox' && (
                  <button 
                    className="flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => onMove('inbox')}
                  >
                    <ArrowLeft size={16} className="mr-2" />
                    Move to Inbox
                  </button>
                )}
                {currentFolder !== 'trash' && (
                  <button 
                    className="flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => onMove('trash')}
                  >
                    <Trash size={16} className="mr-2" />
                    Move to Trash
                  </button>
                )}
                <button 
                  className="flex w-full items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={onDelete}
                >
                  <Trash size={16} className="mr-2" />
                  Delete Permanently
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Email metadata */}
      <div className="p-4 border-b dark:border-gray-700">
        <div className="flex flex-col space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 mr-3 flex-shrink-0">
                <span className="text-lg font-medium">{(email.fromName || email.from).charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{email.fromName || email.from}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  To: {email.to}
                </p>
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(email.date)}
            </div>
          </div>
        </div>
      </div>
      
      {/* Email body */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
          </div>
        ) : (
          <EmailContent body={email.body} />
        )}
      </div>
      
      {/* Email attachments if any */}
      {email.attachments && email.attachments.length > 0 && (
        <div className="p-4 border-t dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Attachments ({email.attachments.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {email.attachments.map((attachment, index) => (
              <div 
                key={index}
                className="flex items-center p-2 border dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700"
              >
                <div className="mr-2">
                  <Download size={16} className="text-gray-500 dark:text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                    {attachment.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {(attachment.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Email actions */}
      <div className="p-4 border-t dark:border-gray-700 flex justify-between">
        <div className="flex space-x-2">
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-500 dark:text-gray-400 flex items-center">
            <Reply size={18} className="mr-1" />
            <span className="text-sm">Reply</span>
          </button>
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-500 dark:text-gray-400 flex items-center">
            <Forward size={18} className="mr-1" />
            <span className="text-sm">Forward</span>
          </button>
        </div>
        <button 
          onClick={onDelete}
          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md text-red-500 flex items-center"
        >
          <Trash size={18} className="mr-1" />
          <span className="text-sm">Delete</span>
        </button>
      </div>
    </div>
  );
};

export default EmailDetail; 