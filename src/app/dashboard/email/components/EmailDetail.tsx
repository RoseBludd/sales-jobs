'use client';

import React from 'react';
import { ArrowLeft, Star } from 'lucide-react';
import { EmailContent } from './EmailContent';
import { EmailAttachment } from '../types';

interface Email {
  id: number;
  folder: 'inbox' | 'sent' | 'draft' | 'trash';
  from: string;
  fromName: string;
  to: string;
  subject: string;
  body: string;
  date: Date;
  isRead: boolean;
  isStarred: boolean;
  attachments?: EmailAttachment[];
  itemId?: string;
}

interface EmailDetailProps {
  email: Email;
  onBack: () => void;
  onDelete: () => void;
  onMove: (folder: 'inbox' | 'sent' | 'draft' | 'trash') => void;
}

const EmailDetail = ({ 
  email, 
  onBack, 
  onDelete,
  onMove
}: EmailDetailProps) => (
  <div className="h-full flex flex-col">
    <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
      <div className="flex items-center">
        <button 
          onClick={onBack} 
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="ml-4">
          <h2 className="text-xl font-semibold">{email.subject}</h2>
          <p className="text-sm text-gray-500">
            {new Date(email.date).toLocaleString()}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <button 
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          aria-label={email.isStarred ? "Unstar email" : "Star email"}
        >
          <Star 
            size={20} 
            fill={email.isStarred ? "currentColor" : "none"} 
            className={email.isStarred ? "text-yellow-400" : ""}
          />
        </button>
        <div className="relative group">
          <button 
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            aria-label="More options"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
              <path 
                stroke="currentColor" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M12 12h.01M12 6h.01M12 18h.01"
              />
            </svg>
          </button>
          <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 hidden group-hover:block">
            <div className="py-1">
              <button 
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => onMove('inbox')}
              >
                Move to Inbox
              </button>
              <button 
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => onMove('trash')}
              >
                Move to Trash
              </button>
              <button 
                className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={onDelete}
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div className="p-4 border-b dark:border-gray-700">
      <div className="flex items-start">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
          {email.fromName.charAt(0).toUpperCase()}
        </div>
        <div className="ml-3 flex-1">
          <div className="flex justify-between">
            <div>
              <p className="font-semibold">{email.fromName}</p>
              <p className="text-sm text-gray-500">
                &lt;{email.from}&gt;
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            To: {email.to}
          </p>
        </div>
      </div>
    </div>
    
    <div className="flex-1 overflow-auto p-4">
      <EmailContent body={email.body} />
      
      {email.attachments && email.attachments.length > 0 && (
        <div className="mt-6 border-t dark:border-gray-700 pt-4">
          <h3 className="font-semibold mb-2">Attachments ({email.attachments.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {email.attachments.map(attachment => (
              <div 
                key={attachment.id} 
                className="p-3 border dark:border-gray-700 rounded-md flex items-center"
              >
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-gray-500">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path 
                      stroke="currentColor" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="2" 
                      d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="font-medium truncate">{attachment.name}</p>
                  <p className="text-sm text-gray-500">
                    {(attachment.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <a 
                  href="#"
                  className="ml-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                  aria-label="Download attachment"
                >
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                    <path 
                      stroke="currentColor" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="2" 
                      d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 0 0 4.561 21H19.439a2 2 0 0 0 1.94-1.515L22 17"
                    />
                  </svg>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
);

export default EmailDetail; 