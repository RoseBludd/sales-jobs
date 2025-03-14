'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X } from 'lucide-react';

interface ComposeEmailProps {
  onClose: () => void;
  onSubmit: (data: { to: string; subject: string; body: string }) => Promise<void>;
  isSubmitting?: boolean;
}

const ComposeEmail = ({ onClose, onSubmit, isSubmitting = false }: ComposeEmailProps) => {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Handle click outside to close the modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        console.log('Click outside detected, closing compose modal');
        onClose();
      }
    };
    
    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);
  
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!to) {
      setError('Please specify at least one recipient');
      return;
    }
    
    // Basic email validation
    if (!validateEmail(to)) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (!subject) {
      setError('Please enter a subject');
      return;
    }
    
    try {
      setSending(true);
      console.log('Sending email to:', to);
      await onSubmit({ to, subject, body });
      
      console.log('Email sent successfully');
      onClose();
    } catch (err) {
      setError('An error occurred while sending the email');
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-fadeIn"
      >
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">New Message</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-3 mb-4 rounded-r">
                <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}
            
            <div className="relative">
              <input
                type="email"
                id="to"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                className="w-full px-3 py-2.5 border-b dark:border-gray-600 focus:outline-none focus:border-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                required
              />
              <label htmlFor="to" className="absolute -top-2 left-0 text-xs font-medium text-gray-500 dark:text-gray-400">
                To:
              </label>
            </div>
            
            <div className="relative">
              <input
                type="text"
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="w-full px-3 py-2.5 border-b dark:border-gray-600 focus:outline-none focus:border-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                required
              />
              <label htmlFor="subject" className="absolute -top-2 left-0 text-xs font-medium text-gray-500 dark:text-gray-400">
                Subject:
              </label>
            </div>
            
            <div className="flex-1 mt-4">
              <textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message here..."
                className="w-full h-full min-h-[200px] px-3 py-2 border dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none text-sm"
              />
            </div>
          </div>
          
          <div className="p-4 border-t dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-b-lg">
            <div>
              <button
                type="button"
                className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                aria-label="Attach file"
              >
                <Paperclip size={18} />
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => {
                  console.log('Discard button clicked');
                  onClose();
                }}
                className="px-4 py-2 text-sm border dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={sending || isSubmitting}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors shadow-sm"
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
                    <Send size={16} className="mr-2" />
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