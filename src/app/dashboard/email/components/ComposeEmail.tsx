'use client';

import React, { useState } from 'react';
import { X, Send } from 'lucide-react';

interface ComposeEmailProps {
  onClose: () => void;
  onSend: (to: string, subject: string, body: string) => Promise<boolean>;
  isSubmitting?: boolean;
}

const ComposeEmail = ({ onClose, onSend, isSubmitting = false }: ComposeEmailProps) => {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!to) {
      setError('Please specify at least one recipient');
      return;
    }
    
    try {
      setSending(true);
      const success = await onSend(to, subject, body);
      
      if (success) {
        onClose();
      } else {
        setError('Failed to send email. Please try again.');
      }
    } catch (err) {
      setError('An error occurred while sending the email');
      console.error(err);
    } finally {
      setSending(false);
    }
  };
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl mx-4 flex flex-col" style={{ maxHeight: 'calc(100vh - 40px)' }}>
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-medium">New Message</h2>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-3 mb-4">
                <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}
            
            <div>
              <label htmlFor="to" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                To:
              </label>
              <input
                type="text"
                id="to"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subject:
              </label>
              <input
                type="text"
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            <div className="flex-1">
              <label htmlFor="body" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Message:
              </label>
              <textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                rows={12}
              />
            </div>
          </div>
          
          <div className="p-4 border-t dark:border-gray-700 flex justify-between">
            <div>
              {/* Attachment button would go here */}
            </div>
            <div>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 mr-2 border dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={sending || isSubmitting}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {sending || isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={18} className="mr-2" />
                    Send
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ComposeEmail; 