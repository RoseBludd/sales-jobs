'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import { Email } from './types';
import { useEmailContext } from './context/EmailProvider';

// Import components
import EmailListItem from './components/EmailListItem';
import EmailDetail from './components/EmailDetail';
import ComposeEmail from './components/ComposeEmail';
import SearchBar from './components/SearchBar';

interface EmailPageProps {
  currentFolder: 'inbox' | 'sent' | 'draft' | 'trash';
}

export default function EmailPage({ currentFolder }: EmailPageProps) {
  const router = useRouter();
  
  // Use the shared context
  const { 
    emails,
    showCompose, 
    setShowCompose, 
    setIsLoading 
  } = useEmailContext();
  
  const [filteredEmails, setFilteredEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEmails, setTotalEmails] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // Fetch emails when currentFolder changes
  useEffect(() => {
    console.log(`Fetching emails for folder: ${currentFolder}`);
    fetchEmails(1);
  }, [currentFolder]);
  
  // Apply search filter when query changes
  useEffect(() => {
    if (!searchQuery) {
      setFilteredEmails(emails);
      return;
    }
    
    const lowerQuery = searchQuery.toLowerCase();
    const filtered = emails.filter(email => 
      email.subject.toLowerCase().includes(lowerQuery) ||
      email.fromName.toLowerCase().includes(lowerQuery) ||
      email.body.toLowerCase().includes(lowerQuery)
    );
    
    setFilteredEmails(filtered);
  }, [searchQuery, emails]);
  
  const fetchEmails = async (page = 1) => {
    try {
      setLoading(true);
      setIsLoading(true);
      setError('');
      
      // Convert folder name to match API expectations
      const apiFolder = currentFolder.toUpperCase();
      
      // Make API call to fetch emails
      const response = await fetch(`/api/email?folder=${apiFolder}&page=${page}&limit=10`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch emails');
      }
      
      const data = await response.json();
      
      // Transform API response to match our Email interface
      const transformedEmails: Email[] = data.emails.map((emailData: { 
        id: number;
        from: string;
        fromName?: string;
        to: string;
        subject?: string;
        body?: string;
        date: string;
        isRead: boolean;
        isStarred?: boolean;
        itemId?: string;
        attachments?: Array<{
          id: string;
          name: string;
          size: number;
          type: string;
        }>;
      }) => ({
        id: emailData.id,
        folder: currentFolder,
        from: emailData.from,
        fromName: emailData.fromName || emailData.from.split('@')[0],
        to: emailData.to,
        subject: emailData.subject || '(No Subject)',
        body: emailData.body || '',
        date: new Date(emailData.date),
        isRead: emailData.isRead,
        isStarred: emailData.isStarred || false,
        itemId: emailData.itemId,
        attachments: emailData.attachments || []
      }));
      
      // Dispatch event to update context
      const event = new CustomEvent('emailsUpdated', {
        detail: { emails: transformedEmails }
      });
      window.dispatchEvent(event);
      
      setFilteredEmails(transformedEmails);
      setTotalPages(data.totalPages || 1);
      setTotalEmails(data.total || 0);
      setCurrentPage(page);
      
    } catch (err) {
      console.error('Error fetching emails:', err);
      setError(err instanceof Error ? err.message : 'Failed to load emails. Please try again later.');
      
      // Dispatch event to update context even on error
      const event = new CustomEvent('emailsUpdated', {
        detail: { emails: [] }
      });
      window.dispatchEvent(event);
    } finally {
      setLoading(false);
      setIsLoading(false);
      setInitialLoad(false);
    }
  };
  
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    fetchEmails(newPage);
  };
  
  const handleEmailSelect = async (email: Email) => {
    try {
      setSelectedEmail(email);
      
      // If email is not read, mark it as read
      if (!email.isRead && email.itemId) {
        const response = await fetch('/api/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'markAsRead',
            itemId: email.itemId
          }),
        });
        
        if (response.ok) {
          // Update filtered emails
          setFilteredEmails(prevEmails => 
            prevEmails.map(e => e.id === email.id ? { ...e, isRead: true } : e)
          );
          
          // Update the selected email
          setSelectedEmail({ ...email, isRead: true });
          
          // Dispatch event to update emails in context
          const updatedEmails = emails.map(e => 
            e.id === email.id ? { ...e, isRead: true } : e
          );
          
          const event = new CustomEvent('emailsUpdated', {
            detail: { emails: updatedEmails }
          });
          window.dispatchEvent(event);
        }
      }
    } catch (err) {
      console.error('Error fetching email details:', err);
      setError('Failed to load email details. Please try again later.');
    }
  };
  
  const handleDeleteEmail = async (email: Email) => {
    try {
      if (!email.itemId) {
        throw new Error('Email ID is missing');
      }
      
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          itemId: email.itemId
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete email');
      }
      
      // Update filtered emails
      setFilteredEmails(prevEmails => 
        prevEmails.filter(e => e.id !== email.id)
      );
      
      if (selectedEmail?.id === email.id) {
        setSelectedEmail(null);
      }
      
      // Dispatch event to update emails in context
      const updatedEmails = emails.filter(e => e.id !== email.id);
      
      const event = new CustomEvent('emailsUpdated', {
        detail: { emails: updatedEmails }
      });
      window.dispatchEvent(event);
      
    } catch (err) {
      console.error('Error deleting email:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete email. Please try again later.');
    }
  };
  
  const handleMoveEmail = async (email: Email, toFolder: 'inbox' | 'sent' | 'draft' | 'trash') => {
    try {
      if (!email.itemId) {
        throw new Error('Email ID is missing');
      }
      
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'move',
          itemId: email.itemId,
          fromFolder: currentFolder.toUpperCase(),
          toFolder: toFolder.toUpperCase()
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to move email');
      }
      
      // Update filtered emails
      setFilteredEmails(prevEmails => 
        prevEmails.filter(e => e.id !== email.id)
      );
      
      if (selectedEmail?.id === email.id) {
        setSelectedEmail(null);
      }
      
      // Navigate to the target folder
      router.push(`/dashboard/email/${toFolder}`);
      
      // Dispatch event to update emails in context
      const updatedEmails = emails.filter(e => e.id !== email.id);
      
      const event = new CustomEvent('emailsUpdated', {
        detail: { emails: updatedEmails }
      });
      window.dispatchEvent(event);
      
    } catch (err) {
      console.error('Error moving email:', err);
      setError(err instanceof Error ? err.message : 'Failed to move email. Please try again later.');
    }
  };
  
  const handleSendEmail = async (to: string, subject: string, body: string): Promise<boolean> => {
    try {
      setIsSubmitting(true);
      
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send',
          to,
          subject,
          body
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send email');
      }
      
      // If successful, refresh the sent folder if we're in it
      if (currentFolder === 'sent') {
        fetchEmails(currentPage);
      }
      
      return true;
    } catch (err) {
      console.error('Error sending email:', err);
      setError(err instanceof Error ? err.message : 'Failed to send email. Please try again later.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };
  
  const handleRetry = () => {
    fetchEmails(currentPage);
  };

  if (initialLoad) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600 dark:text-gray-400">Loading your emails...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Current folder and search */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold capitalize">{currentFolder}</h1>
          <p className="ml-2 text-sm text-gray-500">
            {loading ? 'Loading...' : `${totalEmails} emails`}
          </p>
        </div>
        <SearchBar onSearch={handleSearch} />
      </div>
      
      {/* Email content area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Email list */}
        <div className={`${selectedEmail ? 'hidden md:block md:w-1/3 lg:w-2/5' : 'w-full'} h-full overflow-y-auto border-r border-gray-200`}>
          {error && (
            <div className="p-4 bg-red-100 text-red-800 flex items-center">
              <AlertCircle size={18} className="mr-2" />
              <p>{error}</p>
              <button 
                className="ml-auto text-sm text-blue-600 hover:underline"
                onClick={handleRetry}
              >
                Retry
              </button>
            </div>
          )}
          
          {loading && (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={24} className="animate-spin text-blue-500" />
            </div>
          )}
          
          {!loading && filteredEmails.length === 0 && !error ? (
            <div className="p-8 text-center text-gray-500">
              <p>No emails found in this folder.</p>
            </div>
          ) : (
            <ul>
              {filteredEmails.map(email => (
                <EmailListItem 
                  key={email.id} 
                  email={email} 
                  isSelected={selectedEmail?.id === email.id}
                  onClick={() => handleEmailSelect(email)}
                  onDelete={() => handleDeleteEmail(email)}
                  onMove={(toFolder) => handleMoveEmail(email, toFolder)}
                />
              ))}
            </ul>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 flex items-center justify-between">
              <button 
                className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
              >
                <ChevronLeft size={18} />
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button 
                className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || loading}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
        
        {/* Email detail view */}
        {selectedEmail && (
          <div className="w-full md:w-2/3 lg:w-3/5 h-full overflow-y-auto">
            <EmailDetail 
              email={selectedEmail}
              onBack={() => setSelectedEmail(null)}
              onDelete={() => handleDeleteEmail(selectedEmail)}
              onMove={(toFolder) => handleMoveEmail(selectedEmail, toFolder)}
            />
          </div>
        )}
      </div>
      
      {/* Compose email modal */}
      {showCompose && (
        <ComposeEmail 
          onClose={() => setShowCompose(false)}
          onSend={handleSendEmail}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
