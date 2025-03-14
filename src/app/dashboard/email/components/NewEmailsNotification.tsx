'use client';

import React from 'react';
import { Bell, X, RefreshCw } from 'lucide-react';

interface NewEmailsNotificationProps {
  count: number;
  onDismiss: () => void;
  onView: () => void;
}

const NewEmailsNotification: React.FC<NewEmailsNotificationProps> = ({
  count,
  onDismiss,
  onView
}) => {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 text-blue-700 dark:text-blue-300 p-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center">
        <Bell className="h-5 w-5 mr-2" />
        <span>
          {count === 1
            ? 'You have 1 new email'
            : `You have ${count} new emails`}
        </span>
      </div>
      <div className="flex space-x-2">
        <button
          onClick={onView}
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-1 px-3 rounded text-sm flex items-center"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          View
        </button>
        <button
          onClick={onDismiss}
          className="text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100"
          aria-label="Dismiss notification"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default NewEmailsNotification; 