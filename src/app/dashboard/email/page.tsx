'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import EmailPage from './components/EmailPage';
import EmailSkeleton from './components/EmailSkeleton';
import { Mail, Loader2, XCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeInVariants, pageTransitionVariants } from './utils/animations';
import { showFeatureNotification } from './components/FeatureNotification';
import ThemeProvider, { useTheme } from './context/ThemeContext';
import useSmoothLoading from './hooks/useSmoothLoading';

// Main content wrapper with theme context
const EmailPageContent = () => {
  const [hasError, setHasError] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const folderParam = searchParams?.get('folder') || 'inbox';
  const { theme } = useTheme();
  
  // Add smooth loading for page transitions
  const { isLoading } = useSmoothLoading(false, {
    minLoadingTime: 300,
    initialLoading: true
  });
  
  // Validate folder parameter
  const validFolders = ['inbox', 'sent', 'draft', 'trash', 'spam'];
  const validFolder = validFolders.includes(folderParam as string) ? 
    folderParam as 'inbox' | 'sent' | 'draft' | 'trash' | 'spam' : 
    'inbox';
  
  // Navigate to a different folder
  const navigateToFolder = (folder: string) => {
    router.push(`/dashboard/email?folder=${folder}`);
  };
  
  // Reset error state when folder changes
  useEffect(() => {
    setHasError(false);
  }, [validFolder]);
  
  if (isLoading) {
    return <EmailPageLoader />;
  }
  
  return (
    <motion.div 
      className="h-full flex flex-col"
      variants={pageTransitionVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      key={validFolder} // Force re-render on folder change
    >
      <AnimatePresence mode="wait">
        {hasError ? (
          <ErrorFallback onRetry={() => setHasError(false)} />
        ) : (
          <div 
            suppressHydrationWarning
            className="w-full h-full overflow-hidden transition-all duration-300 ease-in-out"
            style={{
              borderRadius: theme.borderRadius,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            <EmailPage 
              folder={validFolder} 
              onError={() => setHasError(true)}
            />
          </div>
        )}
      </AnimatePresence>
      
      <FolderTabs 
        currentFolder={validFolder}
        onFolderChange={navigateToFolder}
      />
    </motion.div>
  );
};

// Folder tabs component
const FolderTabs = ({ currentFolder, onFolderChange }: { 
  currentFolder: string,
  onFolderChange: (folder: string) => void
}) => {
  const { theme } = useTheme();
  const folders = [
    { id: 'inbox', label: 'Inbox' },
    { id: 'sent', label: 'Sent' },
    { id: 'draft', label: 'Drafts' },
    { id: 'trash', label: 'Trash' },
    { id: 'spam', label: 'Spam' }
  ];
  
  return (
    <motion.div 
      className="flex justify-center mt-4 gap-1 md:gap-2 px-2"
      variants={fadeInVariants}
      initial="hidden"
      animate="visible"
    >
      {folders.map(folder => (
        <button
          key={folder.id}
          onClick={() => onFolderChange(folder.id)}
          className={`px-3 py-1.5 text-sm md:text-base rounded-md transition-colors ${
            currentFolder === folder.id 
              ? 'text-white font-medium shadow-sm' 
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          style={{ 
            backgroundColor: currentFolder === folder.id ? theme.colors.primary : 'transparent',
            borderRadius: theme.borderRadius
          }}
        >
          {folder.label}
        </button>
      ))}
    </motion.div>
  );
};

// Loading component with a subtle animation
const EmailPageLoader = () => {
  const { theme } = useTheme();
  
  return (
    <div className="h-full flex flex-col items-center justify-center space-y-4 p-8 bg-gradient-to-b from-transparent to-gray-50 dark:to-gray-900/30">
      <div className="relative w-24 h-24 flex items-center justify-center">
        <Mail className="w-12 h-12 absolute animate-pulse" style={{ color: `${theme.colors.primary}70` }} />
        <div className="w-24 h-24 border-t-2 rounded-full animate-spin absolute" 
             style={{ borderColor: theme.colors.primary }} />
      </div>
      <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300">Loading your emails</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md">
        We're retrieving your latest messages. This should only take a moment...
      </p>
    </div>
  );
};

// Error boundary component
const ErrorFallback = ({ onRetry }: { onRetry: () => void }) => {
  const { theme } = useTheme();
  
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-red-50 dark:bg-red-900/10">
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md text-center"
           style={{ borderRadius: theme.borderRadius }}>
        <XCircle className="h-12 w-12 mx-auto mb-4" style={{ color: theme.colors.error }} />
        <h3 className="text-xl font-semibold mb-2" style={{ color: theme.colors.error }}>
          Something went wrong
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          We couldn't load your emails. This could be due to a network issue or server problem.
        </p>
        <div className="flex space-x-4 justify-center">
          <button 
            onClick={onRetry}
            className="px-4 py-2 text-white rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            style={{ 
              backgroundColor: theme.colors.primary,
              borderRadius: theme.borderRadius,
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}
          >
            Try Again
          </button>
          <button
            onClick={() => showFeatureNotification({
              featureName: 'Error reporting',
              type: 'coming-soon',
              description: 'Our team has been notified of this issue. Error reporting will be available soon.'
            })}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md transition-colors duration-200"
            style={{ borderRadius: theme.borderRadius }}
          >
            Report Issue
          </button>
        </div>
      </div>
    </div>
  );
};

// Handles non-working features with toast notifications
const handleFeatureNotAvailable = (featureName: string) => {
  toast.custom(
    (t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Coming Soon
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {featureName} feature is currently under development.
              </p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-gray-200 dark:border-gray-700">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 focus:outline-none"
          >
            Close
          </button>
        </div>
      </div>
    ),
    { duration: 3000 }
  );
};

export default function Page() {
  return (
    <ThemeProvider>
      <Suspense fallback={<div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>}>
        <EmailPageContent />
      </Suspense>
      
      {/* Export handleFeatureNotAvailable to be accessible from child components */}
      <script 
        dangerouslySetInnerHTML={{ 
          __html: `window.handleFeatureNotAvailable = ${handleFeatureNotAvailable.toString()};` 
        }} 
      />
    </ThemeProvider>
  );
}
