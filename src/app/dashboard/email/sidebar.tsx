'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Inbox, Send, Archive, Trash, Plus, Loader2, AlertTriangle } from 'lucide-react';
import { useEmailContext } from './context/EmailProvider';

type FolderType = 'inbox' | 'sent' | 'draft' | 'trash' | 'spam';

const EmailSidebarContent = () => {
  const router = useRouter();
  const pathname = usePathname();
  
  // Get current folder from pathname
  const currentFolder = pathname ? pathname.split('/').pop() as FolderType || 'inbox' : 'inbox';
  
  // Use the shared context for shared state
  const {
    allEmails,
    allFoldersEmails,
    isLoading,
    setShowCompose,
    handleSetShowCompose,
    setSelectedEmail
  } = useEmailContext();
  
  // Count unread emails for each folder using allFoldersEmails
  const unreadCounts = {
    inbox: allFoldersEmails?.inbox ? allFoldersEmails.inbox.filter(e => !e.isRead).length : 0,
    sent: 0, // Sent emails are always read
    draft: allFoldersEmails?.draft ? allFoldersEmails.draft.length : 0, // All drafts count as "unread"
    trash: allFoldersEmails?.trash ? allFoldersEmails.trash.filter(e => !e.isRead).length : 0,
    spam: allFoldersEmails?.spam ? allFoldersEmails.spam.filter(e => !e.isRead).length : 0
  };
  
  // Count total emails in each folder using allFoldersEmails
  const totalCounts = {
    inbox: allFoldersEmails?.inbox ? allFoldersEmails.inbox.length : 0,
    sent: allFoldersEmails?.sent ? allFoldersEmails.sent.length : 0,
    draft: allFoldersEmails?.draft ? allFoldersEmails.draft.length : 0,
    trash: allFoldersEmails?.trash ? allFoldersEmails.trash.length : 0,
    spam: allFoldersEmails?.spam ? allFoldersEmails.spam.length : 0
  };
  
  const handleFolderSelect = (folder: FolderType) => {
    // Clear selected email when changing folders
    setSelectedEmail(null);
    
    // Navigate to the selected folder
    router.push(`/dashboard/email/${folder}`);
  };
  
  return (
    <div className="flex flex-col h-full p-4 space-y-6">
      <div className="transform transition-all duration-200 hover:translate-y-[-2px]">
        <button
          className="w-full flex items-center justify-center p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transform hover:scale-[1.02] transition-all duration-200 shadow-sm hover:shadow-md mb-6"
          onClick={() => {
            console.log('Sidebar compose button clicked');
            // Use the handleSetShowCompose method from context
            handleSetShowCompose(true);
            // Also dispatch the event as a backup
            const event = new CustomEvent('showComposeModal');
            console.log('Dispatching showComposeModal event:', event);
            window.dispatchEvent(event);
            console.log('Event dispatched');
          }}
          style={{ pointerEvents: 'auto' }}
        >
          <Plus size={18} className="mr-2 animate-pulse" />
          <span className="font-medium">Compose</span>
        </button>
      
      </div>
      
      <div className="flex-1 overflow-y-auto -mx-4 px-4">
        <nav className="space-y-1">
          <button
            className={`w-full flex items-center justify-between px-4 py-2.5 text-left rounded-lg transition-colors ${
              currentFolder === 'inbox'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            onClick={() => handleFolderSelect('inbox')}
          >
            <div className="flex items-center">
              <Inbox
                size={18}
                className={`mr-3 ${
                  currentFolder === 'inbox' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                }`}
              />
              <span className="font-medium">Inbox</span>
            </div>
            <span className={`inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-medium rounded-full ${
              unreadCounts.inbox > 0 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}>
              {unreadCounts.inbox}
            </span>
          </button>
          
          <button
            className={`w-full flex items-center justify-between px-4 py-2.5 text-left rounded-lg transition-colors ${
              currentFolder === 'sent'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            onClick={() => handleFolderSelect('sent')}
          >
            <div className="flex items-center">
              <Send
                size={18}
                className={`mr-3 ${
                  currentFolder === 'sent' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                }`}
              />
              <span className="font-medium">Sent</span>
            </div>
            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              {totalCounts.sent}
            </span>
          </button>
          
          <button
            className={`w-full flex items-center justify-between px-4 py-2.5 text-left rounded-lg transition-colors ${
              currentFolder === 'draft'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            onClick={() => handleFolderSelect('draft')}
          >
            <div className="flex items-center">
              <Archive
                size={18}
                className={`mr-3 ${
                  currentFolder === 'draft' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                }`}
              />
              <span className="font-medium">Drafts</span>
            </div>
            <span className={`inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-medium rounded-full ${
              totalCounts.draft > 0 
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}>
              {totalCounts.draft}
            </span>
          </button>
          
          <button
            className={`w-full flex items-center justify-between px-4 py-2.5 text-left rounded-lg transition-colors ${
              currentFolder === 'trash'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            onClick={() => handleFolderSelect('trash')}
          >
            <div className="flex items-center">
              <Trash
                size={18}
                className={`mr-3 ${
                  currentFolder === 'trash' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                }`}
              />
              <span className="font-medium">Trash</span>
            </div>
            <span className={`inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-medium rounded-full ${
              unreadCounts.trash > 0 
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}>
              {unreadCounts.trash}
            </span>
          </button>
          
          {/* Spam Folder */}
          <button
            className={`w-full flex items-center justify-between px-4 py-2.5 text-left rounded-lg transition-colors ${
              currentFolder === 'spam'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            onClick={() => handleFolderSelect('spam')}
          >
            <div className="flex items-center">
              <AlertTriangle
                size={18}
                className={`mr-3 ${
                  currentFolder === 'spam' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                }`}
              />
              <span className="font-medium">Spam</span>
            </div>
            <span className={`inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-medium rounded-full ${
              unreadCounts.spam > 0 
                ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}>
              {unreadCounts.spam}
            </span>
          </button>
        </nav>
      </div>
      
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 size={20} className="animate-spin text-blue-500 mr-2" />
          <span className="text-sm text-gray-500 dark:text-gray-400">Loading...</span>
        </div>
      )}
    </div>
  );
};

export default EmailSidebarContent;