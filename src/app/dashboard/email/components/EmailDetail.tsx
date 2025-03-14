'use client';

import React, { useState, useEffect } from 'react';
import { useEmailContext } from '../context/EmailProvider';
import { ChevronLeft, Trash, Star, StarOff, MailPlus, CornerUpLeft, CornerUpRight, Download, Printer, Loader2 } from 'lucide-react';
import { Email, EmailAttachment } from '../types';

interface EmailDetailProps {
  emailId: string;
  onBack: () => void;
  onDelete: () => void;
  isMobileView?: boolean;
}

export default function EmailDetail({ emailId, onBack, onDelete, isMobileView = false }: EmailDetailProps) {
  const { fetchEmailById, updateEmail } = useEmailContext();
  const [email, setEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEmail = async () => {
      try {
        setLoading(true);
        setError(null);
        const emailData = await fetchEmailById(emailId);
        setEmail(emailData);
      } catch (err) {
        console.error('Error loading email:', err);
        setError('Failed to load email. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadEmail();
  }, [emailId, fetchEmailById]);

  const handleToggleStar = () => {
    if (!email) return;
    
    const updatedEmail = { ...email, isStarred: !email.isStarred };
    updateEmail(updatedEmail);
    setEmail(updatedEmail);
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };

  const renderAttachments = (attachments: EmailAttachment[] = []) => {
    if (!attachments || attachments.length === 0) return null;
    
    return (
      <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Attachments ({attachments.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
            >
              <div className="mr-3 text-gray-400 dark:text-gray-500">
                <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {attachment.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {(attachment.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <div>
                <button
                  className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  title="Download"
                >
                  <Download className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Display loading state
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading email...</p>
        </div>
      </div>
    );
  }

  // Display error state
  if (error || !email) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="flex flex-col items-center text-center">
          <div className="text-red-500 mb-4">
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Error Loading Email
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error || 'Unable to load email content. The email may have been moved or deleted.'}
          </p>
          <button
            onClick={onBack}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 p-4">
        <div className="flex justify-between items-center">
          <button
            onClick={onBack}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleToggleStar}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              title={email.isStarred ? 'Unstar' : 'Star'}
            >
              {email.isStarred ? (
                <Star className="h-5 w-5 text-yellow-400" fill="currentColor" />
              ) : (
                <StarOff className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              )}
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Delete"
            >
              <Trash className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Reply"
            >
              <CornerUpLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Forward"
            >
              <CornerUpRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Print"
            >
              <Printer className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Email body */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {email.subject}
          </h1>
          
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-lg font-medium text-gray-700 dark:text-gray-300">
                {email.fromName ? email.fromName.charAt(0).toUpperCase() : 'U'}
              </div>
            </div>
            <div className="ml-3 flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {email.fromName || email.from}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {email.from}
                  </p>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(email.date)}
                </p>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                <span className="font-medium">To:</span> {email.to}
              </p>
            </div>
          </div>
          
          <div className="prose prose-sm dark:prose-invert max-w-none mt-6">
            <div dangerouslySetInnerHTML={{ __html: email.body }} />
          </div>
          
          {email.attachments && renderAttachments(email.attachments)}
        </div>
      </div>
    </div>
  );
} 