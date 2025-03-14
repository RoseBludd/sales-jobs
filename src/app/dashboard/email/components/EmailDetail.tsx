'use client';

import React, { useState, useEffect } from 'react';
import { useEmailContext } from '../context/EmailProvider';
import { ChevronLeft, Trash, Star, StarOff, MailPlus, CornerUpLeft, CornerUpRight, Download, Printer, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Email, EmailAttachment } from '../types';
import { useTheme } from '../context/ThemeContext';
import { slideInRightVariants, fadeInVariants } from '../utils/animations';
import useSmoothLoading from '../hooks/useSmoothLoading';
import { EmailDetailSkeleton } from './EmailSkeleton';
import { showFeatureNotification } from './FeatureNotification';

interface EmailDetailProps {
  emailId: string;
  onBack: () => void;
  onDelete: () => void;
  isMobileView?: boolean;
}

export default function EmailDetail({ emailId, onBack, onDelete, isMobileView = false }: EmailDetailProps) {
  const { fetchEmailById, updateEmail } = useEmailContext();
  const { theme, isDark } = useTheme();
  const [email, setEmail] = useState<Email | null>(null);
  const [isActuallyLoading, setIsActuallyLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use smooth loading hook to prevent loading flashes
  const { isLoading } = useSmoothLoading(isActuallyLoading, {
    minLoadingTime: 600,
    loadingDelay: 200
  });

  useEffect(() => {
    const loadEmail = async () => {
      try {
        setIsActuallyLoading(true);
        setError(null);
        const emailData = await fetchEmailById(emailId);
        setEmail(emailData);
      } catch (err) {
        console.error('Error loading email:', err);
        setError('Failed to load email. Please try again.');
      } finally {
        setIsActuallyLoading(false);
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
  
  const handleFeatureNotAvailable = (featureName: string) => {
    showFeatureNotification({
      featureName,
      type: 'coming-soon'
    });
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
    if (attachments.length === 0) return null;
    
    return (
      <motion.div 
        className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4"
        variants={fadeInVariants}
        initial="hidden"
        animate="visible"
      >
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Attachments ({attachments.length})
        </h3>
        <div className="flex flex-wrap gap-3">
          {attachments.map((attachment, index) => (
            <motion.div
              key={index}
              className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ borderRadius: theme.borderRadius }}
            >
              <div className="text-sm">
                <p className="font-medium text-gray-800 dark:text-gray-200">{attachment.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{attachment.size}</p>
              </div>
              <button 
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                onClick={() => handleFeatureNotAvailable('Download attachments')}
              >
                <Download size={16} className="text-gray-600 dark:text-gray-400" />
              </button>
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  };

  if (isLoading) {
    return <EmailDetailSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full">
        <div className="p-4 rounded-lg text-center max-w-md" 
             style={{ 
               backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(254, 226, 226, 1)',
               color: theme.colors.error,
               borderRadius: theme.borderRadius
             }}>
          <p className="mb-4">{error}</p>
          <button 
            onClick={onBack}
            className="px-4 py-2 rounded-lg text-white text-sm inline-flex items-center"
            style={{ 
              backgroundColor: theme.colors.primary,
              borderRadius: theme.borderRadius
            }}
          >
            <ChevronLeft size={16} className="mr-1" />
            Back to emails
          </button>
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <p>Email not found</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="p-6"
      variants={slideInRightVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Email header with actions */}
      <div className="flex justify-between items-start mb-6">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          style={{ borderRadius: '50%' }}
        >
          <ChevronLeft size={20} />
        </motion.button>
        
        <div className="flex space-x-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleToggleStar}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
          >
            {email.isStarred ? (
              <Star size={20} className="text-amber-400" />
            ) : (
              <StarOff size={20} />
            )}
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleFeatureNotAvailable('Reply to email')}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
          >
            <CornerUpLeft size={20} />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleFeatureNotAvailable('Forward email')}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
          >
            <CornerUpRight size={20} />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onDelete}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
          >
            <Trash size={20} />
          </motion.button>
        </div>
      </div>
      
      {/* Email subject */}
      <motion.h1 
        className="text-2xl font-semibold text-gray-900 dark:text-white mb-4"
        variants={fadeInVariants}
      >
        {email.subject || '(No Subject)'}
      </motion.h1>
      
      {/* Sender info and date */}
      <motion.div 
        className="flex items-center mb-6"
        variants={fadeInVariants}
      >
        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-semibold mr-3">
          {email.fromName?.charAt(0) || email.from?.charAt(0) || '?'}
        </div>
        <div className="flex-1">
          <div className="font-medium text-gray-900 dark:text-white">
            {email.fromName || email.from}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
            <span>To: {email.to}</span>
            <span className="mx-2">•</span>
            <span>{formatDate(email.date)}</span>
          </div>
        </div>
      </motion.div>
      
      {/* Email body */}
      <motion.div 
        className="prose dark:prose-invert max-w-none text-gray-900 dark:text-white"
        variants={fadeInVariants}
        dangerouslySetInnerHTML={{ __html: email.body }}
      />
      
      {/* Attachments */}
      {renderAttachments(email.attachments)}
      
      {/* Email actions */}
      <motion.div 
        className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between"
        variants={fadeInVariants}
      >
        <button 
          onClick={() => handleFeatureNotAvailable('Reply to email')}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center"
          style={{ 
            backgroundColor: theme.colors.primary,
            borderRadius: theme.borderRadius
          }}
        >
          <CornerUpLeft size={16} className="mr-2" />
          Reply
        </button>
        
        <div className="flex space-x-2">
          <button 
            onClick={() => handleFeatureNotAvailable('Print email')}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
          >
            <Printer size={20} />
          </button>
          
          <button 
            onClick={() => handleFeatureNotAvailable('Forward email')}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg flex items-center"
            style={{ borderRadius: theme.borderRadius }}
          >
            <CornerUpRight size={16} className="mr-2" />
            Forward
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
} 