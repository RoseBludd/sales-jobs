'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Inbox, Send, Archive, Trash, Plus, Loader2 } from 'lucide-react';
import { useEmailContext } from './context/EmailProvider';

type FolderType = 'inbox' | 'sent' | 'draft' | 'trash';

const EmailSidebarContent = () => {
  const router = useRouter();
  const pathname = usePathname();
  
  // Get current folder from pathname
  const currentFolder = pathname.split('/').pop() as FolderType || 'inbox';
  
  // Use the shared context for shared state
  const {
    emails,
    setShowCompose,
    isLoading,
    setIsLoading
  } = useEmailContext();
  
  // Count unread emails for each folder
  const unreadCounts = {
    inbox: emails.filter(e => e.folder === 'inbox' && !e.isRead).length,
    sent: 0,
    draft: emails.filter(e => e.folder === 'draft').length,
    trash: 0
  };

  const handleFolderSelect = (folder: FolderType) => {
    if (currentFolder === folder) return;
    
    console.log(`Changing folder from ${currentFolder} to ${folder}`);
    setIsLoading(true);
    
    // Navigate to the corresponding page
    router.push(`/dashboard/email/${folder}`);
  };
  
  return (
    <div className="flex flex-col h-full p-4 space-y-6">
      <div className="transform transition-all duration-200 hover:translate-y-[-2px]">
        <button
          className="w-full flex items-center justify-center p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transform hover:scale-[1.02] transition-all duration-200 shadow-sm hover:shadow-md mb-6"
          onClick={() => setShowCompose(true)}
        >
          <Plus size={18} className="mr-2 animate-pulse" />
          <span className="font-medium">Compose</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto -mx-4 px-4">
        <p className="text-gray-400 text-xs uppercase font-semibold tracking-wider mb-3 px-2">Folders</p>
        <ul className="space-y-1">
          <li className="mb-1">
            <button
              className={`flex items-center p-3 w-full text-left rounded-lg transition-all duration-200
                ${currentFolder === 'inbox'
                  ? 'bg-blue-500/10 text-blue-600 font-medium shadow-sm dark:bg-blue-500/20 dark:text-blue-400'
                  : 'hover:bg-gray-700 dark:hover:bg-gray-800'}
                transform hover:scale-[1.01] hover:shadow-sm`}
              onClick={() => handleFolderSelect('inbox')}
              disabled={isLoading && currentFolder !== 'inbox'}
              aria-current={currentFolder === 'inbox' ? 'page' : undefined}
            >
              <div className="relative">
                {isLoading && currentFolder === 'inbox' ? (
                  <Loader2 size={18} className="mr-3 animate-spin text-blue-500 animate-in fade-in" />
                ) : (
                  <Inbox size={18} className={`mr-3 transition-all duration-200 transform
                    ${currentFolder === 'inbox' ? 'text-blue-500 scale-110' : 'text-gray-400 hover:text-blue-400 hover:scale-105'}`} />
                )}
              </div>
              <span className="font-medium">Inbox</span>
              {unreadCounts.inbox > 0 && (
                <span className="ml-auto inline-flex items-center justify-center bg-blue-500 text-white text-xs font-bold rounded-full px-2 py-1 min-w-[1.5rem] transform transition-all duration-200 hover:scale-110 animate-in fade-in slide-in-from-right">
                  {unreadCounts.inbox}
                </span>
              )}
            </button>
          </li>
          <li className="mb-1">
            <button
              className={`flex items-center p-3 w-full text-left rounded-lg transition-all duration-200
                ${currentFolder === 'sent'
                  ? 'bg-green-500/10 text-green-600 font-medium shadow-sm dark:bg-green-500/20 dark:text-green-400'
                  : 'hover:bg-gray-700 dark:hover:bg-gray-800'}
                transform hover:scale-[1.01] hover:shadow-sm`}
              onClick={() => handleFolderSelect('sent')}
              disabled={isLoading && currentFolder !== 'sent'}
              aria-current={currentFolder === 'sent' ? 'page' : undefined}
            >
              <div className="relative">
                {isLoading && currentFolder === 'sent' ? (
                  <Loader2 size={18} className="mr-3 animate-spin text-green-500 animate-in fade-in duration-300" />
                ) : (
                  <Send size={18} className={`mr-3 transition-all duration-200 transform
                    ${currentFolder === 'sent' ? 'text-green-500 scale-110' : 'text-gray-400 hover:text-green-400 hover:scale-105'}`} />
                )}
              </div>
              <span className="font-medium">Sent</span>
            </button>
          </li>
          <li className="mb-1">
            <button
              className={`flex items-center p-3 w-full text-left rounded-lg transition-all duration-200
                ${currentFolder === 'draft'
                  ? 'bg-indigo-500/10 text-indigo-600 font-medium shadow-sm dark:bg-indigo-500/20 dark:text-indigo-400'
                  : 'hover:bg-gray-700 dark:hover:bg-gray-800'}
                transform hover:scale-[1.01] hover:shadow-sm`}
              onClick={() => handleFolderSelect('draft')}
              disabled={isLoading && currentFolder !== 'draft'}
              aria-current={currentFolder === 'draft' ? 'page' : undefined}
            >
              <div className="relative">
                {isLoading && currentFolder === 'draft' ? (
                  <Loader2 size={18} className="mr-3 animate-spin text-indigo-500 animate-in fade-in duration-300" />
                ) : (
                  <Archive size={18} className={`mr-3 transition-all duration-200 transform
                    ${currentFolder === 'draft' ? 'text-indigo-500 scale-110' : 'text-gray-400 hover:text-indigo-400 hover:scale-105'}`} />
                )}
              </div>
              <span className="font-medium">Draft</span>
              {unreadCounts.draft > 0 && (
                <span className="ml-auto inline-flex items-center justify-center bg-indigo-500 text-white text-xs font-bold rounded-full px-2 py-1 min-w-[1.5rem] transform transition-all duration-200 hover:scale-110 animate-in fade-in slide-in-from-right">
                  {unreadCounts.draft}
                </span>
              )}
            </button>
          </li>
          <li className="mb-1">
            <button
              className={`flex items-center p-3 w-full text-left rounded-lg transition-all duration-200
                ${currentFolder === 'trash'
                  ? 'bg-red-500/10 text-red-600 font-medium shadow-sm dark:bg-red-500/20 dark:text-red-400'
                  : 'hover:bg-gray-700 dark:hover:bg-gray-800'}
                transform hover:scale-[1.01] hover:shadow-sm`}
              onClick={() => handleFolderSelect('trash')}
              disabled={isLoading && currentFolder !== 'trash'}
              aria-current={currentFolder === 'trash' ? 'page' : undefined}
            >
              <div className="relative">
                {isLoading && currentFolder === 'trash' ? (
                  <Loader2 size={18} className="mr-3 animate-spin text-red-500 dark:text-red-400 animate-in fade-in duration-300" />
                ) : (
                  <Trash size={18} className={`mr-3 transition-all duration-200 transform
                    ${currentFolder === 'trash' ? 'text-red-500 dark:text-red-400 scale-110' : 'text-gray-400 dark:text-gray-500 hover:text-red-400 hover:scale-105'}`} />
                )}
              </div>
              <span className="font-medium">Trash</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default EmailSidebarContent;