'use client';

import React, { useState } from 'react';
import { Star, Search, ArrowLeft } from 'lucide-react';

interface EmailAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
}

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
}

const mockEmails: Email[] = [
  {
    id: 1,
    folder: 'inbox',
    from: 'john.smith@example.com',
    fromName: 'John Smith',
    to: 'me@company.com',
    subject: 'Project Update - Q1 Status',
    body: 'Hi team,\n\nI wanted to share the latest progress on our Q1 objectives...\n\nLet me know if you have any questions!\n\nBest,\nJohn',
    date: new Date(2025, 2, 1, 9, 15),
    isRead: true,
    isStarred: false
  },
  {
    id: 2,
    folder: 'inbox',
    from: 'sarah.jones@example.com',
    fromName: 'Sarah Jones',
    to: 'me@company.com',
    subject: 'Client Meeting Tomorrow',
    body: 'Hi,\n\nJust a reminder that we have the client presentation tomorrow at 2PM EST. Please review the slides I shared yesterday and let me know if you have any feedback.\n\nThanks,\nSarah',
    date: new Date(2025, 2, 3, 15, 22),
    isRead: false,
    isStarred: true
  },
  {
    id: 3,
    folder: 'inbox',
    from: 'tech.support@company.com',
    fromName: 'IT Support',
    to: 'me@company.com',
    subject: 'System Maintenance Notice',
    body: 'Dear Team,\n\nPlease be informed that we will be performing system maintenance this weekend.\n\nBest regards,\nIT Support Team',
    date: new Date(2025, 2, 2, 11, 5),
    isRead: true,
    isStarred: false
  }
];

const SearchBar = ({ onSearch }: { onSearch: (query: string) => void }) => (
  <div className="relative">
    <input
      type="text"
      placeholder="Search emails..."
      onChange={(e) => onSearch(e.target.value)}
      className="w-full p-2 pl-10 border rounded-lg bg-white dark:bg-gray-800 
                dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      aria-label="Search emails"
    />
    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
  </div>
);

const EmailListItem = ({ email, onClick }: { email: Email; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
      ${!email.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
      border-b border-gray-100 dark:border-gray-800`}
  >
    <div className="flex items-start">
      <button 
        className="flex-shrink-0 mr-3 hover:text-yellow-500 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          // Handle star toggle
        }}
        aria-label={email.isStarred ? "Unstar email" : "Star email"}
      >
        <Star
          size={18}
          className={email.isStarred ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
        />
      </button>
      
      <div className="flex-grow min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className={`font-medium truncate ${!email.isRead ? 'font-semibold' : ''}`}>
            {email.fromName}
          </span>
          <time className="text-sm text-gray-500 flex-shrink-0 ml-2">
            {email.date.toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </time>
        </div>
        
        <h3 className="text-sm font-medium truncate mb-1">
          {email.subject}
        </h3>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
          {email.body.split('\n')[0]}
        </p>
      </div>
    </div>
  </button>
);

const EmailDetail = ({ email, onBack }: { email: Email; onBack: () => void }) => (
  <article className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-800">
    <header className="p-4 border-b dark:border-gray-700 flex items-center">
      <button 
        className="mr-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        onClick={onBack}
        aria-label="Back to email list"
      >
        <ArrowLeft size={20} />
      </button>
      <div className="flex-1">
        <h1 className="text-2xl font-bold mb-2">{email.subject}</h1>
        <div className="flex justify-between items-baseline">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center mr-3">
              {email.fromName.charAt(0)}
            </div>
            <div>
              <div className="font-medium">
                {email.fromName} &lt;{email.from}&gt;
              </div>
              <div className="text-sm text-gray-500">
                To: {email.to}
              </div>
            </div>
          </div>
          <time className="text-sm text-gray-500">
            {email.date.toLocaleString()}
          </time>
        </div>
      </div>
    </header>
    
    <div className="flex-1 overflow-y-auto p-6">
      <div className="prose dark:prose-invert max-w-none">
        {email.body.split('\n').map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </div>
  </article>
);

export default function EmailPage() {
  const [emails] = useState<Email[]>(mockEmails);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEmails = emails.filter(email => 
    email.folder === 'inbox' &&
    (email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
     email.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
     email.fromName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-6 h-full">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 h-[calc(100vh-12rem)]">
        {!selectedEmail ? (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b dark:border-gray-700">
              <SearchBar onSearch={setSearchQuery} />
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredEmails.length === 0 ? (
                <div className="flex justify-center items-center h-full text-gray-500">
                  <p>No emails found</p>
                </div>
              ) : (
                <div className="divide-y dark:divide-gray-700">
                  {filteredEmails.map(email => (
                    <EmailListItem
                      key={email.id}
                      email={email}
                      onClick={() => setSelectedEmail(email)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <EmailDetail
            email={selectedEmail}
            onBack={() => setSelectedEmail(null)}
          />
        )}
      </div>
    </div>
  );
}