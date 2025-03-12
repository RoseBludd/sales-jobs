'use client';

import React from 'react';
import { Bell } from 'lucide-react';

interface NewEmailsNotificationProps {
  count: number;
  onRefresh: () => void;
  visible: boolean;
}

const NewEmailsNotification: React.FC<NewEmailsNotificationProps> = ({
  count,
  onRefresh,
  visible
}) => {
  if (!visible) return null;
  
  return (
    <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4 flex items-center justify-between">
      <div className="flex items-center">
        <Bell className="h-5 w-5 mr-2" />
        <span>
          {count === 1
            ? 'You have 1 new email'
            : `You have ${count} new emails`}
        </span>
      </div>
      <button
        onClick={onRefresh}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-sm"
      >
        Refresh
      </button>
    </div>
  );
};

export default NewEmailsNotification; 