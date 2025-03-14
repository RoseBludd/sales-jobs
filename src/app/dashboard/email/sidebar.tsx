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
    isLoading,
    setShowCompose,
    handleSetShowCompose
  } = useEmailContext();
  
  // Count unread emails for each folder
  const unreadCounts = {
    inbox: allEmails ? allEmails.filter(e => e.folder === 'inbox' && !e.isRead).length : 0,
    sent: 0,
    draft: allEmails ? allEmails.filter(e => e.folder === 'draft').length : 0,
    trash: 0,
    spam: allEmails ? allEmails.filter(e => e.folder === 'spam' && !e.isRead).length : 0
  };
  
  const handleFolderSelect = (folder: FolderType) => {
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
            {unreadCounts.inbox > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
                {unreadCounts.inbox}
              </span>
            )}
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
            {unreadCounts.draft > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                {unreadCounts.draft}
              </span>
            )}
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
            {unreadCounts.spam > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-medium rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400">
                {unreadCounts.spam}
              </span>
            )}
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