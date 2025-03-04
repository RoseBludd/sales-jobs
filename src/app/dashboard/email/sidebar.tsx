'use client';

import React from 'react';
import { Inbox, Send, Archive, Trash, Plus } from 'lucide-react';

interface Email {
  id: number;
  folder: string;
  isRead: boolean;
}

interface SidebarContentProps {
  currentFolder: string;
  emails: Email[];
  onFolderSelect: (folder: string) => void;
}

const EmailSidebarContent = ({ currentFolder, emails, onFolderSelect }: SidebarContentProps) => {
  return (
    <>
      <div className="mb-6">
        <button className="w-full flex items-center justify-center p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 mb-4">
          <Plus size={18} className="mr-2" /> Compose
        </button>
      </div>
      
      <div className="mb-6">
        <p className="text-gray-400 text-sm mb-2">FOLDERS</p>
        <ul>
          <li className="mb-1">
            <button 
              className={`flex items-center p-2 w-full text-left ${currentFolder === 'inbox' ? 'bg-gray-700' : 'hover:bg-gray-700'} rounded-md`}
              onClick={() => onFolderSelect('inbox')}
            >
              <Inbox size={18} className="mr-2" />
              <span>Inbox</span>
              <span className="ml-auto bg-blue-500 text-xs rounded-full px-2">
                {emails.filter(e => e.folder === 'inbox' && !e.isRead).length}
              </span>
            </button>
          </li>
          <li className="mb-1">
            <button 
              className={`flex items-center p-2 w-full text-left ${currentFolder === 'sent' ? 'bg-gray-700' : 'hover:bg-gray-700'} rounded-md`}
              onClick={() => onFolderSelect('sent')}
            >
              <Send size={18} className="mr-2" />
              <span>Sent</span>
            </button>
          </li>
          <li className="mb-1">
            <button 
              className={`flex items-center p-2 w-full text-left ${currentFolder === 'archive' ? 'bg-gray-700' : 'hover:bg-gray-700'} rounded-md`}
              onClick={() => onFolderSelect('archive')}
            >
              <Archive size={18} className="mr-2" />
              <span>Archive</span>
            </button>
          </li>
          <li className="mb-1">
            <button 
              className={`flex items-center p-2 w-full text-left ${currentFolder === 'trash' ? 'bg-gray-700' : 'hover:bg-gray-700'} rounded-md`}
              onClick={() => onFolderSelect('trash')}
            >
              <Trash size={18} className="mr-2" />
              <span>Trash</span>
            </button>
          </li>
        </ul>
      </div>
    </>
  );
};

export default EmailSidebarContent;