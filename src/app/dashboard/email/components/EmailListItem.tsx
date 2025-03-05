'use client';

import React from 'react';
import { Star, Trash, ArrowRight } from 'lucide-react';
import { Email } from '../types';

interface EmailListItemProps {
  email: Email;
  isSelected?: boolean;
  onClick: () => void;
  onDelete?: () => void;
  onMove?: (toFolder: 'inbox' | 'sent' | 'draft' | 'trash') => void;
}

const EmailListItem = ({ email, isSelected, onClick, onDelete, onMove }: EmailListItemProps) => (
  <div 
    onClick={onClick}
    className={`p-3 hover:bg-gray-100 dark:hover:bg-gray-700 border-b dark:border-gray-700 cursor-pointer transition-colors 
      ${!email.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
      ${isSelected ? 'bg-blue-100 dark:bg-blue-800/30' : ''}`}
  >
    <div className="flex items-center">
      <div className="flex-shrink-0 mr-3">
        <Star 
          size={18} 
          fill={email.isStarred ? "currentColor" : "none"} 
          className={email.isStarred ? "text-yellow-400" : "text-gray-400 dark:text-gray-500"}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between">
          <p className={`text-sm truncate ${!email.isRead ? 'font-semibold' : ''}`}>
            {email.fromName}
          </p>
          <p className="text-xs text-gray-500 ml-2 whitespace-nowrap">
            {new Date(email.date).toLocaleDateString()}
          </p>
        </div>
        <p className={`text-sm truncate mt-1 ${!email.isRead ? 'font-semibold' : ''}`}>
          {email.subject}
        </p>
        <p className="text-xs text-gray-500 truncate mt-1">
          {email.body.substring(0, 120).replace(/<[^>]*>/g, '')}...
        </p>
        {email.attachments && email.attachments.length > 0 && (
          <div className="mt-2 flex items-center">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <span className="ml-1 text-xs text-gray-500">
              {email.attachments.length} attachment{email.attachments.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  </div>
);

export default EmailListItem; 